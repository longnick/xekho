package com.xekho.pos.release

import java.io.File

data class NativeArtifactReport(
    val applicationId: String,
    val versionCode: Int,
    val versionName: String,
    val apkPath: String,
    val scanPattern: String,
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
        val scanPattern = "(^|/)(google-services\\.json|.*\\.env|serviceAccount|firebase-adminsdk|secret|functions-list\\.json)$"
        return NativeArtifactReport(
            applicationId = applicationId,
            versionCode = versionCode,
            versionName = versionName,
            apkPath = apkPath,
            scanPattern = scanPattern,
            summaryLines = listOf(
                "Sprint 24 Android native artifact report for $applicationId.",
                "Debug APK path: $apkPath.",
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
