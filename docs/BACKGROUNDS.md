# ZuzuOS Backgrounds

Backgrounds are registered in `assets/backgrounds/manifest.json` and shown in the Wallpaper Library. Open the library by clicking **Wallpapers** on the right of the desktop, or by pressing **Alt+W**.

## Folders

- `photos/`: JPG, PNG, WebP and SVG still images.
- `motion/`: assets and examples for CSS/SVG/canvas motion themes.
- `videos/`: actual muted MP4 or WebM loops, added by maintainers.
- `manifest.json`: list of choices and paths.

The default wallpaper is **Signal**, an in-browser CSS animation. It starts without a media download and can be changed in the library. Other built-in motion themes are Tide, Ember, and Void.

## Add a still wallpaper

1. Put the file in `assets/backgrounds/photos/`.
2. Add a record to `manifest.json`:

```json
{
  "id": "photo-my-wallpaper",
  "name": "My Wallpaper",
  "type": "photo",
  "category": "photo",
  "source": "/assets/backgrounds/photos/my-wallpaper.webp"
}
```

## Add a video

1. Upload a real short, seamless, muted `.webm` or `.mp4` clip to `assets/backgrounds/videos/`.
2. Use an existing photo as the poster (optional).
3. Add a record to the manifest:

```json
{
  "id": "video-neon-loop",
  "name": "Neon Loop",
  "type": "video",
  "category": "video",
  "source": "/assets/backgrounds/videos/neon-loop.webm",
  "poster": "/assets/backgrounds/photos/neon-poster.webp"
}
```

Only register files that exist. A video record without a committed media file will not play. Use 720p–1080p compressed loops for reasonable loading times. The video autoplays muted when permitted, and pauses when the tab is hidden. Reduced-motion users are not forced to play video.

## Add a new motion preset

Add a `type: "motion"` record with a unique ID to the manifest and define its corresponding CSS variant in `src/styles/experience/wallpapers.css`. An SVG in `motion/` can also serve as artwork, but the default motion engine is CSS-based for performance.

## Saved choices

The selected ID is saved in local storage under `zuzu:background:selected:v2`. This is per browser/device, not cloud synced. The legacy Settings wallpaper selector remains supported and maps to the new library's still images.
