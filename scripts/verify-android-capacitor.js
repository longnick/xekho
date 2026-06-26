const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

// 1. Check package.json contains Capgo
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(
  packageJson.dependencies && packageJson.dependencies['@capgo/capacitor-updater'],
  'package.json must contain @capgo/capacitor-updater in dependencies'
);

// 2. Check capacitor.config.ts contains CapacitorUpdater plugins with autoUpdate: false
const capConfig = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
assert(
  capConfig.includes('CapacitorUpdater') && capConfig.includes('autoUpdate: false'),
  'capacitor.config.ts must configure CapacitorUpdater with autoUpdate: false'
);

// 3. Check ic_launcher_background color resource is set to #7A2B18
const bgXml = fs.readFileSync(
  path.join(root, 'android/app/src/main/res/values/ic_launcher_background.xml'),
  'utf8'
);
assert(
  bgXml.includes('#7A2B18'),
  'ic_launcher_background.xml color must be set to #7A2B18'
);

// 4. Check ic_launcher_foreground contains brand vector assets
const fgXml = fs.readFileSync(
  path.join(root, 'android/app/src/main/res/drawable/ic_launcher_foreground.xml'),
  'utf8'
);
assert(
  fgXml.includes('#FFD34D') && fgXml.includes('#FF7A18') && fgXml.includes('#FFF4D2'),
  'ic_launcher_foreground.xml must contain the brand palette color codes (#FFD34D, #FF7A18, #FFF4D2)'
);

// 5. Check no secrets are in config files
const configFiles = [
  path.join(root, 'capacitor.config.ts'),
  path.join(root, 'android/app/src/main/assets/capacitor.config.json'),
];
for (const file of configFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const secretKeywords = ['secret', 'token', 'apikey', 'credential'];
    for (const kw of secretKeywords) {
      assert(
        !content.toLowerCase().includes(kw + '=' ) && !content.toLowerCase().includes('"' + kw + '" :'),
        `File ${file} seems to contain a secret-like keyword: ${kw}`
      );
    }
  }
}

// 6. Check recursive asset exclusion in build-hosting-dist.js
const buildScript = fs.readFileSync(path.join(root, 'scripts/build-hosting-dist.js'), 'utf8');
assert(
  buildScript.includes("'android'") && buildScript.includes("'android-native'"),
  'scripts/build-hosting-dist.js must exclude android and android-native directories from public hosting build'
);


// 7. Check OTA bundle script and package command are present
assert(
  packageJson.scripts && packageJson.scripts['cap:ota:bundle'] === 'npm run build:hosting && python3 scripts/build-capacitor-ota-bundle.py',
  'package.json must expose cap:ota:bundle to build a manual OTA zip from dist/'
);
const otaScript = fs.readFileSync(path.join(root, 'scripts/build-capacitor-ota-bundle.py'), 'utf8');
assert(
  otaScript.includes('xekho-capacitor-ota-') && otaScript.includes('ZipFile') && otaScript.includes('sha256'),
  'build-capacitor-ota-bundle.py must create a zip and sha256 manifest'
);
assert(
  otaScript.includes("FORBIDDEN_PARTS = {'android', 'android-native', 'functions', 'node_modules', '.git'}"),
  'OTA bundle script must exclude generated/native/backend directories'
);

console.log('verify-android-capacitor ok');
