package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RealDataDirectionGateTest {
    private val gate = GuardedRealDataDirectionGate()

    @Test
    fun defaultDirectionStaysFakeLocalAndExplainsRealDataBlocked() {
        val state = gate.evaluate(RealDataDirectionRequest())

        assertEquals(RealDataDirectionMode.FAKE_LOCAL_ACTIVE, state.mode)
        assertEquals(RealDataDirectionStatus.BLOCKED_LOCAL_ONLY, state.status)
        assertEquals(0, state.readyItemCount)
        assertFalse(state.canExecuteReads)
        assertFalse(state.didInstantiateFirestore)
        assertFalse(state.didExecuteRead)
        assertFalse(state.didReadProductionData)
        assertFalse(state.canWriteToProduction)
        assertFalse(state.canSyncToFirestore)
        assertTrue(state.summaryLines.any { it.contains("fake/local") })
        assertTrue(state.summaryLines.any { it.contains("real data") })
    }

    @Test
    fun partialRealDataPrerequisitesStayBlockedWithoutExecutingFirestore() {
        val state = gate.evaluate(
            RealDataDirectionRequest(
                ownerApprovedReadOnly = true,
                firestoreSdkLinked = true,
                contractPreviewReviewed = true
            )
        )

        assertEquals(RealDataDirectionMode.FIREBASE_READ_ONLY_CANDIDATE, state.mode)
        assertEquals(RealDataDirectionStatus.BLOCKED_LOCAL_ONLY, state.status)
        assertTrue(state.readyItemCount in 1 until state.requiredItemCount)
        assertTrue(state.items.any { it.key == RealDataDirectionItemKey.GOOGLE_SERVICES_JSON && !it.isReady })
        assertFalse(state.canExecuteReads)
        assertFalse(state.didInstantiateFirestore)
        assertFalse(state.didExecuteRead)
        assertFalse(state.didReadProductionData)
    }

    @Test
    fun allPrerequisitesStillRequireOneMoreHumanRunApprovalBeforeReads() {
        val state = gate.evaluate(
            RealDataDirectionRequest(
                ownerApprovedReadOnly = true,
                googleServicesJsonPresent = true,
                firestoreSdkLinked = true,
                contractPreviewReviewed = true,
                repositoryPreviewReviewed = true,
                manualQaResultCaptured = true,
                userRequestedRealDataDirection = true,
                allowOneTimeReadExecution = true
            )
        )

        assertEquals(RealDataDirectionMode.FIREBASE_READ_ONLY_CANDIDATE, state.mode)
        assertEquals(RealDataDirectionStatus.READY_FOR_ONE_TIME_APPROVAL_LOCAL_ONLY, state.status)
        assertEquals(state.requiredItemCount, state.readyItemCount)
        assertFalse(state.canExecuteReads)
        assertFalse(state.didInstantiateFirestore)
        assertFalse(state.didExecuteRead)
        assertFalse(state.didReadProductionData)
        assertTrue(state.summaryLines.any { it.contains("one-time") })
        assertTrue(state.summaryLines.any { it.contains("not executed") })
    }

    @Test
    fun requestNeverAllowsWritesOrSyncWhenSwitchingTowardRealData() {
        val state = gate.evaluate(
            RealDataDirectionRequest(
                ownerApprovedReadOnly = true,
                googleServicesJsonPresent = true,
                firestoreSdkLinked = true,
                contractPreviewReviewed = true,
                repositoryPreviewReviewed = true,
                manualQaResultCaptured = true,
                userRequestedRealDataDirection = true,
                allowOneTimeReadExecution = true
            )
        )

        assertFalse(state.canWriteToProduction)
        assertFalse(state.canSyncToFirestore)
        assertTrue(state.items.all { !it.canWriteToProduction && !it.canSyncToFirestore && !it.canExecuteReads })
        assertTrue(state.summaryLines.any { it.contains("write") || it.contains("sync") })
    }
}
