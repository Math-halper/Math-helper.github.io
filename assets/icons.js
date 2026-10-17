/* proton — SVG icon set and safe rendering for per-account image icons.
 * Named vector icons remain the defaults; users can also upload a small
 * raster image for an app icon from Customize. */
'use strict';

const ICON_PATHS = {
  atom: '<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="4.1"/><ellipse cx="12" cy="12" rx="10" ry="4.1" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.1" transform="rotate(120 12 12)"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  'folder-open': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2H8.5L5 19a2 2 0 0 1-2-1.8z"/><path d="M3 9h20"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
  cut: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M7.5 16.5 19 5M16.5 16.5 5 5M12 12l2 2"/>',
  paste: '<rect x="5" y="5" width="14" height="17" rx="2"/><path d="M9 5V3h6v2M8 12h8M8 16h6"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  'file-text': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><path d="M15.5 4.9a3.5 3.5 0 0 1 0 6.2M17.6 15.4c2 .7 3.4 2.3 3.9 4.6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  inbox: '<path d="M4 13 6.5 4h11L20 13v7H4z"/><path d="M4 13h5l1.2 2.5h3.6L15 13h5"/>',
  send: '<path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z"/>',
  edit: '<path d="M17 3.5 20.5 7 9 18.5 4 20l1.5-5z"/><path d="m14.5 6 3.5 3.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11"/><circle cx="12" cy="15.7" r="1.4" fill="currentColor" stroke="none"/>',
  key: '<circle cx="8" cy="15.5" r="4.5"/><path d="M11.3 11.3 20 2.6M17 5.6l3 3M14.2 8.4l2.6 2.6"/>',
  shield: '<path d="M12 3l7 2.8v6.1c0 4.4-2.9 7.4-7 9.1-4.1-1.7-7-4.7-7-9.1V5.8z"/><path d="m9 11.8 2.2 2.2 4-4.2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  sliders: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1"/><circle cx="16" cy="6" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="18" cy="18" r="2.2"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r="1.2" fill="currentColor" stroke="none"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7h7"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15.5" r="1" fill="currentColor" stroke="none"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.5h18M3 15h18M9 4v16M15 4v16"/>',
  presentation: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v2.5M8.5 21 12 18.5 15.5 21"/><path d="M7.5 13v-3M12 13V8M16.5 13V9.5"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-.8-.6-1.4-.6-2.2 0-.9.8-1.6 1.9-1.6H17a4.5 4.5 0 0 0 4.5-4.5C21.4 6.5 17.2 3.5 12 3.5z"/><circle cx="7.8" cy="10.2" r="1.15" fill="currentColor" stroke="none"/><circle cx="11" cy="7.2" r="1.15" fill="currentColor" stroke="none"/><circle cx="15.2" cy="8" r="1.15" fill="currentColor" stroke="none"/>',
  brush: '<path d="M14.5 4.5 19.5 9.5 12 17l-4.5 1L9 13.5z"/><path d="M9 13.5c-2 .5-3.8-.3-5 1-1 1.1-.5 3.5-2 5 2-.8 4.5-.5 5.5-2 .7-1.2.4-2.6 1.5-4z"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9.5 3 3-3 3M12.5 15.5H17"/>',
  compass: '<circle cx="12" cy="12" r="9"/><polygon points="16.2 7.8 13.6 13.6 7.8 16.2 10.4 10.4"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21"/>',
  music: '<path d="M9 18.5V6l11-2.2V16"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8.5z"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10.5 5-3v9l-5-3"/>',
  phone: '<path d="M5 3.8h3.5L10.2 8 8.2 9.4a12.5 12.5 0 0 0 6.4 6.4l1.4-2 4.2 1.7v3.5a2 2 0 0 1-2.1 2A17.5 17.5 0 0 1 3 5.9 2 2 0 0 1 5 3.8z"/>',
  hash: '<path d="M9.5 3.5 7.5 20.5M16.5 3.5l-2 17M20.5 8.5H4M19.5 15.5H3"/>',
  grid3: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>',
  knight: '<path d="M18.5 20.5h-13v-2.3c0-.8.4-1.6 1.1-2.1C5.2 14.6 4.4 12.2 4.9 9.7L3.4 7.4c.9-.3 2-.2 2.9.4C6.9 5.4 9 3.8 11.5 3.6c2.9-.3 5.4 1.9 5.7 4.8.2 3.2-2.2 5.4-4.6 6.6l.7 1.7h5.2z"/><circle cx="10.5" cy="8.5" r="1" fill="currentColor" stroke="none"/>',
  disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.8"/>',
  layers: '<path d="m12 3.5 9 4.7-9 4.7-9-4.7z"/><path d="m3.6 13.2 8.4 4.4 8.4-4.4"/><path d="m3.6 17.4 8.4 4.4 8.4-4.4"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.8" cy="8.8" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.2" cy="8.8" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="8.8" cy="15.2" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.2" cy="15.2" r="1.4" fill="currentColor" stroke="none"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.3 14.3c1 1.3 2.3 2 3.7 2s2.7-.7 3.7-2"/><circle cx="9" cy="9.4" r="1.15" fill="currentColor" stroke="none"/><circle cx="15" cy="9.4" r="1.15" fill="currentColor" stroke="none"/>',
  zap: '<polygon points="13 2.5 4.5 13.8 11 13.8 9.8 21.5 19.5 10 13 10"/>',
  database: '<ellipse cx="12" cy="5.5" rx="8" ry="2.8"/><path d="M4 5.5v13c0 1.6 3.6 2.9 8 2.9s8-1.3 8-2.9v-13"/><path d="M4 12c0 1.6 3.6 2.9 8 2.9s8-1.3 8-2.9"/>',
  book: '<path d="M12 6.2C10 4.7 7.5 4.2 4 4.2v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2z"/><path d="M12 6.2v14"/>',
  landmark: '<path d="M3 9.3 12 4l9 5.3M3.5 9.3h17"/><path d="M5.5 9.5V18M9.8 9.5V18M14.2 9.5V18M18.5 9.5V18"/><path d="M3.5 18h17M2.5 21h19"/>',
  sigma: '<path d="M17.5 5H8.2l5.6 7-5.6 7h9.3"/>',
  flask: '<path d="M10 3h4M10.2 3v5.7L5.4 18a2.3 2.3 0 0 0 2 3.4h9.2a2.3 2.3 0 0 0 2-3.4L13.8 8.7V3"/><path d="M7.6 14.5h8.8"/>',
  newspaper: '<path d="M4 5.5h13V19H4z"/><path d="M17 10h2.5v7.5a2 2 0 0 1-2 2H17"/><path d="M7 9h7M7 12h7M7 15h4.5"/>',
  home: '<path d="m3.5 11 8.5-7.5L20.5 11"/><path d="M5.5 9.5V20h13V9.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.8-4.8"/>',
  pin: '<path d="M9.5 3.8h5l-.8 6.7 2.8 2.8v2.2H7.5v-2.2l2.8-2.8z"/><path d="M12 15.5V21"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  trash: '<path d="M4 6.5h16M9.5 6V3.8h5V6M6.5 6.5 7.4 20h9.2l.9-13.5"/><path d="M10 10.5v6M14 10.5v6"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M4.5 20.5h15"/>',
  upload: '<path d="M12 15V4M7 8l5-5 5 5M4.5 20.5h15"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 3.5V8h-4.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 13.5V20H5V6h6.5"/>',
  save: '<path d="M5.5 3.5h11L21 8v12.5H5.5z"/><path d="M8.5 3.5v4.5h7V3.5M8.5 20.5v-6h7v6"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="m5 18 5-5 3 3 3-3 3.5 3.5"/>',
  monitor: '<rect x="3" y="4.5" width="18" height="12.5" rx="1.8"/><path d="M9 20.5h6M12 17v3.5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  alert: '<path d="M12 4 22 20H2z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r="1.1" fill="currentColor" stroke="none"/>',
  'chevron-left': '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  'chevron-right': '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  play: '<polygon points="8 5 19 12 8 19" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  'skip-back': '<path d="M6 5v14M20 5l-10 7 10 7z"/>',
  'skip-forward': '<path d="M18 5v14M4 5l10 7-10 7z"/>',
  repeat: '<path d="M17 2.5 21 6.5l-4 4"/><path d="M3 12.5v-1a5 5 0 0 1 5-5h13M7 21.5 3 17.5l4-4"/><path d="M21 11.5v1a5 5 0 0 1-5 5H3"/>',
  star: '<polygon points="12 3.2 14.9 9l6.4.9-4.6 4.5 1.1 6.3L12 17.7l-5.8 3 1.1-6.3L2.7 9.9 9.1 9"/>',
  trophy: '<path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 5.5H4.5a3.5 3.5 0 0 0 3.6 3.5M16 5.5h3.5a3.5 3.5 0 0 1-3.6 3.5M12 13.5v3M8 20.5h8M10 16.5h4l.6 4H9.4z"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 16v-5M12 16V8M16 16v-8M20 16V6"/>',
  shuffle: '<path d="M3 7h4.2L17 17h4M21 7h-4l-2.6 2.6M3 17h4.2l2.6-2.6"/><path d="M18.5 4 21 7l-2.5 3M18.5 14 21 17l-2.5 3"/>',
  reply: '<path d="M9 16.5 4 11.5 9 6.5"/><path d="M4.5 11.5H14a6 6 0 0 1 0 12h-2.5"/>',
  square: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  crown: '<path d="M3.5 8.5 8 12l4-6 4 6 4.5-3.5L19.3 18H4.7z"/><path d="M5 21h14"/>',
  'chess-king': '<path d="M12 2.8v4.2M9.8 4.9h4.4"/><path d="M3.8 9.2 8.2 12 12 6.8 15.8 12l4.4-2.8-1.4 9.3H5.2z"/><path d="M5 21.2h14"/>',
  'chess-queen': '<circle cx="4" cy="7.8" r="1.5"/><circle cx="12" cy="5.4" r="1.5"/><circle cx="20" cy="7.8" r="1.5"/><path d="M5 10.5 8.4 12.6 12 8l3.6 4.6L19 10.5l-1.3 8H6.3z"/><path d="M5.2 21.2h13.6"/>',
  'chess-rook': '<path d="M6 3.8h3.7v3h4.6v-3H18v5.4l-1.8 2.6v6.4H7.8v-6.4L6 9.2z"/><path d="M5 21.2h14M8 15h8"/>',
  'chess-bishop': '<path d="M12 3c2.9 3.1 5.2 5.8 5.2 8.6a5.2 5.2 0 0 1-10.4 0C6.8 8.8 9.1 6.1 12 3z"/><path d="m10 9.8 4 4M14 9.8l-4 4" stroke-width="1.4"/><path d="M7 21.2h10M8.6 21.2c.6-2 1.9-3 3.4-3s2.8 1 3.4 3"/>',
  'chess-pawn': '<circle cx="12" cy="7.6" r="3.4"/><path d="M8.6 12.8h6.8l1.3 4.7H7.3z"/><path d="M5.2 21.2h13.6"/>',
  'suit-spade': '<path d="M12 2.8c3.1 4.1 7.2 7 7.2 10.2a4.3 4.3 0 0 1-6.9 3.4c.3 1.9 1.1 3.4 2.4 4.6H9.3c1.3-1.2 2.1-2.7 2.4-4.6a4.3 4.3 0 0 1-6.9-3.4C4.8 9.8 8.9 6.9 12 2.8z" fill="currentColor" stroke="none"/>',
  'suit-heart': '<path d="M12 20.5S3.8 15.6 3.8 9.9A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.2 2.9c0 5.7-8.2 10.6-8.2 10.6z" fill="currentColor" stroke="none"/>',
  'suit-diamond': '<polygon points="12 3 19 12 12 21 5 12" fill="currentColor" stroke="none"/>',
  'suit-club': '<circle cx="12" cy="8" r="4.1" fill="currentColor" stroke="none"/><circle cx="6.9" cy="14" r="4.1" fill="currentColor" stroke="none"/><circle cx="17.1" cy="14" r="4.1" fill="currentColor" stroke="none"/><path d="M12 13.5c.1 3-.8 5.2-2.6 7.2h4.9c-1.7-2-2.5-4.2-2.3-7.2z" fill="currentColor" stroke="none"/>',
};

/* Names offered in the icon pickers (Customize / App Center / Websites). */
const ICON_CHOICES = [
  ['folder', 'Folder'], ['file-text', 'Document'], ['calendar', 'Calendar'], ['users', 'People'],
  ['mail', 'Mail'], ['lock', 'Lock'], ['key', 'Key'], ['shield', 'Shield'], ['globe', 'Globe'],
  ['grid', 'App grid'], ['sliders', 'Sliders'], ['settings', 'Settings gear'], ['info', 'Info'],
  ['calculator', 'Calculator'], ['table', 'Spreadsheet'], ['presentation', 'Presentation'],
  ['palette', 'Palette'], ['brush', 'Brush'], ['terminal', 'Terminal'], ['compass', 'Compass'],
  ['film', 'Film'], ['music', 'Music'], ['message', 'Chat'], ['video', 'Video'], ['phone', 'Phone'],
  ['hash', 'Numbers'], ['grid3', 'Grid'], ['knight', 'Chess knight'], ['disc', 'Disc / counter'],
  ['layers', 'Cards / layers'], ['dice', 'Dice'], ['smile', 'Smile'], ['zap', 'Lightning'],
  ['database', 'Database'], ['book', 'Book'], ['landmark', 'Landmark'], ['sigma', 'Sigma'],
  ['flask', 'Test flask'], ['newspaper', 'Newspaper'], ['home', 'Home'], ['search', 'Search'],
  ['pin', 'Pin'], ['star', 'Star'], ['trophy', 'Trophy'], ['chart', 'Chart'], ['atom', 'Atom'],
  ['image', 'Image'], ['monitor', 'Monitor'], ['moon', 'Moon'], ['clock', 'Clock'], ['user', 'Person'],
];

/* Old accounts may still hold emoji icon values saved before this icon set
 * existed — translate them so no emoji is ever drawn. */
const LEGACY_ICONS = {
  '\u2b50': 'star', '\u2764': 'suit-heart', '\u2764\ufe0f': 'suit-heart', '\u2665': 'suit-heart', '\u2660': 'suit-spade', '\u2666': 'suit-diamond', '\u2663': 'suit-club',
  '\u{1f5c2}': 'folder', '\u{1f5c2}\ufe0f': 'folder', '\u{1f4c1}': 'folder', '\u{1f4dd}': 'file-text',
  '\u{1f4c4}': 'file', '\u{1f4c5}': 'calendar', '\u{1f465}': 'users', '\u{1f464}': 'user',
  '\u2709': 'mail', '\u2709\ufe0f': 'mail', '\u{1f4e5}': 'inbox', '\u{1f4e4}': 'send',
  '\u270e': 'edit', '\u{1f510}': 'lock', '\u{1f512}': 'lock', '\u{1f511}': 'key',
  '\u{1f30d}': 'globe', '\u{1f310}': 'globe', '\u{1f9e9}': 'grid', '\u{1f39b}': 'sliders',
  '\u{1f39b}\ufe0f': 'sliders', '\u2699': 'settings', '\u2699\ufe0f': 'settings', '\u2139': 'info',
  '\u2139\ufe0f': 'info', '\u{1f9ee}': 'calculator', '\u{1f4ca}': 'table', '\u{1f4fd}': 'presentation',
  '\u{1f4fd}\ufe0f': 'presentation', '\u{1f3a8}': 'palette', '\u270f': 'edit', '\u270f\ufe0f': 'edit',
  '\u2328': 'terminal', '\u2328\ufe0f': 'terminal', '\u{1f3ac}': 'film', '\u{1f3b5}': 'music',
  '\u{1f4ac}': 'message', '\u{1f4f9}': 'video', '\u{1f4de}': 'phone', '\u{1f522}': 'hash',
  '\u265e': 'knight', '\u{1f534}': 'disc', '\u26ab': 'disc', '\u26aa': 'disc',
  '\u{1f0cf}': 'layers', '\u{1f3b2}': 'dice', '\u{1f44b}': 'smile', '\u26a1': 'zap',
  '\u{1f4be}': 'database', '\u{1f4d6}': 'book', '\u{1f3db}': 'landmark', '\u{1f3db}\ufe0f': 'landmark',
  '\u03a3': 'sigma', '\u{1f9ea}': 'flask', '\u{1f4f0}': 'newspaper', '\u2302': 'home',
  '\u{1f50e}': 'search', '\u{1f4cc}': 'pin', '\u269b': 'atom', '\u{1f600}': 'user',
  '\u{1f5bc}': 'image', '\u{1f5bc}\ufe0f': 'image', '\u{1f5a5}': 'monitor', '\u{1f5a5}\ufe0f': 'monitor',
  '\u{1f311}': 'moon', '\u{1f550}': 'clock', '\u{1f4d5}': 'file-text', '\u2b07': 'download',
  '\u2b06': 'upload', '\u{1f5d1}': 'trash', '\u21bb': 'refresh', '\u2197': 'external',
  '\u26a0': 'alert', '\u26a0\ufe0f': 'alert', '\u2713': 'check', '\u2715': 'x',
  '\uff0b': 'plus',
};

/* Resolve any stored icon value (icon name, legacy emoji, or empty) to a
 * known icon name. Unknown values fall back so the UI never prints raw
 * emoji or markup from user data. */
function iconNameFrom(value, fallback = 'grid') {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return fallback;
  const clean = raw.replace(/[\uFE0E\uFE0F]/g, '');
  if (ICON_PATHS[clean]) return clean;
  if (LEGACY_ICONS[raw]) return LEGACY_ICONS[raw];
  if (LEGACY_ICONS[clean]) return LEGACY_ICONS[clean];
  return fallback;
}

/* Inline SVG markup for an icon. Size follows the surrounding font-size
 * (1em), so existing layout sizing keeps working; add a class for extras. */
function iconSvg(name, cls = '') {
  const n = ICON_PATHS[name] ? name : 'grid';
  return `<svg class="icn ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[n]}</svg>`;
}

/* Uploaded icons are normalized to tiny raster data URLs before being saved
 * in the account record. Accept only known raster MIME types and base64 so
 * account backups cannot inject markup or remote URLs into the UI. */
const ICON_IMAGE_DATA_MAX = 180_000;
const ICON_IMAGE_DATA_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
function isIconImageData(value) {
  return typeof value === 'string' && value.length <= ICON_IMAGE_DATA_MAX && ICON_IMAGE_DATA_RE.test(value);
}

/* Read, downscale and re-encode a chosen raster image. Keeping a 128px copy
 * makes it sharp in the desktop while avoiding large localStorage backups. */
function iconImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(?:png|jpe?g|webp|gif|bmp|avif)$/i.test(file.type || '')) {
      reject(new Error('Choose a PNG, JPG, WebP, GIF, BMP, or AVIF image.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Choose an image that is 8 MB or smaller.'));
      return;
    }

    let objectUrl;
    try { objectUrl = URL.createObjectURL(file); }
    catch { reject(new Error('This browser could not read that image.')); return; }
    const image = new Image();
    const release = () => { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = ''; };
    image.onerror = () => { release(); reject(new Error('That image could not be decoded.')); };
    image.onload = () => {
      release();
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      if (!sourceWidth || !sourceHeight || sourceWidth * sourceHeight > 32_000_000) {
        reject(new Error('That image has invalid or excessively large dimensions.'));
        return;
      }
      const scale = Math.min(1, 128 / Math.max(sourceWidth, sourceHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      try {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable.');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/webp', 0.86);
        if (!isIconImageData(data)) throw new Error('That image could not be saved as an app icon.');
        resolve(data);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('That image could not be saved as an app icon.'));
      }
    };
    try { image.src = objectUrl; }
    catch { release(); reject(new Error('That image could not be decoded.')); }
  });
}

/* Render an uploaded image or a named/legacy icon. */
function iconFor(value, fallback = 'grid') {
  if (isIconImageData(value)) {
    return `<img class="icn app-icon-image" src="${value}" alt="" aria-hidden="true" draggable="false">`;
  }
  return iconSvg(iconNameFrom(value, fallback));
}

/* <option> list for icon picker <select>s, with `selected` pre-chosen. */
function iconOptions(selected) {
  const cur = iconNameFrom(selected, 'grid');
  const option = (name, label) => `<option value="${name}" ${name === cur ? 'selected' : ''}>${MH.esc(label)}</option>`;
  return ICON_CHOICES.map(([name, label]) => option(name, label)).join('');
}
