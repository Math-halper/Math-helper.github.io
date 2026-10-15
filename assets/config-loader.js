/* Human-editable catalogs — parses data/applications.js into
 * window.PROTON_APPLICATIONS and data/websites.js into
 * window.PROTON_WEBSITES (the lists assets/html-loader.js uses at boot).
 * Same block format for both: one [application] / [website] block per
 * entry, `key=value` lines; `#` and `//` comment lines and C-style block
 * comments are ignored. Validation problems are collected in
 * window.PROTON_CATALOG_WARNINGS and echoed to the console. */
'use strict';
(function () {
  const warnings = [];

  function parse(text, names) {
    const records = [];
    let item;
    let inComment = false;
    String(text || '').split(/\r?\n/).forEach((raw) => {
      let line = raw.trim();
      /* Skip C-style block comments (the catalogs use them for notes). */
      if (inComment) {
        if (line.includes('*/')) { inComment = false; line = line.slice(line.indexOf('*/') + 2).trim(); }
        else return;
      }
      if (line.startsWith('/*')) {
        if (!line.includes('*/')) { inComment = true; return; }
        line = line.slice(line.indexOf('*/') + 2).trim();
      }
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

  /* Shared validation: id, name and path are required; duplicates and
   * enabled=false entries are dropped; the rest get defaults. */
  function validate(kind, records, defaults) {
    const ids = new Set();
    return records.filter((item) => {
      if (!item.id || !item.name || !item.path) {
        warnings.push(`${kind} ${item.id || '(unnamed)'} needs id, name, and path.`);
        return false;
      }
      if (ids.has(item.id)) {
        warnings.push(`Duplicate ${kind.toLowerCase()} id: ${item.id}. Only the first entry is used.`);
        return false;
      }
      if (String(item.enabled).toLowerCase() === 'false') return false; // hidden without deleting the block
      /* Defaults keep a block minimal — id, name and path are enough. */
      item.icon = item.icon || defaults.icon;
      item.desc = item.desc || '';
      ids.add(item.id);
      return true;
    });
  }

  window.PROTON_APPLICATIONS = validate('Application',
    parse(window.PROTON_APPLICATIONS_TEXT, ['application', 'app']),
    { icon: 'grid' })
    .map((item) => {
      item.cat = item.cat || 'Other';
      item.w = parseInt(item.w, 10) || 880;
      item.h = parseInt(item.h, 10) || 600;
      return item;
    });

  window.PROTON_WEBSITES = validate('Website',
    parse(window.PROTON_WEBSITES_TEXT, ['website', 'site']),
    { icon: 'globe' });

  window.PROTON_CATALOG_WARNINGS = warnings;
  if (warnings.length) console.warn('Catalogs need attention: ' + warnings.join(' '));
})();
