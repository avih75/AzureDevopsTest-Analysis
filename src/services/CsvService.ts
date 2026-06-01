export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows || !rows.length) return;
  const sep = ",";
  const keys = Object.keys(rows[0]);
  const content =
    keys.join(sep) +
    "\n" +
    rows
      .map((row: Record<string, unknown>) =>
        keys
          .map((k) => {
            let cell = row[k] == null ? "" : row[k];
            cell =
              cell instanceof Date
                ? cell.toLocaleString()
                : String(cell).replace(/"/g, '""');
            if (/[",\n]/.test(cell as string)) cell = `"${cell}"`;
            return cell;
          })
          .join(sep)
      )
      .join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
