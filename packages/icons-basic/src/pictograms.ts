/** Original 24-unit outlines share a stroke weight and rounded joins. */
export const pictograms: Record<string, string> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  timer: '<circle cx="12" cy="14" r="7"/><path d="M9 2h6M12 2v5m5 2 2-2M12 10v4l2 2"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3v4c0 3 10 7 10 10v4M17 3v4c0 3-10 7-10 10v4M9 18h6"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h2m3 0h2m3 0h1M7 18h2m3 0h2"/>',
  'calendar-check':
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M8 15l3 3 5-6"/>',
  history: '<path d="M4 8a9 9 0 1 1-1 7M3 3v6h6M12 7v5l4 2"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M9 8v8m6-8v8"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
  message:
    '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M7 9h10m-10 4h7"/>',
  question:
    '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M10 8a2 2 0 0 1 4 0c0 2-2 2-2 4m0 3v.01"/>',
  reply:
    '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z m6 4-3 3 3 3m-3-3h8"/>',
  conversation:
    '<path d="M4 3h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3v-3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z m16 5h1a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2v3l-4-3h-5a2 2 0 0 1-2-2v-1"/>',
  notification:
    '<path d="M15 4H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2v4l5-4h9a2 2 0 0 0 2-2v-6M7 9h6m-6 4h9"/><circle cx="19" cy="4" r="3"/>',
  bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3a2 2 0 0 0 4 0M12 2v2"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  'user-check': '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 12-5m1 3 2 2 5-5"/>',
  document: '<path d="M5 3h9l5 5v13H5Zm9 0v5h5M8 12h8m-8 4h6"/>',
  documents: '<path d="M7 2h9l5 5v12H7Zm9 0v5h5M3 6v16h14M10 11h8m-8 4h6"/>',
  'file-text': '<path d="M5 3h14v18H5ZM8 7h8M8 11h8m-8 4h8m-8 3h5"/>',
  'file-code': '<path d="M5 3h9l5 5v13H5Zm9 0v5h5m-9 4-3 3 3 3m4-6 3 3-3 3"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10H3Z"/>',
  'folder-open': '<path d="M3 11V6a2 2 0 0 1 2-2h5l2 3h7v4M3 20l-1-8h20l-3 8Z"/>',
  clipboard:
    '<rect x="5" y="5" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1"/><path d="M9 12h6m-6 4h6"/>',
  'clipboard-check':
    '<rect x="5" y="5" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1"/><path d="m8 15 3 3 5-6"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  filter: '<path d="M3 4h18l-7 8v7l-4 2v-9Z"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
  table:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 9v12m6-12v12"/>',
  bookmark: '<path d="M6 3h12v19l-6-4-6 4Z"/>',
  tag: '<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7" cy="7" r="1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
  start: '<circle cx="14" cy="12" r="8"/><path d="M2 12h12m-4-4 4 4-4 4"/>',
  stop: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9Z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  cancel: '<circle cx="12" cy="12" r="9"/><path d="m8 8 8 8m0-8-8 8"/>',
  branch: '<path d="M12 21v-8M12 13 5 6m7 7 7-7M5 6h5M5 6v5m14-5h-5m5 0v5"/>',
  merge: '<path d="M5 21V10a3 3 0 0 1 3-3h11m0 0-4-4m4 4-4 4M19 21v-5a3 3 0 0 0-3-3H9"/>',
  repeat: '<path d="M3 10V6h16m-3-3 3 3-3 3M21 14v4H5m3-3-3 3 3 3"/>',
  refresh: '<path d="M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5m-4 7a8 8 0 0 0 14 4l3-3m0 5v-5h-5"/>',
  shield: '<path d="m12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5Z m-4 9 3 3 5-6"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3m-5 5v3"/>',
  key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-4-4 3-3m-6 0 3-3"/>',
  warning: '<path d="m12 2 10 19H2Zm0 6v6m0 3v.01"/>',
  error: '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8Zm0 6 8 8m0-8-8 8"/>',
  retry: '<path d="M4 8a8 8 0 1 1-1 8M3 3v6h6"/>',
  backup: '<path d="M5 8V4h14v4M3 8h18v13H3Zm5 5 4-3 4 3m-4-3v7"/>',
  health:
    '<path d="M20 4c-3-3-6-1-8 2-2-3-5-5-8-2-5 5 3 12 8 17 5-5 13-12 8-17Z M3 12h5l2-4 4 8 2-4h5"/>',
  database:
    '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  storage: '<path d="m4 4-2 11v5h20v-5L20 4Zm-2 11h20M6 18h.01m4 0h.01"/>',
  upload: '<path d="M12 16V2m-5 5 5-5 5 5M3 14v7h18v-7"/>',
  download: '<path d="M12 2v14m-5-5 5 5 5-5M3 14v7h18v-7"/>',
  archive: '<path d="M3 3h18v5H3Zm2 5v13h14V8M9 12h6"/>',
  queue:
    '<rect x="2" y="8" width="5" height="9" rx="1"/><rect x="9" y="8" width="5" height="9" rx="1"/><path d="M17 12h5m-3-3 3 3-3 3M4 4h10"/>',
  stream:
    '<path d="M2 5h6m-6 7h6m-6 7h6m3-17v20m3-17h8m-3-3 3 3-3 3m-5 4h8m-3-3 3 3-3 3m-5 4h8m-3-3 3 3-3 3"/>',
  sync: '<path d="M7 21V3m-4 4 4-4 4 4m6-4v18m-4-4 4 4 4-4"/>',
  server:
    '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01m4 0h6M7 17.5h.01m4 0h6"/>',
  cloud: '<path d="M6 19a5 5 0 0 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 0 12Z"/>',
  network:
    '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>',
  api: '<rect x="7" y="5" width="10" height="14" rx="2"/><path d="M2 9h5m-3-3-3 3 3 3M17 15h5m-3-3 3 3-3 3M10 9h4m-4 3h4m-4 3h4"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16"/>',
  settings:
    '<path d="M3 6h18M3 12h18M3 18h18"/><rect x="6" y="3" width="4" height="6" rx="1"/><rect x="14" y="9" width="4" height="6" rx="1"/><rect x="8" y="15" width="4" height="6" rx="1"/>',
  terminal: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/>',
  package: '<path d="m12 2 10 5v10l-10 5-10-5V7Zm-10 5 10 5 10-5M12 12v10M7 4.5l10 5v4"/>',
}
