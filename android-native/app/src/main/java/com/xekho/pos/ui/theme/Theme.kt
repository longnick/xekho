package com.xekho.pos.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val XekhoColorScheme: ColorScheme = darkColorScheme(
    primary = XekhoPrimary,
    secondary = XekhoSecondary,
    tertiary = XekhoAccent,
    background = XekhoDark,
    surface = XekhoDark,
    onPrimary = XekhoLight,
    onSecondary = XekhoDark,
    onTertiary = XekhoDark,
    onBackground = XekhoLight,
    onSurface = XekhoLight
)

@Composable
fun XekhoTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = XekhoColorScheme,
        typography = Typography,
        content = content
    )
}
