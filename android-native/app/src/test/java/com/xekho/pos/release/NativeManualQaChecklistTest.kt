package com.xekho.pos.release

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeManualQaChecklistTest {
    private val checklist = NativeManualQaChecklistReporter().buildChecklist()

    @Test
    fun checklistDocumentsSafeInstallAndDevicePrep() {
        assertEquals("Sprint 26", checklist.sprint)
        assertTrue(checklist.installSteps.any { it.contains("scripts/native-apk-report.sh") })
        assertTrue(checklist.installSteps.any { it.contains("Enable Install unknown apps") })
        assertTrue(checklist.installSteps.any { it.contains("MEDIA:") })
        assertTrue(checklist.installSteps.any { it.contains("Demo PIN: 1234") })
    }

    @Test
    fun checklistCoversCoreManualSmokePath() {
        assertTrue(checklist.smokeChecks.any { it.contains("PIN demo") })
        assertTrue(checklist.smokeChecks.any { it.contains("Bàn") })
        assertTrue(checklist.smokeChecks.any { it.contains("Kho") })
        assertTrue(checklist.smokeChecks.any { it.contains("Tài chính") })
        assertTrue(checklist.smokeChecks.any { it.contains("Cài đặt") })
        assertTrue(checklist.smokeChecks.any { it.contains("Firestore approval checklist Sprint 22") })
    }

    @Test
    fun checklistKeepsProductionAndFirestoreBlocked() {
        assertFalse(checklist.canWriteToProduction)
        assertFalse(checklist.canSyncToFirestore)
        assertFalse(checklist.canExecuteFirestoreReads)
        assertTrue(checklist.blockedItems.any { it.contains("google-services.json") })
        assertTrue(checklist.blockedItems.any { it.contains("service account") })
        assertTrue(checklist.blockedItems.any { it.contains("production POS data") })
    }
}
