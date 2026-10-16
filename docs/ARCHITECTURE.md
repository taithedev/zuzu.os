# Architecture

## Entry point

`index.html` keeps the stable DOM IDs that the original ZuzuOS app and setup flow expect. Styles load in four groups: foundational, shell, app-specific, and Studio experience. JavaScript loads in the original dependency order using `defer`.

The original scripts are classic browser scripts (not ES modules). Do not add `type="module"` to them or reorder them without checking cross-script hooks.

## Application state

- `src/scripts/core/app.js`: Supabase auth, onboarding, settings, notes and built-in applications.
- `src/scripts/core/os-shell.js`: window manager, Start launcher and browser-local virtual file system.
- `src/scripts/core/os-desktop.js`: context menus, system controls and desktop interactions.
- `src/scripts/core/os-immersive.js`: legacy layout choices and supplementary dock apps.
- `src/scripts/features/`: add-on apps, browser, chat/connect, developer tools and cloud sync.
- `src/scripts/experience/studio-shell.js`: visible desktop UI, real app/dock controls and system labels.
- `src/scripts/experience/background-library.js`: the wallpaper manifest, renderer and chooser.

The Studio shell does not reimplement auth, window movement, stored files or Supabase tables. It reuses those systems and avoids fragile duplicate event registration.

## Styles

Legacy component styles were moved, not deleted. `src/styles/experience/studio.css` defines the visible UI (dock, panels, menus, windows, auth and setup); `wallpapers.css` owns wallpaper visuals; `controls.css` finishes small controls and state overrides. Keep future visual changes here rather than stacking new global root-level stylesheets.

## Background registry

The registry is `assets/backgrounds/manifest.json`. The wallpaper engine only accepts paths under `/assets/backgrounds/{photos,videos,motion}/`. A video must have a real media file committed in `videos/` before it is registered. There are no bundled video files in this release.

## Boundaries

This is a browser desktop, not an OS kernel. Files managed by the virtual file system stay in local browser storage. Cloud-backed features depend on Supabase and its access policies. Video autoplay is muted and subject to browser policies. Reduced-motion preferences disable CSS animation and prevent autoplay of video wallpaper.

## Validation and deployment

Run `npm run check` at the repository root. The GitHub Actions workflow runs the same check on pushes and pull requests. Vercel builds from the production branch of the existing `zuzu.os` project; the user-facing hostname is `https://zuzuos.lol/`.
