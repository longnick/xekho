package com.xekho.pos.ui

import java.io.File

data class NativeUiServerSmokeReport(
    val isServerSideOnly: Boolean,
    val requiresApkInstall: Boolean,
    val requiresAndroidEmulator: Boolean,
    val requiredMarkers: List<String>,
    val missingMarkers: List<String>,
    val forbiddenMarkers: List<String>,
    val foundForbiddenMarkers: List<String>,
    val summaryLines: List<String>,
    val canExecuteReads: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

class NativeUiServerSmokeHarness(
    private val projectRoot: File = discoverProjectRoot()
) {
    fun evaluate(): NativeUiServerSmokeReport {
        val sourceText = listOf(
            "app/src/main/java/com/xekho/pos/AppBrand.kt",
            "app/src/main/java/com/xekho/pos/ui/AppRoot.kt",
            "app/src/main/java/com/xekho/pos/domain/GuardedFirestoreReadOnlyApprovalChecklist.kt"
        ).joinToString("\n") { relativePath ->
            projectRoot.resolve(relativePath).readText()
        }.let { raw -> raw + "\n" + decodeUnicodeEscapes(raw) }
        val required = listOf(
            "Xe Kho POS",
            "PIN demo",
            "POS local multi-table flow",
            "Thanh toán nháp local",
            "Offline queue nháp local",
            "Firestore UI mapping Sprint 21",
            "Firestore approval checklist Sprint 22",
            "Auth readiness",
            "Tài chính hôm nay",
            "POS dry-run",
            "Kho cần nhập",
            "Không service account",
            "No Firestore instance, no query/get/listener, no production rows, no writes."
        )
        val forbidden = listOf(
            "Firestore write enabled",
            "Auto sync enabled",
            "production write enabled",
            "FirebaseFirestore.getInstance()",
            ".get().await()"
        )
        val missing = required.filterNot { sourceText.contains(it) }
        val foundForbidden = forbidden.filter { sourceText.contains(it) }
        return NativeUiServerSmokeReport(
            isServerSideOnly = true,
            requiresApkInstall = false,
            requiresAndroidEmulator = false,
            requiredMarkers = required,
            missingMarkers = missing,
            forbiddenMarkers = forbidden,
            foundForbiddenMarkers = foundForbidden,
            summaryLines = listOf(
                "Sprint 23 server-side native UI smoke harness: source-level smoke only.",
                "Runs on this server with no emulator and no APK install.",
                "Covers login/PIN, core native tabs/cards, Settings, Inventory, Finance, and Firestore checklist copy markers.",
                "Guards no Firestore execution, no production rows, no writes, and no sync."
            ),
            canExecuteReads = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private fun decodeUnicodeEscapes(value: String): String = Regex("\\\\u([0-9a-fA-F]{4})").replace(value) { match ->
        match.groupValues[1].toInt(16).toChar().toString()
    }

    companion object {
        private fun discoverProjectRoot(): File {
            var current: File? = File(System.getProperty("user.dir") ?: ".").absoluteFile
            while (current != null) {
                if (current.name == "android-native" && current.resolve("app/src/main/java/com/xekho/pos/ui/AppRoot.kt").exists()) {
                    return current
                }
                current = current.parentFile
            }
            return File(".").absoluteFile
        }
    }
}
