package com.xekho.pos.auth

interface AuthRepository {
    val mode: AuthRepositoryMode

    fun initialSession(): AuthSession

    fun verifyPin(pin: String, current: AuthSession): AuthSession

    fun lock(current: AuthSession): AuthSession
}

enum class AuthRepositoryMode {
    FAKE_LOCAL,
    FIREBASE_BLOCKED
}

data class FirebaseAuthConfig(
    val explicitOwnerApproval: Boolean = false,
    val googleServicesJsonPresent: Boolean = false,
    val firebaseAuthSdkLinked: Boolean = false
)

data class FirebaseAuthReadiness(
    val mode: AuthRepositoryMode,
    val canUseRealFirebase: Boolean,
    val blockReason: String
)

object FirebaseAuthConfigGuard {
    fun evaluate(config: FirebaseAuthConfig): FirebaseAuthReadiness {
        val blockReason = when {
            !config.explicitOwnerApproval -> "missing explicit owner approval"
            !config.googleServicesJsonPresent -> "missing google-services.json"
            !config.firebaseAuthSdkLinked -> "missing Firebase Auth SDK"
            else -> "real Firebase Auth intentionally blocked in Sprint 5"
        }

        return FirebaseAuthReadiness(
            mode = AuthRepositoryMode.FIREBASE_BLOCKED,
            canUseRealFirebase = false,
            blockReason = blockReason
        )
    }
}

class BlockedFirebaseAuthRepository(
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
        errorMessage = "Firebase Auth blocked: ${readiness.blockReason}",
        isLocalOnly = true
    )

    override fun lock(current: AuthSession): AuthSession = current.copy(
        stage = AuthStage.LOCKED,
        staffName = null,
        errorMessage = null,
        isLocalOnly = true
    )
}
