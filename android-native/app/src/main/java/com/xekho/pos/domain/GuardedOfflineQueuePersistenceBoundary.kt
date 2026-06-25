package com.xekho.pos.domain

import java.nio.charset.StandardCharsets
import java.util.Base64

class GuardedOfflineQueuePersistenceBoundary {
    fun saveLocalSnapshot(state: OfflineQueueState): OfflineQueuePersistenceResult {
        val safeState = sanitizeState(state)
        val snapshot = snapshotFromState(safeState, OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY)
        return OfflineQueuePersistenceResult(
            state = safeState,
            snapshot = snapshot,
            mode = OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY,
            message = "Đã tạo snapshot queue local-only; chưa dùng Room/DB, chưa sync Firestore.",
            didUseRoom = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun restoreLocalSnapshot(snapshot: OfflineQueuePersistenceSnapshot): OfflineQueuePersistenceResult {
        val restoredState = if (snapshot.mode == OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY) {
            sanitizeState(OfflineQueueState(items = snapshot.encodedItems.mapNotNull(::decodeItem)))
        } else {
            OfflineQueueState()
        }
        val safeSnapshot = snapshotFromState(restoredState, OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY)
        return OfflineQueuePersistenceResult(
            state = restoredState,
            snapshot = safeSnapshot,
            mode = OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY,
            message = "Đã nạp lại snapshot local-only; Room/DB thật vẫn bị chặn.",
            didUseRoom = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun blockedRoomPersistence(state: OfflineQueueState): OfflineQueuePersistenceResult {
        val emptyState = OfflineQueueState()
        return OfflineQueuePersistenceResult(
            state = emptyState,
            snapshot = snapshotFromState(emptyState, OfflineQueuePersistenceMode.ROOM_BLOCKED_LOCAL_ONLY),
            mode = OfflineQueuePersistenceMode.ROOM_BLOCKED_LOCAL_ONLY,
            message = "Room/DB persistence đang bị chặn trong sprint này; queue không được ghi xuống DB thật.",
            didUseRoom = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun clearLocalSnapshot(): OfflineQueuePersistenceResult {
        val emptyState = OfflineQueueState()
        return OfflineQueuePersistenceResult(
            state = emptyState,
            snapshot = snapshotFromState(emptyState, OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY),
            mode = OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY,
            message = "Đã xóa snapshot queue local-only; không đụng Room/DB/Firestore.",
            didUseRoom = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private fun snapshotFromState(
        state: OfflineQueueState,
        mode: OfflineQueuePersistenceMode
    ): OfflineQueuePersistenceSnapshot {
        val safeState = sanitizeState(state)
        return OfflineQueuePersistenceSnapshot(
            version = 1,
            mode = mode,
            encodedItems = if (mode == OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY) {
                safeState.items.map(::encodeItem)
            } else {
                emptyList()
            },
            itemCount = if (mode == OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY) safeState.items.size else 0,
            pendingCount = if (mode == OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY) safeState.pendingCount else 0,
            blockedCount = if (mode == OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY) safeState.blockedCount else 0,
            retryPreviewCount = if (mode == OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY) safeState.retryPreviewCount else 0,
            isPersistentStorageEnabled = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private fun sanitizeState(state: OfflineQueueState): OfflineQueueState = OfflineQueueState(
        items = state.items.map { item ->
            item.copy(canWriteToProduction = false, canSyncToFirestore = false)
        },
        canWriteToProduction = false,
        canSyncToFirestore = false
    )

    private fun encodeItem(item: OfflineQueueItem): String = listOf(
        item.localQueueId,
        item.tableId,
        item.localReceiptNumber,
        item.status.name,
        item.totalDue.toString(),
        item.itemCount.toString(),
        item.payloadPreview
    ).joinToString("\u001d") { part -> encodePart(part) }

    private fun decodeItem(encoded: String): OfflineQueueItem? {
        val parts = encoded.split("\u001d").map(::decodePart)
        if (parts.size < 7) return null
        val status = runCatching { OfflineQueueStatus.valueOf(parts[3]) }.getOrNull() ?: return null
        return OfflineQueueItem(
            localQueueId = parts[0],
            tableId = parts[1],
            localReceiptNumber = parts[2],
            status = status,
            totalDue = parts[4].toLongOrNull() ?: 0L,
            itemCount = parts[5].toIntOrNull() ?: 0,
            payloadPreview = parts[6],
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private fun encodePart(value: String): String = Base64.getEncoder()
        .encodeToString(value.toByteArray(StandardCharsets.UTF_8))

    private fun decodePart(value: String): String = runCatching {
        String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8)
    }.getOrDefault("")
}
