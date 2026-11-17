// Temporary scratch script (NOT part of the repo). Generates a lightweight PNG
// poster for the hero video as a fallback when video playback is unavailable.
// Pure-Node PNG encoder — no external dependencies.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import zlib from 'node:zlib';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const W = 1280;
const H = 720;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
  return Buffer.concat([len, typeB, data, crc]);
}

function lerp(a, b, t) { return a + (b - a) * t; }

function colorAt(x, y) {
  const t = y / H; // 0 top -> 1 bottom
  // Deep burgundy vertical gradient
  let r = lerp(0x3a, 0x6e, Math.min(1, t * 1.4));
  let g = lerp(0x0e, 0x1f, Math.min(1, t * 1.4));
  let b = lerp(0x1c, 0x36, Math.min(1, t * 1.4));
  // Second stop
  const t2 = Math.max(0, (t - 0.45) / 0.55);
  r = lerp(r, 0x1a, t2);
  g = lerp(g, 0x08, t2);
  b = lerp(b, 0x0d, t2);

  // Soft gold horizontal accent band (model/luxury highlight)
  const gy = 0.78;
  const gd = Math.abs(t - gy) / 0.06;
  const gmask = Math.exp(-(gd * gd) * 2.0) * 0.55;
  // gold glow biased to the right (model side)
  const gx = x / W;
  const gspread = 0.5 + gx * 0.5;
  r += (0xc6 - r) * gmask * gspread;
  g += (0xa1 - g) * gmask * gspread;
  b += (0x5b - b) * gmask * gspread;

  // Subtle radial vignette (darker corners)
  const cx = W / 2, cy = H / 2;
  const d = Math.hypot(x - cx, y - cy) / Math.hypot(cx, cy);
  const vig = 1 - Math.pow(Math.min(1, d), 1.6) * 0.45;
  r *= vig; g *= vig; b *= vig;

  return [r | 0, g | 0, b | 0, 255];
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const raw = [];
for (let y = 0; y < H; y++) {
  raw.push(0); // filter: none
  for (let x = 0; x < W; x++) {
    const [r, g, b, a] = colorAt(x, y);
    raw.push(r, g, b, a);
  }
}
const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });

const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
writeFileSync(path.join(HERE, 'client/public/videos/hero-poster.png'), png);
console.log('poster written:', png.length, 'bytes', W + 'x' + H);