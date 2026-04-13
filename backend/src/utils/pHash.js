/**
 * Perceptual hashing (pHash) for card image matching.
 * Uses DCT-based approach via sharp for image preprocessing.
 *
 * Algorithm:
 *  1. Resize to 32×32 grayscale
 *  2. Compute 32×32 DCT
 *  3. Take top-left 8×8 (lowest frequencies)
 *  4. Threshold against median → 64-bit binary string
 */

import sharp from 'sharp';

const HASH_SIZE = 8;        // final hash grid
const DCT_SIZE = HASH_SIZE * 4; // process on larger grid for accuracy

/**
 * Compute the DCT of a 1D array (naive O(n²) — fine for 32-element rows).
 */
function dct1d(signal) {
  const N = signal.length;
  const result = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += signal[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N));
    }
    result[k] = sum * (k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N));
  }
  return result;
}

/**
 * 2D DCT via separable row/col 1D DCTs.
 */
function dct2d(matrix, size) {
  const temp = Array.from({ length: size }, () => new Float64Array(size));
  const out = Array.from({ length: size }, () => new Float64Array(size));

  // DCT on rows
  for (let r = 0; r < size; r++) {
    const row = dct1d(matrix[r]);
    temp[r] = row;
  }
  // DCT on cols
  for (let c = 0; c < size; c++) {
    const col = new Float64Array(size);
    for (let r = 0; r < size; r++) col[r] = temp[r][c];
    const transformed = dct1d(col);
    for (let r = 0; r < size; r++) out[r][c] = transformed[r];
  }
  return out;
}

/**
 * Compute pHash of an image buffer.
 * Returns a 64-character hex string (representing 256 bits — HASH_SIZE²×4).
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<string>} hex hash
 */
export async function computePhash(imageBuffer) {
  const pixels = await sharp(imageBuffer)
    .resize(DCT_SIZE, DCT_SIZE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  // Build 2D matrix
  const matrix = Array.from({ length: DCT_SIZE }, (_, r) =>
    new Float64Array(DCT_SIZE).map((__, c) => pixels[r * DCT_SIZE + c])
  );

  const dctMatrix = dct2d(matrix, DCT_SIZE);

  // Extract top-left HASH_SIZE×HASH_SIZE block
  const lowFreq = [];
  for (let r = 0; r < HASH_SIZE; r++) {
    for (let c = 0; c < HASH_SIZE; c++) {
      lowFreq.push(dctMatrix[r][c]);
    }
  }

  // Median
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Binary string → pack into hex
  const bits = lowFreq.map(v => (v > median ? 1 : 0));
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }

  return hex;
}

/**
 * Hamming distance between two hex pHash strings.
 * Lower = more similar (0 = identical).
 *
 * @param {string} hashA
 * @param {string} hashB
 * @returns {number}
 */
export function hammingDistance(hashA, hashB) {
  if (hashA.length !== hashB.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < hashA.length; i++) {
    const xor = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    dist += xor.toString(2).split('').filter(b => b === '1').length;
  }
  return dist;
}
