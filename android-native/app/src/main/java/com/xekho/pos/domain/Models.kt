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
    BLOCKED_LOCAL_ONLY("Chưa đủ điều kiện xếp hàng local-only"),
    RETRY_PREVIEW_LOCAL_ONLY("Đang xem thử retry local-only")
}

enum class OfflineQueueFilter(val displayName: String) {
    ALL("Tất cả"),
    QUEUED("Đã xếp hàng"),
    BLOCKED("Bị chặn"),
    RETRY_PREVIEW("Retry nháp")
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
    val blockedCount: Int get() = items.count { it.status == OfflineQueueStatus.BLOCKED_LOCAL_ONLY }
    val retryPreviewCount: Int get() = items.count { it.status == OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY }
}

enum class OfflineQueueDetailType(val displayName: String) {
    INFO_LOCAL_ONLY("Thông tin local-only"),
    ERROR_PREVIEW_LOCAL_ONLY("Lỗi nháp local-only"),
    CONFLICT_PREVIEW_LOCAL_ONLY("Xung đột nháp local-only")
}

data class OfflineQueueDetailPreview(
    val localQueueId: String,
    val type: OfflineQueueDetailType,
    val title: String,
    val lines: List<String>,
    val recommendedAction: String,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

enum class OfflineQueuePersistenceMode(val displayName: String) {
    LOCAL_MEMORY_ONLY("Local snapshot boundary only"),
    ROOM_BLOCKED_LOCAL_ONLY("Room/DB blocked local-only")
}

data class OfflineQueuePersistenceSnapshot(
    val version: Int = 1,
    val mode: OfflineQueuePersistenceMode,
    val encodedItems: List<String> = emptyList(),
    val itemCount: Int = 0,
    val pendingCount: Int = 0,
    val blockedCount: Int = 0,
    val retryPreviewCount: Int = 0,
    val isPersistentStorageEnabled: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class OfflineQueuePersistenceResult(
    val state: OfflineQueueState,
    val snapshot: OfflineQueuePersistenceSnapshot,
    val mode: OfflineQueuePersistenceMode,
    val message: String,
    val didUseRoom: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

enum class OfflineQueueSnapshotValidationStatus(val displayName: String) {
    VALID_LOCAL_ONLY("Valid local-only snapshot"),
    EMPTY_LOCAL_ONLY("Empty local-only snapshot"),
    CORRUPT_LOCAL_ONLY("Corrupt local-only snapshot"),
    UNSUPPORTED_LOCAL_ONLY("Unsupported local-only snapshot")
}

data class OfflineQueueSnapshotValidationPreview(
    val status: OfflineQueueSnapshotValidationStatus,
    val title: String,
    val lines: List<String>,
    val itemCount: Int = 0,
    val corruptRowCount: Int = 0,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class OfflineQueueSnapshotExportPreview(
    val snapshot: OfflineQueuePersistenceSnapshot,
    val validation: OfflineQueueSnapshotValidationPreview,
    val copyableText: String,
    val itemCount: Int,
    val didUseRoom: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class OfflineQueueSnapshotImportPreview(
    val snapshot: OfflineQueuePersistenceSnapshot,
    val validation: OfflineQueueSnapshotValidationPreview,
    val rawLineCount: Int,
    val didUseRoom: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

enum class QueueStorageBackend(val displayName: String) {
    NONE_LOCAL_ONLY("No real storage local-only"),
    DATASTORE("DataStore candidate"),
    ROOM("Room candidate")
}

enum class QueueStorageReadinessStatus(val displayName: String) {
    BLOCKED_LOCAL_ONLY("Blocked local-only"),
    PREP_ONLY_LOCAL_ONLY("Prep-only local-only"),
    APPROVAL_HELD_LOCAL_ONLY("Approval held local-only")
}

data class QueueStorageRequest(
    val requestedBackend: QueueStorageBackend = QueueStorageBackend.NONE_LOCAL_ONLY,
    val dependencyDeclared: Boolean = false,
    val ownerApprovedRealPersistence: Boolean = false
)

data class QueueStorageDecision(
    val requestedBackend: QueueStorageBackend,
    val selectedBackend: QueueStorageBackend,
    val status: QueueStorageReadinessStatus,
    val lines: List<String>,
    val isDependencyDeclared: Boolean = false,
    val canPersist: Boolean = false,
    val didOpenDatabase: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class QueueStorageComparison(
    val options: List<QueueStorageDecision>,
    val recommendedFutureBackend: QueueStorageBackend,
    val summary: String,
    val canPersist: Boolean = false,
    val didOpenDatabase: Boolean = false
)

enum class PosReadOnlyDataSource(val displayName: String) {
    FAKE_LOCAL("Fake/local data"),
    FIREBASE_READ_ONLY("Firebase read-only candidate")
}

enum class PosReadOnlyDataReadinessStatus(val displayName: String) {
    FAKE_LOCAL_ACTIVE("Fake/local active"),
    BLOCKED_LOCAL_ONLY("Blocked local-only"),
    PREP_ONLY_LOCAL_ONLY("Prep-only local-only")
}

data class PosReadOnlyDataRequest(
    val requestedSource: PosReadOnlyDataSource = PosReadOnlyDataSource.FAKE_LOCAL,
    val ownerApprovedReadOnly: Boolean = false,
    val googleServicesJsonPresent: Boolean = false,
    val firestoreSdkLinked: Boolean = false
)

data class PosReadOnlyDataReadiness(
    val requestedSource: PosReadOnlyDataSource,
    val selectedSource: PosReadOnlyDataSource,
    val status: PosReadOnlyDataReadinessStatus,
    val lines: List<String>,
    val canReadFirestore: Boolean = false,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class PosReadOnlyDataPreview(
    val source: PosReadOnlyDataSource,
    val tableCount: Int,
    val inventoryCount: Int,
    val todayRevenue: Long,
    val lines: List<String>,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class PosFirestoreReadOnlyCollectionContract(
    val collectionName: String,
    val purpose: String,
    val requiredFields: List<String>,
    val sampleRowCount: Int = 0,
    val canExecuteReads: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class PosFirestoreReadOnlyContractPreview(
    val collectionCount: Int,
    val sampleRowCount: Int,
    val lines: List<String>,
    val didReadFirestore: Boolean = false,
    val canExecuteReads: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

enum class PosFirestoreReadOnlyRepositoryMode(val displayName: String) {
    BLOCKED_PREVIEW_ONLY("Blocked preview only"),
    APPROVAL_HELD_PREVIEW_ONLY("Approval held preview only")
}

data class PosFirestoreReadOnlyRepositoryRequest(
    val ownerApprovedReadOnly: Boolean = false,
    val googleServicesJsonPresent: Boolean = false,
    val firestoreSdkLinked: Boolean = false,
    val allowRealReadExecution: Boolean = false
)

data class PosFirestoreReadOnlyCollectionPreview(
    val collectionName: String,
    val requiredFields: List<String>,
    val sampleRowCount: Int,
    val lines: List<String>,
    val didInstantiateFirestore: Boolean = false,
    val didExecuteRead: Boolean = false,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class PosFirestoreReadOnlyRepositoryPreview(
    val mode: PosFirestoreReadOnlyRepositoryMode,
    val collectionCount: Int,
    val sampleRowCount: Int,
    val lines: List<String>,
    val didInstantiateFirestore: Boolean = false,
    val didExecuteRead: Boolean = false,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class PosFirestoreReadOnlyUiSummary(
    val title: String,
    val modeLabel: String,
    val collectionCount: Int,
    val sampleRowCount: Int,
    val lines: List<String>,
    val isBlocked: Boolean = true,
    val didExecuteRead: Boolean = false,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class PosFirestoreReadOnlyUiRow(
    val collectionName: String,
    val requiredFieldsLabel: String,
    val sampleRowCount: Int,
    val safetyLabel: String,
    val isEmptyPreview: Boolean = true,
    val didExecuteRead: Boolean = false,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class PosFirestoreReadOnlyDashboardState(
    val summary: PosFirestoreReadOnlyUiSummary,
    val rows: List<PosFirestoreReadOnlyUiRow>,
    val didExecuteRead: Boolean = false,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

enum class FirestoreReadOnlyChecklistItemKey {
    OWNER_APPROVAL,
    GOOGLE_SERVICES_JSON,
    FIRESTORE_SDK_LINKED,
    CONTRACT_PREVIEW_REVIEWED,
    REPOSITORY_PREVIEW_REVIEWED
}

enum class FirestoreReadOnlyChecklistStatus(val displayName: String) {
    BLOCKED_LOCAL_ONLY("Blocked local-only"),
    APPROVAL_HELD_LOCAL_ONLY("Approval held local-only")
}

data class FirestoreReadOnlyApprovalChecklistRequest(
    val ownerApprovedReadOnly: Boolean = false,
    val googleServicesJsonPresent: Boolean = false,
    val firestoreSdkLinked: Boolean = false,
    val contractPreviewReviewed: Boolean = false,
    val repositoryPreviewReviewed: Boolean = false,
    val allowFutureReadExecution: Boolean = false
)

data class FirestoreReadOnlyChecklistItem(
    val key: FirestoreReadOnlyChecklistItemKey,
    val label: String,
    val isReady: Boolean,
    val status: FirestoreReadOnlyChecklistStatus,
    val message: String,
    val canExecuteReads: Boolean = false,
    val didInstantiateFirestore: Boolean = false,
    val didExecuteRead: Boolean = false,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class FirestoreReadOnlyApprovalChecklistState(
    val status: FirestoreReadOnlyChecklistStatus,
    val items: List<FirestoreReadOnlyChecklistItem>,
    val summaryLines: List<String>,
    val readyItemCount: Int,
    val requiredItemCount: Int,
    val canExecuteReads: Boolean = false,
    val didInstantiateFirestore: Boolean = false,
    val didExecuteRead: Boolean = false,
    val didReadProductionData: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
)

data class PosFirestoreReadOnlyContract(
    val collections: List<PosFirestoreReadOnlyCollectionContract>,
    val canExecuteReads: Boolean = false,
    val canWriteToProduction: Boolean = false,
    val canSyncToFirestore: Boolean = false
) {
    fun preview(): PosFirestoreReadOnlyContractPreview = PosFirestoreReadOnlyContractPreview(
        collectionCount = collections.size,
        sampleRowCount = 0,
        lines = listOf(
            "Firestore read-only contract only: ${collections.joinToString { it.collectionName }}.",
            "Read execution blocked; no production POS rows sampled.",
            "No writes and no sync."
        ) + collections.map { collection ->
            "${collection.collectionName}: ${collection.purpose}; fields=${collection.requiredFields.joinToString()}"
        },
        didReadFirestore = false,
        canExecuteReads = false,
        canWriteToProduction = false,
        canSyncToFirestore = false
    )

    companion object {
        fun default(): PosFirestoreReadOnlyContract = PosFirestoreReadOnlyContract(
            collections = listOf(
                PosFirestoreReadOnlyCollectionContract(
                    collectionName = "tables",
                    purpose = "read-only table status and current totals contract",
                    requiredFields = listOf("id", "label", "status", "total", "itemCount")
                ),
                PosFirestoreReadOnlyCollectionContract(
                    collectionName = "inventory",
                    purpose = "read-only stock quantity/status contract",
                    requiredFields = listOf("id", "name", "currentQty", "unit", "status")
                ),
                PosFirestoreReadOnlyCollectionContract(
                    collectionName = "history",
                    purpose = "read-only closed local/POS history contract",
                    requiredFields = listOf("id", "tableId", "total", "closedAt", "status")
                )
            ),
            canExecuteReads = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }
}

data class DashboardSnapshot(
    val tabs: List<NativeTab>,
    val tables: List<TableOverview>,
    val inventory: List<InventoryItem>,
    val finance: FinanceSummary,
    val draft: OrderDraft
)
