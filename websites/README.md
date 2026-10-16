# proton built-in websites — one site per folder

Every built-in website is a **single HTML file in its own folder**:
`websites/<site-name>/site.html`. Each file is a real, standalone HTML page:
normal HTML markup in the body and a plain `<script>` at the bottom for
interactivity.

Websites use the **same catalog system as the apps**. The list of sites — name,
location (path), icon and description — lives in **one catalog file**:
[`data/websites.js`](../data/websites.js), one `[website]` block per site
(exactly like the `[application]` blocks in `data/applications.js`). At boot
proton's config loader (`assets/config-loader.js`) parses that catalog and the
HTML loader (`assets/html-loader.js`) registers every entry; the Browser loads
the page itself in a frame when it is visited. The site automatically appears:

- on the **Browser home page** (`proton://home`),
- in the Browser's **“Built-in websites…”** menu,
- at its own address, e.g. `proton://test-page`.

This build ships its **System apps only**, so the catalog was emptied when the
other apps went; **Test Page** is the one site that ships now. It is the
built-in smoke test for a build: its page runs automated checks (scripts,
shared stylesheet, timers, canvas, `fetch`, storage, and the desktop bridge)
and offers buttons that talk back to proton. Add more sites the same way.

(Websites saved on an account before adding was disabled are different — those
live in account data and can still be opened or removed in App Center
(`apps/app-center/`) and on the Browser home page. Users cannot add websites;
typing an address in the Browser visits it without saving it.)

## Add your own site (developer workflow)

1. Copy the `websites/_template/` folder and rename it, e.g. `websites/my-site/`.
2. Edit `websites/my-site/site.html`.
3. Add ONE `[website]` block to `data/websites.js` (copy the template in that
   file's header): `id`, `name`, `path=websites/my-site/site.html`, `icon` (a
   name from `assets/icons.js` such as `globe`, `book` or `flask`) and `desc`.
   Block order = home page order. Set `enabled=false` to hide a site without
   deleting it.
4. Re-run `python3 tools/gen-fs-manifest.py` so the page appears in the virtual
   file system, then `npm test`.

Write the page as ordinary HTML. From its `<script>`, the desktop is reachable
(same browser tab, same origin) as `window.parent.__protonSiteCtx`:
`.openApp('settings')` opens an app, `.showSite('test-page')` visits another
built-in site, `.showHome()` returns to Browser home, and `.loadExternal(url)`
embeds a real web page. Pages share proton's look via
`<link rel="stylesheet" href="../../assets/styles.css">` — note that
`assets/styles.css` only carries the shell's chrome and the classes the System
apps use, so a page that needs its own layout adds a small `<style>` block, as
Test Page does. Always guard the desktop bridge: the page can also be opened
directly, outside the Browser, where `window.parent` is the page itself.

## Remove a site

- **Temporarily:** set `enabled=false` in its `[website]` block in
  `data/websites.js`.
- **Permanently:** delete its block from `data/websites.js`, delete the folder,
  and refresh `data/fs-manifest.js`. The Browser copes with an empty catalog:
  its home page says there are no built-in sites and its “Built-in websites…”
  menu disappears.

## The sites

| Folder | Site (address) |
| --- | --- |
| `test-page/` | Test Page (`proton://test-page`) — buttons, forms, clock, counter, canvas, storage and automated checks against the Browser |
| `_template/` | not a site — the starting point for a new one |
