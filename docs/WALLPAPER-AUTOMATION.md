# Automatic wallpaper discovery

Add still images to `assets/backgrounds/photos/`: PNG, JPG, JPEG, GIF, WebP, or SVG.
Add animated videos to `assets/backgrounds/videos/`: MOV, MP4, or WebM.

**GitHub workflow**: `.github/workflows/wallpapers.yml` runs `node scripts/generate-wallpapers.mjs` after those folders change, then commits an updated `manifest.json`. If GitHub Actions lacks permission to push, run the script locally and commit the manifest yourself.

The wallpaper library reads `manifest.json` when opened. GIF files animate automatically as images. MOV playback depends on the browser and codec; MP4 (H.264) is the most broadly supported format. Do not expect every iPhone MOV / Live Photo video to play in every browser.

**Personal wallpapers:** Signed-in users can upload PNG, JPG, JPEG, GIF, WebP, MOV, MP4 or WebM files (max 50 MB) from the wallpaper library. Files go into the separate, private `zuzu-wallpapers` Supabase Storage bucket, under each user's UID, with restricted select/insert/delete policies. Their own files get temporary signed URLs for playback. This does not grant access to other users' uploads or Discord bot tables. The video portion of an iPhone Live Photo can be uploaded; HEIC still images are not currently supported.

The existing `bot_*` tables belong to the Discord bot, not ZuzuOS. They have deliberately not been dropped. A separate database project would be the next step for complete separation.
