package com.xekho.pos.domain

class GuardedRealDataDirectionGate {
    fun evaluate(request: RealDataDirectionRequest): RealDataDirectionState {
        val inputs = listOf(
            Input(
                key = RealDataDirectionItemKey.OWNER_APPROVAL,
                label = "Owner read-only approval",
                ready = request.ownerApprovedReadOnly,
                blockedMessage = "Owner approval missing for real data read-only direction."
            ),
            Input(
                key = RealDataDirectionItemKey.GOOGLE_SERVICES_JSON,
                label = "google-services.json present",
                ready = request.googleServicesJsonPresent,
                blockedMessage = "google-services.json is not present; app stays fake/local."
            ),
            Input(
                key = RealDataDirectionItemKey.FIRESTORE_SDK_LINKED,
                label = "Firestore SDK linked",
                ready = request.firestoreSdkLinked,
                blockedMessage = "Firestore SDK marker is not linked for real data direction."
            ),
            Input(
                key = RealDataDirectionItemKey.CONTRACT_PREVIEW_REVIEWED,
                label = "Collection contract reviewed",
                ready = request.contractPreviewReviewed,
                blockedMessage = "Firestore collection contract must be reviewed before real data direction."
            ),
            Input(
                key = RealDataDirectionItemKey.REPOSITORY_PREVIEW_REVIEWED,
                label = "Repository preview reviewed",
                ready = request.repositoryPreviewReviewed,
                blockedMessage = "Repository preview must be reviewed before real data direction."
            ),
            Input(
                key = RealDataDirectionItemKey.MANUAL_QA_RESULT_CAPTURED,
                label = "Manual QA result captured",
                ready = request.manualQaResultCaptured,
                blockedMessage = "A real-device QA result should be captured before switching toward real data."
            ),
            Input(
                key = RealDataDirectionItemKey.USER_REQUESTED_REAL_DATA_DIRECTION,
                label = "User requested real data direction",
                ready = request.userRequestedRealDataDirection,
                blockedMessage = "Real data direction has not been requested for this local gate."
            )
        )
        val readyCount = inputs.count { it.ready }
        val allReady = readyCount == inputs.size
        val mode = if (readyCount == 0) {
            RealDataDirectionMode.FAKE_LOCAL_ACTIVE
        } else {
            RealDataDirectionMode.FIREBASE_READ_ONLY_CANDIDATE
        }
        val status = if (allReady && request.allowOneTimeReadExecution) {
            RealDataDirectionStatus.READY_FOR_ONE_TIME_APPROVAL_LOCAL_ONLY
        } else {
            RealDataDirectionStatus.BLOCKED_LOCAL_ONLY
        }
        val items = inputs.map { input ->
            RealDataDirectionItem(
                key = input.key,
                label = input.label,
                isReady = input.ready,
                message = if (input.ready) {
                    "Ready for local checklist only; one-time read is not executed in Sprint 28."
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
        val summary = if (status == RealDataDirectionStatus.READY_FOR_ONE_TIME_APPROVAL_LOCAL_ONLY) {
            listOf(
                "Real data direction Sprint 28: all local prerequisites are ready for one-time human approval.",
                "The one-time Firestore read is not executed here; canExecuteReads remains false.",
                "No write, no sync, no production mutation, no background worker."
            )
        } else {
            listOf(
                "Real data direction Sprint 28 stays fake/local: $readyCount/${inputs.size} prerequisites ready.",
                "Firebase real data is blocked until all read-only prerequisites and one-time approval are complete.",
                "No Firestore instance, no query/get/listener, no production rows, no write, no sync."
            )
        }
        return RealDataDirectionState(
            mode = mode,
            status = status,
            items = items,
            summaryLines = summary,
            readyItemCount = readyCount,
            requiredItemCount = inputs.size,
            canExecuteReads = false,
            didInstantiateFirestore = false,
            didExecuteRead = false,
            didReadProductionData = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private data class Input(
        val key: RealDataDirectionItemKey,
        val label: String,
        val ready: Boolean,
        val blockedMessage: String
    )
}
