# proton built-in websites — one site per folder

Every built-in website is a **single HTML file in its own folder**:
`websites/<site-name>/site.html`. Each file is a real, standalone HTML page:
normal HTML markup in the body and a plain `<script>` at the bottom for
interactivity.

Websites use the **same catalog system as the apps**. The list of sites —
name, location (path), icon and description — lives in **one catalog file**:
[`data/websites.js`](../data/websites.js), one `[website]` block per site
(exactly like the `[application]` blocks in `data/applications.js`). At boot
proton's config loader (`assets/config-loader.js`) parses that catalog and
the HTML loader (`assets/html-loader.js`) registers every entry; the Browser
loads the page itself in a frame when it is visited. The site automatically
appears:

- on the **Browser home page** (`proton://home`),
- in the Browser's **“Built-in websites…”** menu,
- at its own address, e.g. `proton://test-page`.

(Websites saved on an account before adding was disabled are different —
those live in account data and can still be opened or removed in App
Center (`apps/app-center/`) and on the Browser home page. Users can no
longer add websites;
typing an address in the Browser visits it without saving it.)

## Add your own site (developer workflow)

1. Copy the `websites/_template/` folder and rename it, e.g. `websites/my-site/`.
2. Edit `websites/my-site/site.html`.
3. Add ONE `[website]` block to `data/websites.js` (copy the template in
   that file's header): `id`, `name`, `path=websites/my-site/site.html`,
   `icon` (a name from `assets/icons.js` such as `globe`, `book` or
   `flask`) and `desc`. Block order = home page order.

Write the page as ordinary HTML. From its `<script>`, the desktop is
reachable (same browser tab) as `window.parent.__protonSiteCtx`:
`.openApp('calculator')` opens an app, `.showSite('guide')` visits another
built-in site, `.showHome()` returns to Browser home, and
`.loadExternal(url)` embeds a real web page. Pages share proton's look via
`<link rel="stylesheet" href="../../assets/styles.css">`.

## Remove a site

- **Temporarily:** set `enabled=false` in its `[website]` block in
  `data/websites.js`.
- **Permanently:** delete its block from `data/websites.js` (and
  optionally the folder).

## The sites

| Folder | Site (address) |
| --- | --- |
| `guide/` | Guide (`proton://guide`) |
| `world-history/` | World History (`proton://world-history`) |
| `maths-resources/` | Maths Resources (`proton://maths-resources`) |
| `test-page/` | Test Page (`proton://test-page`) |
| `proton-daily/` | proton Daily, sample test newspaper (`proton://proton-daily`) |
| `logic-sim/` | Digital Logic Sim — web edition (`proton://logic-sim`); also the source of the Logic Sim app |
