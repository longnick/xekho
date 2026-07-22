package com.xekho.pos.domain

class FirestoreReadOnlyUiMappingAdapter {
    fun fromRepositoryPreview(preview: PosFirestoreReadOnlyRepositoryPreview): PosFirestoreReadOnlyUiSummary =
        PosFirestoreReadOnlyUiSummary(
            title = "Firestore read-only",
            modeLabel = preview.mode.displayName,
            collectionCount = preview.collectionCount,
            sampleRowCount = preview.sampleRowCount,
            lines = preview.lines,
            isBlocked = !preview.didExecuteRead,
            didExecuteRead = false,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )

    fun fromCollectionPreview(preview: PosFirestoreReadOnlyCollectionPreview): PosFirestoreReadOnlyUiRow =
        PosFirestoreReadOnlyUiRow(
            collectionName = preview.collectionName,
            requiredFieldsLabel = preview.requiredFields.joinToString(", "),
            sampleRowCount = preview.sampleRowCount,
            safetyLabel = "No Firestore read · no production data · no writes",
            isEmptyPreview = preview.sampleRowCount == 0,
            didExecuteRead = false,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )

    fun dashboardState(
        repositoryPreview: PosFirestoreReadOnlyRepositoryPreview,
        collectionPreviews: List<PosFirestoreReadOnlyCollectionPreview>
    ): PosFirestoreReadOnlyDashboardState {
        val summary = fromRepositoryPreview(repositoryPreview)
        val rows = collectionPreviews.map { fromCollectionPreview(it) }
        return PosFirestoreReadOnlyDashboardState(
            summary = summary,
            rows = rows,
            didExecuteRead = false,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }
}
