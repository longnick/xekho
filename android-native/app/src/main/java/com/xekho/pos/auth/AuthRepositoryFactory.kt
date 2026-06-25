package com.xekho.pos.auth

import com.google.firebase.auth.FirebaseAuth

object AuthRepositoryFactory {
    fun defaultRepository(): AuthRepository = FakeAuthRepository()

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
