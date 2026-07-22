package com.xekho.pos.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRepositoryBoundaryTest {
    @Test
    fun fakeAuthRepositorySatisfiesRepositoryContract() {
        val repository: AuthRepository = FakeAuthRepository()

        val initial = repository.initialSession()
        val unlocked = repository.verifyPin("1234", initial)

        assertEquals(AuthRepositoryMode.FAKE_LOCAL, repository.mode)
        assertTrue(initial.isLocalOnly)
        assertTrue(unlocked.canAccessPosTabs)
        assertTrue(unlocked.isLocalOnly)
    }

    @Test
    fun firebaseAuthGuardBlocksRealAuthUntilExplicitlyApprovedAndConfigured() {
        val readiness = FirebaseAuthConfigGuard.evaluate(FirebaseAuthConfig())

        assertFalse(readiness.canUseRealFirebase)
        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, readiness.mode)
        assertEquals("missing explicit owner approval", readiness.blockReason)
    }

    @Test
    fun blockedFirebaseRepositoryNeverUnlocksPosTabs() {
        val repository: AuthRepository = BlockedFirebaseAuthRepository(
            readiness = FirebaseAuthConfigGuard.evaluate(
                FirebaseAuthConfig(
                    explicitOwnerApproval = false,
                    googleServicesJsonPresent = false,
                    firebaseAuthSdkLinked = false
                )
            )
        )

        val initial = repository.initialSession()
        val attempted = repository.verifyPin("1234", initial)

        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, repository.mode)
        assertFalse(initial.canAccessPosTabs)
        assertFalse(attempted.canAccessPosTabs)
        assertEquals("Firebase Auth blocked: missing explicit owner approval", attempted.errorMessage)
        assertTrue(attempted.isLocalOnly)
    }
}
