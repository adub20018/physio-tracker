// Minimal CSV builder with correct quoting (commas, quotes, newlines).
// Kept dependency-free — this is 20 lines, not a library.

// Escapes one cell per RFC 4180: wrap in quotes when needed, double quotes.
function escapeCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Builds CSV text from a header row and data rows.
export function toCsv(
  header: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(","));
  return lines.join("\r\n") + "\r\n";
}
