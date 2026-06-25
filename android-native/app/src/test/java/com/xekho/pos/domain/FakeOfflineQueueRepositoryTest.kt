package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeOfflineQueueRepositoryTest {
    @Test
    fun draftFromPaidLocalOrderCreatesLocalOnlyQueueItem() {
        val writeRepo = FakePosWriteRepository()
        val queueRepo = FakeOfflineQueueRepository()
        val openOrder = writeRepo.addMenuItem(writeRepo.openOrder("ban-01").order, "mien-tron").order
        val draft = writeRepo.previewPayment(openOrder, PaymentMethod.CASH)
        val paid = writeRepo.closePaymentDraft(openOrder, draft)

        val item = queueRepo.draftFromPaymentClose(paid)

        assertEquals("queue-local-paid-ban-01-45000", item.localQueueId)
        assertEquals("ban-01", item.tableId)
        assertEquals("local-paid-ban-01-45000", item.localReceiptNumber)
        assertEquals(OfflineQueueStatus.QUEUED_LOCAL_ONLY, item.status)
        assertEquals(45000, item.totalDue)
        assertEquals(1, item.itemCount)
        assertTrue(item.payloadPreview.contains("Miến trộn"))
        assertFalse(item.canWriteToProduction)
        assertFalse(item.canSyncToFirestore)
    }

    @Test
    fun draftFromNotPayablePaymentCloseCreatesBlockedLocalOnlyItem() {
        val writeRepo = FakePosWriteRepository()
        val queueRepo = FakeOfflineQueueRepository()
        val order = writeRepo.openOrder("ban-02").order
        val notPayable = writeRepo.closePaymentDraft(
            order,
            writeRepo.previewPayment(order, PaymentMethod.CASH)
        )

        val item = queueRepo.draftFromPaymentClose(notPayable)

        assertEquals(OfflineQueueStatus.BLOCKED_LOCAL_ONLY, item.status)
        assertEquals("", item.localReceiptNumber)
        assertEquals(0, item.totalDue)
        assertEquals(0, item.itemCount)
        assertTrue(item.payloadPreview.contains("not payable"))
        assertFalse(item.canWriteToProduction)
        assertFalse(item.canSyncToFirestore)
    }

    @Test
    fun appendDraftAddsItemOnceAndKeepsQueueLocalOnly() {
        val writeRepo = FakePosWriteRepository()
        val queueRepo = FakeOfflineQueueRepository()
        val openOrder = writeRepo.addMenuItem(writeRepo.openOrder("ban-03").order, "tra-tac").order
        val paid = writeRepo.closePaymentDraft(openOrder, writeRepo.previewPayment(openOrder, PaymentMethod.CASH))
        val draft = queueRepo.draftFromPaymentClose(paid)
        val initialQueue = OfflineQueueState()

        val once = queueRepo.appendDraft(initialQueue, draft)
        val twice = queueRepo.appendDraft(once, draft)

        assertEquals(1, once.items.size)
        assertEquals(1, twice.items.size)
        assertEquals(15000, twice.pendingTotal)
        assertEquals(1, twice.pendingCount)
        assertFalse(twice.canWriteToProduction)
        assertFalse(twice.canSyncToFirestore)
    }

    @Test
    fun clearQueueKeepsFailClosedGuards() {
        val queueRepo = FakeOfflineQueueRepository()
        val state = OfflineQueueState(
            items = listOf(
                OfflineQueueItem(
                    localQueueId = "queue-local-paid-ban-01-45000",
                    tableId = "ban-01",
                    localReceiptNumber = "local-paid-ban-01-45000",
                    status = OfflineQueueStatus.QUEUED_LOCAL_ONLY,
                    totalDue = 45000,
                    itemCount = 1,
                    payloadPreview = "local only"
                )
            )
        )

        val cleared = queueRepo.clearLocalQueue(state)

        assertTrue(cleared.items.isEmpty())
        assertFalse(cleared.canWriteToProduction)
        assertFalse(cleared.canSyncToFirestore)
    }
}
