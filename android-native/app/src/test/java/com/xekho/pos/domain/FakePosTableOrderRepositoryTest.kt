package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakePosTableOrderRepositoryTest {
    @Test
    fun initialStateSelectsFirstTableAndCreatesLocalOrdersForEachTable() {
        val tables = listOf(
            TableOverview("ban-01", "Bàn 1", TableStatus.AVAILABLE, 0, 0),
            TableOverview("ban-02", "Bàn 2", TableStatus.AVAILABLE, 0, 0),
            TableOverview("mang-ve", "Mang về", TableStatus.AVAILABLE, 0, 0)
        )

        val state = FakePosTableOrderRepository().initialState(tables)

        assertEquals("ban-01", state.selectedTableId)
        assertEquals(3, state.ordersByTable.size)
        assertEquals("ban-01", state.selectedOrder.tableId)
        assertTrue(state.ordersByTable.values.all { it.status == PosOrderStatus.OPEN })
        assertTrue(state.ordersByTable.values.all { !it.canWriteToProduction })
        assertFalse(state.canWriteToProduction)
        assertFalse(state.canSyncToFirestore)
    }

    @Test
    fun selectTableKeepsEachTablesLocalOrderSeparate() {
        val repo = FakePosTableOrderRepository()
        val writeRepo = FakePosWriteRepository()
        val tables = listOf(
            TableOverview("ban-01", "Bàn 1", TableStatus.AVAILABLE, 0, 0),
            TableOverview("ban-02", "Bàn 2", TableStatus.AVAILABLE, 0, 0)
        )
        val state = repo.initialState(tables)
        val ban01WithItem = repo.replaceSelectedOrder(
            state,
            writeRepo.addMenuItem(state.selectedOrder, "mien-tron").order
        )
        val ban02Selected = repo.selectTable(ban01WithItem, "ban-02")
        val ban02WithItem = repo.replaceSelectedOrder(
            ban02Selected,
            writeRepo.addMenuItem(ban02Selected.selectedOrder, "tra-tac").order
        )
        val backToBan01 = repo.selectTable(ban02WithItem, "ban-01")

        assertEquals("ban-01", backToBan01.selectedTableId)
        assertEquals(45000, backToBan01.selectedOrder.total)
        assertEquals(1, backToBan01.selectedOrder.itemCount)
        assertEquals(15000, repo.selectTable(backToBan01, "ban-02").selectedOrder.total)
        assertFalse(backToBan01.canWriteToProduction)
        assertFalse(backToBan01.canSyncToFirestore)
    }

    @Test
    fun selectingUnknownTableKeepsCurrentStateUnchanged() {
        val repo = FakePosTableOrderRepository()
        val state = repo.initialState(
            listOf(TableOverview("ban-01", "Bàn 1", TableStatus.AVAILABLE, 0, 0))
        )

        val unchanged = repo.selectTable(state, "missing-table")

        assertEquals(state.selectedTableId, unchanged.selectedTableId)
        assertEquals(state.ordersByTable, unchanged.ordersByTable)
        assertFalse(unchanged.canWriteToProduction)
        assertFalse(unchanged.canSyncToFirestore)
    }

    @Test
    fun tableSummariesReflectLocalOrderTotalsAndStatuses() {
        val repo = FakePosTableOrderRepository()
        val writeRepo = FakePosWriteRepository()
        val tables = listOf(
            TableOverview("ban-01", "Bàn 1", TableStatus.AVAILABLE, 0, 0),
            TableOverview("ban-02", "Bàn 2", TableStatus.AVAILABLE, 0, 0)
        )
        val state = repo.initialState(tables)
        val withBan01Item = repo.replaceSelectedOrder(
            state,
            writeRepo.addMenuItem(state.selectedOrder, "mien-tron").order
        )
        val paidBan01 = repo.replaceSelectedOrder(
            withBan01Item,
            writeRepo.closePaymentDraft(
                withBan01Item.selectedOrder,
                writeRepo.previewPayment(withBan01Item.selectedOrder, PaymentMethod.CASH)
            ).order
        )

        val summaries = repo.tableSummaries(paidBan01)

        assertEquals(TableStatus.NEEDS_ATTENTION, summaries.first { it.id == "ban-01" }.status)
        assertEquals(45000, summaries.first { it.id == "ban-01" }.total)
        assertEquals(1, summaries.first { it.id == "ban-01" }.itemCount)
        assertEquals(TableStatus.AVAILABLE, summaries.first { it.id == "ban-02" }.status)
        assertFalse(paidBan01.canWriteToProduction)
        assertFalse(paidBan01.canSyncToFirestore)
    }
}
