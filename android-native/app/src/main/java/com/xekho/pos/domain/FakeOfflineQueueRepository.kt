package com.xekho.pos.domain

class FakeOfflineQueueRepository {
    fun previewDetail(state: OfflineQueueState, localQueueId: String): OfflineQueueDetailPreview {
        val item = state.items.firstOrNull { it.localQueueId == localQueueId }
            ?: return OfflineQueueDetailPreview(
                localQueueId = localQueueId,
                type = OfflineQueueDetailType.ERROR_PREVIEW_LOCAL_ONLY,
                title = "Không tìm thấy queue item local",
                lines = listOf("Không tìm thấy queue item: $localQueueId", "Không sync Firestore, không ghi production."),
                recommendedAction = "Tải lại queue local hoặc xếp queue nháp lại từ đơn local.",
                canWriteToProduction = false,
                canSyncToFirestore = false
            )

        val duplicateReceiptCount = state.items.count {
            it.localReceiptNumber.isNotBlank() && it.localReceiptNumber == item.localReceiptNumber
        }
        if (duplicateReceiptCount > 1) {
            return OfflineQueueDetailPreview(
                localQueueId = item.localQueueId,
                type = OfflineQueueDetailType.CONFLICT_PREVIEW_LOCAL_ONLY,
                title = "Xung đột local receipt nháp",
                lines = listOf(
                    "Phát hiện trùng local receipt: ${item.localReceiptNumber}",
                    "Đây chỉ là conflict preview local-only; chưa sync thật.",
                    "Không Firestore sync, không production write."
                ),
                recommendedAction = "Giữ local-only và kiểm tra lại bàn/biên nhận trước khi bật sync thật.",
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }

        return when (item.status) {
            OfflineQueueStatus.BLOCKED_LOCAL_ONLY -> OfflineQueueDetailPreview(
                localQueueId = item.localQueueId,
                type = OfflineQueueDetailType.ERROR_PREVIEW_LOCAL_ONLY,
                title = "Chưa đủ điều kiện xếp queue",
                lines = listOf(
                    item.payloadPreview,
                    "Bàn: ${item.tableId}",
                    "Item count: ${item.itemCount}",
                    "Không Firestore sync, không production write."
                ),
                recommendedAction = "Kiểm tra lại giỏ, thanh toán local, rồi tạo queue nháp mới.",
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
            OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY -> OfflineQueueDetailPreview(
                localQueueId = item.localQueueId,
                type = OfflineQueueDetailType.ERROR_PREVIEW_LOCAL_ONLY,
                title = "Retry preview local-only",
                lines = listOf(
                    item.payloadPreview,
                    "Retry này chỉ là trạng thái xem thử trong máy.",
                    "Không Firestore sync, không production write."
                ),
                recommendedAction = "Chưa bấm sync thật; dùng để kiểm tra lỗi trước khi có persistence/sync được duyệt.",
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
            OfflineQueueStatus.QUEUED_LOCAL_ONLY -> OfflineQueueDetailPreview(
                localQueueId = item.localQueueId,
                type = OfflineQueueDetailType.INFO_LOCAL_ONLY,
                title = "Sẵn sàng local-only",
                lines = listOf(
                    "Queue item đang chờ local; không sync thật.",
                    "Bàn: ${item.tableId}",
                    "Biên nhận: ${item.localReceiptNumber}",
                    "Tổng local: ${item.totalDue}",
                    "Không Firestore sync, không production write."
                ),
                recommendedAction = "Giữ trong queue local cho tới khi có persistence/sync thật được duyệt.",
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
    }

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
