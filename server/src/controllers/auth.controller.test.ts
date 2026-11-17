import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { login, register } from './auth.controller.js';
import { Admin } from '../models/Admin.js';
import { Customer } from '../models/Customer.js';

function responseRecorder() {
  const state: { status?: number; body?: any; cookies: Array<{ name: string; value: string; options: unknown }> } = { cookies: [] };
  const res = {
    status(value: number) { state.status = value; return res; },
    json(value: unknown) { state.body = value; return res; },
    cookie(name: string, value: string, options: unknown) { state.cookies.push({ name, value, options }); return res; },
    clearCookie() { return res; },
  };
  return { res, state };
}

function queryResult<T>(value: T) {
  return { select: async () => value };
}

test('customer registration hashes credentials and establishes an HttpOnly session', async () => {
  const original = { findOne: Customer.findOne, create: Customer.create, adminExists: Admin.exists };
  let created: any;
  (Customer as any).findOne = async () => null;
  (Admin as any).exists = async () => null;
  (Customer as any).create = async (value: unknown) => {
    created = value;
    return { id: 'customer-1', name: 'Rabah Customer', email: 'customer@example.test', phone: undefined };
  };

  try {
    const { res, state } = responseRecorder();
    await register({ body: { name: 'Rabah Customer', identifier: 'customer@example.test', password: 'a-long-password' } } as any, res as any);

    assert.equal(state.status, 201);
    assert.equal(state.body.role, 'customer');
    assert.equal(state.cookies[0].name, 'rabah_customer');
    assert.equal((state.cookies[0].options as { httpOnly: boolean }).httpOnly, true);
    assert.notEqual(created.passwordHash, 'a-long-password');
    assert.equal(await bcrypt.compare('a-long-password', created.passwordHash), true);
  } finally {
    (Customer as any).findOne = original.findOne;
    (Customer as any).create = original.create;
    (Admin as any).exists = original.adminExists;
  }
});

test('duplicate registration and invalid login fail without issuing a session', async () => {
  const original = { customerFind: Customer.findOne, adminFind: Admin.findOne };
  (Customer as any).findOne = () => queryResult({ id: 'existing-customer' });
  (Admin as any).findOne = () => queryResult(null);

  try {
    await assert.rejects(
      () => register({ body: { name: 'Rabah Customer', identifier: 'existing@example.test', password: 'a-long-password' } } as any, responseRecorder().res as any),
      (error: any) => error?.statusCode === 409,
    );

    (Customer as any).findOne = () => queryResult(null);
    const { res, state } = responseRecorder();
    await assert.rejects(
      () => login({ body: { identifier: 'missing@example.test', password: 'a-long-password' } } as any, res as any),
      (error: any) => error?.statusCode === 401,
    );
    assert.equal(state.cookies.length, 0);
  } finally {
    (Customer as any).findOne = original.customerFind;
    (Admin as any).findOne = original.adminFind;
  }
});

test('customer login rejects a wrong password and accepts the correct one', async () => {
  const original = { customerFind: Customer.findOne, adminFind: Admin.findOne };
  const passwordHash = await bcrypt.hash('correct customer password', 12);
  (Admin as any).findOne = () => queryResult(null);
  (Customer as any).findOne = () => queryResult({
    id: 'customer-1', name: 'Rabah Customer', email: 'customer@example.test', phone: undefined, passwordHash,
  });

  try {
    await assert.rejects(
      () => login({ body: { identifier: 'customer@example.test', password: 'wrong password' } } as any, responseRecorder().res as any),
      (error: any) => error?.statusCode === 401,
    );

    const { res, state } = responseRecorder();
    await login({ body: { identifier: 'customer@example.test', password: 'correct customer password' } } as any, res as any);
    assert.equal(state.body.role, 'customer');
    assert.equal(state.cookies.some((cookie) => cookie.name === 'rabah_customer'), true);
  } finally {
    (Customer as any).findOne = original.customerFind;
    (Admin as any).findOne = original.adminFind;
  }
});
