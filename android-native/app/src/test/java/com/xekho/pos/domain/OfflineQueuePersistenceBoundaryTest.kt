package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OfflineQueuePersistenceBoundaryTest {
    private val boundary = GuardedOfflineQueuePersistenceBoundary()

    @Test
    fun saveLocalSnapshotKeepsQueueLocalOnlyAndDoesNotEnableRoom() {
        val state = OfflineQueueState(
            items = listOf(
                OfflineQueueItem(
                    localQueueId = "queue-001",
                    tableId = "ban-02",
                    localReceiptNumber = "receipt-001",
                    status = OfflineQueueStatus.QUEUED_LOCAL_ONLY,
                    totalDue = 125_000L,
                    itemCount = 2,
                    payloadPreview = "LOCAL QUEUE DRAFT ONLY\nno Firestore sync, no production write"
                ),
                OfflineQueueItem(
                    localQueueId = "queue-blocked-ban-03",
                    tableId = "ban-03",
                    localReceiptNumber = "",
                    status = OfflineQueueStatus.BLOCKED_LOCAL_ONLY,
                    totalDue = 0L,
                    itemCount = 0,
                    payloadPreview = "not payable local-only"
                )
            )
        )

        val result = boundary.saveLocalSnapshot(state)

        assertEquals(OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY, result.mode)
        assertEquals(2, result.snapshot.itemCount)
        assertEquals(1, result.snapshot.pendingCount)
        assertEquals(1, result.snapshot.blockedCount)
        assertFalse(result.snapshot.isPersistentStorageEnabled)
        assertFalse(result.snapshot.canWriteToProduction)
        assertFalse(result.snapshot.canSyncToFirestore)
        assertFalse(result.didUseRoom)
        assertFalse(result.canWriteToProduction)
        assertFalse(result.canSyncToFirestore)
    }

    @Test
    fun restoreLocalSnapshotSanitizesWriteAndSyncFlags() {
        val unsafeState = OfflineQueueState(
            items = listOf(
                OfflineQueueItem(
                    localQueueId = "queue-unsafe",
                    tableId = "ban-04",
                    localReceiptNumber = "receipt-unsafe",
                    status = OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY,
                    totalDue = 50_000L,
                    itemCount = 1,
                    payloadPreview = "retry preview",
                    canWriteToProduction = true,
                    canSyncToFirestore = true
                )
            ),
            canWriteToProduction = true,
            canSyncToFirestore = true
        )
        val snapshot = boundary.saveLocalSnapshot(unsafeState).snapshot

        val restored = boundary.restoreLocalSnapshot(snapshot)

        assertEquals(OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY, restored.mode)
        assertEquals(1, restored.state.items.size)
        assertEquals(OfflineQueueStatus.RETRY_PREVIEW_LOCAL_ONLY, restored.state.items.single().status)
        assertFalse(restored.state.canWriteToProduction)
        assertFalse(restored.state.canSyncToFirestore)
        assertFalse(restored.state.items.single().canWriteToProduction)
        assertFalse(restored.state.items.single().canSyncToFirestore)
        assertFalse(restored.didUseRoom)
    }

    @Test
    fun blockedRoomBoundaryDoesNotPersistOrRestoreQueue() {
        val state = OfflineQueueState(
            items = listOf(
                OfflineQueueItem(
                    localQueueId = "queue-001",
                    tableId = "ban-02",
                    localReceiptNumber = "receipt-001",
                    status = OfflineQueueStatus.QUEUED_LOCAL_ONLY,
                    totalDue = 125_000L,
                    itemCount = 2,
                    payloadPreview = "LOCAL QUEUE DRAFT ONLY"
                )
            )
        )

        val result = boundary.blockedRoomPersistence(state)

        assertEquals(OfflineQueuePersistenceMode.ROOM_BLOCKED_LOCAL_ONLY, result.mode)
        assertEquals(0, result.snapshot.itemCount)
        assertTrue(result.state.items.isEmpty())
        assertFalse(result.didUseRoom)
        assertFalse(result.canWriteToProduction)
        assertFalse(result.canSyncToFirestore)
    }

    @Test
    fun clearLocalSnapshotReturnsEmptyLocalOnlyState() {
        val result = boundary.clearLocalSnapshot()

        assertEquals(OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY, result.mode)
        assertTrue(result.state.items.isEmpty())
        assertEquals(0, result.snapshot.itemCount)
        assertFalse(result.snapshot.isPersistentStorageEnabled)
        assertFalse(result.didUseRoom)
    }

    @Test
    fun validateSnapshotRejectsCorruptEncodedRowsWithoutRestoringThem() {
        val corruptSnapshot = OfflineQueuePersistenceSnapshot(
            mode = OfflineQueuePersistenceMode.LOCAL_MEMORY_ONLY,
            encodedItems = listOf("not-base64-row", "also-corrupt"),
            itemCount = 2,
            pendingCount = 2
        )

        val validation = boundary.validateSnapshot(corruptSnapshot)
        val restored = boundary.restoreLocalSnapshot(corruptSnapshot)

        assertEquals(OfflineQueueSnapshotValidationStatus.CORRUPT_LOCAL_ONLY, validation.status)
        assertEquals(2, validation.corruptRowCount)
        assertTrue(validation.lines.any { it.contains("corrupt") })
        assertTrue(restored.state.items.isEmpty())
        assertTrue(restored.message.contains("khong hop le"))
        assertFalse(validation.canWriteToProduction)
        assertFalse(validation.canSyncToFirestore)
    }

    @Test
    fun exportPreviewShowsCopyableLocalOnlyPayloadWithoutEnablingPersistence() {
        val snapshot = boundary.saveLocalSnapshot(
            OfflineQueueState(
                items = listOf(
                    OfflineQueueItem(
                        localQueueId = "queue-export",
                        tableId = "ban-05",
                        localReceiptNumber = "receipt-export",
                        status = OfflineQueueStatus.QUEUED_LOCAL_ONLY,
                        totalDue = 90_000L,
                        itemCount = 3,
                        payloadPreview = "export preview only"
                    )
                )
            )
        ).snapshot

        val exportPreview = boundary.previewExport(snapshot)

        assertEquals(OfflineQueueSnapshotValidationStatus.VALID_LOCAL_ONLY, exportPreview.validation.status)
        assertTrue(exportPreview.copyableText.contains("XK_QUEUE_SNAPSHOT_V1"))
        assertTrue(exportPreview.copyableText.contains("LOCAL_ONLY"))
        assertEquals(1, exportPreview.itemCount)
        assertFalse(exportPreview.didUseRoom)
        assertFalse(exportPreview.canWriteToProduction)
        assertFalse(exportPreview.canSyncToFirestore)
    }

    @Test
    fun importPreviewParsesValidExportAndRejectsTamperedText() {
        val snapshot = boundary.saveLocalSnapshot(
            OfflineQueueState(
                items = listOf(
                    OfflineQueueItem(
                        localQueueId = "queue-import",
                        tableId = "ban-06",
                        localReceiptNumber = "receipt-import",
                        status = OfflineQueueStatus.QUEUED_LOCAL_ONLY,
                        totalDue = 70_000L,
                        itemCount = 1,
                        payloadPreview = "import preview only"
                    )
                )
            )
        ).snapshot
        val exportPreview = boundary.previewExport(snapshot)

        val importPreview = boundary.previewImport(exportPreview.copyableText)
        val tamperedPreview = boundary.previewImport("XK_QUEUE_SNAPSHOT_V1\nLOCAL_ONLY\nnot-a-valid-payload")

        assertEquals(OfflineQueueSnapshotValidationStatus.VALID_LOCAL_ONLY, importPreview.validation.status)
        assertEquals(1, importPreview.snapshot.itemCount)
        assertFalse(importPreview.canWriteToProduction)
        assertFalse(importPreview.canSyncToFirestore)
        assertEquals(OfflineQueueSnapshotValidationStatus.CORRUPT_LOCAL_ONLY, tamperedPreview.validation.status)
        assertEquals(0, tamperedPreview.snapshot.itemCount)
        assertFalse(tamperedPreview.didUseRoom)
    }
}
