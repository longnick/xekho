package com.xekho.pos.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class FirebaseAuthPreparationTest {
    @Test
    fun firebaseAuthSdkMarkerDocumentsDependencyWithoutEnablingRealAuth() {
        assertEquals("com.google.firebase.auth.FirebaseAuth", FirebaseAuthSdkMarker.authClassName)
        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, FirebaseAuthSdkMarker.repositoryMode)
    }

    @Test
    fun guardStillBlocksWhenSdkAndConfigAppearPresent() {
        val readiness = FirebaseAuthConfigGuard.evaluate(
            FirebaseAuthConfig(
                explicitOwnerApproval = true,
                googleServicesJsonPresent = true,
                firebaseAuthSdkLinked = true
            )
        )

        assertFalse(readiness.canUseRealFirebase)
        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, readiness.mode)
        assertEquals("real Firebase Auth intentionally blocked in Sprint 5", readiness.blockReason)
    }
}
