package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakePosPaymentCloseRepositoryTest {
    @Test
    fun closePaymentDraftMarksOrderPaidLocalOnlyWithoutProductionWrite() {
        val repo = FakePosWriteRepository()
        val order = repo.addMenuItem(repo.openOrder("ban-09").order, "com-ga").order
        val draft = repo.previewPayment(order, PaymentMethod.CASH)

        val result = repo.closePaymentDraft(order, draft)

        assertEquals(PaymentCloseStatus.CLOSED_LOCAL_ONLY, result.status)
        assertEquals(PosOrderStatus.PAID_LOCAL_ONLY, result.order.status)
        assertEquals("ban-09", result.order.tableId)
        assertEquals(55000, result.draft.totalDue)
        assertTrue(result.localReceiptNumber.startsWith("local-paid-ban-09-"))
        assertTrue(result.message.contains("local-only"))
        assertTrue(result.isClosedLocal)
        assertFalse(result.canWriteToProduction)
        assertFalse(result.canSyncToFirestore)
        assertFalse(result.order.canWriteToProduction)

        val editAfterPaid = repo.addMenuItem(result.order, "tra-tac").order
        assertEquals(PosOrderStatus.PAID_LOCAL_ONLY, editAfterPaid.status)
        assertEquals(result.order.items, editAfterPaid.items)
    }

    @Test
    fun closePaymentDraftRejectsEmptyOrZeroDraftWithoutClosingOrder() {
        val repo = FakePosWriteRepository()
        val order = repo.openOrder("ban-10").order
        val draft = repo.previewPayment(order, PaymentMethod.BANK_TRANSFER)

        val result = repo.closePaymentDraft(order, draft)

        assertEquals(PaymentCloseStatus.NOT_PAYABLE_LOCAL_ONLY, result.status)
        assertEquals(PosOrderStatus.OPEN, result.order.status)
        assertEquals(0, result.draft.totalDue)
        assertEquals("", result.localReceiptNumber)
        assertFalse(result.isClosedLocal)
        assertFalse(result.canWriteToProduction)
        assertFalse(result.canSyncToFirestore)
    }

    @Test
    fun closePaymentDraftDoesNotConvertAlreadyClosedOrderToPaid() {
        val repo = FakePosWriteRepository()
        val order = repo.addMenuItem(repo.openOrder("ban-11").order, "mien-tron").order
        val closedOrder = repo.closeOrder(order).order
        val draft = repo.previewPayment(closedOrder, PaymentMethod.CASH)

        val result = repo.closePaymentDraft(closedOrder, draft)

        assertEquals(PaymentCloseStatus.NOT_PAYABLE_LOCAL_ONLY, result.status)
        assertEquals(PosOrderStatus.CLOSED_LOCAL_ONLY, result.order.status)
        assertEquals("", result.localReceiptNumber)
        assertFalse(result.isClosedLocal)
        assertFalse(result.canWriteToProduction)
        assertFalse(result.canSyncToFirestore)
    }
}
