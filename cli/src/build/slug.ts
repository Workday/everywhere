// NOTE: This implementation is duplicated in src/build/index.ts (the
// deprecated @workday/everywhere/build shim). Keep both in sync until that
// shim is removed.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
