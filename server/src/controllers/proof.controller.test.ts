import assert from 'node:assert/strict';
import test from 'node:test';
import { proofUploadBlock, uploadPaymentProof, viewPaymentProof } from './proof.controller.js';
import { listOrders } from './admin-management.controller.js';
import { Order } from '../models/Order.js';
import { PaymentProof } from '../models/PaymentProof.js';
import { adminSettingsSchema } from '../validators/admin-management.js';

const TOKEN = 'a'.repeat(64);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const file = { mimetype: 'image/png', size: png.length, buffer: png };

function fakeOrder(over: Record<string, unknown> = {}) {
  return {
    _id: 'o1', orderNumber: 'RB-123456', paymentMethod: 'instapay', paymentStatus: 'pending', orderStatus: 'new',
    accessToken: TOKEN, trackingEvents: [] as unknown[], paymentProof: undefined as any, saved: 0,
    async save() { this.saved += 1; },
    ...over,
  };
}

async function run(order: ReturnType<typeof fakeOrder>) {
  const origFind = Order.findOne;
  const origCreate = PaymentProof.create;
  const origDelete = PaymentProof.deleteOne;
  const created: any[] = []; const deleted: unknown[] = [];
  (Order as any).findOne = () => ({ select: async () => order });
  (PaymentProof as any).create = async (doc: any) => { created.push(doc); return { _id: '507f1f77bcf86cd799439011' }; };
  (PaymentProof as any).deleteOne = async (q: unknown) => { deleted.push(q); return {}; };
  let body: any; let err: unknown;
  try {
    await uploadPaymentProof(
      { params: { orderNumber: order.orderNumber }, body: { accessToken: TOKEN, transferReference: 'T1' }, file } as any,
      { json(b: unknown) { body = b; } } as any,
      (e?: unknown) => { err = e; },
    );
  } finally {
    (Order as any).findOne = origFind; (PaymentProof as any).create = origCreate; (PaymentProof as any).deleteOne = origDelete;
  }
  return { body, err, created, deleted };
}

test('proofUploadBlock refuses paid and cancelled orders but allows rejected ones', () => {
  assert.ok(proofUploadBlock({ paymentStatus: 'paid', orderStatus: 'new' }));
  assert.ok(proofUploadBlock({ paymentStatus: 'pending', orderStatus: 'cancelled' }));
  assert.equal(proofUploadBlock({ paymentStatus: 'rejected', orderStatus: 'new' }), null);
  assert.equal(proofUploadBlock({ paymentStatus: 'pending', orderStatus: 'new' }), null);
});

test('a new proof is stored in the database and moves the order to review', async () => {
  const order = fakeOrder();
  const { body, err, created } = await run(order);
  assert.equal(err, undefined);
  assert.equal(created.length, 1);
  assert.equal(created[0].data, png);
  assert.equal(order.paymentStatus, 'awaiting_verification');
  assert.equal(order.paymentProof.filePath, undefined, 'nothing is written to local disk');
  assert.equal(body.data.proof.id, '507f1f77bcf86cd799439011');
});

test('re-uploading on a paid order is refused and changes nothing', async () => {
  const order = fakeOrder({ paymentStatus: 'paid' });
  const { err, created } = await run(order);
  assert.ok(err);
  assert.equal((err as any).statusCode ?? (err as any).status, 409);
  assert.equal(created.length, 0);
  assert.equal(order.paymentStatus, 'paid');
  assert.equal(order.saved, 0);
});

test('re-uploading on a cancelled order is refused', async () => {
  const order = fakeOrder({ orderStatus: 'cancelled' });
  const { err, created } = await run(order);
  assert.ok(err);
  assert.equal(created.length, 0);
});

test('replacing a rejected proof returns to review and deletes the old file record', async () => {
  const order = fakeOrder({ paymentStatus: 'rejected', paymentProof: { proofId: 'old1' } });
  const { err, deleted } = await run(order);
  assert.equal(err, undefined);
  assert.equal(order.paymentStatus, 'awaiting_verification');
  assert.deepEqual(deleted, [{ _id: 'old1' }]);
});

test('admin proof view streams the stored image with safe headers', async () => {
  const origO = Order.findById; const origP = PaymentProof.findById;
  (Order as any).findById = () => ({ select: async () => ({ orderNumber: 'RB-1', paymentProof: { proofId: 'p1' } }) });
  (PaymentProof as any).findById = () => ({ select: async () => ({ mime: 'image/png', data: png }) });
  const headers: Record<string, string> = {}; let sent: unknown; let err: unknown;
  try {
    await viewPaymentProof({ params: { id: '507f1f77bcf86cd799439011' } } as any,
      { set(h: Record<string, string>) { Object.assign(headers, h); }, send(b: unknown) { sent = b; } } as any,
      (e?: unknown) => { err = e; });
  } finally { (Order as any).findById = origO; (PaymentProof as any).findById = origP; }
  assert.equal(err, undefined);
  assert.equal(sent, png);
  assert.equal(headers['Content-Type'], 'image/png');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});

test('admin proof view returns 404 when the order has no proof', async () => {
  const origO = Order.findById;
  (Order as any).findById = () => ({ select: async () => ({ orderNumber: 'RB-1' }) });
  let err: any;
  try {
    await viewPaymentProof({ params: { id: '507f1f77bcf86cd799439011' } } as any, {} as any, (e?: unknown) => { err = e; });
  } finally { (Order as any).findById = origO; }
  assert.equal(err?.statusCode ?? err?.status, 404);
});

test('admin order list reports proof availability without storage ids', async () => {
  const origFind = Order.find;
  (Order as any).find = () => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [
    { orderNumber: 'A', paymentProof: { proofId: 'secret', transferReference: 'T', uploadedAt: new Date(0) } },
    { orderNumber: 'B' },
  ] }) }) }) });
  let out: any;
  try { await listOrders({ query: {} } as any, { json(b: unknown) { out = b; } } as any); } finally { (Order as any).find = origFind; }
  assert.equal(out.data[0].paymentProof.available, true);
  assert.ok(!JSON.stringify(out).includes('secret'));
  assert.equal(out.data[1].paymentProof, undefined);
});

test('enabling InstaPay without an identifier is rejected by settings validation', () => {
  const shape = (adminSettingsSchema as any).shape.instapay;
  const base = { accountName: '', instructions: { ar: '', en: '' } };
  assert.equal(shape.safeParse({ ...base, enabled: true, identifier: '  ' }).success, false);
  assert.equal(shape.safeParse({ ...base, enabled: true, identifier: 'x@instapay' }).success, true);
  assert.equal(shape.safeParse({ ...base, enabled: false, identifier: '' }).success, true);
});
