/**
 * Client-only Blob URL download helper. Never touches the network or
 * browser storage — the file exists only for the duration of the download.
 */
export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so the browser has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
