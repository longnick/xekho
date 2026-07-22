package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirestoreReadOnlyApprovalChecklistTest {
    private val checklist = GuardedFirestoreReadOnlyApprovalChecklist()

    @Test
    fun defaultChecklistBlocksFutureRealReads() {
        val state = checklist.evaluate(FirestoreReadOnlyApprovalChecklistRequest())

        assertEquals(FirestoreReadOnlyChecklistStatus.BLOCKED_LOCAL_ONLY, state.status)
        assertEquals(5, state.items.size)
        assertEquals(0, state.readyItemCount)
        assertFalse(state.canExecuteReads)
        assertFalse(state.didInstantiateFirestore)
        assertFalse(state.didExecuteRead)
        assertFalse(state.didReadProductionData)
        assertFalse(state.canWriteToProduction)
        assertFalse(state.canSyncToFirestore)
        assertTrue(state.summaryLines.any { it.contains("blocked") })
    }

    @Test
    fun configWithoutOwnerApprovalStaysBlocked() {
        val state = checklist.evaluate(
            FirestoreReadOnlyApprovalChecklistRequest(
                googleServicesJsonPresent = true,
                firestoreSdkLinked = true,
                contractPreviewReviewed = true,
                repositoryPreviewReviewed = true
            )
        )

        assertEquals(FirestoreReadOnlyChecklistStatus.BLOCKED_LOCAL_ONLY, state.status)
        assertEquals(4, state.readyItemCount)
        assertTrue(state.items.any { it.key == FirestoreReadOnlyChecklistItemKey.OWNER_APPROVAL && !it.isReady })
        assertFalse(state.canExecuteReads)
    }

    @Test
    fun allLocalChecklistFlagsBecomeApprovalHeldNotExecutable() {
        val state = checklist.evaluate(
            FirestoreReadOnlyApprovalChecklistRequest(
                ownerApprovedReadOnly = true,
                googleServicesJsonPresent = true,
                firestoreSdkLinked = true,
                contractPreviewReviewed = true,
                repositoryPreviewReviewed = true,
                allowFutureReadExecution = true
            )
        )

        assertEquals(FirestoreReadOnlyChecklistStatus.APPROVAL_HELD_LOCAL_ONLY, state.status)
        assertEquals(5, state.readyItemCount)
        assertFalse(state.canExecuteReads)
        assertFalse(state.didInstantiateFirestore)
        assertFalse(state.didExecuteRead)
        assertFalse(state.didReadProductionData)
        assertTrue(state.summaryLines.any { it.contains("Sprint 22") })
    }

    @Test
    fun checklistItemsExposeDisplayLabelsAndLocalOnlyGuards() {
        val state = checklist.evaluate(FirestoreReadOnlyApprovalChecklistRequest(firestoreSdkLinked = true))
        val sdkItem = state.items.first { it.key == FirestoreReadOnlyChecklistItemKey.FIRESTORE_SDK_LINKED }

        assertEquals("Firestore SDK linked", sdkItem.label)
        assertTrue(sdkItem.isReady)
        assertEquals(FirestoreReadOnlyChecklistStatus.BLOCKED_LOCAL_ONLY, sdkItem.status)
        assertFalse(sdkItem.canExecuteReads)
        assertFalse(sdkItem.canWriteToProduction)
        assertFalse(sdkItem.canSyncToFirestore)
    }
}
