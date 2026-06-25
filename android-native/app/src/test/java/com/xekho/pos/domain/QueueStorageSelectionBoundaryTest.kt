package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QueueStorageSelectionBoundaryTest {
    private val boundary = GuardedQueueStorageSelectionBoundary()

    @Test
    fun defaultSelectionKeepsStorageBlockedWithoutDependencies() {
        val decision = boundary.selectStorage(QueueStorageRequest())

        assertEquals(QueueStorageBackend.NONE_LOCAL_ONLY, decision.selectedBackend)
        assertEquals(QueueStorageReadinessStatus.BLOCKED_LOCAL_ONLY, decision.status)
        assertFalse(decision.isDependencyDeclared)
        assertFalse(decision.canPersist)
        assertFalse(decision.didOpenDatabase)
        assertFalse(decision.canWriteToProduction)
        assertFalse(decision.canSyncToFirestore)
        assertTrue(decision.lines.any { it.contains("not requested") })
    }

    @Test
    fun roomRequestStaysBlockedUntilDependencyAndApprovalAreExplicit() {
        val decision = boundary.selectStorage(
            QueueStorageRequest(
                requestedBackend = QueueStorageBackend.ROOM,
                dependencyDeclared = false,
                ownerApprovedRealPersistence = false
            )
        )

        assertEquals(QueueStorageBackend.ROOM, decision.requestedBackend)
        assertEquals(QueueStorageBackend.NONE_LOCAL_ONLY, decision.selectedBackend)
        assertEquals(QueueStorageReadinessStatus.BLOCKED_LOCAL_ONLY, decision.status)
        assertTrue(decision.lines.any { it.contains("Room dependency missing") })
        assertFalse(decision.canPersist)
        assertFalse(decision.didOpenDatabase)
    }

    @Test
    fun dataStoreRequestStaysPrepOnlyWhenDependencyExistsButApprovalMissing() {
        val decision = boundary.selectStorage(
            QueueStorageRequest(
                requestedBackend = QueueStorageBackend.DATASTORE,
                dependencyDeclared = true,
                ownerApprovedRealPersistence = false
            )
        )

        assertEquals(QueueStorageBackend.DATASTORE, decision.requestedBackend)
        assertEquals(QueueStorageBackend.NONE_LOCAL_ONLY, decision.selectedBackend)
        assertEquals(QueueStorageReadinessStatus.PREP_ONLY_LOCAL_ONLY, decision.status)
        assertTrue(decision.lines.any { it.contains("owner approval missing") })
        assertFalse(decision.canPersist)
        assertFalse(decision.didOpenDatabase)
    }

    @Test
    fun explicitApprovalStillDoesNotOpenDatabaseInSprint17() {
        val decision = boundary.selectStorage(
            QueueStorageRequest(
                requestedBackend = QueueStorageBackend.ROOM,
                dependencyDeclared = true,
                ownerApprovedRealPersistence = true
            )
        )

        assertEquals(QueueStorageBackend.ROOM, decision.requestedBackend)
        assertEquals(QueueStorageBackend.NONE_LOCAL_ONLY, decision.selectedBackend)
        assertEquals(QueueStorageReadinessStatus.APPROVAL_HELD_LOCAL_ONLY, decision.status)
        assertTrue(decision.lines.any { it.contains("Sprint 17") })
        assertFalse(decision.canPersist)
        assertFalse(decision.didOpenDatabase)
        assertFalse(decision.canWriteToProduction)
        assertFalse(decision.canSyncToFirestore)
    }

    @Test
    fun compareBackendsRecommendsRoomLaterButKeepsBothBlockedToday() {
        val comparison = boundary.compareBackends()

        assertEquals(2, comparison.options.size)
        assertEquals(QueueStorageBackend.ROOM, comparison.recommendedFutureBackend)
        assertTrue(comparison.summary.contains("Room"))
        assertFalse(comparison.canPersist)
        assertFalse(comparison.didOpenDatabase)
        assertTrue(comparison.options.all { !it.canPersist })
    }
}
