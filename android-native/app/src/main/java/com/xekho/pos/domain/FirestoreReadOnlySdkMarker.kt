package com.xekho.pos.domain

import com.google.firebase.firestore.FirebaseFirestore

object FirestoreReadOnlySdkMarker {
    val firestoreClass: Class<*> = FirebaseFirestore::class.java
    val className: String = firestoreClass.name
    const val isLinked: Boolean = true
    const val canExecuteReads: Boolean = false
    const val canWriteToProduction: Boolean = false
    const val canSyncToFirestore: Boolean = false
}
