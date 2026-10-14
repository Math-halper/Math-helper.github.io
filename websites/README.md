# proton built-in websites — one site per folder

Every built-in website is a **single file in its own folder**:
`websites/<site-name>/site.js`. Each file calls
`registerSite({ id, name, icon, desc, render(main, ctx) })` and the site
automatically appears:

- on the **Browser home page** (`proton://home`),
- in the Browser's **“Built-in websites…”** menu,
- at its own address, e.g. `proton://test-page`.

(The websites *users* save at runtime are different — those live in their
account data and are managed by `apps/websites/` and `apps/app-center/`.)

## Add your own site

1. Copy the `websites/_template/` folder and rename it, e.g. `websites/my-site/`.
2. Edit `websites/my-site/site.js`.
3. Add one line to `index.html` with the other website scripts:
   `<script src="websites/my-site/site.js"></script>`

In `render(main, ctx)`: set `main.innerHTML` for your page, then wire up
buttons. `ctx.openApp('math')` opens an app, `ctx.showSite('guide')`
visits another built-in site, `ctx.showHome()` returns to Browser home,
`ctx.loadExternal(url)` embeds a real web page.

## Remove a site

Delete its `<script>` line from `index.html` (and optionally the folder).

## The sites

| Folder | Site (address) |
| --- | --- |
| `guide/` | Guide (`proton://guide`) |
| `world-history/` | World History (`proton://world-history`) |
| `maths-resources/` | Maths Resources (`proton://maths-resources`) |
| `test-page/` | Test Page (`proton://test-page`) |
| `proton-daily/` | proton Daily, sample test newspaper (`proton://proton-daily`) |
