package com.xekho.pos.auth

enum class AuthStage {
    LOCKED,
    UNLOCKED
}

data class AuthSession(
    val stage: AuthStage,
    val staffName: String? = null,
    val errorMessage: String? = null,
    val isLocalOnly: Boolean = true
) {
    val canAccessPosTabs: Boolean get() = stage == AuthStage.UNLOCKED
}

class FakeAuthRepository(
    private val acceptedPin: String = "1234",
    private val demoStaffName: String = "Nh\u00e2n vi\u00ean demo"
) : AuthRepository {
    override val mode: AuthRepositoryMode = AuthRepositoryMode.FAKE_LOCAL
    override fun initialSession(): AuthSession = AuthSession(
        stage = AuthStage.LOCKED,
        staffName = null,
        errorMessage = null,
        isLocalOnly = true
    )

    override fun verifyPin(pin: String, current: AuthSession): AuthSession {
        val normalizedPin = pin.trim()
        return if (normalizedPin == acceptedPin) {
            current.copy(
                stage = AuthStage.UNLOCKED,
                staffName = demoStaffName,
                errorMessage = null,
                isLocalOnly = true
            )
        } else {
            current.copy(
                stage = AuthStage.LOCKED,
                staffName = null,
                errorMessage = "PIN kh\u00f4ng \u0111\u00fang",
                isLocalOnly = true
            )
        }
    }

    override fun lock(current: AuthSession): AuthSession = current.copy(
        stage = AuthStage.LOCKED,
        staffName = null,
        errorMessage = null,
        isLocalOnly = true
    )
}
