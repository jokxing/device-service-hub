const {
  withAppBuildGradle,
  withAndroidManifest,
} = require("expo/config-plugins");

module.exports = function withLocalAndroidTest(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest["uses-permission"] = (manifest["uses-permission"] ?? []).filter(
      (permission) =>
        permission.$["android:name"] !==
        "android.permission.SYSTEM_ALERT_WINDOW",
    );
    return mod;
  });
  return withAppBuildGradle(config, (mod) => {
    const marker =
      "// Local APK test signing (credentials stay in process environment)";
    if (!mod.modResults.contents.includes(marker))
      mod.modResults.contents += `
${marker}
android {
  signingConfigs {
    localTest {
      storeFile file(System.getenv('DSH_APK_KEYSTORE'))
      storePassword System.getenv('DSH_APK_KEY_PASSWORD')
      keyAlias 'device-service-hub-test'
      keyPassword System.getenv('DSH_APK_KEY_PASSWORD')
    }
  }
  buildTypes.release.signingConfig = signingConfigs.localTest
}
`;
    return mod;
  });
};
