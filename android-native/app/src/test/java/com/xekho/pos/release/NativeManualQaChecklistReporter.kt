package com.xekho.pos.release

data class NativeManualQaChecklist(
    val sprint: String,
    val installSteps: List<String>,
    val smokeChecks: List<String>,
    val blockedItems: List<String>,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false,
    val canExecuteFirestoreReads: Boolean = false
)

class NativeManualQaChecklistReporter {
    fun buildChecklist(): NativeManualQaChecklist = NativeManualQaChecklist(
        sprint = "Sprint 26",
        installSteps = listOf(
            "Run `cd /home/longnick/projects/xekho/android-native && ./gradlew :app:assembleDebug --no-daemon` before sharing a new build.",
            "Run `cd /home/longnick/projects/xekho/android-native && scripts/native-apk-report.sh` to refresh checksum, scan, and delivery report.",
            "Telegram delivery line: MEDIA:/home/longnick/projects/xekho/android-native/app/build/outputs/apk/debug/app-debug.apk",
            "On Android test device, Enable Install unknown apps only for the trusted app used to open the APK, then disable it after install if desired.",
            "Install/open the debug APK and unlock with Demo PIN: 1234."
        ),
        smokeChecks = listOf(
            "PIN demo: wrong PIN stays locked; Demo PIN: 1234 unlocks local fake tabs.",
            "Bàn tab: POS local multi-table flow renders local-only tables/cart/payment/queue cards.",
            "Kho tab: Kho cần nhập card renders without fetching Firebase/Firestore menu data.",
            "Tài chính tab: Tài chính hôm nay and POS dry-run cards render fake/local-only totals.",
            "Cài đặt tab: Auth readiness and safety copy show fake/local and no service account state.",
            "Firestore UI mapping Sprint 21 card still shows sampleRowCount = 0.",
            "Firestore approval checklist Sprint 22 card remains blocked/approval-held and not executable."
        ),
        blockedItems = listOf(
            "No google-services.json is required or packaged for this debug APK.",
            "No service account or .env is required for manual QA.",
            "No production POS data should be read, sampled, returned, written, or synced.",
            "No FirebaseFirestore.getInstance(), get(), listener, background sync, or production write is approved in Sprint 26.",
            "Release signing remains blocked and is not required for this debug/manual QA artifact."
        ),
        canWriteToProduction = false,
        canSyncToFirestore = false,
        canExecuteFirestoreReads = false
    )
}
