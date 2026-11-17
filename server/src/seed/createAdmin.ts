import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../config/db.js';
import { Admin } from '../models/Admin.js';

const credentialsSchema = z.object({
  ADMIN_EMAIL: z.email().max(254),
  ADMIN_USERNAME: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,79}$/),
  ADMIN_NAME: z.string().trim().min(2).max(80),
  ADMIN_PASSWORD: z.string().min(12).max(72),
});

async function main() {
  const credentials = credentialsSchema.safeParse(process.env);
  if (!credentials.success) {
    throw new Error('Set ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_NAME, and a 12-72 character ADMIN_PASSWORD before running create-admin.');
  }

  await connectDb();
  const email = credentials.data.ADMIN_EMAIL.trim().toLowerCase();
  const username = credentials.data.ADMIN_USERNAME;
  if (await Admin.exists({ $or: [{ email }, { username }] })) {
    throw new Error('An admin account with this email or username already exists; refusing to overwrite it.');
  }

  await Admin.create({
    email,
    username,
    name: credentials.data.ADMIN_NAME,
    passwordHash: await bcrypt.hash(credentials.data.ADMIN_PASSWORD, 12),
  });
  console.log(`Admin account created for ${email}.`);
}

main()
  .catch((error: unknown) => {
    console.error('Admin creation failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
