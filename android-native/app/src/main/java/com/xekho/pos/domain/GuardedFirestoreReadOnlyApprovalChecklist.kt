package com.xekho.pos.domain

class GuardedFirestoreReadOnlyApprovalChecklist {
    fun evaluate(
        request: FirestoreReadOnlyApprovalChecklistRequest
    ): FirestoreReadOnlyApprovalChecklistState {
        val itemInputs = listOf(
            ChecklistInput(
                key = FirestoreReadOnlyChecklistItemKey.OWNER_APPROVAL,
                label = "Owner read-only approval",
                ready = request.ownerApprovedReadOnly,
                blockedMessage = "Owner approval missing for future Firestore read-only execution."
            ),
            ChecklistInput(
                key = FirestoreReadOnlyChecklistItemKey.GOOGLE_SERVICES_JSON,
                label = "google-services.json present",
                ready = request.googleServicesJsonPresent,
                blockedMessage = "Local google-services.json is not present; no Firebase app config is used."
            ),
            ChecklistInput(
                key = FirestoreReadOnlyChecklistItemKey.FIRESTORE_SDK_LINKED,
                label = "Firestore SDK linked",
                ready = request.firestoreSdkLinked,
                blockedMessage = "Firestore SDK marker is not linked for the future read-only path."
            ),
            ChecklistInput(
                key = FirestoreReadOnlyChecklistItemKey.CONTRACT_PREVIEW_REVIEWED,
                label = "Collection contract reviewed",
                ready = request.contractPreviewReviewed,
                blockedMessage = "Collection contract preview has not been owner-reviewed."
            ),
            ChecklistInput(
                key = FirestoreReadOnlyChecklistItemKey.REPOSITORY_PREVIEW_REVIEWED,
                label = "Repository preview reviewed",
                ready = request.repositoryPreviewReviewed,
                blockedMessage = "Repository preview has not been owner-reviewed."
            )
        )
        val allRequiredReady = itemInputs.all { it.ready }
        val status = if (allRequiredReady && request.allowFutureReadExecution) {
            FirestoreReadOnlyChecklistStatus.APPROVAL_HELD_LOCAL_ONLY
        } else {
            FirestoreReadOnlyChecklistStatus.BLOCKED_LOCAL_ONLY
        }
        val items = itemInputs.map { input ->
            FirestoreReadOnlyChecklistItem(
                key = input.key,
                label = input.label,
                isReady = input.ready,
                status = if (input.ready) status else FirestoreReadOnlyChecklistStatus.BLOCKED_LOCAL_ONLY,
                message = if (input.ready) {
                    "Ready for review only; Sprint 22 still blocks real Firestore reads."
                } else {
                    input.blockedMessage
                },
                canExecuteReads = false,
                didInstantiateFirestore = false,
                didExecuteRead = false,
                didReadProductionData = false,
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
        val readyCount = items.count { it.isReady }
        val summary = if (status == FirestoreReadOnlyChecklistStatus.APPROVAL_HELD_LOCAL_ONLY) {
            listOf(
                "Sprint 22 checklist is complete but approval-held local-only.",
                "Real Firestore read execution is still disabled in this sprint.",
                "No FirebaseFirestore instance, query/get/listener, production row sample, write, or sync."
            )
        } else {
            listOf(
                "Firestore read-only checklist blocked: $readyCount/${items.size} prerequisites ready.",
                "Missing items must be reviewed before any future real read sprint.",
                "Sprint 22 does not execute Firestore and does not touch production POS rows."
            )
        }
        return FirestoreReadOnlyApprovalChecklistState(
            status = status,
            items = items,
            summaryLines = summary,
            readyItemCount = readyCount,
            requiredItemCount = items.size,
            canExecuteReads = false,
            didInstantiateFirestore = false,
            didExecuteRead = false,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private data class ChecklistInput(
        val key: FirestoreReadOnlyChecklistItemKey,
        val label: String,
        val ready: Boolean,
        val blockedMessage: String
    )
}
