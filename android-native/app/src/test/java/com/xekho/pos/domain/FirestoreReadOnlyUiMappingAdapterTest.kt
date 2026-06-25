package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirestoreReadOnlyUiMappingAdapterTest {
    private val repository = GuardedFirestoreReadOnlyRepositoryFactory.defaultRepository()
    private val adapter = FirestoreReadOnlyUiMappingAdapter()

    @Test
    fun mapsRepositoryPreviewToBlockedUiStateWithoutRows() {
        val state = adapter.fromRepositoryPreview(repository.previewCollections())

        assertEquals("Firestore read-only", state.title)
        assertEquals(PosFirestoreReadOnlyRepositoryMode.BLOCKED_PREVIEW_ONLY.displayName, state.modeLabel)
        assertEquals(3, state.collectionCount)
        assertEquals(0, state.sampleRowCount)
        assertTrue(state.isBlocked)
        assertFalse(state.didExecuteRead)
        assertFalse(state.didReadProductionData)
        assertFalse(state.canWriteToProduction)
        assertFalse(state.canSyncToFirestore)
        assertTrue(state.lines.any { it.contains("blocked") })
    }

    @Test
    fun mapsCollectionPreviewToUiRowWithoutProductionSample() {
        val row = adapter.fromCollectionPreview(repository.previewCollection("tables"))

        assertEquals("tables", row.collectionName)
        assertEquals("id, label, status, total, itemCount", row.requiredFieldsLabel)
        assertEquals(0, row.sampleRowCount)
        assertTrue(row.isEmptyPreview)
        assertFalse(row.didExecuteRead)
        assertFalse(row.didReadProductionData)
        assertFalse(row.canWriteToProduction)
        assertTrue(row.safetyLabel.contains("No Firestore read"))
    }

    @Test
    fun mapsContractAndRepositoryIntoDashboardState() {
        val contract = PosFirestoreReadOnlyContract.default()
        val state = adapter.dashboardState(
            repositoryPreview = repository.previewCollections(),
            collectionPreviews = contract.collections.map { repository.previewCollection(it.collectionName) }
        )

        assertEquals(3, state.rows.size)
        assertEquals(listOf("tables", "inventory", "history"), state.rows.map { it.collectionName })
        assertEquals(0, state.rows.sumOf { it.sampleRowCount })
        assertTrue(state.summary.isBlocked)
        assertFalse(state.didExecuteRead)
        assertFalse(state.didReadProductionData)
        assertFalse(state.canWriteToProduction)
    }

    @Test
    fun unknownCollectionMapsToEmptyBlockedUiRow() {
        val row = adapter.fromCollectionPreview(repository.previewCollection("unknown"))

        assertEquals("unknown", row.collectionName)
        assertEquals("", row.requiredFieldsLabel)
        assertEquals(0, row.sampleRowCount)
        assertTrue(row.isEmptyPreview)
        assertFalse(row.didExecuteRead)
        assertFalse(row.didReadProductionData)
    }
}
