plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    // Sprint 5 prep only: do not apply in app module until google-services.json/runtime gate is approved.
    alias(libs.plugins.google.services) apply false
}
