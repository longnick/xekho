package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirestoreReadOnlyContractTest {
    private val marker = FirestoreReadOnlySdkMarker
    private val contract = PosFirestoreReadOnlyContract.default()

    @Test
    fun firestoreSdkMarkerIsLinkedButReadExecutionStaysBlocked() {
        assertTrue(marker.isLinked)
        assertEquals("com.google.firebase.firestore.FirebaseFirestore", marker.className)
        assertFalse(marker.canExecuteReads)
        assertFalse(marker.canWriteToProduction)
        assertFalse(marker.canSyncToFirestore)
    }

    @Test
    fun defaultContractDeclaresTablesInventoryAndHistoryCollections() {
        assertEquals(3, contract.collections.size)
        assertEquals(listOf("tables", "inventory", "history"), contract.collections.map { it.collectionName })
        assertTrue(contract.collections.all { it.requiredFields.isNotEmpty() })
        assertFalse(contract.canExecuteReads)
        assertFalse(contract.canWriteToProduction)
        assertFalse(contract.canSyncToFirestore)
    }

    @Test
    fun contractPreviewIsLocalOnlyAndDoesNotReadFirestore() {
        val preview = contract.preview()

        assertEquals(3, preview.collectionCount)
        assertEquals(0, preview.sampleRowCount)
        assertFalse(preview.didReadFirestore)
        assertFalse(preview.canExecuteReads)
        assertTrue(preview.lines.any { it.contains("tables") })
        assertTrue(preview.lines.any { it.contains("blocked") })
    }

    @Test
    fun readOnlyBoundarySeesFirestoreSdkButStillBlocksReadsInSprint19() {
        val readiness = GuardedPosReadOnlyDataBoundary().evaluate(
            PosReadOnlyDataRequest(
                requestedSource = PosReadOnlyDataSource.FIREBASE_READ_ONLY,
                ownerApprovedReadOnly = true,
                googleServicesJsonPresent = true,
                firestoreSdkLinked = marker.isLinked
            )
        )

        assertEquals(PosReadOnlyDataReadinessStatus.PREP_ONLY_LOCAL_ONLY, readiness.status)
        assertEquals(PosReadOnlyDataSource.FAKE_LOCAL, readiness.selectedSource)
        assertFalse(readiness.canReadFirestore)
        assertFalse(readiness.didReadProductionData)
        assertTrue(readiness.lines.any { it.contains("Sprint 19") })
    }
}
