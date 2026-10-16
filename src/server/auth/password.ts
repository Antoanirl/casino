import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with scrypt (built into Node, memory-hard, no native modules to compile).
 * Stored format: scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 * Keeping the parameters in the string means they can be raised later without
 * breaking existing accounts.
 */

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
// scrypt needs about 128 * N * r bytes (32 MB here); allow headroom over Node's 32 MB default.
const MAX_MEMORY = 64 * 1024 * 1024;

function scryptAsync(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEMORY });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nText, rText, pText, saltText, hashText] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (![n, r, p].every(Number.isSafeInteger)) return false;

  const salt = Buffer.from(saltText, "base64");
  const expected = Buffer.from(hashText, "base64");
  if (expected.length === 0) return false;

  const actual = await scryptAsync(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: MAX_MEMORY,
  });
  // Constant-time comparison, so response timing doesn't leak how many bytes matched.
  return timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

/**
 * Used when a login names an email that doesn't exist: we still run one full hash,
 * so "unknown email" and "wrong password" take the same time and can't be told apart.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(password, await dummyHash);
  return false;
}
