package com.xekho.pos.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirebaseLocalConfigMetadataTest {
    @Test
    fun buildMetadataDefaultsToNoGoogleServicesJsonInCommittedRepo() {
        val metadata = FirebaseLocalConfigMetadata.fromBuildConfig()

        assertFalse(metadata.googleServicesJsonPresent)
        assertEquals("BuildConfig", metadata.source)
        assertTrue(metadata.displayLine.contains("google-services.json"))
        assertTrue(metadata.displayLine.contains("not present"))
    }

    @Test
    fun readinessReporterCanUseMetadataProviderWithoutEnablingFirebase() {
        val report = AuthReadinessReporter.report(
            localConfigStatus = FirebaseLocalConfigMetadata.fromBuildConfig()
        )

        assertEquals(AuthRuntimeMode.FAKE_LOCAL, report.activeRuntimeMode)
        assertFalse(report.googleServicesJsonPresent)
        assertFalse(report.canUseRealFirebase)
        assertTrue(report.displayLines.contains("google-services.json: not present"))
    }
}
