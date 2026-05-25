/**
 * Return a unique, alphabetically-sorted list, dropping falsy entries.
 * Used to build filter dropdown option lists from raw expense fields.
 */
export function unique(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort()
}
