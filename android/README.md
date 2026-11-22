# Pit Wall Android app

A Trusted Web Activity (TWA): a small Android app that opens https://sarthak125.github.io/Pit-wall/ full screen in Chrome, generated
with Google's [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). It has no app code of its own, so site updates reach it without
a new APK. Only changes to the app's name, icon, colours or start address need a new build.

- Package: `io.github.sarthak125.pitwall`, Android 7 (API 24) or newer.
- Download: `public/pit-wall.apk`, served at https://sarthak125.github.io/Pit-wall/pit-wall.apk and linked from the How to use page.
- Signing certificate SHA-256: `77:9B:58:0A:82:C8:89:E6:4C:80:85:34:59:AD:32:13:4C:66:0D:AC:3F:C3:AD:FB:32:8B:D6:98:B2:49:95:3F`

## Full screen without an address bar

Android hides the address bar only when the site proves it owns the app, with `/.well-known/assetlinks.json` at the **root** of the
domain (https://sarthak125.github.io/.well-known/assetlinks.json), not under `/Pit-wall/`. That file lives in the separate
`Sarthak125.github.io` repository (with an empty `.nojekyll` file, so GitHub Pages serves the `.well-known` folder). The files for that repository
(`assetlinks.json`, `.nojekyll`, and a home page that forwards to Pit Wall) are in `site-root/`. Until it is live, the app works but shows a small address bar at the top.

## The signing key

The release key (`pitwall-release.keystore`) and its password are **not** in this repository and must never be committed. Keep both
somewhere safe, such as a password manager. Every future version must be signed with the same key: if it is lost, installed apps cannot
be updated and people have to uninstall and reinstall.

## Building a new version

Needs Node.js, JDK 17 or newer and the Android SDK (platform 36, build-tools 35).

1. Raise `appVersionCode` and `appVersionName` in `project/twa-manifest.json` and `project/app/build.gradle`.
2. In `project/`, create `local.properties` with `sdk.dir=<path to the Android SDK>`, then run `./gradlew assembleRelease`.
3. Align and sign:

```bash
zipalign -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk aligned.apk
```

```bash
apksigner sign --ks pitwall-release.keystore --ks-key-alias pitwall --out pit-wall.apk aligned.apk
```

4. Replace `public/pit-wall.apk`, update the version shown on the How to use page, and push to `main`.

`generate.cjs` recreates `project/` from the site's web manifest with `@bubblewrap/core` (it reads a local copy of the manifest and icons;
see the comments in it). The generated project was changed in two places by hand: Maven Central replaces the retired JCenter mirror in
`build.gradle`, and the minimum Android version is 24, as the current Android Browser Helper library requires.
