package com.xekho.pos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.xekho.pos.ui.AppRoot
import com.xekho.pos.ui.theme.XekhoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            XekhoTheme {
                AppRoot()
            }
        }
    }
}
