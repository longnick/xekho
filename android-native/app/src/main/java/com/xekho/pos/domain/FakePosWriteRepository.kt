package com.xekho.pos.domain

class FakePosWriteRepository {
    private val menuItems = listOf(
        OrderItem(id = "mien-tron", name = "Miến trộn", quantity = 1, unitPrice = 45000),
        OrderItem(id = "tra-tac", name = "Trà tắc", quantity = 1, unitPrice = 15000),
        OrderItem(id = "com-ga", name = "Cơm gà", quantity = 1, unitPrice = 55000)
    )

    fun fakeMenu(): List<OrderItem> = menuItems

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

    fun addMenuItem(order: PosLocalOrder, itemId: String): PosWriteResult {
        val menuItem = menuItems.firstOrNull { it.id == itemId }
            ?: return PosWriteResult(
                order = order.copy(canWriteToProduction = false),
                message = "menu item not found; local order unchanged",
                canWriteToProduction = false
            )
        return addItem(order, menuItem)
    }

    fun addItem(order: PosLocalOrder, item: OrderItem): PosWriteResult {
        val mergedItems = mergeItem(order.items, item)
        return PosWriteResult(
            order = order.copy(items = mergedItems, canWriteToProduction = false),
            message = "added local-only item",
            canWriteToProduction = false
        )
    }

    fun increaseItem(order: PosLocalOrder, itemId: String): PosWriteResult {
        val existing = order.items.firstOrNull { it.id == itemId }
            ?: return PosWriteResult(order.copy(canWriteToProduction = false), "item not found; local order unchanged", false)
        return addItem(order, existing.copy(quantity = 1))
    }

    fun decreaseItem(order: PosLocalOrder, itemId: String): PosWriteResult {
        val nextItems = order.items.mapNotNull { item ->
            when {
                item.id != itemId -> item
                item.quantity > 1 -> item.copy(quantity = item.quantity - 1)
                else -> null
            }
        }
        return PosWriteResult(
            order = order.copy(items = nextItems, canWriteToProduction = false),
            message = "decreased local-only item",
            canWriteToProduction = false
        )
    }

    fun removeItem(order: PosLocalOrder, itemId: String): PosWriteResult = PosWriteResult(
        order = order.copy(items = order.items.filterNot { it.id == itemId }, canWriteToProduction = false),
        message = "removed local-only item",
        canWriteToProduction = false
    )

    fun clearOrder(order: PosLocalOrder): PosWriteResult = PosWriteResult(
        order = order.copy(items = emptyList(), canWriteToProduction = false),
        message = "cleared local-only order",
        canWriteToProduction = false
    )

    fun previewPayment(
        order: PosLocalOrder,
        method: PaymentMethod,
        discount: Long = 0L
    ): PaymentDraft {
        val subtotal = order.total
        val safeDiscount = discount.coerceIn(0L, subtotal)
        val totalDue = subtotal - safeDiscount
        val receiptPreview = buildString {
            appendLine("Bàn: ${order.tableId}")
            appendLine("Thanh toán: ${method.displayName}")
            if (order.items.isEmpty()) {
                appendLine("Chưa có món")
            } else {
                order.items.forEach { item ->
                    appendLine("${item.name} x${item.quantity} = ${item.lineTotal}")
                }
            }
            appendLine("Tạm tính: $subtotal")
            appendLine("Giảm: $safeDiscount")
            appendLine("Cần thu: $totalDue")
            append("LOCAL ONLY - không Firestore, không sync")
        }
        return PaymentDraft(
            tableId = order.tableId,
            method = method,
            subtotal = subtotal,
            discount = safeDiscount,
            totalDue = totalDue,
            itemCount = order.itemCount,
            receiptPreview = receiptPreview,
            canWriteToProduction = false,
            canSyncToFirestore = false
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
