package com.xekho.pos.auth

enum class AuthRuntimeMode {
    FAKE_LOCAL,
    FIREBASE_AUTH
}

data class AuthRuntimeConfig(
    val mode: AuthRuntimeMode = AuthRuntimeMode.FAKE_LOCAL,
    val firebaseConfig: FirebaseAuthConfig = FirebaseAuthConfig()
)

data class AuthRuntimeSelection(
    val runtimeMode: AuthRuntimeMode,
    val repositoryMode: AuthRepositoryMode,
    val canUseRealFirebase: Boolean,
    val requiresFirebaseAuthInstance: Boolean,
    val reason: String,
    val readiness: FirebaseAuthReadiness? = null
)

object AuthRuntimeSelector {
    fun select(config: AuthRuntimeConfig = AuthRuntimeConfig()): AuthRuntimeSelection = when (config.mode) {
        AuthRuntimeMode.FAKE_LOCAL -> AuthRuntimeSelection(
            runtimeMode = AuthRuntimeMode.FAKE_LOCAL,
            repositoryMode = AuthRepositoryMode.FAKE_LOCAL,
            canUseRealFirebase = false,
            requiresFirebaseAuthInstance = false,
            reason = "default fake/local auth",
            readiness = null
        )
        AuthRuntimeMode.FIREBASE_AUTH -> {
            val readiness = FirebaseAuthConfigGuard.evaluate(config.firebaseConfig)
            AuthRuntimeSelection(
                runtimeMode = AuthRuntimeMode.FIREBASE_AUTH,
                repositoryMode = readiness.mode,
                canUseRealFirebase = readiness.canUseRealFirebase,
                requiresFirebaseAuthInstance = readiness.canUseRealFirebase,
                reason = readiness.blockReason,
                readiness = readiness
            )
        }
    }
}
