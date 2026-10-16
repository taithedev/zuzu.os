# ZuzuOS

A browser desktop built around a custom dark shell, real app windows, a launcher, and a local wallpaper library.

**Production:** https://zuzuos.lol/  
**Source:** https://github.com/taithedev/zuzu.os

## Project structure

```text
index.html                       Main document; keeps stable UI IDs for the app
src/
  scripts/
    core/                        Auth, desktop lifecycle, window manager, icons
    features/                    Browser, community, sync, motion controls
    experience/                  Studio desktop and unified wallpaper library
  styles/
    base/                        Foundation and existing component primitives
    shell/                       Window, tray and desktop support styles
    apps/                        Styles for individual applications
    themes/                      Original theme and layout compatibility
    experience/                  One coherent shell design + wallpaper picker
assets/
  backgrounds/
    photos/                      Still wallpapers (SVG, JPG, PNG, WebP)
    motion/                      Animated SVG and motion theme assets
    videos/                      Future looping MP4/WebM files
    manifest.json                Registered built-in wallpapers
  graphics/                      Original ZuzuOS hero artwork
  icons/                         Unified UI icon sprite
supabase/                        Database migrations and account edge functions
docs/                            Project and wallpaper documentation
tests/                           Zero-dependency static checks
```

## Development

This is a static HTML/CSS/JavaScript project. No bundler is required.

1. Clone the repository.
2. Serve its root with any static HTTP server, e.g. `python3 -m http.server 3000`.
3. Open `http://localhost:3000`.
4. Run `npm run check` for a static integrity and JavaScript syntax check.

Auth and online account features need the existing Supabase configuration and a reachable Supabase instance. The core app is not a replacement for an actual operating system.

## Desktop behavior

Arcade includes two original offline games: 2048 and Memory, available from the Start menu and dock.

The Studio shell does not show desktop shortcuts. Apps launch from Start and the bottom dock. The top-left ZuzuOS label opens the account menu. The right rail includes quick access to recent apps, music, wallpaper choices and Settings. Use **Alt+W** to open the wallpaper library; use **Ctrl/Cmd+K** for the existing Start search.

Built-in motion wallpapers are CSS animated, not large background videos. They respect reduced-motion settings. Photo and video choices are listed in `assets/backgrounds/manifest.json`; see [wallpaper documentation](docs/BACKGROUNDS.md).

## Working on the code

The older application logic remains intentionally compatible to avoid breaking account sessions, Supabase queries, notes, files or app windows. It is now grouped by responsibility under `src/` instead of at the repository root. The final visual layer is owned by `src/styles/experience/`; avoid adding competing root-level overrides.

GitHub runs validation on push. The production site is deployed through the existing Vercel project named `zuzu.os`, with the public domain `zuzuos.lol`.

See [architecture](docs/ARCHITECTURE.md) and [release notes](CHANGELOG.md).
