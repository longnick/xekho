package com.xekho.pos.auth

import com.google.firebase.auth.FirebaseAuth

class FirebaseAuthRepository(
    @Suppress("unused") private val firebaseAuth: FirebaseAuth,
    private val readiness: FirebaseAuthReadiness
) : AuthRepository {
    override val mode: AuthRepositoryMode = AuthRepositoryMode.FIREBASE_BLOCKED

    override fun initialSession(): AuthSession = AuthSession(
        stage = AuthStage.LOCKED,
        staffName = null,
        errorMessage = null,
        isLocalOnly = true
    )

    override fun verifyPin(pin: String, current: AuthSession): AuthSession = current.copy(
        stage = AuthStage.LOCKED,
        staffName = null,
        errorMessage = "Firebase Auth repository is gated in Sprint 6: ${readiness.blockReason}",
        isLocalOnly = true
    )

    override fun lock(current: AuthSession): AuthSession = current.copy(
        stage = AuthStage.LOCKED,
        staffName = null,
        errorMessage = null,
        isLocalOnly = true
    )
}
