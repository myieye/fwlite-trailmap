const svg = (body: string) =>
  `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

export const icons = {
  planned: svg('<rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke-dasharray="2.4 2"/>'),
  building: svg('<path d="M3 13.5h10M5 13.5V6.5l3-3 3 3v7M5 9h6"/><path d="M3 6.5h10" stroke-dasharray="1.6 1.4"/>'),
  beta: svg('<path d="M2 8h12"/><path d="M8 8 5.2 12.5M8 8l2.8 4.5"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/>'),
  open: svg('<path d="m3.5 8.4 2.9 2.9 6.1-6.6"/>'),
  broken: svg('<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M8 2.5 6.6 6.4l2.6 1.8-1.6 5.3"/>'),
  fire: `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8.4 1c.3 2.4 3.9 3.9 3.9 8a4.3 4.3 0 0 1-8.6 0c0-2 1.1-3.3 2-4 .1 1.3.7 2.2 1.5 2.5C6.8 5.3 7.3 2.8 8.4 1Z"/></svg>`,
  working: svg('<path d="m6.2 6.6-4 4a1.4 1.4 0 0 0 2 2l4-4"/><path d="m7 3.6 1.6-1.6 5.4 5.4-1.6 1.6-1.4-1.4-1.2 1.2-2.6-2.6 1.2-1.2z"/>'),
}

export const uiIcons = {
  items: svg('<path d="M5.5 4.5h8M5.5 8h8M5.5 11.5h8"/><circle cx="2.8" cy="4.5" r=".6" fill="currentColor"/><circle cx="2.8" cy="8" r=".6" fill="currentColor"/><circle cx="2.8" cy="11.5" r=".6" fill="currentColor"/>'),
  fit: svg('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
  list: svg('<path d="M5.5 4.5h8M5.5 8h8M5.5 11.5h8M2.5 4.5h.01M2.5 8h.01M2.5 11.5h.01"/>'),
  map: svg('<path d="m2 4 4-1.5 4 1.5 4-1.5v9.5L10 13.5 6 12l-4 1.5z"/><path d="M6 2.5V12M10 4v9.5"/>'),
  external: svg('<path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v4h-9.5V4h4"/>'),
}
