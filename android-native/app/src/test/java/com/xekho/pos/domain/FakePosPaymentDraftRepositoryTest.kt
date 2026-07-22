package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakePosPaymentDraftRepositoryTest {
    @Test
    fun paymentDraftSummarizesCartLocallyWithoutProductionWrite() {
        val repo = FakePosWriteRepository()
        val order = repo.addMenuItem(
            repo.addMenuItem(repo.openOrder("ban-06").order, "mien-tron").order,
            "tra-tac"
        ).order

        val draft = repo.previewPayment(order, PaymentMethod.CASH)

        assertEquals("ban-06", draft.tableId)
        assertEquals(PaymentMethod.CASH, draft.method)
        assertEquals(60000, draft.subtotal)
        assertEquals(0, draft.discount)
        assertEquals(60000, draft.totalDue)
        assertEquals(2, draft.itemCount)
        assertTrue(draft.receiptPreview.contains("Miến trộn x1"))
        assertTrue(draft.receiptPreview.contains("Trà tắc x1"))
        assertFalse(draft.canWriteToProduction)
        assertFalse(draft.canSyncToFirestore)
    }

    @Test
    fun paymentDraftAppliesLocalDiscountButNeverAllowsNegativeTotal() {
        val repo = FakePosWriteRepository()
        val order = repo.addMenuItem(repo.openOrder("ban-07").order, "tra-tac").order

        val draft = repo.previewPayment(order, PaymentMethod.BANK_TRANSFER, discount = 20000)

        assertEquals(PaymentMethod.BANK_TRANSFER, draft.method)
        assertEquals(15000, draft.subtotal)
        assertEquals(15000, draft.discount)
        assertEquals(0, draft.totalDue)
        assertFalse(draft.canWriteToProduction)
        assertFalse(draft.canSyncToFirestore)
    }

    @Test
    fun emptyOrderPaymentDraftStaysLocalOnlyAndNotPayable() {
        val repo = FakePosWriteRepository()
        val order = repo.openOrder("ban-08").order

        val draft = repo.previewPayment(order, PaymentMethod.CASH)

        assertEquals(0, draft.totalDue)
        assertEquals(0, draft.itemCount)
        assertFalse(draft.isPayable)
        assertFalse(draft.canWriteToProduction)
        assertFalse(draft.canSyncToFirestore)
        assertTrue(draft.receiptPreview.contains("Chưa có món"))
    }
}
