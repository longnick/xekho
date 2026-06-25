package com.xekho.pos.domain

class GuardedPosReadOnlyDataBoundary {
    fun evaluate(request: PosReadOnlyDataRequest): PosReadOnlyDataReadiness = when (request.requestedSource) {
        PosReadOnlyDataSource.FAKE_LOCAL -> PosReadOnlyDataReadiness(
            requestedSource = PosReadOnlyDataSource.FAKE_LOCAL,
            selectedSource = PosReadOnlyDataSource.FAKE_LOCAL,
            status = PosReadOnlyDataReadinessStatus.FAKE_LOCAL_ACTIVE,
            lines = listOf(
                "Using fake/local dashboard data only.",
                "No Firestore read, no production POS data, no writes."
            ),
            canReadFirestore = false,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
        PosReadOnlyDataSource.FIREBASE_READ_ONLY -> evaluateFirebaseReadOnly(request)
    }

    fun previewFakeLocalData(snapshot: DashboardSnapshot): PosReadOnlyDataPreview = PosReadOnlyDataPreview(
        source = PosReadOnlyDataSource.FAKE_LOCAL,
        tableCount = snapshot.tables.size,
        inventoryCount = snapshot.inventory.size,
        todayRevenue = snapshot.finance.todayRevenue,
        lines = listOf(
            "Previewing fake/local POS data for UI shape only.",
            "Tables=${snapshot.tables.size}, inventory=${snapshot.inventory.size}, revenue=${snapshot.finance.todayRevenue}.",
            "No Firestore read, no production POS data, no writes."
        ),
        didReadProductionData = false,
        canWriteToProduction = false,
        canSyncToFirestore = false
    )

    fun previewFirebaseReadOnly(request: PosReadOnlyDataRequest): PosReadOnlyDataPreview {
        val readiness = evaluate(request.copy(requestedSource = PosReadOnlyDataSource.FIREBASE_READ_ONLY))
        return PosReadOnlyDataPreview(
            source = PosReadOnlyDataSource.FIREBASE_READ_ONLY,
            tableCount = 0,
            inventoryCount = 0,
            todayRevenue = 0L,
            lines = listOf(
                "Firebase read-only preview is blocked in Sprint 18.",
                "Status: ${readiness.status.displayName}.",
                "No production rows returned, no Firestore read, no writes."
            ) + readiness.lines,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private fun evaluateFirebaseReadOnly(request: PosReadOnlyDataRequest): PosReadOnlyDataReadiness {
        val missingReason = when {
            !request.ownerApprovedReadOnly -> "owner approval missing for Firebase read-only POS data"
            !request.googleServicesJsonPresent -> "google-services.json missing for Firebase read-only prep"
            !request.firestoreSdkLinked -> "Firestore SDK dependency missing for Firebase read-only prep"
            else -> null
        }
        val status = if (missingReason == null) {
            PosReadOnlyDataReadinessStatus.PREP_ONLY_LOCAL_ONLY
        } else {
            PosReadOnlyDataReadinessStatus.BLOCKED_LOCAL_ONLY
        }
        val firstLine = missingReason
            ?: "All read-only flags are present, but Sprint 18 is prep-only; Firestore reads stay blocked."
        return PosReadOnlyDataReadiness(
            requestedSource = PosReadOnlyDataSource.FIREBASE_READ_ONLY,
            selectedSource = PosReadOnlyDataSource.FAKE_LOCAL,
            status = status,
            lines = listOf(
                firstLine,
                "Selected source remains fake/local; no production POS data read.",
                "Read-only means no writes now or later unless a separate write sprint is explicitly approved."
            ),
            canReadFirestore = false,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }
}
