/** A CSV cell, quoted and escaped only when it contains a comma, quote, or newline. */
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows of raw values joined into a CSV body, each cell escaped. */
export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
