// Minimal QR Code Model 2 encoder for attendance tokens.
// Fixed at Version 4, error correction level L (80 data + 20 ECC codewords).
// This keeps QR generation local in the browser and avoids sending attendance tokens to third parties.

const VERSION = 4;
const SIZE = 17 + VERSION * 4; // 33
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;
const TOTAL_CODEWORDS = DATA_CODEWORDS + ECC_CODEWORDS;

type Bit = 0 | 1;

function gfMultiply(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function reedSolomonDivisor(degree: number) {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]) {
  const result = new Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  }
  return result;
}

function appendBits(bits: Bit[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i--) bits.push(((value >>> i) & 1) as Bit);
}

function makeCodewords(value: string) {
  const bytes = Array.from(new TextEncoder().encode(value));
  // Version 4-L byte-mode capacity is 78 bytes.
  if (bytes.length > 78) throw new Error("QR attendance token is too long");

  const bits: Bit[] = [];
  appendBits(bits, 0b0100, 4); // Byte mode.
  appendBits(bits, bytes.length, 8); // Character count for versions 1-9.
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminator; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    data.push(byte);
  }
  for (let pad = 0; data.length < DATA_CODEWORDS; pad++) data.push(pad % 2 === 0 ? 0xec : 0x11);

  const ecc = reedSolomonRemainder(data, reedSolomonDivisor(ECC_CODEWORDS));
  return [...data, ...ecc];
}

function getBit(value: number, index: number): Bit {
  return ((value >>> index) & 1) as Bit;
}

export function makeQrMatrix(value: string): boolean[][] {
  const codewords = makeCodewords(value);
  if (codewords.length !== TOTAL_CODEWORDS) throw new Error("Invalid QR codeword count");

  const modules = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false));
  const isFunction = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false));

  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // Timing patterns first; finder/alignment patterns overwrite the overlapping modules.
  for (let i = 0; i < SIZE; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }

  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(cx + dx, cy + dy, distance !== 2 && distance !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(SIZE - 4, 3);
  drawFinder(3, SIZE - 4);

  // Version 4 has alignment centers at 6 and 26. Only (26, 26) is not occupied by a finder.
  const alignmentCenter = 26;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFunction(alignmentCenter + dx, alignmentCenter + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  const drawFormatBits = (mask: number) => {
    // Error correction level L has format bits 01.
    const data = (1 << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
    const bits = ((data << 10) | remainder) ^ 0x5412;

    for (let i = 0; i <= 5; i++) setFunction(8, i, getBit(bits, i) === 1);
    setFunction(8, 7, getBit(bits, 6) === 1);
    setFunction(8, 8, getBit(bits, 7) === 1);
    setFunction(7, 8, getBit(bits, 8) === 1);
    for (let i = 9; i < 15; i++) setFunction(14 - i, 8, getBit(bits, i) === 1);

    for (let i = 0; i < 8; i++) setFunction(SIZE - 1 - i, 8, getBit(bits, i) === 1);
    for (let i = 8; i < 15; i++) setFunction(8, SIZE - 15 + i, getBit(bits, i) === 1);
    setFunction(8, SIZE - 8, true); // Always-dark module.
  };

  // Reserve format modules before placing data. The final mask is 0, so these values are already final.
  drawFormatBits(0);

  const dataBits: Bit[] = [];
  for (const byte of codewords) appendBits(dataBits, byte, 8);

  let bitIndex = 0;
  let right = SIZE - 1;
  while (right >= 1) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vertical = 0; vertical < SIZE; vertical++) {
      const y = upward ? SIZE - 1 - vertical : vertical;
      for (let column = 0; column < 2; column++) {
        const x = right - column;
        if (isFunction[y][x]) continue;
        modules[y][x] = bitIndex < dataBits.length ? dataBits[bitIndex] === 1 : false;
        bitIndex++;
      }
    }
    right -= 2;
  }

  // Apply mask pattern 0 to data modules only.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!isFunction[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
    }
  }

  return modules;
}
