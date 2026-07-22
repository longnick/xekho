package com.xekho.pos.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakePosCartEditRepositoryTest {
    @Test
    fun menuItemsCanBeAddedAndEditedLocallyWithoutProductionWrite() {
        val repo = FakePosWriteRepository()
        val menu = repo.fakeMenu()
        val order = repo.openOrder("ban-03").order

        assertTrue(menu.any { it.id == "mien-tron" })
        assertTrue(menu.any { it.id == "tra-tac" })

        val withMien = repo.addMenuItem(order, "mien-tron").order
        val withTra = repo.addMenuItem(withMien, "tra-tac").order
        val increased = repo.increaseItem(withTra, "tra-tac").order
        val decreased = repo.decreaseItem(increased, "tra-tac").order

        assertEquals(2, decreased.items.size)
        assertEquals(1, decreased.items.first { it.id == "tra-tac" }.quantity)
        assertEquals(60000, decreased.total)
        assertFalse(decreased.canWriteToProduction)
    }

    @Test
    fun decreaseToZeroRemovesItemAndClearOrderStaysLocalOnly() {
        val repo = FakePosWriteRepository()
        val order = repo.openOrder("ban-04").order
        val withTea = repo.addMenuItem(order, "tra-tac").order
        val removedByDecrease = repo.decreaseItem(withTea, "tra-tac").order

        assertTrue(removedByDecrease.items.none { it.id == "tra-tac" })
        assertEquals(0, removedByDecrease.total)
        assertFalse(removedByDecrease.canWriteToProduction)

        val withTwo = repo.addMenuItem(repo.addMenuItem(removedByDecrease, "mien-tron").order, "tra-tac").order
        val removedExplicitly = repo.removeItem(withTwo, "mien-tron").order
        val cleared = repo.clearOrder(removedExplicitly).order

        assertTrue(cleared.items.isEmpty())
        assertEquals(0, cleared.total)
        assertFalse(cleared.canWriteToProduction)
    }

    @Test
    fun unknownMenuItemLeavesOrderUnchangedWithLocalOnlyMessage() {
        val repo = FakePosWriteRepository()
        val order = repo.openOrder("ban-05").order
        val result = repo.addMenuItem(order, "khong-co")

        assertEquals(order, result.order)
        assertEquals("menu item not found; local order unchanged", result.message)
        assertFalse(result.canWriteToProduction)
    }
}
