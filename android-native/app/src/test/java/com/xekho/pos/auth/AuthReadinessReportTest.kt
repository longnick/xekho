package com.xekho.pos.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthReadinessReportTest {
    @Test
    fun defaultReportShowsFakeLocalActiveAndFirebaseBlocked() {
        val report = AuthReadinessReporter.report()

        assertEquals(AuthRuntimeMode.FAKE_LOCAL, report.activeRuntimeMode)
        assertEquals("FAKE_LOCAL active", report.activeModeLabel)
        assertEquals("Firebase Auth blocked", report.firebaseStatusLabel)
        assertEquals("default fake/local auth", report.blockReason)
        assertFalse(report.canUseRealFirebase)
        assertFalse(report.googleServicesJsonPresent)
        assertTrue(report.displayLines.contains("Auth: FAKE_LOCAL active"))
        assertTrue(report.displayLines.contains("Firebase: blocked — default fake/local auth"))
        assertTrue(report.displayLines.contains("google-services.json: not present"))
    }

    @Test
    fun firebaseRequestedReportShowsGuardReasonAndStillNoRealAuth() {
        val report = AuthReadinessReporter.report(
            AuthRuntimeConfig(
                mode = AuthRuntimeMode.FIREBASE_AUTH,
                firebaseConfig = FirebaseAuthConfig(
                    explicitOwnerApproval = true,
                    googleServicesJsonPresent = true,
                    firebaseAuthSdkLinked = true
                )
            ),
            FirebaseLocalConfigStatus(googleServicesJsonPresent = true)
        )

        assertEquals(AuthRuntimeMode.FIREBASE_AUTH, report.activeRuntimeMode)
        assertEquals("FIREBASE_AUTH requested", report.activeModeLabel)
        assertEquals("Firebase Auth blocked", report.firebaseStatusLabel)
        assertEquals("real Firebase Auth intentionally blocked in Sprint 5", report.blockReason)
        assertFalse(report.canUseRealFirebase)
        assertTrue(report.googleServicesJsonPresent)
        assertTrue(report.displayLines.contains("google-services.json: present (local only)"))
    }
}
