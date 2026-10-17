# Changelog

## v0.3.5a — Cinematic desktop and Windows account experience

- Replaced the simulated FPS display with an explicit ZuzuOS version badge; removed frame sampling.
- Rebalanced the Cine-style desktop against the provided reference: clean wallpaper-first canvas, centered weekday, compact glass taskbar and three grouped right-hand widgets.
- Added a Windows-inspired full-screen sign-in design, a local account picker, optional server-verified PIN screen and password confirmation on account creation.
- Added optional desktop icon visibility in Settings and retained Windows/macOS-style launch menu and left/center taskbar options.
- Left existing apps, Supabase tables, and user storage in place. This release does not change other projects' data.

The exact artwork in the reference screenshot is not bundled; it can be selected via the existing Wallpaper Library or added under `assets/backgrounds/`.

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
