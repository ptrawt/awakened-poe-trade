# How this works

There are 2 main parts of the app:

1. renderer: this is the HTML/Javascript-based UI rendered within the Electron container. This runs Vue.js, a React-like Javascript framework for rendering front-end.
2. main: includes the main app (written in Electron). Handles keyboard shortcuts, brings up the UI and overlays.

Note that these 2 both depend on each other, and one cannot run without the other.

# How to develop

The most up-to-date instructions can always be derived from CI:

[.github/workflows/main.yml](https://github.com/SnosMe/awakened-poe-trade/blob/master/.github/workflows/main.yml)

Here's what that looks like as of 2026-08-01.

```shell
cd renderer
npm ci
npm run dev

# In a second shell
cd main
npm ci
npm run dev
```

# How to build

## Windows releases for the nm fork

The Windows NSIS installer checks GitHub Releases in `ptrawt/awakened-poe-trade`
for updates. The Portable build supports manual updates.

For a release, update the version in `main/package.json` and its lockfile, commit
on the `nm` branch, and push that commit to the fork. From the repository root
on Windows, run the following after building the renderer and main process:

```powershell
Set-Location main
npm run package -- --win nsis --x64 --publish never
```

Create the matching `v<version>` GitHub release from that commit and upload
the installer, its `.blockmap`, and `latest.yml` from the same build. Publish
the release after the three files are uploaded.

```shell
cd renderer
npm ci
npm run build

cd ../main
npm ci
npm run build
# We want to sign with a distribution certificate to ensure other users can
# install without errors
CSC_NAME="Certificate name in Keychain" npm run package
```
