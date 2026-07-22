package com.xekho.pos.release

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeArtifactReportTest {
    private val reporter = NativeArtifactReporter()

    @Test
    fun readsVersionMetadataForSprint24AlphaPrep() {
        val report = reporter.buildReport()

        assertEquals("com.xekho.pos", report.applicationId)
        assertEquals(24, report.versionCode)
        assertEquals("0.24.0-alpha24", report.versionName)
        assertTrue(report.isDebugArtifact)
        assertFalse(report.requiresReleaseSigning)
        assertTrue(report.summaryLines.any { it.contains("Sprint 24") })
    }

    @Test
    fun reportDocumentsArtifactPathAndNoSecrets() {
        val report = reporter.buildReport()

        assertTrue(report.apkPath.endsWith("app/build/outputs/apk/debug/app-debug.apk"))
        assertTrue(report.scanPattern.contains("google-services"))
        assertFalse(report.canWriteToProduction)
        assertFalse(report.canSyncToFirestore)
        assertFalse(report.includesServiceAccount)
        assertFalse(report.includesGoogleServicesJson)
    }

    @Test
    fun reportProvidesCopyableDeliveryCommandAndMarkdown() {
        val report = reporter.buildReport()

        assertTrue(report.deliveryScript.endsWith("scripts/native-apk-report.sh"))
        assertTrue(report.reportPath.endsWith("app/build/outputs/apk/debug/xekho-native-debug-apk-report.md"))
        assertTrue(report.copyableTelegramMarkdown.any { it.contains("MEDIA:") })
        assertTrue(report.copyableTelegramMarkdown.any { it.contains("SHA256") })
        assertTrue(report.summaryLines.any { it.contains("Sprint 25") })
    }
}
