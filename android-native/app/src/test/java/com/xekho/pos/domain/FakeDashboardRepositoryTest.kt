package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeDashboardRepositoryTest {
    @Test
    fun fakeDashboardContainsFourNativeMvpTabs() {
        val snapshot = FakeDashboardRepository().loadSnapshot()

        assertEquals(
            listOf("Bàn", "Kho", "Tài chính", "Cài đặt"),
            snapshot.tabs.map { it.label }
        )
        assertTrue(snapshot.tables.any { it.status == TableStatus.OCCUPIED })
        assertTrue(snapshot.inventory.any { it.status == StockStatus.LOW })
        assertTrue(snapshot.finance.todayRevenue > 0)
    }

    @Test
    fun orderDraftCalculatesTotalsWithoutProductionWrites() {
        val draft = OrderDraft(
            tableId = "ban-01",
            items = listOf(
                OrderItem(id = "mien-tron", name = "Miến trộn", quantity = 2, unitPrice = 45000),
                OrderItem(id = "tra-tac", name = "Trà tắc", quantity = 1, unitPrice = 15000)
            )
        )

        assertEquals(105000, draft.total)
        assertEquals(false, draft.canWriteToProduction)
    }
}
