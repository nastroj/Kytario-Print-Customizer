/**
 * Types describing the UNTRUSTED shape of imported songbook payloads
 * (parsed JSON from files, URLs, clipboard, or API responses).
 *
 * Imported data can be arbitrarily shaped, so these types model "some JSON
 * value" rather than a concrete schema. All access to raw payload fields
 * should go through the helpers below (`asRecord`, `rawString`, ...) instead
 * of unchecked casts, so malformed imports fail safely at runtime rather
 * than producing hidden type errors.
 */

/** Any valid JSON value. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * An indexable bag for arbitrary JSON objects read from untrusted input.
 * Property access yields `JsonValue | undefined`; use the narrowing helpers
 * below to get concrete primitives.
 */
export interface RawLike {
  [key: string]: JsonValue;
}

/** A raw song object as it appears in an import payload (schema varies). */
export type RawSongLike = RawLike;

/** A raw songbook container object as it appears in an import payload. */
export type RawSongbookLike = RawLike;

/** A raw Kytario AST section ({ title?, tokens?: unknown[] }). */
export type RawSectionLike = RawLike;

/** A raw Kytario AST token ({ type?: number, content?: JsonValue }). */
export type RawTokenLike = RawLike;

/** True when the value is a non-null, non-array plain object. */
export function isRecord(value: JsonValue | unknown): value is RawLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrows an unknown/JSON value to a `RawLike` record, or returns undefined
 * for null, primitives, and arrays. Replaces scattered `(x as any)` casts.
 */
export function asRecord(value: JsonValue | unknown): RawLike | undefined {
  return isRecord(value) ? (value as RawLike) : undefined;
}

/** Reads a property from a raw record as a string ('' when absent/non-string). */
export function rawString(obj: RawLike | undefined, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : '';
}

/**
 * Reads the first property (from a candidate key list) that is a non-empty
 * string (numbers are stringified). Returns '' when none match. Mirrors the
 * common `a.x || a.y || a.z || ''` pattern on untrusted objects.
 */
export function firstRawString(obj: RawLike | undefined, keys: readonly string[]): string {
  if (!obj) return '';
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.length > 0) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
}

/** Reads a property as a number, or undefined when absent/non-finite. */
export function rawNumber(obj: RawLike | undefined, key: string): number | undefined {
  const v = obj?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** Reads a property coerced to boolean (truthiness), defaulting to false. */
export function rawBoolean(obj: RawLike | undefined, key: string): boolean {
  return !!obj?.[key];
}

/** Reads a value as an array of raw records (skips non-object items). */
export function rawRecordArray(value: JsonValue | unknown): RawLike[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}
