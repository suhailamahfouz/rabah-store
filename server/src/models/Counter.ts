import { Schema, model, InferSchemaType } from 'mongoose';

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

export type CounterDoc = InferSchemaType<typeof counterSchema>;
export const Counter = model('Counter', counterSchema);

/** Atomic, gap-tolerant sequence used for human-readable order numbers. */
export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return doc!.seq;
}
