## Optional ZuzuOS icons

Place PNG images in `assets/icons/apps/` or `assets/icons/windows icon/` and register only the files you actually uploaded in `assets/icons/icon-manifest.json`.

Example after adding the files:

```json
{
  "version": 1,
  "windows": { "start": "/assets/icons/windows%20icon/start.png" },
  "apps": { "files": "/assets/icons/apps/files.png", "browser": "/assets/icons/apps/browser.png" }
}
```

Omit missing icons from the manifest; ZuzuOS uses existing SVG icons without requesting non-existent PNGs. Only paths under `/assets/icons/` are allowed. The manifest is loaded when the desktop starts.
