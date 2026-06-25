package com.xekho.pos

import org.junit.Assert.assertEquals
import org.junit.Test

class AppBrandTest {
    @Test
    fun appBrandUsesXeKhoPosShell() {
        assertEquals("Xe Kho POS", AppBrand.appName)
        assertEquals("com.xekho.pos", AppBrand.applicationId)
    }
}
