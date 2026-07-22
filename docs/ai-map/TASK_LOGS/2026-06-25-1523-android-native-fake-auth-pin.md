# 2026-06-25 15:23 +07 - Android native fake Auth/PIN Sprint 3

## Scope

Add native Auth/PIN shell using fake/local-only state before exposing the fake POS tabs.

Still blocked/deferred:

- No Firebase Auth SDK
- No Firestore read/write
- No service account or `.env`
- No production POS/customer/payment data
- No real staff credential validation

## Implementation

- Added `com.xekho.pos.auth`:
  - `AuthStage`
  - `AuthSession`
  - `FakeAuthRepository`
- Added fake PIN gate:
  - initial session is locked
  - demo PIN `1234` unlocks local POS tabs
  - wrong PIN remains locked and shows error
  - `Khóa` action returns to locked state
- Updated `AppRoot`:
  - locked state shows `AuthGateScreen`
  - unlocked state shows existing fake dashboard tabs
  - auth state uses `rememberSaveable` with custom `Saver` so basic lock/unlock state survives Compose recreation/config changes
- Kept all auth and data local-only.

## TDD evidence

RED:

```text
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
FAILED: Unresolved reference 'FakeAuthRepository', 'AuthStage'
```

GREEN:

```text
./gradlew :app:testDebugUnitTest --no-daemon
BUILD SUCCESSFUL
```

Kilo review initially flagged config-change state loss with plain `remember`; fixed by switching auth session to `rememberSaveable(stateSaver = authSessionSaver)` and re-ran tests/build.

## Verification

Android native:

```text
./gradlew :app:testDebugUnitTest --no-daemon  # BUILD SUCCESSFUL
./gradlew :app:assembleDebug --no-daemon      # BUILD SUCCESSFUL
```

APK:

```text
android-native/app/build/outputs/apk/debug/app-debug.apk
size: 9.1M
sha256: 564f1a4cf569e070937f0c84fd3be1887f9b43e5a8a88f63963f5ed76fe3a53a
```

APK filename secret scan:

```text
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -Ei 'env|serviceAccount|firebase-adminsdk|secret|credential|functions'
# no matches
```

Legacy web regression:

```text
npm run check               # pass
npm test -- --runInBand     # 2 suites, 12 tests pass
npm run build:hosting       # pass, dist prepared
```

Kilo re-review:

```text
Kilo hermes-9router/ag/gemini-3-flash reviewed Android Sprint 3 changes read-only.
Result: compile pass, no Firebase/POS data safety blockers; remaining future work is replacing fake/local auth with Firebase Auth in a later approved sprint.
```

## Next sprint

Sprint 4 should add Firebase/Auth planning or Firebase read-only preparation, but still avoid Firestore writes. Recommended safe next slice: Firebase config guard + auth interface abstraction + fake-vs-real repository boundary tests before adding real Firebase SDK/config.
