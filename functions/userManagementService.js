const {
  assertCanManageRole,
  buildManagedUserDocument,
  normalizeManagedUserInput,
} = require('./utils/userManagement');

function nowValue(now) {
  return typeof now === 'function' ? now() : now;
}

async function createManagedUser(request, { auth, db, now = () => new Date().toISOString() }) {
  if (!request?.auth?.uid) {
    const error = new Error('Authentication is required.');
    error.code = 'unauthenticated';
    throw error;
  }

  const input = normalizeManagedUserInput(request.data);
  const actor = {
    uid: request.auth.uid,
    ...(request.auth.token || {}),
  };
  assertCanManageRole(actor, input.role);

  let createdUser = null;
  try {
    createdUser = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: false,
    });
    await auth.setCustomUserClaims(createdUser.uid, { role: input.role });

    const timestamp = nowValue(now);
    await db.collection('users').doc(createdUser.uid).set(buildManagedUserDocument({
      uid: createdUser.uid,
      input,
      actorUid: actor.uid,
      now: timestamp,
    }));

    return { uid: createdUser.uid, role: input.role };
  } catch (error) {
    if (createdUser?.uid) {
      try {
        await auth.deleteUser(createdUser.uid);
      } catch (_) {
        // Preserve the original provisioning failure; cleanup is best effort.
      }
    }
    throw error;
  }
}

module.exports = { createManagedUser };
