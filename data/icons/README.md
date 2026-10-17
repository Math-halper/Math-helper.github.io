# Default app icons

Put repository-wide default raster icons in this folder, then refer to them
from a `[application]` block in `data/applications.js` with a site-relative
path and `svg-icon=false`:

```ini
icon=data/icons/my-app.png
svg-icon=false
```

`icon=` accepts PNG, JPG/JPEG, WebP, GIF, BMP, or AVIF files under this
folder. Keep filenames simple (letters, numbers, dots, `_` and `-`). The
catalog path is shared by all users; a user's uploaded icon in Customize
continues to override it for that account only.

For one of proton's built-in inline SVG icons, use its name and set the flag
to true:

```ini
icon=globe
svg-icon=true
```

After adding, changing, or removing icon files, run
`python3 tools/gen-fs-manifest.py` so the virtual filesystem stays in sync.
