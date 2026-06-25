package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeOfflineQueueFilterRetryTest {
    private fun queuedItem(id: String = "queue-local-paid-ban-01-45000") = OfflineQueueItem(
        localQueueId = id,
        tableId = "ban-01",
        localReceiptNumber = "local-paid-ban-01-45000",
        status = OfflineQueueStatus.QUEUED_LOCAL_ONLY,
        totalDue = 45000,
        itemCount = 1,
        payloadPreview = "local queued only"
    )

    private fun blockedItem(id: String = "queue-blocked-ban-02") = OfflineQueueItem(
        localQueueId = id,
        tableId = "ban-02",
        localReceiptNumber = "",
        status = OfflineQueueStatus.BLOCKED_LOCAL_ONLY,
        totalDue = 0,
        itemCount = 0,
        payloadPreview = "not payable local-only"
    )

    @Test
    fun filterItemsReturnsAllQueuedBlockedAndRetryPreviewBuckets() {
        val repo = FakeOfflineQueueRepository()
        val retryPreview = blockedItem("queue-retry-ban-03").copy(status = OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY)
        val state = OfflineQueueState(items = listOf(queuedItem(), blockedItem(), retryPreview))

        assertEquals(3, repo.filterItems(state, OfflineQueueFilter.ALL).size)
        assertEquals(1, repo.filterItems(state, OfflineQueueFilter.QUEUED).size)
        assertEquals(1, repo.filterItems(state, OfflineQueueFilter.BLOCKED).size)
        assertEquals(1, repo.filterItems(state, OfflineQueueFilter.RETRY_PREVIEW).size)
        assertFalse(state.canWriteToProduction)
        assertFalse(state.canSyncToFirestore)
    }

    @Test
    fun retryPreviewMarksBlockedItemAsLocalRetryPreviewOnly() {
        val repo = FakeOfflineQueueRepository()
        val state = OfflineQueueState(items = listOf(queuedItem(), blockedItem()))

        val preview = repo.retryPreview(state, "queue-blocked-ban-02")

        val retried = preview.items.first { it.localQueueId == "queue-blocked-ban-02" }
        assertEquals(OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY, retried.status)
        assertTrue(retried.payloadPreview.contains("retry preview"))
        assertFalse(retried.canWriteToProduction)
        assertFalse(retried.canSyncToFirestore)
        assertFalse(preview.canWriteToProduction)
        assertFalse(preview.canSyncToFirestore)
    }

    @Test
    fun retryPreviewLeavesQueuedAndMissingItemsUnchanged() {
        val repo = FakeOfflineQueueRepository()
        val state = OfflineQueueState(items = listOf(queuedItem()))

        val queuedRetry = repo.retryPreview(state, "queue-local-paid-ban-01-45000")
        val missingRetry = repo.retryPreview(state, "missing")

        assertEquals(OfflineQueueStatus.QUEUED_LOCAL_ONLY, queuedRetry.items.single().status)
        assertEquals(state.items, missingRetry.items)
        assertFalse(queuedRetry.canWriteToProduction)
        assertFalse(missingRetry.canSyncToFirestore)
    }

    @Test
    fun retryPreviewCountIsLocalOnlyAndSeparateFromPendingCount() {
        val repo = FakeOfflineQueueRepository()
        val state = OfflineQueueState(items = listOf(queuedItem(), blockedItem()))

        val preview = repo.retryPreview(state, "queue-blocked-ban-02")

        assertEquals(1, preview.pendingCount)
        assertEquals(45000, preview.pendingTotal)
        assertEquals(1, preview.retryPreviewCount)
        assertFalse(preview.canWriteToProduction)
        assertFalse(preview.canSyncToFirestore)
    }
}
