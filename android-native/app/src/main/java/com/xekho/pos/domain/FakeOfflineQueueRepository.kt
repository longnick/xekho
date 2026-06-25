package com.xekho.pos.domain

class FakeOfflineQueueRepository {
    fun filterItems(state: OfflineQueueState, filter: OfflineQueueFilter): List<OfflineQueueItem> = when (filter) {
        OfflineQueueFilter.ALL -> state.items
        OfflineQueueFilter.QUEUED -> state.items.filter { it.status == OfflineQueueStatus.QUEUED_LOCAL_ONLY }
        OfflineQueueFilter.BLOCKED -> state.items.filter { it.status == OfflineQueueStatus.BLOCKED_LOCAL_ONLY }
        OfflineQueueFilter.RETRY_PREVIEW -> state.items.filter { it.status == OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY }
    }

    fun retryPreview(state: OfflineQueueState, localQueueId: String): OfflineQueueState {
        val updatedItems = state.items.map { item ->
            if (item.localQueueId == localQueueId && item.status == OfflineQueueStatus.BLOCKED_LOCAL_ONLY) {
                item.copy(
                    status = OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY,
                    payloadPreview = item.payloadPreview + "\nretry preview local-only; no Firestore sync, no production write",
                    canWriteToProduction = false,
                    canSyncToFirestore = false
                )
            } else {
                item.copy(canWriteToProduction = false, canSyncToFirestore = false)
            }
        }
        return OfflineQueueState(
            items = updatedItems,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun draftFromPaymentClose(closeResult: PaymentCloseResult): OfflineQueueItem {
        val order = closeResult.order
        val draft = closeResult.draft
        if (!closeResult.isClosedLocal) {
            return OfflineQueueItem(
                localQueueId = "queue-blocked-${order.tableId}",
                tableId = order.tableId,
                localReceiptNumber = "",
                status = OfflineQueueStatus.BLOCKED_LOCAL_ONLY,
                totalDue = 0L,
                itemCount = order.itemCount,
                payloadPreview = "not payable local-only; no sync payload prepared",
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
        val payloadPreview = buildString {
            appendLine("LOCAL QUEUE DRAFT ONLY")
            appendLine("table=${order.tableId}")
            appendLine("receipt=${closeResult.localReceiptNumber}")
            appendLine("totalDue=${draft.totalDue}")
            order.items.forEach { item ->
                appendLine("${item.name} x${item.quantity} = ${item.lineTotal}")
            }
            append("no Firestore sync, no production write")
        }
        return OfflineQueueItem(
            localQueueId = "queue-${closeResult.localReceiptNumber}",
            tableId = order.tableId,
            localReceiptNumber = closeResult.localReceiptNumber,
            status = OfflineQueueStatus.QUEUED_LOCAL_ONLY,
            totalDue = draft.totalDue,
            itemCount = order.itemCount,
            payloadPreview = payloadPreview,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun appendDraft(state: OfflineQueueState, item: OfflineQueueItem): OfflineQueueState {
        val dedupedItems = if (state.items.any { it.localQueueId == item.localQueueId }) {
            state.items
        } else {
            state.items + item.copy(canWriteToProduction = false, canSyncToFirestore = false)
        }
        return OfflineQueueState(
            items = dedupedItems,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun clearLocalQueue(state: OfflineQueueState): OfflineQueueState = state.copy(
        items = emptyList(),
        canWriteToProduction = false,
        canSyncToFirestore = false
    )
}
