import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn<T> {
  header: string;
  /** Value for the export cell. Kept separate from the on-screen renderer,
   *  which returns JSX and would serialise as "[object Object]". */
  value: (row: T) => string | number | null | undefined;
  /** Right-align in the PDF; Excel infers alignment from the cell type. */
  numeric?: boolean;
}

/**
 * Exports run on the CLIENT, against the rows already on screen.
 *
 * That means "Export" gives exactly what the user is looking at, including
 * their filters - which is what they expect. It also means it exports the
 * current PAGE, not the whole table. Callers wanting everything should raise
 * pageSize first (the API caps it at 200); a true full-dataset export belongs
 * on the server, where it can stream.
 */
export function exportToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  sheetName = "Sheet1",
): void {
  const body = rows.map((row) => {
    const record: Record<string, string | number> = {};
    for (const column of columns) {
      const value = column.value(row);
      record[column.header] = value ?? "";
    }
    return record;
  });

  const sheet = XLSX.utils.json_to_sheet(body);

  // Width each column to its widest cell, capped so a long description does
  // not push everything else off screen.
  sheet["!cols"] = columns.map((column) => {
    const widest = Math.max(
      column.header.length,
      ...rows.map((row) => String(column.value(row) ?? "").length),
    );
    return { wch: Math.min(Math.max(widest + 2, 10), 45) };
  });

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  XLSX.writeFile(book, `${fileName}-${stamp()}.xlsx`);
}

export function exportToPdf<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  title: string,
  subtitle?: string,
): void {
  // Landscape: these are wide operational tables, and portrait truncates them.
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text(title, 40, 40);

  doc.setFontSize(9);
  doc.setTextColor(120);
  const generated = `Generated ${new Date().toLocaleString("en-IN")}`;
  doc.text(subtitle ? `${subtitle}  ·  ${generated}` : generated, 40, 56);

  autoTable(doc, {
    startY: 70,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) =>
      columns.map((column) => String(column.value(row) ?? "")),
    ),
    styles: { fontSize: 8, cellPadding: 4 },
    // Matches the app's green primary so an exported sheet still looks like it
    // came from this system.
    headStyles: { fillColor: [20, 122, 60], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 248, 246] },
    columnStyles: Object.fromEntries(
      columns.map((column, index) => [
        index,
        { halign: column.numeric ? "right" : "left" },
      ]),
    ),
    margin: { left: 40, right: 40 },
  });

  doc.save(`${fileName}-${stamp()}.pdf`);
}

/**
 * Print uses the browser's own dialog against a print stylesheet, rather than
 * generating a PDF and printing that. It keeps the on-screen layout, costs no
 * extra rendering, and lets the user pick their own paper size.
 */
export function printCurrentView(): void {
  window.print();
}

function stamp(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
}
