import { AppError } from '@/lib/errors';

/**
 * Small runtime readers for data that crosses a trust boundary (database rows,
 * Edge Function responses). They throw an `AppError` with code `validation`.
 */

export type UnknownRecord = Record<string, unknown>;

export function invalidData(context: string, field?: string): AppError {
  return new AppError(
    'validation',
    `Received unexpected ${context} data from the server.`,
    field ? `${context}.${field}` : context,
  );
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function expectRecord(value: unknown, context: string): UnknownRecord {
  if (!isRecord(value)) throw invalidData(context);
  return value;
}

/** Non-empty string. */
export function readString(record: UnknownRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) throw invalidData(context, key);
  return value;
}

/** String or null; empty strings become null. */
export function readNullableString(
  record: UnknownRecord,
  key: string,
  context: string,
): string | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw invalidData(context, key);
  return value.trim().length > 0 ? value : null;
}

/** String or numeric identifier, returned as a string. */
export function readId(record: UnknownRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return readString(record, key, context);
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  // Postgres `numeric` columns can arrive as strings.
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function readNumber(record: UnknownRecord, key: string, context: string): number {
  const value = toFiniteNumber(record[key]);
  if (value === undefined) throw invalidData(context, key);
  return value;
}

export function readNullableNumber(
  record: UnknownRecord,
  key: string,
  context: string,
): number | null {
  const raw = record[key];
  if (raw === null || raw === undefined) return null;
  const value = toFiniteNumber(raw);
  if (value === undefined) throw invalidData(context, key);
  return value;
}

export function readBoolean(record: UnknownRecord, key: string, context: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') throw invalidData(context, key);
  return value;
}

export function readArray(record: UnknownRecord, key: string, context: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw invalidData(context, key);
  return value;
}
