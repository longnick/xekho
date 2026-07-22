package com.xekho.pos.release

import java.io.File

data class NativeArtifactReport(
    val applicationId: String,
    val versionCode: Int,
    val versionName: String,
    val apkPath: String,
    val scanPattern: String,
    val deliveryScript: String,
    val reportPath: String,
    val copyableTelegramMarkdown: List<String>,
    val summaryLines: List<String>,
    val isDebugArtifact: Boolean = true,
    val requiresReleaseSigning: Boolean = false,
    val includesServiceAccount: Boolean = false,
    val includesGoogleServicesJson: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

class NativeArtifactReporter(
    private val projectRoot: File = discoverProjectRoot()
) {
    fun buildReport(): NativeArtifactReport {
        val gradleText = projectRoot.resolve("app/build.gradle.kts").readText()
        val applicationId = Regex("applicationId\\s*=\\s*\"([^\"]+)\"").find(gradleText)?.groupValues?.get(1).orEmpty()
        val versionCode = Regex("versionCode\\s*=\\s*(\\d+)").find(gradleText)?.groupValues?.get(1)?.toIntOrNull() ?: 0
        val versionName = Regex("versionName\\s*=\\s*\"([^\"]+)\"").find(gradleText)?.groupValues?.get(1).orEmpty()
        val apkPath = "app/build/outputs/apk/debug/app-debug.apk"
        val reportPath = "app/build/outputs/apk/debug/xekho-native-debug-apk-report.md"
        val deliveryScript = "scripts/native-apk-report.sh"
        val scanPattern = "(^|/)(google-services\\.json|.*\\.env|serviceAccount|firebase-adminsdk|secret|functions-list\\.json)$"
        return NativeArtifactReport(
            applicationId = applicationId,
            versionCode = versionCode,
            versionName = versionName,
            apkPath = apkPath,
            scanPattern = scanPattern,
            deliveryScript = deliveryScript,
            reportPath = reportPath,
            copyableTelegramMarkdown = listOf(
                "## Xe Khô native debug APK",
                "MEDIA:/home/longnick/projects/xekho/android-native/$apkPath",
                "Report: /home/longnick/projects/xekho/android-native/$reportPath",
                "SHA256: run `cd android-native && $deliveryScript` to refresh the checksum."
            ),
            summaryLines = listOf(
                "Sprint 24 Android native artifact report for $applicationId.",
                "Sprint 25 delivery command: cd android-native && $deliveryScript.",
                "Debug APK path: $apkPath.",
                "Markdown report path: $reportPath.",
                "Version: $versionName ($versionCode).",
                "Release signing is not required for this debug artifact; production signing remains a later explicit gate.",
                "No service account, google-services.json, production write, or Firestore sync is included by this report."
            ),
            isDebugArtifact = true,
            requiresReleaseSigning = false,
            includesServiceAccount = false,
            includesGoogleServicesJson = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    companion object {
        private fun discoverProjectRoot(): File {
            var current: File? = File(System.getProperty("user.dir") ?: ".").absoluteFile
            while (current != null) {
                if (current.name == "android-native" && current.resolve("app/build.gradle.kts").exists()) {
                    return current
                }
                current = current.parentFile
            }
            return File(".").absoluteFile
        }
    }
}
