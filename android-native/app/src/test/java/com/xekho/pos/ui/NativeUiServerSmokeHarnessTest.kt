package com.xekho.pos.ui

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeUiServerSmokeHarnessTest {
    private val harness = NativeUiServerSmokeHarness()

    @Test
    fun serverSmokeCoversCoreLoginAndTabCopyWithoutDevice() {
        val report = harness.evaluate()

        assertTrue(report.isServerSideOnly)
        assertFalse(report.requiresApkInstall)
        assertFalse(report.requiresAndroidEmulator)
        assertTrue(report.requiredMarkers.contains("Xe Kho POS"))
        assertTrue(report.requiredMarkers.contains("PIN demo"))
        assertTrue(report.requiredMarkers.contains("POS local multi-table flow"))
        assertTrue(report.requiredMarkers.contains("Firestore approval checklist Sprint 22"))
        assertTrue(report.missingMarkers.isEmpty())
    }

    @Test
    fun serverSmokeRejectsDangerousEnabledFirestoreCopy() {
        val report = harness.evaluate()

        assertTrue(report.forbiddenMarkers.contains("Firestore write enabled"))
        assertTrue(report.forbiddenMarkers.contains("Auto sync enabled"))
        assertTrue(report.forbiddenMarkers.contains("production write enabled"))
        assertTrue(report.foundForbiddenMarkers.isEmpty())
        assertFalse(report.canExecuteReads)
        assertFalse(report.canWriteToProduction)
        assertFalse(report.canSyncToFirestore)
    }

    @Test
    fun serverSmokeCoversSettingsInventoryAndFinanceTabs() {
        val report = harness.evaluate()

        assertTrue(report.requiredMarkers.contains("Auth readiness"))
        assertTrue(report.requiredMarkers.contains("Tài chính hôm nay"))
        assertTrue(report.requiredMarkers.contains("POS dry-run"))
        assertTrue(report.requiredMarkers.contains("Kho cần nhập"))
        assertTrue(report.requiredMarkers.contains("Không service account"))
        assertTrue(report.missingMarkers.isEmpty())
    }

    @Test
    fun serverSmokeSummarizesRenderableNativeFlow() {
        val report = harness.evaluate()

        assertTrue(report.summaryLines.any { it.contains("server-side") })
        assertTrue(report.summaryLines.any { it.contains("no emulator") })
        assertTrue(report.summaryLines.any { it.contains("no APK install") })
        assertTrue(report.summaryLines.any { it.contains("no Firestore execution") })
        assertTrue(report.summaryLines.any { it.contains("Settings") })
        assertTrue(report.summaryLines.any { it.contains("Inventory") })
        assertTrue(report.summaryLines.any { it.contains("Finance") })
    }
}
