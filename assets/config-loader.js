/* Human-editable application catalog — parses data/applications.js into
 * window.PROTON_APPLICATIONS (the list assets/html-loader.js fetches at
 * boot). Same block format as the reference catalog parser: one
 * [application] block per app, `key=value` lines, `#`/`//` comment lines
 * ignored. Validation problems are collected in
 * window.PROTON_CATALOG_WARNINGS and echoed to the console. */
'use strict';
(function () {
  const warnings = [];

  function parse(text, names) {
    const records = [];
    let item;
    String(text || '').split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) return;
      const header = /^\[([^\]]+)\]$/.exec(line);
      if (header) {
        item = names.includes(header[1].toLowerCase()) ? { block: header[1].toLowerCase() } : null;
        if (item) records.push(item);
        return;
      }
      const at = line.indexOf('=');
      if (item && at > 0) item[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    });
    return records;
  }

  const ids = new Set();
  window.PROTON_APPLICATIONS = parse(window.PROTON_APPLICATIONS_TEXT, ['application', 'app']).filter((item) => {
    if (!item.id || !item.name || !item.path) {
      warnings.push(`Application ${item.id || '(unnamed)'} needs id, name, and path.`);
      return false;
    }
    if (ids.has(item.id)) {
      warnings.push(`Duplicate application id: ${item.id}. Only the first entry is used.`);
      return false;
    }
    if (String(item.enabled).toLowerCase() === 'false') return false; // hidden without deleting the block
    /* Defaults keep a block minimal — id, name and path are enough. */
    item.icon = item.icon || 'grid';
    item.cat = item.cat || 'Other';
    item.desc = item.desc || '';
    item.w = parseInt(item.w, 10) || 880;
    item.h = parseInt(item.h, 10) || 600;
    ids.add(item.id);
    return true;
  });

  window.PROTON_CATALOG_WARNINGS = warnings;
  if (warnings.length) console.warn('Application catalog needs attention: ' + warnings.join(' '));
})();
