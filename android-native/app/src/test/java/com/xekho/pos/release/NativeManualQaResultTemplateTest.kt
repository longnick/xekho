package com.xekho.pos.release

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeManualQaResultTemplateTest {
    private val template = NativeManualQaResultTemplateReporter().buildTemplate()

    @Test
    fun templateCapturesDeviceAndArtifactFields() {
        assertEquals("Sprint 27", template.sprint)
        assertTrue(template.resultTemplatePath.endsWith("docs/android-native-manual-qa-result-template.md"))
        assertTrue(template.resultCommand.endsWith("scripts/native-qa-result-template.sh"))
        assertTrue(template.requiredFields.contains("Device"))
        assertTrue(template.requiredFields.contains("Android version"))
        assertTrue(template.requiredFields.contains("APK SHA256"))
    }

    @Test
    fun templateCapturesManualPassFailSections() {
        assertTrue(template.passFailSections.any { it.contains("Install result") })
        assertTrue(template.passFailSections.any { it.contains("PIN gate") })
        assertTrue(template.passFailSections.any { it.contains("Bàn") })
        assertTrue(template.passFailSections.any { it.contains("Kho") })
        assertTrue(template.passFailSections.any { it.contains("Tài chính") })
        assertTrue(template.passFailSections.any { it.contains("Cài đặt") })
        assertTrue(template.passFailSections.any { it.contains("Firestore cards blocked") })
    }

    @Test
    fun templateKeepsBlockedFlagsExplicit() {
        assertFalse(template.canWriteToProduction)
        assertFalse(template.canSyncToFirestore)
        assertFalse(template.canExecuteFirestoreReads)
        assertTrue(template.blockedConfirmations.any { it.contains("No google-services.json") })
        assertTrue(template.blockedConfirmations.any { it.contains("No service account") })
        assertTrue(template.blockedConfirmations.any { it.contains("No production POS data") })
    }
}
