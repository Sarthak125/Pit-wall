const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');
(async () => {
  // Generated from a local copy of the live site's manifest and icons (this machine's Node cannot reach the site directly).
  const m = await TwaManifest.fromWebManifest('http://localhost:8765/Pit-wall/manifest.webmanifest');
  const SITE = 'https://sarthak125.github.io/Pit-wall/';
  m.host = 'sarthak125.github.io';
  m.fullScopeUrl = new URL(SITE);
  m.packageId = 'io.github.sarthak125.pitwall';
  m.launcherName = 'Pit Wall';
  m.name = 'Pit Wall: F1 Dashboard';
  m.signingKey = { path: '../pitwall-release.keystore', alias: 'pitwall' };
  m.appVersionName = '1.0.0';
  m.appVersionCode = 1;
  m.enableNotifications = true;
  m.fallbackType = 'customtabs';
  m.minSdkVersion = 24;
  m.themeColorDark = m.themeColor;
  m.navigationColor = m.navigationColorDark = m.backgroundColor;
  m.navigationDividerColor = m.navigationDividerColorDark = m.backgroundColor;
  console.log(JSON.stringify(m.toJson(), null, 1));
  await new TwaGenerator().createTwaProject(process.argv[2], m, new ConsoleLog('gen'));
  // Saved with the real addresses.
  m.webManifestUrl = new URL(SITE + 'manifest.webmanifest');
  m.iconUrl = SITE + 'icons/icon-512.png';
  m.maskableIconUrl = SITE + 'icons/icon-maskable-512.png';
  await m.saveToFile(process.argv[2] + '/twa-manifest.json');
  console.log('generated');
})().catch((e) => { console.error(e); process.exit(1); });
