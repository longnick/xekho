package com.xekho.pos.domain

class FakePosWriteRepository {
    fun openOrder(tableId: String): PosWriteResult {
        val order = PosLocalOrder(
            clientOrderId = "local-$tableId-001",
            tableId = tableId,
            status = PosOrderStatus.OPEN,
            items = emptyList(),
            canWriteToProduction = false
        )
        return PosWriteResult(
            order = order,
            message = "opened local-only order",
            canWriteToProduction = false
        )
    }

    fun addItem(order: PosLocalOrder, item: OrderItem): PosWriteResult {
        val mergedItems = mergeItem(order.items, item)
        return PosWriteResult(
            order = order.copy(items = mergedItems, canWriteToProduction = false),
            message = "added local-only item",
            canWriteToProduction = false
        )
    }

    fun closeOrder(order: PosLocalOrder): PosWriteResult = PosWriteResult(
        order = order.copy(status = PosOrderStatus.CLOSED_LOCAL_ONLY, canWriteToProduction = false),
        message = "closed local-only order; not synced",
        canWriteToProduction = false
    )

    private fun mergeItem(items: List<OrderItem>, item: OrderItem): List<OrderItem> {
        val existing = items.firstOrNull { it.id == item.id } ?: return items + item
        return items.map { current ->
            if (current.id == item.id) {
                current.copy(quantity = existing.quantity + item.quantity)
            } else {
                current
            }
        }
    }
}
