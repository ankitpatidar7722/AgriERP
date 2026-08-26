/**
 * Excel helpers for bulk import. SheetJS (xlsx) is loaded lazily so it stays out
 * of every other route's bundle. The sample is headers-only on purpose — an
 * example data row would otherwise import as a real (junk) record.
 */

/** Download a .xlsx whose only row is the header row the importer expects. */
export async function downloadSampleXlsx(filename: string, columns: string[]): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([columns]);
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(14, c.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

/** Parse the first sheet of an uploaded file into rows keyed by the header text. */
export async function parseSheet(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const first = wb.SheetNames[0];
  const sheet = first ? wb.Sheets[first] : undefined;
  if (!sheet) return [];
  // defval "" so blank cells are present as empty strings; keys come from row 1.
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}
