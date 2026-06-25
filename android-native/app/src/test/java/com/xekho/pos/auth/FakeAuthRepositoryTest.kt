package com.xekho.pos.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeAuthRepositoryTest {
    @Test
    fun initialSessionLocksPosTabsUntilPinIsAccepted() {
        val repository = FakeAuthRepository()

        val initial = repository.initialSession()
        assertFalse(initial.canAccessPosTabs)
        assertEquals(AuthStage.LOCKED, initial.stage)

        val rejected = repository.verifyPin("0000", initial)
        assertFalse(rejected.canAccessPosTabs)
        assertEquals(AuthStage.LOCKED, rejected.stage)
        assertEquals("PIN kh\u00f4ng \u0111\u00fang", rejected.errorMessage)

        val accepted = repository.verifyPin("1234", rejected)
        assertTrue(accepted.canAccessPosTabs)
        assertEquals(AuthStage.UNLOCKED, accepted.stage)
        assertEquals("Nh\u00e2n vi\u00ean demo", accepted.staffName)
    }

    @Test
    fun logoutReturnsToLockedLocalOnlyState() {
        val repository = FakeAuthRepository()
        val unlocked = repository.verifyPin("1234", repository.initialSession())

        val locked = repository.lock(unlocked)

        assertFalse(locked.canAccessPosTabs)
        assertEquals(AuthStage.LOCKED, locked.stage)
        assertEquals(null, locked.errorMessage)
        assertTrue(locked.isLocalOnly)
    }
}
