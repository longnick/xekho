package com.xekho.pos.domain

class FakePosTableOrderRepository(
    private val writeRepository: FakePosWriteRepository = FakePosWriteRepository()
) {
    fun initialState(tables: List<TableOverview>): PosTableOrderState {
        val safeTables = tables.ifEmpty {
            listOf(TableOverview("ban-02", "Bàn 2", TableStatus.AVAILABLE, 0, 0))
        }
        val orders = safeTables.associate { table ->
            table.id to writeRepository.openOrder(table.id).order
        }
        return PosTableOrderState(
            selectedTableId = safeTables.first().id,
            ordersByTable = orders,
            tableLabelsById = safeTables.associate { it.id to it.label },
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun selectTable(state: PosTableOrderState, tableId: String): PosTableOrderState {
        if (!state.ordersByTable.containsKey(tableId)) return state.copy(
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
        return state.copy(
            selectedTableId = tableId,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun replaceSelectedOrder(state: PosTableOrderState, order: PosLocalOrder): PosTableOrderState {
        val selectedTableId = state.selectedTableId
        if (order.tableId != selectedTableId) return state.copy(
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
        return state.copy(
            ordersByTable = state.ordersByTable + (selectedTableId to order.copy(canWriteToProduction = false)),
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun tableSummaries(state: PosTableOrderState): List<TableOverview> = state.ordersByTable.map { (tableId, order) ->
        TableOverview(
            id = tableId,
            label = state.tableLabelsById[tableId] ?: tableId,
            status = statusForOrder(order),
            total = order.total,
            itemCount = order.itemCount
        )
    }

    private fun statusForOrder(order: PosLocalOrder): TableStatus = when {
        order.status == PosOrderStatus.PAID_LOCAL_ONLY -> TableStatus.NEEDS_ATTENTION
        order.status == PosOrderStatus.CLOSED_LOCAL_ONLY -> TableStatus.NEEDS_ATTENTION
        order.itemCount > 0 -> TableStatus.OCCUPIED
        else -> TableStatus.AVAILABLE
    }
}
