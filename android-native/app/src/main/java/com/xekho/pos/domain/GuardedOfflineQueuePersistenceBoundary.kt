package com.xekho.pos.domain

import java.nio.charset.StandardCharsets
import java.util.Base64

private const val EXPORT_HEADER = "XK_QUEUE_SNAPSHOT_V1"
private const val EXPORT_SCOPE = "LOCAL_ONLY"

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
        val validation = validateSnapshot(snapshot)
        if (validation.status != OfflineQueueSnapshotValidationStatus.VALID_LOCAL_ONLY &&
            validation.status != OfflineQueueSnapshotValidationStatus.EMPTY_LOCAL_ONLY
        ) {
            val emptyState = OfflineQueueState()
            return OfflineQueuePersistenceResult(
                state = emptyState,
                snapshot = snapshotFromState(emptyState, OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY),
                mode = OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY,
                message = "Snapshot local khong hop le; da chan restore, khong dung Room/DB/Firestore.",
                didUseRoom = false,
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
        val restoredState = sanitizeState(OfflineQueueState(items = snapshot.encodedItems.mapNotNull(::decodeItem)))
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

    fun validateSnapshot(snapshot: OfflineQueuePersistenceSnapshot): OfflineQueueSnapshotValidationPreview {
        if (snapshot.mode != OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY) {
            return OfflineQueueSnapshotValidationPreview(
                status = OfflineQueueSnapshotValidationStatus.UNSUPPORTED_LOCAL_ONLY,
                title = "Unsupported snapshot mode",
                lines = listOf(
                    "Snapshot mode ${snapshot.mode.name} is blocked in this sprint.",
                    "No Room/DB restore, no Firestore sync, no production write."
                ),
                itemCount = 0,
                corruptRowCount = snapshot.encodedItems.size,
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
        if (snapshot.encodedItems.isEmpty()) {
            return OfflineQueueSnapshotValidationPreview(
                status = OfflineQueueSnapshotValidationStatus.EMPTY_LOCAL_ONLY,
                title = "Empty local-only snapshot",
                lines = listOf("Snapshot has no queue rows.", "Safe: no Room/DB, no Firestore sync."),
                itemCount = 0,
                corruptRowCount = 0,
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
        val decodedItems = snapshot.encodedItems.map(::decodeItem)
        val corruptCount = decodedItems.count { it == null }
        if (corruptCount > 0) {
            return OfflineQueueSnapshotValidationPreview(
                status = OfflineQueueSnapshotValidationStatus.CORRUPT_LOCAL_ONLY,
                title = "Corrupt local-only snapshot",
                lines = listOf(
                    "Detected $corruptCount corrupt queue row(s).",
                    "Restore is blocked; no Room/DB, no Firestore sync, no production write."
                ),
                itemCount = decodedItems.count { it != null },
                corruptRowCount = corruptCount,
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
        return OfflineQueueSnapshotValidationPreview(
            status = OfflineQueueSnapshotValidationStatus.VALID_LOCAL_ONLY,
            title = "Valid local-only snapshot",
            lines = listOf(
                "${decodedItems.size} queue row(s) can be preview-restored locally.",
                "Still local-only: no Room/DB, no Firestore sync, no production write."
            ),
            itemCount = decodedItems.size,
            corruptRowCount = 0,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun previewExport(snapshot: OfflineQueuePersistenceSnapshot): OfflineQueueSnapshotExportPreview {
        val validation = validateSnapshot(snapshot)
        val safeLines = if (validation.status == OfflineQueueSnapshotValidationStatus.VALID_LOCAL_ONLY ||
            validation.status == OfflineQueueSnapshotValidationStatus.EMPTY_LOCAL_ONLY
        ) {
            snapshot.encodedItems
        } else {
            emptyList()
        }
        val copyableText = buildString {
            appendLine(EXPORT_HEADER)
            appendLine(EXPORT_SCOPE)
            appendLine("version=${snapshot.version}")
            appendLine("items=${safeLines.size}")
            safeLines.forEach { appendLine(it) }
        }.trimEnd()
        return OfflineQueueSnapshotExportPreview(
            snapshot = snapshot.copy(
                encodedItems = safeLines,
                itemCount = safeLines.size,
                canWriteToProduction = false,
                canSyncToFirestore = false,
                isPersistentStorageEnabled = false
            ),
            validation = validation,
            copyableText = copyableText,
            itemCount = safeLines.size,
            didUseRoom = false,
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    fun previewImport(copyableText: String): OfflineQueueSnapshotImportPreview {
        val rawLines = copyableText.lines().map { it.trim() }.filter { it.isNotBlank() }
        val snapshot = if (rawLines.size >= 4 && rawLines[0] == EXPORT_HEADER && rawLines[1] == EXPORT_SCOPE) {
            val encodedRows = rawLines.drop(4)
            OfflineQueuePersistenceSnapshot(
                version = 1,
                mode = OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY,
                encodedItems = encodedRows,
                itemCount = encodedRows.size,
                pendingCount = 0,
                blockedCount = 0,
                retryPreviewCount = 0,
                isPersistentStorageEnabled = false,
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        } else {
            OfflineQueuePersistenceSnapshot(
                mode = OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY,
                encodedItems = listOf("invalid-import-envelope"),
                itemCount = 0,
                isPersistentStorageEnabled = false,
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
        val validation = validateSnapshot(snapshot)
        val safeSnapshot = if (validation.status == OfflineQueueSnapshotValidationStatus.VALID_LOCAL_ONLY ||
            validation.status == OfflineQueueSnapshotValidationStatus.EMPTY_LOCAL_ONLY
        ) {
            snapshot.copy(itemCount = validation.itemCount, canWriteToProduction = false, canSyncToFirestore = false)
        } else {
            OfflineQueuePersistenceSnapshot(
                mode = OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY,
                itemCount = 0,
                isPersistentStorageEnabled = false,
                canWriteToProduction = false,
                canSyncToFirestore = false
            )
        }
        return OfflineQueueSnapshotImportPreview(
            snapshot = safeSnapshot,
            validation = validation,
            rawLineCount = rawLines.size,
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
        val encodedParts = encoded.split("\u001d")
        if (encodedParts.size < 7) return null
        val parts = encodedParts.map { decodePart(it) ?: return null }
        val status = runCatching { OfflineQueueStatus.valueOf(parts[3]) }.getOrNull() ?: return null
        return OfflineQueueItem(
            localQueueId = parts[0],
            tableId = parts[1],
            localReceiptNumber = parts[2],
            status = status,
            totalDue = parts[4].toLongOrNull() ?: return null,
            itemCount = parts[5].toIntOrNull() ?: return null,
            payloadPreview = parts[6],
            canWriteToProduction = false,
            canSyncToFirestore = false
        )
    }

    private fun encodePart(value: String): String = Base64.getEncoder()
        .encodeToString(value.toByteArray(StandardCharsets.UTF_8))

    private fun decodePart(value: String): String? = runCatching {
        String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8)
    }.getOrNull()
}
