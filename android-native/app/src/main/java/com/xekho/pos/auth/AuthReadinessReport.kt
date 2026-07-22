package com.xekho.pos.auth

data class FirebaseLocalConfigStatus(
    val googleServicesJsonPresent: Boolean = false,
    val source: String = "local build metadata"
)

data class AuthReadinessReport(
    val activeRuntimeMode: AuthRuntimeMode,
    val activeModeLabel: String,
    val firebaseStatusLabel: String,
    val blockReason: String,
    val canUseRealFirebase: Boolean,
    val googleServicesJsonPresent: Boolean,
    val displayLines: List<String>
)

object AuthReadinessReporter {
    fun report(
        config: AuthRuntimeConfig = AuthRuntimeConfig(),
        localConfigStatus: FirebaseLocalConfigStatus = FirebaseLocalConfigStatus()
    ): AuthReadinessReport {
        val selection = AuthRuntimeSelector.select(config)
        val activeLabel = when (selection.runtimeMode) {
            AuthRuntimeMode.FAKE_LOCAL -> "FAKE_LOCAL active"
            AuthRuntimeMode.FIREBASE_AUTH -> "FIREBASE_AUTH requested"
        }
        val firebaseStatus = if (selection.canUseRealFirebase) {
            "Firebase Auth ready"
        } else {
            "Firebase Auth blocked"
        }
        val blockReason = selection.reason
        val googleServicesLine = if (localConfigStatus.googleServicesJsonPresent) {
            "google-services.json: present (local only)"
        } else {
            "google-services.json: not present"
        }

        return AuthReadinessReport(
            activeRuntimeMode = selection.runtimeMode,
            activeModeLabel = activeLabel,
            firebaseStatusLabel = firebaseStatus,
            blockReason = blockReason,
            canUseRealFirebase = selection.canUseRealFirebase,
            googleServicesJsonPresent = localConfigStatus.googleServicesJsonPresent,
            displayLines = listOf(
                "Auth: $activeLabel",
                "Firebase: ${firebaseStatus.removePrefix("Firebase Auth ")} — $blockReason",
                googleServicesLine
            )
        )
    }
}
