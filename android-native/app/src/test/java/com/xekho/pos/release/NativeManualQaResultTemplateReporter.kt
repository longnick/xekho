package com.xekho.pos.release

data class NativeManualQaResultTemplate(
    val sprint: String,
    val resultTemplatePath: String,
    val resultCommand: String,
    val requiredFields: List<String>,
    val passFailSections: List<String>,
    val blockedConfirmations: List<String>,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false,
    val canExecuteFirestoreReads: Boolean = false
)

class NativeManualQaResultTemplateReporter {
    fun buildTemplate(): NativeManualQaResultTemplate = NativeManualQaResultTemplate(
        sprint = "Sprint 27",
        resultTemplatePath = "docs/android-native-manual-qa-result-template.md",
        resultCommand = "scripts/native-qa-result-template.sh",
        requiredFields = listOf(
            "Device",
            "Android version",
            "APK SHA256",
            "Tester",
            "Test date/time",
            "Install source"
        ),
        passFailSections = listOf(
            "Install result: PASS/FAIL",
            "PIN gate: PASS/FAIL",
            "Bàn: PASS/FAIL",
            "Kho: PASS/FAIL",
            "Tài chính: PASS/FAIL",
            "Cài đặt: PASS/FAIL",
            "Firestore cards blocked: PASS/FAIL",
            "Rotate/background foreground: PASS/FAIL"
        ),
        blockedConfirmations = listOf(
            "No google-services.json used or packaged.",
            "No service account used or packaged.",
            "No .env used or packaged.",
            "No production POS data read, sampled, returned, written, or synced.",
            "No Firestore write, sync, background worker, query, listener, or get() approved."
        ),
        canWriteToProduction = false,
        canSyncToFirestore = false,
        canExecuteFirestoreReads = false
    )
}
