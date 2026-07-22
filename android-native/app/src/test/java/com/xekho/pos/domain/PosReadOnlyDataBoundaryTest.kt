package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PosReadOnlyDataBoundaryTest {
    private val boundary = GuardedPosReadOnlyDataBoundary()
    private val fakeSnapshot = FakeDashboardRepository().loadSnapshot()

    @Test
    fun defaultRequestStaysFakeLocalAndBlocksFirebaseRead() {
        val readiness = boundary.evaluate(PosReadOnlyDataRequest())

        assertEquals(PosReadOnlyDataSource.FAKE_LOCAL, readiness.selectedSource)
        assertEquals(PosReadOnlyDataReadinessStatus.FAKE_LOCAL_ACTIVE, readiness.status)
        assertFalse(readiness.canReadFirestore)
        assertFalse(readiness.didReadProductionData)
        assertFalse(readiness.canWriteToProduction)
        assertFalse(readiness.canSyncToFirestore)
        assertTrue(readiness.lines.any { it.contains("fake/local") })
    }

    @Test
    fun firebaseReadOnlyRequestBlocksWhenApprovalOrConfigMissing() {
        val readiness = boundary.evaluate(
            PosReadOnlyDataRequest(
                requestedSource = PosReadOnlyDataSource.FIREBASE_READ_ONLY,
                ownerApprovedReadOnly = false,
                googleServicesJsonPresent = false,
                firestoreSdkLinked = false
            )
        )

        assertEquals(PosReadOnlyDataSource.FAKE_LOCAL, readiness.selectedSource)
        assertEquals(PosReadOnlyDataReadinessStatus.BLOCKED_LOCAL_ONLY, readiness.status)
        assertTrue(readiness.lines.any { it.contains("owner approval missing") })
        assertFalse(readiness.canReadFirestore)
        assertFalse(readiness.didReadProductionData)
    }

    @Test
    fun firebaseReadOnlyRequestIsPrepOnlyEvenWhenAllFlagsPresentInSprint18() {
        val readiness = boundary.evaluate(
            PosReadOnlyDataRequest(
                requestedSource = PosReadOnlyDataSource.FIREBASE_READ_ONLY,
                ownerApprovedReadOnly = true,
                googleServicesJsonPresent = true,
                firestoreSdkLinked = true
            )
        )

        assertEquals(PosReadOnlyDataSource.FAKE_LOCAL, readiness.selectedSource)
        assertEquals(PosReadOnlyDataReadinessStatus.PREP_ONLY_LOCAL_ONLY, readiness.status)
        assertTrue(readiness.lines.any { it.contains("Sprint 18") })
        assertFalse(readiness.canReadFirestore)
        assertFalse(readiness.didReadProductionData)
        assertFalse(readiness.canWriteToProduction)
        assertFalse(readiness.canSyncToFirestore)
    }

    @Test
    fun fakePreviewMapsDashboardToReadOnlyCountsWithoutProductionRead() {
        val preview = boundary.previewFakeLocalData(fakeSnapshot)

        assertEquals(PosReadOnlyDataSource.FAKE_LOCAL, preview.source)
        assertEquals(fakeSnapshot.tables.size, preview.tableCount)
        assertEquals(fakeSnapshot.inventory.size, preview.inventoryCount)
        assertEquals(fakeSnapshot.finance.todayRevenue, preview.todayRevenue)
        assertFalse(preview.didReadProductionData)
        assertFalse(preview.canWriteToProduction)
        assertFalse(preview.canSyncToFirestore)
        assertTrue(preview.lines.any { it.contains("fake/local") })
    }

    @Test
    fun blockedFirebasePreviewNeverReturnsProductionRows() {
        val preview = boundary.previewFirebaseReadOnly(
            PosReadOnlyDataRequest(
                requestedSource = PosReadOnlyDataSource.FIREBASE_READ_ONLY,
                ownerApprovedReadOnly = true,
                googleServicesJsonPresent = true,
                firestoreSdkLinked = true
            )
        )

        assertEquals(PosReadOnlyDataSource.FIREBASE_READ_ONLY, preview.source)
        assertEquals(0, preview.tableCount)
        assertEquals(0, preview.inventoryCount)
        assertEquals(0L, preview.todayRevenue)
        assertFalse(preview.didReadProductionData)
        assertTrue(preview.lines.any { it.contains("blocked") })
    }
}
