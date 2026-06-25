package com.xekho.pos.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.xekho.pos.AppBrand
import com.xekho.pos.auth.AuthReadinessReporter
import com.xekho.pos.auth.FirebaseLocalConfigMetadata
import com.xekho.pos.auth.AuthRepository
import com.xekho.pos.auth.AuthRepositoryFactory
import com.xekho.pos.auth.AuthSession
import com.xekho.pos.auth.AuthStage
import com.xekho.pos.domain.DashboardSnapshot
import com.xekho.pos.domain.FakeDashboardRepository
import com.xekho.pos.domain.FakeOfflineQueueRepository
import com.xekho.pos.domain.FakePosTableOrderRepository
import com.xekho.pos.domain.FirestoreReadOnlySdkMarker
import com.xekho.pos.domain.FirestoreReadOnlyUiMappingAdapter
import com.xekho.pos.domain.FirestoreReadOnlyApprovalChecklistRequest
import com.xekho.pos.domain.GuardedFirestoreReadOnlyRepositoryFactory
import com.xekho.pos.domain.GuardedFirestoreReadOnlyApprovalChecklist
import com.xekho.pos.domain.GuardedOfflineQueuePersistenceBoundary
import com.xekho.pos.domain.GuardedPosReadOnlyDataBoundary
import com.xekho.pos.domain.GuardedQueueStorageSelectionBoundary
import com.xekho.pos.domain.FakePosWriteRepository
import com.xekho.pos.domain.InventoryItem
import com.xekho.pos.domain.NativeTab
import com.xekho.pos.domain.OfflineQueueFilter
import com.xekho.pos.domain.OfflineQueueDetailPreview
import com.xekho.pos.domain.OfflineQueueItem
import com.xekho.pos.domain.OfflineQueuePersistenceSnapshot
import com.xekho.pos.domain.OfflineQueueSnapshotExportPreview
import com.xekho.pos.domain.OfflineQueueSnapshotImportPreview
import com.xekho.pos.domain.OfflineQueueSnapshotValidationPreview
import com.xekho.pos.domain.OfflineQueueState
import com.xekho.pos.domain.OfflineQueueStatus
import com.xekho.pos.domain.OrderItem
import com.xekho.pos.domain.PaymentDraft
import com.xekho.pos.domain.PaymentMethod
import com.xekho.pos.domain.PosFirestoreReadOnlyContract
import com.xekho.pos.domain.PosFirestoreReadOnlyContractPreview
import com.xekho.pos.domain.PosFirestoreReadOnlyDashboardState
import com.xekho.pos.domain.FirestoreReadOnlyApprovalChecklistState
import com.xekho.pos.domain.PosFirestoreReadOnlyRepositoryPreview
import com.xekho.pos.domain.PosLocalOrder
import com.xekho.pos.domain.PosOrderStatus
import com.xekho.pos.domain.PosReadOnlyDataPreview
import com.xekho.pos.domain.PosReadOnlyDataReadiness
import com.xekho.pos.domain.PosReadOnlyDataRequest
import com.xekho.pos.domain.PosReadOnlyDataSource
import com.xekho.pos.domain.PosTableOrderState
import com.xekho.pos.domain.QueueStorageComparison
import com.xekho.pos.domain.QueueStorageDecision
import com.xekho.pos.domain.QueueStorageRequest
import com.xekho.pos.domain.QueueStorageBackend
import com.xekho.pos.domain.TableOverview
import com.xekho.pos.ui.theme.XekhoTheme

private val authSessionSaver: Saver<AuthSession, List<String?>> = Saver(
    save = { session ->
        listOf(
            session.stage.name,
            session.staffName,
            session.errorMessage,
            session.isLocalOnly.toString()
        )
    },
    restore = { saved ->
        AuthSession(
            stage = AuthStage.valueOf(saved[0] ?: AuthStage.LOCKED.name),
            staffName = saved[1],
            errorMessage = saved[2],
            isLocalOnly = saved.getOrNull(3)?.toBooleanStrictOrNull() ?: true
        )
    }
)

private val posLocalOrderSaver: Saver<PosLocalOrder, List<String>> = Saver(
    save = { order ->
        listOf(
            order.clientOrderId,
            order.tableId,
            order.status.name,
            order.canWriteToProduction.toString()
        ) + order.items.map { item ->
            listOf(item.id, item.name, item.quantity.toString(), item.unitPrice.toString()).joinToString("\t")
        }
    },
    restore = { saved ->
        val items = saved.drop(4).mapNotNull { encoded ->
            val parts = encoded.split("\t")
            if (parts.size == 4) {
                OrderItem(
                    id = parts[0],
                    name = parts[1],
                    quantity = parts[2].toIntOrNull() ?: 0,
                    unitPrice = parts[3].toLongOrNull() ?: 0L
                )
            } else {
                null
            }
        }
        PosLocalOrder(
            clientOrderId = saved.getOrNull(0) ?: "local-restored",
            tableId = saved.getOrNull(1) ?: "ban-02",
            status = saved.getOrNull(2)?.let { PosOrderStatus.valueOf(it) } ?: PosOrderStatus.OPEN,
            canWriteToProduction = saved.getOrNull(3)?.toBooleanStrictOrNull() ?: false,
            items = items
        )
    }
)

private val posTableOrderStateSaver: Saver<PosTableOrderState, List<String>> = Saver(
    save = { state ->
        listOf(state.selectedTableId) + state.ordersByTable.map { (tableId, order) ->
            val itemPayload = order.items.joinToString("\u001e") { item ->
                listOf(item.id, item.name, item.quantity.toString(), item.unitPrice.toString()).joinToString("\u001f")
            }
            listOf(
                tableId,
                state.tableLabelsById[tableId] ?: tableId,
                order.clientOrderId,
                order.tableId,
                order.status.name,
                order.canWriteToProduction.toString(),
                itemPayload
            ).joinToString("\u001d")
        }
    },
    restore = { saved ->
        val rows = saved.drop(1)
        val orders = rows.mapNotNull { row ->
            val parts = row.split("\u001d")
            if (parts.size >= 7) {
                val items = parts[6].takeIf { it.isNotBlank() }?.split("\u001e")?.mapNotNull { encodedItem ->
                    val itemParts = encodedItem.split("\u001f")
                    if (itemParts.size == 4) {
                        OrderItem(
                            id = itemParts[0],
                            name = itemParts[1],
                            quantity = itemParts[2].toIntOrNull() ?: 0,
                            unitPrice = itemParts[3].toLongOrNull() ?: 0L
                        )
                    } else {
                        null
                    }
                } ?: emptyList()
                parts[0] to PosLocalOrder(
                    clientOrderId = parts[2],
                    tableId = parts[3],
                    status = parts[4].let { PosOrderStatus.valueOf(it) },
                    canWriteToProduction = parts[5].toBooleanStrictOrNull() ?: false,
                    items = items
                )
            } else {
                null
            }
        }.toMap()
        val labels = rows.mapNotNull { row ->
            val parts = row.split("\u001d")
            if (parts.size >= 2) parts[0] to parts[1] else null
        }.toMap()
        val selected = saved.firstOrNull().takeIf { it != null && orders.containsKey(it) }
            ?: orders.keys.firstOrNull()
            ?: "ban-02"
        PosTableOrderState(
            selectedTableId = selected,
            ordersByTable = orders.ifEmpty {
                mapOf("ban-02" to PosLocalOrder("local-ban-02-001", "ban-02", PosOrderStatus.OPEN))
            },
            tableLabelsById = labels.ifEmpty { mapOf("ban-02" to "Bàn 2") },
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }
)

private val offlineQueueStateSaver: Saver<OfflineQueueState, List<String>> = Saver(
    save = { state ->
        state.items.map { item ->
            listOf(
                item.localQueueId,
                item.tableId,
                item.localReceiptNumber,
                item.status.name,
                item.totalDue.toString(),
                item.itemCount.toString(),
                item.payloadPreview,
                item.canWriteToProduction.toString(),
                item.canSyncToFirestore.toString()
            ).joinToString("\u001d")
        }
    },
    restore = { saved ->
        OfflineQueueState(
            items = saved.mapNotNull { row ->
                val parts = row.split("\u001d")
                if (parts.size >= 9) {
                    OfflineQueueItem(
                        localQueueId = parts[0],
                        tableId = parts[1],
                        localReceiptNumber = parts[2],
                        status = parts[3].let { OfflineQueueStatus.valueOf(it) },
                        totalDue = parts[4].toLongOrNull() ?: 0L,
                        itemCount = parts[5].toIntOrNull() ?: 0,
                        payloadPreview = parts[6],
                        canWriteToProduction = false,
                        canSyncToFirestore = false
                    )
                } else {
                    null
                }
            },
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }
)

@Composable
fun AppRoot(
    modifier: Modifier = Modifier,
    snapshot: DashboardSnapshot = remember { FakeDashboardRepository().loadSnapshot() },
    authRepository: AuthRepository = remember { AuthRepositoryFactory.defaultRepository() }
) {
    var authSession by rememberSaveable(stateSaver = authSessionSaver) {
        mutableStateOf(authRepository.initialSession())
    }

    if (!authSession.canAccessPosTabs) {
        AuthGateScreen(
            modifier = modifier,
            authSession = authSession,
            onPinSubmit = { pin -> authSession = authRepository.verifyPin(pin, authSession) }
        )
        return
    }

    MainDashboard(
        modifier = modifier,
        snapshot = snapshot,
        authSession = authSession,
        onLock = { authSession = authRepository.lock(authSession) }
    )
}

@Composable
private fun AuthGateScreen(
    modifier: Modifier = Modifier,
    authSession: AuthSession,
    onPinSubmit: (String) -> Unit
) {
    var pin by remember { mutableStateOf("") }

    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = AppBrand.appName,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Kh\u00f3a POS native \u00b7 fake auth local-only",
                color = MaterialTheme.colorScheme.onBackground,
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(modifier = Modifier.height(20.dp))
            OutlinedTextField(
                value = pin,
                onValueChange = { pin = it.take(8) },
                label = { Text("PIN demo") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                supportingText = { Text("Demo PIN: 1234. Ch\u01b0a k\u1ebft n\u1ed1i Firebase Auth.") }
            )
            if (authSession.errorMessage != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = authSession.errorMessage,
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = { onPinSubmit(pin) }) {
                Text("M\u1edf kh\u00f3a local")
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "An to\u00e0n: m\u00e0n n\u00e0y kh\u00f4ng \u0111\u1ecdc .env, service account, Firestore hay POS production data.",
                color = MaterialTheme.colorScheme.secondary,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun MainDashboard(
    modifier: Modifier = Modifier,
    snapshot: DashboardSnapshot,
    authSession: AuthSession,
    onLock: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(NativeTab.TABLES) }
    val posWriteRepository = remember { FakePosWriteRepository() }
    val tableOrderRepository = remember { FakePosTableOrderRepository(posWriteRepository) }
    val offlineQueueRepository = remember { FakeOfflineQueueRepository() }
    val offlineQueuePersistenceBoundary = remember { GuardedOfflineQueuePersistenceBoundary() }
    val queueStorageBoundary = remember { GuardedQueueStorageSelectionBoundary() }
    val posReadOnlyDataBoundary = remember { GuardedPosReadOnlyDataBoundary() }
    val defaultPosReadiness = remember { posReadOnlyDataBoundary.evaluate(PosReadOnlyDataRequest()) }
    val fakePosPreview = remember(snapshot) { posReadOnlyDataBoundary.previewFakeLocalData(snapshot) }
    val firestoreReadOnlyContract = remember { PosFirestoreReadOnlyContract.default() }
    val firestoreReadOnlyContractPreview = remember { firestoreReadOnlyContract.preview() }
    val firestoreReadOnlyRepositoryPreview = remember(firestoreReadOnlyContract) {
        GuardedFirestoreReadOnlyRepositoryFactory.defaultRepository(firestoreReadOnlyContract).previewCollections()
    }
    val firestoreReadOnlyUiState = remember(firestoreReadOnlyContract, firestoreReadOnlyRepositoryPreview) {
        val repository = GuardedFirestoreReadOnlyRepositoryFactory.defaultRepository(firestoreReadOnlyContract)
        FirestoreReadOnlyUiMappingAdapter().dashboardState(
            repositoryPreview = firestoreReadOnlyRepositoryPreview,
            collectionPreviews = firestoreReadOnlyContract.collections.map { repository.previewCollection(it.collectionName) }
        )
    }
    val firestoreReadOnlyApprovalChecklist = remember {
        GuardedFirestoreReadOnlyApprovalChecklist().evaluate(
            FirestoreReadOnlyApprovalChecklistRequest(
                firestoreSdkLinked = true,
                contractPreviewReviewed = true,
                repositoryPreviewReviewed = true
            )
        )
    }
    val firebaseReadOnlyPreview = remember {
        posReadOnlyDataBoundary.previewFirebaseReadOnly(
            PosReadOnlyDataRequest(requestedSource = PosReadOnlyDataSource.FIREBASE_READ_ONLY)
        )
    }
    val defaultStorageDecision = remember { queueStorageBoundary.selectStorage(QueueStorageRequest()) }
    val roomStorageDecision = remember {
        queueStorageBoundary.selectStorage(QueueStorageRequest(requestedBackend = QueueStorageBackend.ROOM))
    }
    val storageComparison = remember { queueStorageBoundary.compareBackends() }
    var savedQueueSnapshot by remember { mutableStateOf<OfflineQueuePersistenceSnapshot?>(null) }
    var tableOrderState by rememberSaveable(stateSaver = posTableOrderStateSaver) {
        mutableStateOf(tableOrderRepository.initialState(snapshot.tables))
    }
    var offlineQueueState by rememberSaveable(stateSaver = offlineQueueStateSaver) {
        mutableStateOf(OfflineQueueState())
    }
    var selectedQueueFilterName by rememberSaveable { mutableStateOf(OfflineQueueFilter.ALL.name) }
    var selectedQueueDetailId by rememberSaveable { mutableStateOf("") }
    var queuePersistenceMessage by rememberSaveable { mutableStateOf("Chưa lưu snapshot queue local") }
    var queueImportText by rememberSaveable { mutableStateOf("") }
    var queueValidationPreview by remember { mutableStateOf<OfflineQueueSnapshotValidationPreview?>(null) }
    var queueExportPreview by remember { mutableStateOf<OfflineQueueSnapshotExportPreview?>(null) }
    var queueImportPreview by remember { mutableStateOf<OfflineQueueSnapshotImportPreview?>(null) }
    val selectedQueueFilter = OfflineQueueFilter.valueOf(selectedQueueFilterName)
    val filteredQueueItems = offlineQueueRepository.filterItems(offlineQueueState, selectedQueueFilter)
    val selectedQueueDetail = selectedQueueDetailId.takeIf { it.isNotBlank() }?.let { id ->
        offlineQueueRepository.previewDetail(offlineQueueState, id)
    }
    val localOrder = tableOrderState.selectedOrder
    var localPaymentCloseMessage by rememberSaveable { mutableStateOf("Chưa thu local") }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                snapshot.tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Text(text = tab.label.take(1)) },
                        label = { Text(text = tab.label) }
                    )
                }
            }
        }
    ) { paddingValues ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(20.dp)
            ) {
                Header(snapshot = snapshot, authSession = authSession, onLock = onLock)
                Spacer(modifier = Modifier.height(16.dp))
                when (selectedTab) {
                    NativeTab.TABLES -> TablesScreen(
                        tables = tableOrderRepository.tableSummaries(tableOrderState),
                        selectedTableId = tableOrderState.selectedTableId,
                        menuItems = posWriteRepository.fakeMenu(),
                        localOrder = localOrder,
                        paymentDraft = posWriteRepository.previewPayment(localOrder, PaymentMethod.CASH),
                        offlineQueueState = offlineQueueState,
                        filteredQueueItems = filteredQueueItems,
                        selectedQueueFilter = selectedQueueFilter,
                        selectedQueueDetail = selectedQueueDetail,
                        queuePersistenceSnapshot = savedQueueSnapshot,
                        queuePersistenceMessage = queuePersistenceMessage,
                        queueValidationPreview = queueValidationPreview,
                        queueExportPreview = queueExportPreview,
                        queueImportPreview = queueImportPreview,
                        queueImportText = queueImportText,
                        defaultStorageDecision = defaultStorageDecision,
                        roomStorageDecision = roomStorageDecision,
                        storageComparison = storageComparison,
                        defaultPosReadiness = defaultPosReadiness,
                        fakePosPreview = fakePosPreview,
                        firestoreReadOnlyContractPreview = firestoreReadOnlyContractPreview,
                        firestoreReadOnlyRepositoryPreview = firestoreReadOnlyRepositoryPreview,
                        firestoreReadOnlyUiState = firestoreReadOnlyUiState,
                        firestoreReadOnlyApprovalChecklist = firestoreReadOnlyApprovalChecklist,
                        firebaseReadOnlyPreview = firebaseReadOnlyPreview,
                        localPaymentCloseMessage = localPaymentCloseMessage,
                        onSelectTable = { tableId ->
                            tableOrderState = tableOrderRepository.selectTable(tableOrderState, tableId)
                            localPaymentCloseMessage = "Chưa thu local"
                        },
                        onOpenLocalOrder = {
                            val opened = posWriteRepository.openOrder(tableOrderState.selectedTableId).order
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(tableOrderState, opened)
                            localPaymentCloseMessage = "Chưa thu local"
                        },
                        onAddMenuItem = { itemId ->
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(
                                tableOrderState,
                                posWriteRepository.addMenuItem(localOrder, itemId).order
                            )
                        },
                        onIncreaseItem = { itemId ->
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(
                                tableOrderState,
                                posWriteRepository.increaseItem(localOrder, itemId).order
                            )
                        },
                        onDecreaseItem = { itemId ->
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(
                                tableOrderState,
                                posWriteRepository.decreaseItem(localOrder, itemId).order
                            )
                        },
                        onRemoveItem = { itemId ->
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(
                                tableOrderState,
                                posWriteRepository.removeItem(localOrder, itemId).order
                            )
                        },
                        onClearOrder = {
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(
                                tableOrderState,
                                posWriteRepository.clearOrder(localOrder).order
                            )
                        },
                        onClosePaymentDraft = {
                            val draft = posWriteRepository.previewPayment(localOrder, PaymentMethod.CASH)
                            val closeResult = posWriteRepository.closePaymentDraft(localOrder, draft)
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(tableOrderState, closeResult.order)
                            localPaymentCloseMessage = "${closeResult.status.displayName} · ${closeResult.localReceiptNumber.ifBlank { "không có biên nhận" }} · không sync"
                        },
                        onQueueLocalDraft = {
                            val draft = posWriteRepository.previewPayment(localOrder, PaymentMethod.CASH)
                            val closeResult = posWriteRepository.closePaymentDraft(localOrder, draft)
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(tableOrderState, closeResult.order)
                            offlineQueueState = offlineQueueRepository.appendDraft(
                                offlineQueueState,
                                offlineQueueRepository.draftFromPaymentClose(closeResult)
                            )
                            localPaymentCloseMessage = "${closeResult.status.displayName} · xếp hàng local-only · không sync"
                        },
                        onClearOfflineQueue = {
                            offlineQueueState = offlineQueueRepository.clearLocalQueue(offlineQueueState)
                            selectedQueueDetailId = ""
                        },
                        onSelectQueueFilter = { filter ->
                            selectedQueueFilterName = filter.name
                        },
                        onRetryQueuePreview = { localQueueId ->
                            offlineQueueState = offlineQueueRepository.retryPreview(offlineQueueState, localQueueId)
                            selectedQueueFilterName = OfflineQueueFilter.RETRY_PREVIEW.name
                            selectedQueueDetailId = localQueueId
                            localPaymentCloseMessage = "Retry preview local-only · không sync"
                        },
                        onShowQueueDetail = { localQueueId ->
                            selectedQueueDetailId = localQueueId
                        },
                        onSaveQueueSnapshot = {
                            val result = offlineQueuePersistenceBoundary.saveLocalSnapshot(offlineQueueState)
                            savedQueueSnapshot = result.snapshot
                            queuePersistenceMessage = "${result.message} · ${result.snapshot.itemCount} item"
                        },
                        onRestoreQueueSnapshot = {
                            val snapshotToRestore = savedQueueSnapshot
                            if (snapshotToRestore == null) {
                                queuePersistenceMessage = "Chưa có snapshot local để nạp lại; không đụng Room/DB."
                            } else {
                                val result = offlineQueuePersistenceBoundary.restoreLocalSnapshot(snapshotToRestore)
                                offlineQueueState = result.state
                                queuePersistenceMessage = "${result.message} · nạp ${result.snapshot.itemCount} item"
                            }
                        },
                        onBlockedRoomPersistence = {
                            val result = offlineQueuePersistenceBoundary.blockedRoomPersistence(offlineQueueState)
                            queuePersistenceMessage = result.message
                        },
                        onClearQueueSnapshot = {
                            val result = offlineQueuePersistenceBoundary.clearLocalSnapshot()
                            savedQueueSnapshot = null
                            queueValidationPreview = null
                            queueExportPreview = null
                            queueImportPreview = null
                            queueImportText = ""
                            queuePersistenceMessage = result.message
                        },
                        onValidateQueueSnapshot = {
                            val snapshotToValidate = savedQueueSnapshot
                            if (snapshotToValidate == null) {
                                queuePersistenceMessage = "Chưa có snapshot local để validate; không đụng Room/DB."
                            } else {
                                val validation = offlineQueuePersistenceBoundary.validateSnapshot(snapshotToValidate)
                                queueValidationPreview = validation
                                queuePersistenceMessage = "Validate snapshot: ${validation.status.displayName} · corrupt ${validation.corruptRowCount}"
                            }
                        },
                        onPreviewQueueExport = {
                            val snapshotToExport = savedQueueSnapshot ?: offlineQueuePersistenceBoundary.saveLocalSnapshot(offlineQueueState).snapshot
                            val exportPreview = offlineQueuePersistenceBoundary.previewExport(snapshotToExport)
                            savedQueueSnapshot = exportPreview.snapshot
                            queueExportPreview = exportPreview
                            queueImportText = exportPreview.copyableText
                            queueValidationPreview = exportPreview.validation
                            queuePersistenceMessage = "Export preview local-only · ${exportPreview.itemCount} item · chưa lưu DB"
                        },
                        onQueueImportTextChange = { text ->
                            queueImportText = text
                        },
                        onPreviewQueueImport = {
                            val importPreview = offlineQueuePersistenceBoundary.previewImport(queueImportText)
                            queueImportPreview = importPreview
                            queueValidationPreview = importPreview.validation
                            queuePersistenceMessage = "Import preview local-only · ${importPreview.validation.status.displayName} · ${importPreview.snapshot.itemCount} item"
                        },
                        onUseImportSnapshot = {
                            val preview = queueImportPreview
                            if (preview == null) {
                                queuePersistenceMessage = "Chưa có import preview để nạp; không đụng Room/DB."
                            } else {
                                savedQueueSnapshot = preview.snapshot
                                val result = offlineQueuePersistenceBoundary.restoreLocalSnapshot(preview.snapshot)
                                offlineQueueState = result.state
                                queuePersistenceMessage = "Dùng import snapshot local-only · ${result.snapshot.itemCount} item · không sync"
                            }
                        },
                        onFillCorruptImportSample = {
                            queueImportText = "XK_QUEUE_SNAPSHOT_V1\nLOCAL_ONLY\nversion=1\nitems=1\nnot-a-valid-payload"
                            val importPreview = offlineQueuePersistenceBoundary.previewImport(queueImportText)
                            queueImportPreview = importPreview
                            queueValidationPreview = importPreview.validation
                            queuePersistenceMessage = "Đã tạo mẫu corrupt local-only để xem lỗi restore."
                        },
                        onCloseLocalOrder = {
                            tableOrderState = tableOrderRepository.replaceSelectedOrder(
                                tableOrderState,
                                posWriteRepository.closeOrder(localOrder).order
                            )
                        }
                    )
                    NativeTab.INVENTORY -> InventoryScreen(snapshot.inventory)
                    NativeTab.FINANCE -> FinanceScreen(snapshot)
                    NativeTab.SETTINGS -> SettingsScreen()
                }
            }
        }
    }
}

@Composable
private fun Header(snapshot: DashboardSnapshot, authSession: AuthSession, onLock: () -> Unit) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = AppBrand.appName,
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${authSession.staffName ?: "Local staff"} \u00b7 fake data only \u00b7 no Firebase writes",
                    color = MaterialTheme.colorScheme.onBackground,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            TextButton(onClick = onLock) {
                Text("Kh\u00f3a")
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Doanh thu", formatVnd(snapshot.finance.todayRevenue), Modifier.weight(1f))
            StatCard("\u0110\u01a1n m\u1edf", snapshot.finance.openOrders.toString(), Modifier.weight(1f))
            StatCard("Kho c\u1ea7n nh\u1eadp", snapshot.finance.lowStockCount.toString(), Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f))
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            Text(text = value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        }
    }
}

@Composable
private fun TablesScreen(
    tables: List<TableOverview>,
    selectedTableId: String,
    menuItems: List<OrderItem>,
    localOrder: PosLocalOrder,
    paymentDraft: PaymentDraft,
    offlineQueueState: OfflineQueueState,
    filteredQueueItems: List<OfflineQueueItem>,
    selectedQueueFilter: OfflineQueueFilter,
    selectedQueueDetail: OfflineQueueDetailPreview?,
    queuePersistenceSnapshot: OfflineQueuePersistenceSnapshot?,
    queuePersistenceMessage: String,
    queueValidationPreview: OfflineQueueSnapshotValidationPreview?,
    queueExportPreview: OfflineQueueSnapshotExportPreview?,
    queueImportPreview: OfflineQueueSnapshotImportPreview?,
    queueImportText: String,
    defaultStorageDecision: QueueStorageDecision,
    roomStorageDecision: QueueStorageDecision,
    storageComparison: QueueStorageComparison,
    defaultPosReadiness: PosReadOnlyDataReadiness,
    fakePosPreview: PosReadOnlyDataPreview,
    firestoreReadOnlyContractPreview: PosFirestoreReadOnlyContractPreview,
    firestoreReadOnlyRepositoryPreview: PosFirestoreReadOnlyRepositoryPreview,
    firestoreReadOnlyUiState: PosFirestoreReadOnlyDashboardState,
    firestoreReadOnlyApprovalChecklist: FirestoreReadOnlyApprovalChecklistState,
    firebaseReadOnlyPreview: PosReadOnlyDataPreview,
    localPaymentCloseMessage: String,
    onSelectTable: (String) -> Unit,
    onOpenLocalOrder: () -> Unit,
    onAddMenuItem: (String) -> Unit,
    onIncreaseItem: (String) -> Unit,
    onDecreaseItem: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
    onClearOrder: () -> Unit,
    onClosePaymentDraft: () -> Unit,
    onQueueLocalDraft: () -> Unit,
    onClearOfflineQueue: () -> Unit,
    onSelectQueueFilter: (OfflineQueueFilter) -> Unit,
    onRetryQueuePreview: (String) -> Unit,
    onShowQueueDetail: (String) -> Unit,
    onSaveQueueSnapshot: () -> Unit,
    onRestoreQueueSnapshot: () -> Unit,
    onBlockedRoomPersistence: () -> Unit,
    onClearQueueSnapshot: () -> Unit,
    onValidateQueueSnapshot: () -> Unit,
    onPreviewQueueExport: () -> Unit,
    onQueueImportTextChange: (String) -> Unit,
    onPreviewQueueImport: () -> Unit,
    onUseImportSnapshot: () -> Unit,
    onFillCorruptImportSample: () -> Unit,
    onCloseLocalOrder: () -> Unit
) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.14f))) {
                Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                    Text("POS local multi-table flow", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "Bàn đang chọn: $selectedTableId · ${localOrder.status.displayName} · ${localOrder.clientOrderId} · ${localOrder.itemCount} món · ${formatVnd(localOrder.total)}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        "Local-only: chọn bàn, giữ giỏ riêng từng bàn, tăng/giảm/xóa tại máy; không Firestore, không production write, không sync.",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.secondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = onOpenLocalOrder) { Text("Mở lại") }
                        TextButton(onClick = onClearOrder) { Text("Xóa giỏ") }
                        TextButton(onClick = onClosePaymentDraft) { Text("Thu local") }
                        TextButton(onClick = onQueueLocalDraft) { Text("Xếp queue") }
                        TextButton(onClick = onCloseLocalOrder) { Text("Đóng local") }
                    }
                }
            }
        }
        item {
            SectionCard(
                "Thanh toán nháp local",
                "${paymentDraft.method.displayName} · ${paymentDraft.itemCount} món · Tạm tính ${formatVnd(paymentDraft.subtotal)} · Cần thu ${formatVnd(paymentDraft.totalDue)}\n" +
                    "${if (paymentDraft.isPayable) "Có thể xem nháp thu tiền local" else "Chưa có món để thu"}\n" +
                    "Kết quả thu: $localPaymentCloseMessage\n" +
                    "Không ghi production, không sync Firestore."
            )
        }
        item {
            SectionCard(
                "Offline queue nháp local",
                "${offlineQueueState.pendingCount} queued · ${offlineQueueState.blockedCount} blocked · ${offlineQueueState.retryPreviewCount} retry nháp · ${formatVnd(offlineQueueState.pendingTotal)}\n" +
                    "Bộ lọc: ${selectedQueueFilter.displayName}. Chỉ là hàng đợi nháp trong máy: không Firestore, không sync, không production write."
            )
        }
        item {
            SectionCard(
                "Persistence boundary local-only",
                "Snapshot: ${queuePersistenceSnapshot?.itemCount ?: 0} item · Room/DB: blocked · persistent storage: off\n" +
                    "$queuePersistenceMessage\n" +
                    "Boundary chỉ encode/decode snapshot local; chưa Room, chưa DB thật, chưa sync Firestore."
            )
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(onClick = onSaveQueueSnapshot) { Text("Lưu snapshot local") }
                TextButton(onClick = onRestoreQueueSnapshot) { Text("Nạp snapshot local") }
                TextButton(onClick = onBlockedRoomPersistence) { Text("Thử Room/DB (blocked)") }
                TextButton(onClick = onClearQueueSnapshot) { Text("Xóa snapshot local") }
                TextButton(onClick = onValidateQueueSnapshot) { Text("Validate snapshot") }
                TextButton(onClick = onPreviewQueueExport) { Text("Export preview") }
            }
        }
        item {
            SectionCard(
                "Import/export preview local-only",
                "Validation: ${queueValidationPreview?.status?.displayName ?: "Chưa validate"} · corrupt ${queueValidationPreview?.corruptRowCount ?: 0}\n" +
                    "Export: ${queueExportPreview?.itemCount ?: 0} item · Import: ${queueImportPreview?.snapshot?.itemCount ?: 0} item\n" +
                    "Preview chỉ để kiểm tra/copy snapshot local; không Room/DB, không Firestore sync, không production write."
            )
        }
        if (queueValidationPreview != null) {
            item {
                SectionCard(
                    "Snapshot validation detail",
                    "${queueValidationPreview.title}\n" + queueValidationPreview.lines.joinToString("\n")
                )
            }
        }
        item {
            OutlinedTextField(
                value = queueImportText,
                onValueChange = { onQueueImportTextChange(it.take(4000)) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Snapshot import/export text") },
                minLines = 3,
                maxLines = 6,
                supportingText = { Text("Local-only preview; dán snapshot hoặc dùng Export preview để tự điền.") }
            )
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(onClick = onPreviewQueueImport) { Text("Preview import") }
                TextButton(onClick = onUseImportSnapshot) { Text("Dùng import snapshot local") }
                TextButton(onClick = onFillCorruptImportSample) { Text("Mẫu corrupt") }
            }
        }
        if (queueExportPreview != null) {
            item {
                SectionCard(
                    "Export copy preview",
                    queueExportPreview.copyableText.take(600)
                )
            }
        }
        item {
            SectionCard(
                "POS data prep Sprint 18",
                "Source: ${defaultPosReadiness.selectedSource.displayName} · ${defaultPosReadiness.status.displayName}\n" +
                    "Fake preview: ${fakePosPreview.tableCount} bàn · ${fakePosPreview.inventoryCount} kho · ${formatVnd(fakePosPreview.todayRevenue)}\n" +
                    "Firebase read-only candidate: ${firebaseReadOnlyPreview.lines.first()}\n" +
                    "No Firestore read, no production POS data returned, no writes."
            )
        }
        item {
            SectionCard(
                "Firestore contract Sprint 19",
                "SDK marker: ${FirestoreReadOnlySdkMarker.className}\n" +
                    "Collections: ${firestoreReadOnlyContractPreview.collectionCount} · sample rows ${firestoreReadOnlyContractPreview.sampleRowCount}\n" +
                    firestoreReadOnlyContractPreview.lines.take(4).joinToString("\n") + "\n" +
                    "Read execution blocked, no production data sampled, no writes."
            )
        }
        item {
            SectionCard(
                "Firestore repository Sprint 20",
                "Mode: ${firestoreReadOnlyRepositoryPreview.mode.displayName}\n" +
                    "Collections: ${firestoreReadOnlyRepositoryPreview.collectionCount} · sample rows ${firestoreReadOnlyRepositoryPreview.sampleRowCount}\n" +
                    firestoreReadOnlyRepositoryPreview.lines.take(4).joinToString("\n") + "\n" +
                    "No Firestore instance, no query/get/listener, no production rows, no writes."
            )
        }
        item {
            SectionCard(
                "Firestore UI mapping Sprint 21",
                "${firestoreReadOnlyUiState.summary.title} · ${firestoreReadOnlyUiState.summary.modeLabel}\n" +
                    "Rows: ${firestoreReadOnlyUiState.rows.size} · sample rows ${firestoreReadOnlyUiState.rows.sumOf { it.sampleRowCount }}\n" +
                    firestoreReadOnlyUiState.rows.joinToString("\n") { row ->
                        "${row.collectionName}: ${row.requiredFieldsLabel.ifBlank { "no contract fields" }} · ${row.safetyLabel}"
                    } + "\nNo Firestore execution, no production rows, no writes."
            )
        }
        item {
            SectionCard(
                "Firestore approval checklist Sprint 22",
                "Status: ${firestoreReadOnlyApprovalChecklist.status.displayName} · ${firestoreReadOnlyApprovalChecklist.readyItemCount}/${firestoreReadOnlyApprovalChecklist.requiredItemCount} ready\n" +
                    firestoreReadOnlyApprovalChecklist.items.joinToString("\n") { item ->
                        "${if (item.isReady) "✓" else "•"} ${item.label}: ${item.message}"
                    } + "\n" +
                    firestoreReadOnlyApprovalChecklist.summaryLines.joinToString("\n") +
                    "\nNo Firestore instance, no query/get/listener, no production rows, no writes."
            )
        }
        item {
            SectionCard(
                "Firebase read-only guard",
                defaultPosReadiness.lines.joinToString("\n") + "\n\n" + firebaseReadOnlyPreview.lines.take(3).joinToString("\n")
            )
        }
        item {
            SectionCard(
                "Storage prep boundary Sprint 17",
                "Default: ${defaultStorageDecision.status.displayName} · selected ${defaultStorageDecision.selectedBackend.displayName}\n" +
                    "Room candidate: ${roomStorageDecision.status.displayName} · dependency ${if (roomStorageDecision.isDependencyDeclared) "declared" else "missing"}\n" +
                    "Future recommendation: ${storageComparison.recommendedFutureBackend.displayName}\n" +
                    "${storageComparison.summary}\n" +
                    "No Room/DataStore file opened, no production write, no Firestore sync."
            )
        }
        item {
            SectionCard(
                "Storage options blocked today",
                storageComparison.options.joinToString("\n\n") { option ->
                    "${option.requestedBackend.displayName}: ${option.status.displayName}\n" + option.lines.joinToString("\n")
                }
            )
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                OfflineQueueFilter.entries.forEach { filter ->
                    TextButton(onClick = { onSelectQueueFilter(filter) }) {
                        Text(if (filter == selectedQueueFilter) "✓ ${filter.displayName}" else filter.displayName)
                    }
                }
            }
        }
        if (selectedQueueDetail != null) {
            item {
                SectionCard(
                    "Chi tiết queue local",
                    "${selectedQueueDetail.type.displayName} · ${selectedQueueDetail.title}\n" +
                        selectedQueueDetail.lines.joinToString("\n") +
                        "\nHành động gợi ý: ${selectedQueueDetail.recommendedAction}\n" +
                        "Không ghi production, không sync Firestore."
                )
            }
        }
        if (filteredQueueItems.isNotEmpty()) {
            items(filteredQueueItems) { queueItem ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.12f))) {
                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                        Text(queueItem.status.displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("${queueItem.localQueueId} · ${queueItem.tableId} · ${queueItem.itemCount} món · ${formatVnd(queueItem.totalDue)}")
                        Text("Không sync Firestore, không ghi production.", style = MaterialTheme.typography.labelMedium)
                        TextButton(onClick = { onShowQueueDetail(queueItem.localQueueId) }) { Text("Chi tiết lỗi") }
                        if (queueItem.status == OfflineQueueStatus.BLOCKED_LOCAL_ONLY) {
                            TextButton(onClick = { onRetryQueuePreview(queueItem.localQueueId) }) { Text("Retry nháp") }
                        }
                    }
                }
            }
            item {
                TextButton(onClick = onClearOfflineQueue) { Text("Xóa queue local") }
            }
        }
        item {
            SectionCard("Menu mẫu", menuItems.joinToString("\n") { item -> "${item.name} · ${formatVnd(item.unitPrice)}" })
        }
        items(menuItems) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(formatVnd(item.unitPrice), style = MaterialTheme.typography.bodyMedium)
                    }
                    TextButton(onClick = { onAddMenuItem(item.id) }) { Text("Thêm") }
                }
            }
        }
        items(localOrder.items) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f))) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("${item.name} x${item.quantity}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(formatVnd(item.lineTotal), style = MaterialTheme.typography.bodyMedium)
                    }
                    TextButton(onClick = { onDecreaseItem(item.id) }) { Text("-") }
                    TextButton(onClick = { onIncreaseItem(item.id) }) { Text("+") }
                    TextButton(onClick = { onRemoveItem(item.id) }) { Text("Xóa") }
                }
            }
        }
        item {
            SectionCard("Chọn bàn local", "Mỗi bàn giữ một order local riêng; chọn bàn không ghi server.")
        }
        items(tables) { table ->
            val isSelected = table.id == selectedTableId
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (isSelected) {
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    }
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "${if (isSelected) "✓ " else ""}${table.label}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(text = table.status.displayName, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(horizontalAlignment = Alignment.End) {
                        Text(text = formatVnd(table.total), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        Text(text = "${table.itemCount} món", style = MaterialTheme.typography.labelMedium)
                        TextButton(onClick = { onSelectTable(table.id) }) { Text(if (isSelected) "Đang chọn" else "Chọn") }
                    }
                }
            }
        }
    }
}

@Composable
private fun InventoryScreen(items: List<InventoryItem>) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(items) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                    Text(text = item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(text = "${item.currentQty} ${item.unit} \u00b7 ${item.status.displayName}")
                }
            }
        }
    }
}

@Composable
private fun FinanceScreen(snapshot: DashboardSnapshot) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("T\u00e0i ch\u00ednh h\u00f4m nay", "Doanh thu fake: ${formatVnd(snapshot.finance.todayRevenue)}")
        SectionCard("POS dry-run", "Gi\u1ecf h\u00e0ng m\u1eabu: ${formatVnd(snapshot.draft.total)} · ch\u01b0a cho ghi production")
    }
}

@Composable
private fun SettingsScreen() {
    val authReport = AuthReadinessReporter.report(
        localConfigStatus = FirebaseLocalConfigMetadata.fromBuildConfig()
    )
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Tr\u1ea1ng th\u00e1i", "Sprint 9: Metadata reads local config presence; app default v\u1eabn l\u00e0 FAKE_LOCAL.")
        SectionCard("Auth readiness", authReport.displayLines.joinToString("\n"))
        SectionCard("An to\u00e0n", "Kh\u00f4ng service account, kh\u00f4ng .env, kh\u00f4ng POS production data trong APK n\u00e0y.")
    }
}

@Composable
private fun SectionCard(title: String, body: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

private fun formatVnd(value: Long): String = "%,d\u0111".format(value)

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun AppRootPreview() {
    XekhoTheme {
        AppRoot()
    }
}
