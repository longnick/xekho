package com.xekho.pos.domain

interface PosFirestoreReadOnlyRepository {
    val mode: PosFirestoreReadOnlyRepositoryMode
    val canExecuteReads: Boolean
    val canWriteToProduction: Boolean
    val canSyncToFirestore: Boolean

    fun previewCollections(): PosFirestoreReadOnlyRepositoryPreview

    fun previewCollection(collectionName: String): PosFirestoreReadOnlyCollectionPreview
}

class BlockedFirestoreReadOnlyRepository(
    private val contract: PosFirestoreReadOnlyContract,
    override val mode: PosFirestoreReadOnlyRepositoryMode = PosFirestoreReadOnlyRepositoryMode.BLOCKED_PREVIEW_ONLY,
    private val reason: String = "Firestore read-only repository blocked by default in Sprint 20."
) : PosFirestoreReadOnlyRepository {
    override val canExecuteReads: Boolean = false
    override val canWriteToProduction: Boolean = false
    override val canSyncToFirestore: Boolean = false

    override fun previewCollections(): PosFirestoreReadOnlyRepositoryPreview = PosFirestoreReadOnlyRepositoryPreview(
        mode = mode,
        collectionCount = contract.collections.size,
        sampleRowCount = 0,
        lines = listOf(
            reason,
            "SDK marker=${FirestoreReadOnlySdkMarker.className}, but repository does not instantiate Firestore.",
            "Collections=${contract.collections.joinToString { it.collectionName }}.",
            "No get(), listener, query, production row sample, write, or sync."
        ),
        didInstantiateFirestore = false,
        didExecuteRead = false,
        didReadProductionData = false,
        canWriteToProduction = false,
        canSyncToFirestore = false
    )

    override fun previewCollection(collectionName: String): PosFirestoreReadOnlyCollectionPreview {
        val collection = contract.collections.firstOrNull { it.collectionName == collectionName }
        val requiredFields = collection?.requiredFields.orEmpty()
        val purpose = collection?.purpose ?: "unknown contract; blocked local preview only"
        return PosFirestoreReadOnlyCollectionPreview(
            collectionName = collectionName,
            requiredFields = requiredFields,
            sampleRowCount = 0,
            lines = listOf(
                "Collection '$collectionName' preview is blocked local metadata only.",
                purpose,
                "Required fields=${requiredFields.joinToString()}.",
                "No Firestore instance, no query/get/listener, no production POS rows."
            ),
            didInstantiateFirestore = false,
            didExecuteRead = false,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }
}

object GuardedFirestoreReadOnlyRepositoryFactory {
    fun defaultRepository(
        contract: PosFirestoreReadOnlyContract = PosFirestoreReadOnlyContract.default()
    ): PosFirestoreReadOnlyRepository = BlockedFirestoreReadOnlyRepository(contract)

    fun fromRequest(
        request: PosFirestoreReadOnlyRepositoryRequest,
        contract: PosFirestoreReadOnlyContract = PosFirestoreReadOnlyContract.default()
    ): PosFirestoreReadOnlyRepository {
        val missingReason = when {
            !request.ownerApprovedReadOnly -> "owner approval missing for Firestore read-only repository"
            !request.googleServicesJsonPresent -> "google-services.json missing for Firestore read-only repository"
            !request.firestoreSdkLinked -> "Firestore SDK marker missing for Firestore read-only repository"
            !request.allowRealReadExecution -> "real read execution flag missing for Firestore read-only repository"
            else -> null
        }
        val mode = if (missingReason == null) {
            PosFirestoreReadOnlyRepositoryMode.APPROVAL_HELD_PREVIEW_ONLY
        } else {
            PosFirestoreReadOnlyRepositoryMode.BLOCKED_PREVIEW_ONLY
        }
        val reason = missingReason
            ?: "All local read-only flags are present, but Sprint 20 repository remains approval-held preview only."
        return BlockedFirestoreReadOnlyRepository(
            contract = contract,
            mode = mode,
            reason = reason
        )
    }
}
