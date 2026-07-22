package com.xekho.pos.auth

import com.xekho.pos.BuildConfig

object FirebaseLocalConfigMetadata {
    fun fromBuildConfig(): FirebaseLocalConfigStatus = FirebaseLocalConfigStatus(
        googleServicesJsonPresent = BuildConfig.GOOGLE_SERVICES_JSON_PRESENT,
        source = BuildConfig.FIREBASE_LOCAL_CONFIG_SOURCE
    )

    val displayLine: String
        get() = fromBuildConfig().displayLine
}

val FirebaseLocalConfigStatus.displayLine: String
    get() = if (googleServicesJsonPresent) {
        "google-services.json: present (local only)"
    } else {
        "google-services.json: not present"
    }
