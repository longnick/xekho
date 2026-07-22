package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeOfflineQueueDetailPreviewTest {
    private fun queuedItem(
        id: String = "queue-local-paid-ban-01-45000",
        receipt: String = "local-paid-ban-01-45000"
    ) = OfflineQueueItem(
        localQueueId = id,
        tableId = "ban-01",
        localReceiptNumber = receipt,
        status = OfflineQueueStatus.QUEUED_LOCAL_ONLY,
        totalDue = 45000,
        itemCount = 1,
        payloadPreview = "LOCAL QUEUE DRAFT ONLY"
    )

    private fun blockedItem() = OfflineQueueItem(
        localQueueId = "queue-blocked-ban-02",
        tableId = "ban-02",
        localReceiptNumber = "",
        status = OfflineQueueStatus.BLOCKED_LOCAL_ONLY,
        totalDue = 0,
        itemCount = 0,
        payloadPreview = "not payable local-only"
    )

    @Test
    fun detailPreviewForBlockedItemShowsLocalErrorWithoutWriteOrSync() {
        val repo = FakeOfflineQueueRepository()
        val state = OfflineQueueState(items = listOf(blockedItem()))

        val detail = repo.previewDetail(state, "queue-blocked-ban-02")

        assertEquals(OfflineQueueDetailType.ERROR_PREVIEW_LOCAL_ONLY, detail.type)
        assertEquals("queue-blocked-ban-02", detail.localQueueId)
        assertTrue(detail.title.contains("Chưa đủ điều kiện"))
        assertTrue(detail.lines.any { it.contains("not payable") })
        assertTrue(detail.recommendedAction.contains("Kiểm tra lại giỏ"))
        assertFalse(detail.canWriteToProduction)
        assertFalse(detail.canSyncToFirestore)
    }

    @Test
    fun detailPreviewForDuplicateReceiptShowsConflictPreviewOnly() {
        val repo = FakeOfflineQueueRepository()
        val state = OfflineQueueState(
            items = listOf(
                queuedItem(id = "queue-local-paid-ban-01-45000-a"),
                queuedItem(id = "queue-local-paid-ban-01-45000-b")
            )
        )

        val detail = repo.previewDetail(state, "queue-local-paid-ban-01-45000-a")

        assertEquals(OfflineQueueDetailType.CONFLICT_PREVIEW_LOCAL_ONLY, detail.type)
        assertTrue(detail.lines.any { it.contains("trùng local receipt") })
        assertTrue(detail.recommendedAction.contains("Giữ local-only"))
        assertFalse(detail.canWriteToProduction)
        assertFalse(detail.canSyncToFirestore)
    }

    @Test
    fun detailPreviewForHealthyQueuedItemShowsInfoOnly() {
        val repo = FakeOfflineQueueRepository()
        val state = OfflineQueueState(items = listOf(queuedItem()))

        val detail = repo.previewDetail(state, "queue-local-paid-ban-01-45000")

        assertEquals(OfflineQueueDetailType.INFO_LOCAL_ONLY, detail.type)
        assertTrue(detail.title.contains("Sẵn sàng local"))
        assertTrue(detail.lines.any { it.contains("không sync thật") })
        assertFalse(detail.canWriteToProduction)
        assertFalse(detail.canSyncToFirestore)
    }

    @Test
    fun missingItemDetailPreviewIsLocalOnlyError() {
        val repo = FakeOfflineQueueRepository()
        val state = OfflineQueueState(items = listOf(queuedItem()))

        val detail = repo.previewDetail(state, "missing")

        assertEquals(OfflineQueueDetailType.ERROR_PREVIEW_LOCAL_ONLY, detail.type)
        assertEquals("missing", detail.localQueueId)
        assertTrue(detail.lines.any { it.contains("Không tìm thấy") })
        assertFalse(detail.canWriteToProduction)
        assertFalse(detail.canSyncToFirestore)
    }
}
