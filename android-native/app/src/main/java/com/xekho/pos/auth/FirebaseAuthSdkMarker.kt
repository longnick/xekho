package com.xekho.pos.auth

import com.google.firebase.auth.FirebaseAuth

object FirebaseAuthSdkMarker {
    const val authClassName: String = "com.google.firebase.auth.FirebaseAuth"
    val repositoryMode: AuthRepositoryMode = AuthRepositoryMode.FIREBASE_BLOCKED

    @Suppress("unused")
    val compileOnlySdkReference = FirebaseAuth::class
}
