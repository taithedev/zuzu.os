# Changelog

## Studio Shell / Build 02 · 2026-10-15

- Reorganized root scripts and styles into `src/scripts/` and `src/styles/` by responsibility.
- Removed duplicate design overrides and legacy root-level wallpaper scripts.
- Rebuilt the home desktop as a dark, screenshot-inspired workspace with an original ZuzuOS emblem.
- Replaced inconsistent taskbar glyphs with a single reusable SVG icon set.
- Removed desktop shortcut creation; retained Start, the real app launcher and taskbar buttons.
- Added a central wallpaper registry and a working background picker for motion/still/video types.
- Kept existing account flows, settings, app windows and Supabase integration intact.
- Updated old wallpaper references to the canonical `assets/backgrounds/photos/` directory.
- Fixed invalid literal `\\n` sequences in the stylesheet/script links in `index.html`.
- Replaced legacy GitHub Pages deployment workflow with zero-dependency CI checks.
- Added architecture, wallpaper and validation documentation.

The background video directory is intentionally empty until actual media files are contributed.
