import assert from 'node:assert/strict';
import test from 'node:test';
import { Admin } from '../models/Admin.js';
import { Customer } from '../models/Customer.js';
import {
  COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
  requireAdmin,
  requireCustomer,
  signCustomerToken,
  signToken,
} from './auth.js';

async function invoke(middleware: any, req: any): Promise<unknown> {
  return new Promise((resolve) => middleware(req, {}, (error?: unknown) => resolve(error)));
}

test('admin authorization accepts only an active administrator with the current session version', async () => {
  const original = Admin.findById;
  (Admin as any).findById = async () => ({ id: 'admin-1', email: 'admin@example.test', name: 'Admin', role: 'admin', isActive: true, authVersion: 3 });

  try {
    const req: any = { cookies: { [COOKIE_NAME]: signToken('admin-1', 3) } };
    assert.equal(await invoke(requireAdmin, req), undefined);
    assert.deepEqual(req.admin, { id: 'admin-1', email: 'admin@example.test', name: 'Admin', role: 'admin' });

    const stale: any = { cookies: { [COOKIE_NAME]: signToken('admin-1', 2) } };
    assert.equal((await invoke(requireAdmin, stale) as any)?.statusCode, 401);
  } finally {
    (Admin as any).findById = original;
  }
});

test('customer authorization attaches only the authenticated customer and rejects missing sessions', async () => {
  const original = Customer.findById;
  (Customer as any).findById = async (id: string) => id === 'customer-1'
    ? { id, name: 'Customer', email: 'customer@example.test', phone: '01000000000' }
    : null;

  try {
    const req: any = { cookies: { [CUSTOMER_COOKIE_NAME]: signCustomerToken('customer-1') } };
    assert.equal(await invoke(requireCustomer, req), undefined);
    assert.equal(req.customerId, 'customer-1');
    assert.equal(req.customer.role, 'customer');

    assert.equal((await invoke(requireCustomer, { cookies: {} }) as any)?.statusCode, 401);
  } finally {
    (Customer as any).findById = original;
  }
});
