import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { CUSTOMER_COOKIE_NAME, CustomerRequest, optionalCustomer } from './auth.js';

async function applyOptionalCustomer(token?: string): Promise<CustomerRequest> {
  const req = {
    cookies: token ? { [CUSTOMER_COOKIE_NAME]: token } : {},
  } as CustomerRequest;

  await new Promise<void>((resolve, reject) => {
    const next: NextFunction = (error?: unknown) => error ? reject(error) : resolve();
    optionalCustomer(req, {} as Response, next);
  });

  return req;
}

test('optionalCustomer attaches customerId from a valid HS256 customer cookie', async () => {
  const token = jwt.sign({ sub: 'customer-123', role: 'customer' }, env.JWT_SECRET, {
    algorithm: 'HS256', issuer: 'rabah-api', audience: 'rabah-customer',
  });
  const req = await applyOptionalCustomer(token);
  assert.equal(req.customerId, 'customer-123');
});

test('optionalCustomer continues as a guest for missing, invalid, or wrong-role cookies', async () => {
  const invalidSignature = jwt.sign({ sub: 'customer-123', role: 'customer' }, 'a different signing secret that is at least 32 chars', {
    algorithm: 'HS256', issuer: 'rabah-api', audience: 'rabah-customer',
  });
  const adminRole = jwt.sign({ sub: 'admin-123', role: 'admin' }, env.JWT_SECRET, {
    algorithm: 'HS256', issuer: 'rabah-api', audience: 'rabah-customer',
  });

  for (const token of [undefined, invalidSignature, adminRole]) {
    const req = await applyOptionalCustomer(token);
    assert.equal(req.customerId, undefined);
  }
});

test('optionalCustomer rejects tokens signed with another JWT algorithm', async () => {
  const token = jwt.sign({ sub: 'customer-123', role: 'customer' }, env.JWT_SECRET, {
    algorithm: 'HS384', issuer: 'rabah-api', audience: 'rabah-customer',
  });
  const req = await applyOptionalCustomer(token);
  assert.equal(req.customerId, undefined);
});
