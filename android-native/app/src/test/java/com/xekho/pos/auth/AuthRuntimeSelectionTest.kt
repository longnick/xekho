package com.xekho.pos.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRuntimeSelectionTest {
    @Test
    fun defaultRuntimeConfigSelectsFakeLocalWithoutFirebaseInstance() {
        val config = AuthRuntimeConfig()
        val selection = AuthRuntimeSelector.select(config)
        val repository = AuthRepositoryFactory.fromRuntimeConfig(config)

        assertEquals(AuthRuntimeMode.FAKE_LOCAL, config.mode)
        assertEquals(AuthRepositoryMode.FAKE_LOCAL, selection.repositoryMode)
        assertFalse(selection.requiresFirebaseAuthInstance)
        assertEquals("default fake/local auth", selection.reason)
        assertTrue(repository is FakeAuthRepository)
    }

    @Test
    fun firebaseRequestedWithoutOwnerApprovalFallsBackToBlockedRepository() {
        val config = AuthRuntimeConfig(
            mode = AuthRuntimeMode.FIREBASE_AUTH,
            firebaseConfig = FirebaseAuthConfig(
                explicitOwnerApproval = false,
                googleServicesJsonPresent = true,
                firebaseAuthSdkLinked = true
            )
        )
        val selection = AuthRuntimeSelector.select(config)
        val repository = AuthRepositoryFactory.fromRuntimeConfig(config)
        val attempted = repository.verifyPin("1234", repository.initialSession())

        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, selection.repositoryMode)
        assertFalse(selection.canUseRealFirebase)
        assertFalse(selection.requiresFirebaseAuthInstance)
        assertEquals("missing explicit owner approval", selection.reason)
        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, repository.mode)
        assertFalse(attempted.canAccessPosTabs)
    }

    @Test
    fun firebaseRequestedWithAllFlagsStillBlockedUntilGuardChanges() {
        val config = AuthRuntimeConfig(
            mode = AuthRuntimeMode.FIREBASE_AUTH,
            firebaseConfig = FirebaseAuthConfig(
                explicitOwnerApproval = true,
                googleServicesJsonPresent = true,
                firebaseAuthSdkLinked = true
            )
        )
        val selection = AuthRuntimeSelector.select(config)
        val repository = AuthRepositoryFactory.fromRuntimeConfig(config)

        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, selection.repositoryMode)
        assertFalse(selection.canUseRealFirebase)
        assertFalse(selection.requiresFirebaseAuthInstance)
        assertEquals("real Firebase Auth intentionally blocked in Sprint 5", selection.reason)
        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, repository.mode)
    }
}
