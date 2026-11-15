import i18next from 'i18next';

// Keep the source of messages held in UI state so switching language also updates them.
const messages = new Map<string, { source: string; options?: Record<string, unknown> }>();

/** Translate human-readable values at the UI boundary, preserving numbers and React elements. */
export function localize(value: number): string;
export function localize<T>(value: T, options?: Record<string, unknown>): T;
export function localize<T>(value: T, options?: Record<string, unknown>): T | string {
  if (Array.isArray(value)) return value.map(item => localize(item)) as T;
  if (typeof value === 'number') return value.toLocaleString(i18next.language ?? 'fr', { maximumFractionDigits: 20 });
  if (typeof value !== 'string' || !i18next.isInitialized) return value;
  const previous = messages.get(value);
  const source = previous?.source ?? value;
  const interpolation = options ?? previous?.options;
  const values = interpolation && Object.fromEntries(Object.entries(interpolation).map(([key, item]) => [key, localize(item)]));
  const translated = i18next.t(source, { ...values, ns: 'translation', defaultValue: source });
  if (translated !== source) messages.set(translated, { source, options: interpolation });
  return translated as T;
}
