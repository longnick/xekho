package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakePosWriteRepositoryTest {
    @Test
    fun localOpenAddCloseFlowNeverWritesProduction() {
        val repo = FakePosWriteRepository()
        val open = repo.openOrder(tableId = "ban-02")

        assertEquals(PosOrderStatus.OPEN, open.order.status)
        assertEquals("ban-02", open.order.tableId)
        assertTrue(open.order.clientOrderId.startsWith("local-"))
        assertFalse(open.canWriteToProduction)
        assertEquals("opened local-only order", open.message)

        val withItem = repo.addItem(
            order = open.order,
            item = OrderItem(id = "mien-tron", name = "Miến trộn", quantity = 2, unitPrice = 45000)
        )

        assertEquals(90000, withItem.order.total)
        assertEquals(1, withItem.order.items.size)
        assertFalse(withItem.canWriteToProduction)

        val closed = repo.closeOrder(withItem.order)

        assertEquals(PosOrderStatus.CLOSED_LOCAL_ONLY, closed.order.status)
        assertEquals(90000, closed.order.total)
        assertFalse(closed.canWriteToProduction)
        assertEquals("closed local-only order; not synced", closed.message)
    }

    @Test
    fun addItemCombinesSameItemQuantityWithoutProductionPermission() {
        val repo = FakePosWriteRepository()
        val order = repo.openOrder("ban-01").order
        val first = repo.addItem(order, OrderItem("tra-tac", "Trà tắc", 1, 15000)).order
        val second = repo.addItem(first, OrderItem("tra-tac", "Trà tắc", 2, 15000)).order

        assertEquals(1, second.items.size)
        assertEquals(3, second.items.single().quantity)
        assertEquals(45000, second.total)
        assertFalse(second.canWriteToProduction)
    }
}
