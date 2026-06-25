package com.xekho.pos.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirebaseAuthRepositorySkeletonTest {
    @Test
    fun defaultFactoryStillReturnsFakeLocalRepository() {
        val repository = AuthRepositoryFactory.defaultRepository()

        assertEquals(AuthRepositoryMode.FAKE_LOCAL, repository.mode)
        assertTrue(repository is FakeAuthRepository)
    }

    @Test
    fun blockedFactoryReturnsBlockedFirebaseRepositoryWithoutFirebaseInstance() {
        val readiness = FirebaseAuthConfigGuard.evaluate(FirebaseAuthConfig())
        val repository = AuthRepositoryFactory.blockedFirebaseRepository(readiness)
        val attempted = repository.verifyPin("1234", repository.initialSession())

        assertEquals(AuthRepositoryMode.FIREBASE_BLOCKED, repository.mode)
        assertFalse(attempted.canAccessPosTabs)
        assertEquals("Firebase Auth blocked: missing explicit owner approval", attempted.errorMessage)
    }

    @Test
    fun firebaseAuthRepositoryConstructorRequiresInjectedFirebaseAuthAndReadiness() {
        val constructor = FirebaseAuthRepository::class.java.constructors.single()
        val parameterTypes = constructor.parameterTypes.map { it.name }

        assertEquals(
            listOf(
                "com.google.firebase.auth.FirebaseAuth",
                "com.xekho.pos.auth.FirebaseAuthReadiness"
            ),
            parameterTypes
        )
    }
}
