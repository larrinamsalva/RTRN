# Roads to Recognition Network — RTRN Studio

A browser-based control room for recognition tributes, podcasts and comedy. This initial import preserves the existing original studio artwork, four cozy lounges, scene selection, photo frames, music library, audience cues, camera controls and local recording tools.

## Status

- The imported source includes the mobile navigation repair and recording shortcuts under the preview.
- The automated browser smoke test checks mobile navigation and desktop workspaces. Real Android camera/microphone access, audio capture, complete recording and remote two-device calling need manual verification.
- The existing hosted guest-call test is separate; remote guest video is not automatically integrated into this studio's recording.
- The studio is not itself a public livestreaming service.

## Privacy and storage

Uploads, scripts, and recordings are stored locally in the browser. Back up the library before changing browsers, devices or site addresses; local data does not automatically transfer. Do not commit personal photos, recordings, or credentials. The public repository contains the studio software and bundled artwork/audio, not the user's media library.

## Development and release

Serve the repository over HTTPS (or localhost for development). Run `npm install --no-save --no-package-lock playwright@1.56.1`, `npx playwright install chromium`, then `node tests/studio-smoke.mjs`. Release only after automated checks and the relevant real-device tests. Keep the source and existing design assets intact.

The root `index.html` is a self-contained static site, suitable for GitHub Pages or an equivalent HTTPS host. The website address is not confirmed until a deployment is ready.
