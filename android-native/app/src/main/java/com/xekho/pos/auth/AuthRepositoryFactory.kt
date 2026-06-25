package com.xekho.pos.auth

import com.google.firebase.auth.FirebaseAuth

object AuthRepositoryFactory {
    fun defaultRepository(): AuthRepository = fromRuntimeConfig()

    fun fromRuntimeConfig(
        config: AuthRuntimeConfig = AuthRuntimeConfig(),
        firebaseAuth: FirebaseAuth? = null
    ): AuthRepository {
        val selection = AuthRuntimeSelector.select(config)
        return when (selection.runtimeMode) {
            AuthRuntimeMode.FAKE_LOCAL -> FakeAuthRepository()
            AuthRuntimeMode.FIREBASE_AUTH -> {
                val readiness = selection.readiness ?: FirebaseAuthConfigGuard.evaluate(config.firebaseConfig)
                if (readiness.canUseRealFirebase && firebaseAuth != null) {
                    FirebaseAuthRepository(firebaseAuth, readiness)
                } else {
                    BlockedFirebaseAuthRepository(readiness)
                }
            }
        }
    }

    fun blockedFirebaseRepository(readiness: FirebaseAuthReadiness): AuthRepository =
        BlockedFirebaseAuthRepository(readiness)

    fun guardedFirebaseRepository(
        firebaseAuth: FirebaseAuth,
        readiness: FirebaseAuthReadiness
    ): AuthRepository = if (readiness.canUseRealFirebase) {
        FirebaseAuthRepository(firebaseAuth, readiness)
    } else {
        BlockedFirebaseAuthRepository(readiness)
    }
}
