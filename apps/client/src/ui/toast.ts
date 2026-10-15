export function showToast(message: string, kind: 'error' | 'info' = 'error'): void {
  const toast = document.createElement('div'); toast.className = `toast ${kind}`; toast.textContent = message;
  document.body.append(toast); window.setTimeout(() => toast.remove(), 3000);
}
