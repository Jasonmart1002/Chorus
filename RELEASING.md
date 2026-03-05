# Releasing Chorus

This project publishes open-source desktop builds through GitHub Actions.

## Before Tagging

1. Update version numbers if needed:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
2. Run the verification suite:

```bash
npm ci
npm run build
cd src-tauri && cargo fmt --check
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
cd src-tauri && cargo test
```

3. Produce a local release build on macOS when possible:

```bash
npm run tauri build
```

4. Sanity-check the generated artifacts in `src-tauri/target/release/bundle/`.

## Publishing

1. Commit the release changes.
2. Create and push a version tag:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

3. GitHub Actions runs `.github/workflows/release.yml` and creates a draft release.
4. Wait for all matrix builds to finish:
   - macOS Apple Silicon
   - macOS Intel
   - Windows x64
   - Linux x64
5. Review the draft release:
   - confirm the expected assets are attached
   - confirm the release notes still match the shipped behavior
   - mention CLI prerequisites if the draft text needs adjustment
   - mention that builds are unsigned if that is still true
6. Publish the draft release.

## Release Notes Checklist

- State that Chorus requires the local Claude Code CLI:
  - `@anthropic-ai/claude-code`
- Call out any Claude-specific limitations or regressions.
- Note any platform-specific limitations or regressions.

## Current Release Model

- Builds are open-source release artifacts.
- macOS and Windows binaries are currently unsigned.
- GitHub Releases is the source of truth for public downloads.
