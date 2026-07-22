package com.xekho.pos.domain

class GuardedQueueStorageSelectionBoundary {
    fun selectStorage(request: QueueStorageRequest): QueueStorageDecision = when (request.requestedBackend) {
        QueueStorageBackend.NONE_LOCAL_ONLY -> blockedDecision(
            request = request,
            lines = listOf(
                "Real queue storage not requested; current queue remains memory/snapshot local-only.",
                "No Room/DataStore dependency is used, no DB opened, no Firestore sync."
            )
        )
        QueueStorageBackend.ROOM -> selectRequestedBackend(
            request = request,
            missingDependencyLine = "Room dependency missing; keep queue storage blocked local-only.",
            prepOnlyLine = "Room dependency may be prepared later, but owner approval missing; no database opened.",
            approvalHeldLine = "Owner approval present, but Sprint 17 is design/dependency gate only; Room writes stay blocked."
        )
        QueueStorageBackend.DATASTORE -> selectRequestedBackend(
            request = request,
            missingDependencyLine = "DataStore dependency missing; keep queue storage blocked local-only.",
            prepOnlyLine = "DataStore dependency may be prepared later, but owner approval missing; no storage opened.",
            approvalHeldLine = "Owner approval present, but Sprint 17 is design/dependency gate only; DataStore writes stay blocked."
        )
    }

    fun compareBackends(): QueueStorageComparison {
        val dataStoreOption = QueueStorageDecision(
            requestedBackend = QueueStorageBackend.DATASTORE,
            selectedBackend = QueueStorageBackend.NONE_LOCAL_ONLY,
            status = QueueStorageReadinessStatus.PREP_ONLY_LOCAL_ONLY,
            lines = listOf(
                "DataStore is simple for small key/value snapshot text.",
                "Less suitable for structured retry/conflict queue queries.",
                "Blocked today: no dependency, no storage open, no Firestore sync."
            ),
            isDependencyDeclared = false,
            canPersist = false,
            didOpenDatabase = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
        val roomOption = QueueStorageDecision(
            requestedBackend = QueueStorageBackend.ROOM,
            selectedBackend = QueueStorageBackend.NONE_LOCAL_ONLY,
            status = QueueStorageReadinessStatus.PREP_ONLY_LOCAL_ONLY,
            lines = listOf(
                "Room is better for future structured offline queue rows, retry state, conflict review, and migrations.",
                "Requires explicit dependency/migration approval before any real DB file exists.",
                "Blocked today: no dependency, no database open, no Firestore sync."
            ),
            isDependencyDeclared = false,
            canPersist = false,
            didOpenDatabase = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
        return QueueStorageComparison(
            options = listOf(dataStoreOption, roomOption),
            recommendedFutureBackend = QueueStorageBackend.ROOM,
            summary = "Room is the recommended future backend for structured offline queue persistence; Sprint 17 keeps both Room and DataStore blocked.",
            canPersist = false,
            didOpenDatabase = false
        )
    }

    private fun selectRequestedBackend(
        request: QueueStorageRequest,
        missingDependencyLine: String,
        prepOnlyLine: String,
        approvalHeldLine: String
    ): QueueStorageDecision {
        val status = when {
            !request.dependencyDeclared -> QueueStorageReadinessStatus.BLOCKED_LOCAL_ONLY
            !request.ownerApprovedRealPersistence -> QueueStorageReadinessStatus.PREP_ONLY_LOCAL_ONLY
            else -> QueueStorageReadinessStatus.APPROVAL_HELD_LOCAL_ONLY
        }
        val firstLine = when (status) {
            QueueStorageReadinessStatus.BLOCKED_LOCAL_ONLY -> missingDependencyLine
            QueueStorageReadinessStatus.PREP_ONLY_LOCAL_ONLY -> prepOnlyLine
            QueueStorageReadinessStatus.APPROVAL_HELD_LOCAL_ONLY -> approvalHeldLine
        }
        return QueueStorageDecision(
            requestedBackend = request.requestedBackend,
            selectedBackend = QueueStorageBackend.NONE_LOCAL_ONLY,
            status = status,
            lines = listOf(firstLine, "No Room/DB/DataStore write, no production write, no Firestore sync in Sprint 17."),
            isDependencyDeclared = request.dependencyDeclared,
            canPersist = false,
            didOpenDatabase = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private fun blockedDecision(
        request: QueueStorageRequest,
        lines: List<String>
    ): QueueStorageDecision = QueueStorageDecision(
        requestedBackend = request.requestedBackend,
        selectedBackend = QueueStorageBackend.NONE_LOCAL_ONLY,
        status = QueueStorageReadinessStatus.BLOCKED_LOCAL_ONLY,
        lines = lines,
        isDependencyDeclared = false,
        canPersist = false,
        didOpenDatabase = false,
        canWriteToProduction = false,
        canSyncToFirestore = false
    )
}
