package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirestoreReadOnlyRepositoryFactoryTest {
    private val contract = PosFirestoreReadOnlyContract.default()

    @Test
    fun defaultFactoryReturnsBlockedRepository() {
        val repository = GuardedFirestoreReadOnlyRepositoryFactory.defaultRepository(contract)

        assertEquals(PosFirestoreReadOnlyRepositoryMode.BLOCKED_PREVIEW_ONLY, repository.mode)
        assertFalse(repository.canExecuteReads)
        assertFalse(repository.canWriteToProduction)
        assertFalse(repository.canSyncToFirestore)
    }

    @Test
    fun blockedRepositoryPreviewReturnsContractOnlyRows() {
        val repository = GuardedFirestoreReadOnlyRepositoryFactory.defaultRepository(contract)
        val preview = repository.previewCollections()

        assertEquals(contract.collections.size, preview.collectionCount)
        assertEquals(0, preview.sampleRowCount)
        assertFalse(preview.didInstantiateFirestore)
        assertFalse(preview.didExecuteRead)
        assertFalse(preview.didReadProductionData)
        assertFalse(preview.canWriteToProduction)
        assertTrue(preview.lines.any { it.contains("blocked") })
        assertTrue(preview.lines.any { it.contains("tables") })
    }

    @Test
    fun factoryFromRequestStillBlocksEvenWithApprovalAndLocalConfig() {
        val repository = GuardedFirestoreReadOnlyRepositoryFactory.fromRequest(
            request = PosFirestoreReadOnlyRepositoryRequest(
                ownerApprovedReadOnly = true,
                googleServicesJsonPresent = true,
                firestoreSdkLinked = true,
                allowRealReadExecution = true
            ),
            contract = contract
        )
        val preview = repository.previewCollections()

        assertEquals(PosFirestoreReadOnlyRepositoryMode.APPROVAL_HELD_PREVIEW_ONLY, repository.mode)
        assertFalse(repository.canExecuteReads)
        assertFalse(preview.didInstantiateFirestore)
        assertFalse(preview.didExecuteRead)
        assertTrue(preview.lines.any { it.contains("Sprint 20") })
    }

    @Test
    fun blockedCollectionPreviewNeverQueriesFirestore() {
        val repository = GuardedFirestoreReadOnlyRepositoryFactory.defaultRepository(contract)
        val preview = repository.previewCollection("inventory")

        assertEquals("inventory", preview.collectionName)
        assertEquals(0, preview.sampleRowCount)
        assertFalse(preview.didInstantiateFirestore)
        assertFalse(preview.didExecuteRead)
        assertFalse(preview.didReadProductionData)
        assertTrue(preview.requiredFields.contains("currentQty"))
    }
}
