/**
 * End-to-end InstaPay proof flow against a REAL MongoDB and the real Express app.
 *
 * Skipped unless INTEGRATION_MONGODB_URI points at a disposable database that has
 * been prepared with `npm run seed` and `npm run create-admin` (admin: testadmin /
 * Integration-Pass-123). It must never point at production: it edits settings and
 * creates orders. Run with:
 *   INTEGRATION_MONGODB_URI=mongodb://127.0.0.1:27017/rabah_it MONGODB_URI=$INTEGRATION_MONGODB_URI \
 *   JWT_SECRET=<32+ chars> node --import tsx --test src/integration/instapay.integration.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';

const URI = process.env.INTEGRATION_MONGODB_URI;
const ORIGIN = 'http://localhost:4200';

test('InstaPay proof: upload, admin-only view, guards, replacement', { skip: !URI }, async (t) => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.connect(URI as string);
  const { createApp } = await import('../app.js');
  const { Settings, Product, Order, PaymentProof } = await import('../models/index.js');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  t.after(async () => { server.close(); await mongoose.disconnect(); });

  const call = (path: string, init: RequestInit & { cookie?: string } = {}) => {
    const { cookie, ...rest } = init;
    return fetch(base + path, {
      ...rest,
      headers: { Origin: ORIGIN, 'X-Requested-With': 'XMLHttpRequest', ...(cookie ? { Cookie: cookie } : {}), ...(rest.headers ?? {}) },
    });
  };

  // Test-only store configuration: InstaPay on, one delivery zone.
  await Settings.updateOne({ key: 'main' }, { $set: {
    'instapay.enabled': true, 'instapay.identifier': 'integration@instapay', 'instapay.accountName': 'Test',
    'shipping.enabled': true,
    'shipping.zones': [{ name: { ar: 'القاهرة', en: 'Cairo' }, governorates: ['Cairo'], areas: [], price: 30, isActive: true }],
  } });
  const product = await Product.findOne({ isActive: true, stock: { $gt: 5 } });
  assert.ok(product, 'seeded product');
  await Product.updateOne({ _id: product._id }, { $set: { isDemo: false } }); // seeded demo products cannot be ordered

  const orderRes = await call('/api/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idempotencyKey: `it-${Date.now()}`,
      customer: { fullName: 'Test Buyer', phone: '01000000000', governorate: 'Cairo', city: 'Cairo', address: '1 Test Street' },
      items: [{ productSlug: product.slug, quantity: 1 }], paymentMethod: 'instapay', currency: 'EGP',
    }),
  });
  const created = (await orderRes.json()) as any;
  assert.equal(orderRes.status, 201, JSON.stringify(created));
  const { orderNumber, accessToken } = created.data;
  assert.match(accessToken, /^[a-f\d]{64}$/);

  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('integration-proof-bytes')]);
  const upload = (token: string, bytes: Buffer = png, type = 'image/png') => {
    const form = new FormData();
    form.set('accessToken', token);
    form.set('transferReference', 'REF-1');
    form.set('proof', new Blob([new Uint8Array(bytes)], { type }), 'proof.png');
    return call(`/api/orders/${orderNumber}/proof`, { method: 'POST', body: form });
  };

  await t.test('wrong token is refused', async () => {
    assert.equal((await upload('f'.repeat(64))).status, 403);
  });
  await t.test('spoofed image bytes are refused', async () => {
    assert.equal((await upload(accessToken, Buffer.from('not an image'))).status, 400);
  });
  await t.test('oversized proof (over 5 MB) is refused', async () => {
    const big = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024 + 10)]);
    assert.equal((await upload(accessToken, big)).status, 400);
  });

  let firstId = '';
  await t.test('valid upload is stored in MongoDB and sets awaiting_verification', async () => {
    const res = await upload(accessToken);
    const body = (await res.json()) as any;
    assert.equal(res.status, 200, JSON.stringify(body));
    firstId = body.data.proof.id;
    const order = await Order.findOne({ orderNumber });
    assert.equal(order?.paymentStatus, 'awaiting_verification');
    const stored = await PaymentProof.findById(firstId).select('+data');
    assert.ok(stored?.data.equals(png), 'bytes in MongoDB equal the upload');
  });

  const login = await call('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'testadmin', password: 'Integration-Pass-123' }),
  });
  assert.equal(login.status, 200);
  const cookie = (login.headers.getSetCookie() as string[]).map((c) => c.split(';')[0]).join('; ');
  assert.ok(cookie.includes('rabah_admin'));
  const orderId = String((await Order.findOne({ orderNumber }))?._id);

  await t.test('proof is not viewable without an admin session', async () => {
    assert.equal((await call(`/api/admin/orders/${orderId}/proof`)).status, 401);
  });
  await t.test('admin can view the exact stored image with safe headers', async () => {
    const res = await call(`/api/admin/orders/${orderId}/proof`, { cookie });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(Buffer.from(await res.arrayBuffer()).equals(png));
  });
  await t.test('admin order list shows proof availability but no storage id', async () => {
    const res = await call('/api/admin/orders?search=' + orderNumber, { cookie });
    const text = await res.text();
    assert.ok(text.includes('"available":true'));
    assert.ok(!text.includes(firstId));
  });
  await t.test('a rejected proof can be replaced and the old file is deleted', async () => {
    const patch = (body: object) => call(`/api/admin/orders/${orderId}`, { method: 'PATCH', cookie, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await patch({ paymentStatus: 'rejected' })).status, 200);
    const res = await upload(accessToken);
    assert.equal(res.status, 200);
    assert.equal(await PaymentProof.countDocuments({ _id: firstId }), 0);
    assert.equal((await Order.findOne({ orderNumber }))?.paymentStatus, 'awaiting_verification');

    // Manual admin "paid" stays possible, and then re-upload can no longer undo it.
    assert.equal((await patch({ paymentStatus: 'paid' })).status, 200);
    const again = await upload(accessToken);
    assert.equal(again.status, 409);
    assert.equal((await Order.findOne({ orderNumber }))?.paymentStatus, 'paid');
    assert.equal(await PaymentProof.countDocuments({ orderNumber }), 1);
  });
  await t.test('a cancelled order refuses new proofs', async () => {
    await Order.updateOne({ orderNumber }, { $set: { paymentStatus: 'pending', orderStatus: 'cancelled' } });
    assert.equal((await upload(accessToken)).status, 409);
  });
});
