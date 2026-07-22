package com.xekho.pos.domain

class FakeDashboardRepository {
    fun loadSnapshot(): DashboardSnapshot {
        val inventory = listOf(
            InventoryItem(
                id = "mien-dong",
                name = "Mi\u1ebfn dong",
                currentQty = 8.0,
                unit = "kg",
                status = StockStatus.OK
            ),
            InventoryItem(
                id = "rau-thom",
                name = "Rau th\u01a1m",
                currentQty = 1.5,
                unit = "kg",
                status = StockStatus.LOW
            ),
            InventoryItem(
                id = "tra-tac",
                name = "Tr\u00e0 t\u1eafc chai",
                currentQty = 0.0,
                unit = "chai",
                status = StockStatus.OUT
            )
        )

        val tables = listOf(
            TableOverview(id = "ban-01", label = "B\u00e0n 1", status = TableStatus.OCCUPIED, total = 105000, itemCount = 3),
            TableOverview(id = "ban-02", label = "B\u00e0n 2", status = TableStatus.AVAILABLE, total = 0, itemCount = 0),
            TableOverview(id = "mang-ve", label = "Mang v\u1ec1", status = TableStatus.NEEDS_ATTENTION, total = 45000, itemCount = 1)
        )

        val draft = OrderDraft(
            tableId = "ban-01",
            items = listOf(
                OrderItem(id = "mien-tron", name = "Mi\u1ebfn tr\u1ed9n", quantity = 2, unitPrice = 45000),
                OrderItem(id = "tra-tac", name = "Tr\u00e0 t\u1eafc", quantity = 1, unitPrice = 15000)
            )
        )

        return DashboardSnapshot(
            tabs = NativeTab.entries,
            tables = tables,
            inventory = inventory,
            finance = FinanceSummary(
                todayRevenue = 1285000,
                openOrders = tables.count { it.status != TableStatus.AVAILABLE },
                lowStockCount = inventory.count { it.status != StockStatus.OK }
            ),
            draft = draft
        )
    }
}
