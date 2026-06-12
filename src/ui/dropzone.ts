function extractFile(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  const direct = dt.files && dt.files[0];
  if (direct && direct.type.startsWith('image/')) return direct;
  if (dt.items) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.type.startsWith('image/')) return file;
      }
    }
  }
  return null;
}

export function initDropzone(onFile: (file: File) => void): void {
  const overlay = document.createElement('div');
  overlay.id = 'drop-overlay';
  overlay.textContent = 'drop image';
  document.body.appendChild(overlay);

  // dragenter/dragleave fire on every child element; a depth counter keeps
  // the overlay stable instead of flickering.
  let depth = 0;
  const sync = () => overlay.classList.toggle('visible', depth > 0);

  document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    depth++;
    sync();
  });
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    sync();
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    depth = 0;
    sync();
    const file = extractFile(e.dataTransfer);
    if (file) onFile(file);
  });
  document.addEventListener('paste', (e) => {
    const file = extractFile(e.clipboardData);
    if (file) onFile(file);
  });
}
