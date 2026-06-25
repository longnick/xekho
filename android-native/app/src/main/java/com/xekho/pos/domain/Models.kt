package com.xekho.pos.domain

enum class NativeTab(val label: String) {
    TABLES("B\u00e0n"),
    INVENTORY("Kho"),
    FINANCE("T\u00e0i ch\u00ednh"),
    SETTINGS("C\u00e0i \u0111\u1eb7t")
}

data class TableOverview(
    val id: String,
    val label: String,
    val status: TableStatus,
    val total: Long,
    val itemCount: Int
)

enum class TableStatus(val displayName: String) {
    AVAILABLE("Tr\u1ed1ng"),
    OCCUPIED("\u0110ang ph\u1ee5c v\u1ee5"),
    NEEDS_ATTENTION("C\u1ea7n ki\u1ec3m tra")
}

data class InventoryItem(
    val id: String,
    val name: String,
    val currentQty: Double,
    val unit: String,
    val status: StockStatus
)

enum class StockStatus(val displayName: String) {
    OK("\u0110\u1ee7"),
    LOW("C\u1ea7n nh\u1eadp"),
    OUT("H\u1ebft")
}

data class FinanceSummary(
    val todayRevenue: Long,
    val openOrders: Int,
    val lowStockCount: Int
)

data class OrderItem(
    val id: String,
    val name: String,
    val quantity: Int,
    val unitPrice: Long
) {
    val lineTotal: Long get() = quantity * unitPrice
}

data class OrderDraft(
    val tableId: String,
    val items: List<OrderItem>,
    val canWriteToProduction: Boolean = false
) {
    val total: Long get() = items.sumOf { it.lineTotal }
}

enum class PosOrderStatus(val displayName: String) {
    OPEN("Đang mở local"),
    CLOSED_LOCAL_ONLY("Đã đóng local-only"),
    PAID_LOCAL_ONLY("Đã thu local-only")
}

data class PosLocalOrder(
    val clientOrderId: String,
    val tableId: String,
    val status: PosOrderStatus,
    val items: List<OrderItem> = emptyList(),
    val canWriteToProduction: Boolean = false
) {
    val total: Long get() = items.sumOf { it.lineTotal }
    val itemCount: Int get() = items.sumOf { it.quantity }
}

data class PosWriteResult(
    val order: PosLocalOrder,
    val message: String,
    val canWriteToProduction: Boolean = false
)

enum class PaymentMethod(val displayName: String) {
    CASH("Tiền mặt"),
    BANK_TRANSFER("Chuyển khoản")
}

data class PaymentDraft(
    val tableId: String,
    val method: PaymentMethod,
    val subtotal: Long,
    val discount: Long,
    val totalDue: Long,
    val itemCount: Int,
    val receiptPreview: String,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
) {
    val isPayable: Boolean get() = itemCount > 0 && totalDue > 0
}

enum class PaymentCloseStatus(val displayName: String) {
    CLOSED_LOCAL_ONLY("Đã thu local-only"),
    NOT_PAYABLE_LOCAL_ONLY("Chưa thể thu local-only")
}

data class PaymentCloseResult(
    val order: PosLocalOrder,
    val draft: PaymentDraft,
    val status: PaymentCloseStatus,
    val localReceiptNumber: String,
    val message: String,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
) {
    val isClosedLocal: Boolean get() = status == PaymentCloseStatus.CLOSED_LOCAL_ONLY
}

data class PosTableOrderState(
    val selectedTableId: String,
    val ordersByTable: Map<String, PosLocalOrder>,
    val tableLabelsById: Map<String, String>,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
) {
    val selectedOrder: PosLocalOrder get() = ordersByTable.getValue(selectedTableId)
}

enum class OfflineQueueStatus(val displayName: String) {
    QUEUED_LOCAL_ONLY("Đã xếp hàng local-only"),
    BLOCKED_LOCAL_ONLY("Chưa đủ điều kiện xếp hàng local-only")
}

data class OfflineQueueItem(
    val localQueueId: String,
    val tableId: String,
    val localReceiptNumber: String,
    val status: OfflineQueueStatus,
    val totalDue: Long,
    val itemCount: Int,
    val payloadPreview: String,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class OfflineQueueState(
    val items: List<OfflineQueueItem> = emptyList(),
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
) {
    val pendingCount: Int get() = items.count { it.status == OfflineQueueStatus.QUEUED_LOCAL_ONLY }
    val pendingTotal: Long get() = items.filter { it.status == OfflineQueueStatus.QUEUED_LOCAL_ONLY }.sumOf { it.totalDue }
}

data class DashboardSnapshot(
    val tabs: List<NativeTab>,
    val tables: List<TableOverview>,
    val inventory: List<InventoryItem>,
    val finance: FinanceSummary,
    val draft: OrderDraft
)
