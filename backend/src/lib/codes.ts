// Human-friendly monospace codes derived from sort order / rank.
// e.g. CAT-01, FT-011, RC-005 — purely presentational, computed on read.

export function categoryCode(sortOrder: number): string {
  return `CAT-${String(sortOrder).padStart(2, '0')}`;
}

export function failureTypeCode(categorySortOrder: number, sortOrder: number): string {
  return `FT-${String(categorySortOrder).padStart(2, '0')}${String(sortOrder).padStart(1, '0')}`;
}

export function rootCauseCode(rank: number): string {
  return `RC-${String(rank).padStart(3, '0')}`;
}
