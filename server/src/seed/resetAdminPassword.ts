import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../config/db.js';
import { Admin } from '../models/Admin.js';

const credentialsSchema = z.object({
  ADMIN_EMAIL: z.email().max(254),
  ADMIN_PASSWORD: z.string().min(12).max(72),
});

async function main() {
  const credentials = credentialsSchema.safeParse(process.env);
  if (!credentials.success) {
    throw new Error('Set ADMIN_EMAIL and a 12-72 character ADMIN_PASSWORD before running reset-admin-password.');
  }

  await connectDb();
  const email = credentials.data.ADMIN_EMAIL.trim().toLowerCase();
  const admin = await Admin.findOneAndUpdate(
    { email },
    {
      $set: { passwordHash: await bcrypt.hash(credentials.data.ADMIN_PASSWORD, 12) },
      // Password resets invalidate signed browser sessions immediately.
      $inc: { authVersion: 1 },
    },
    { new: true, select: '_id' },
  );
  if (!admin) {
    throw new Error(`No admin account exists for ${email}; refusing to create one.`);
  }

  console.log(`Admin password reset for ${email}.`);
}

main()
  .catch((error: unknown) => {
    console.error('Admin password reset failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
