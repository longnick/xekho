# Xe Kho Native Android

Native Android shell for the XE KHO POS migration.

Current scope:

- Kotlin + Jetpack Compose skeleton
- Debug APK build only
- No Firebase, no POS writes, no production data access

Build:

```bash
cd android-native
./gradlew :app:testDebugUnitTest
./gradlew :app:assembleDebug
```

Debug APK:

```text
app/build/outputs/apk/debug/app-debug.apk
```
