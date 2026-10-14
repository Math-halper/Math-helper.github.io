# proton built-in websites — one site per folder

Every built-in website is a **single HTML file in its own folder**:
`websites/<site-name>/site.html`. Each file is a real, standalone HTML page:
a `<script type="application/json" data-proton-site>` metadata block in the
`<head>` (id, name, icon, desc), normal HTML markup in the body, and a plain
`<script>` at the bottom for interactivity. proton's HTML loader
(`assets/html-loader.js`) reads the metadata at boot, and the Browser loads
the page itself in a frame. The site automatically appears:

- on the **Browser home page** (`proton://home`),
- in the Browser's **“Built-in websites…”** menu,
- at its own address, e.g. `proton://test-page`.

(Websites saved on an account before adding was disabled are different —
those live in account data and can still be opened or removed in
`apps/websites/` and `apps/app-center/`. Users can no longer add websites;
typing an address in the Browser visits it without saving it.)

## Add your own site (developer workflow)

1. Copy the `websites/_template/` folder and rename it, e.g. `websites/my-site/`.
2. Edit `websites/my-site/site.html`.
3. Add one line to `index.html` with the other website links:
   `<link rel="proton-site" href="websites/my-site/site.html">`

Write the page as ordinary HTML. From its `<script>`, the desktop is
reachable (same browser tab) as `window.parent.__protonSiteCtx`:
`.openApp('math')` opens an app, `.showSite('guide')` visits another
built-in site, `.showHome()` returns to Browser home, and
`.loadExternal(url)` embeds a real web page. Pages share proton's look via
`<link rel="stylesheet" href="../../assets/styles.css">`.

## Remove a site

Delete its `<link rel="proton-site">` line from `index.html` (and optionally the folder).

## The sites

| Folder | Site (address) |
| --- | --- |
| `guide/` | Guide (`proton://guide`) |
| `world-history/` | World History (`proton://world-history`) |
| `maths-resources/` | Maths Resources (`proton://maths-resources`) |
| `test-page/` | Test Page (`proton://test-page`) |
| `proton-daily/` | proton Daily, sample test newspaper (`proton://proton-daily`) |
