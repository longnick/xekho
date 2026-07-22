const ALLOWED_ROLES = new Set(['staff', 'kitchen', 'manager', 'admin']);
const ADMIN_CLAIM_ROLES = new Set(['admin', 'owner', 'superadmin']);
const MANAGER_ASSIGNABLE_ROLES = new Set(['staff', 'kitchen']);
const MIN_PASSWORD_LENGTH = 12;
const STAFF_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

function codedError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  return error;
}

function normalizedRole(value) {
  return String(value || '').trim().toLowerCase();
}

function assertCanManageRole(token, requestedRole) {
  if (!token || typeof token !== 'object' || !token.uid) {
    throw codedError('unauthenticated', 'Authentication is required.');
  }

  const actorRole = normalizedRole(token.role);
  const targetRole = normalizedRole(requestedRole);
  if (!ALLOWED_ROLES.has(targetRole)) {
    throw codedError('invalid-argument', 'Unsupported target role.');
  }

  if (ADMIN_CLAIM_ROLES.has(actorRole)) return;
  if (actorRole === 'manager' && MANAGER_ASSIGNABLE_ROLES.has(targetRole)) return;

  throw codedError('permission-denied', 'The caller cannot manage this role.');
}

function normalizeManagedUserInput(raw = {}) {
  const email = String(raw.email || '').trim().toLowerCase();
  const password = String(raw.password || '');
  const displayName = String(raw.displayName || '').trim();
  const role = normalizedRole(raw.role);
  const staffId = raw.staffId == null ? '' : String(raw.staffId).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw codedError('invalid-argument', 'A valid email is required.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw codedError('invalid-argument', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!displayName) {
    throw codedError('invalid-argument', 'Display name is required.');
  }
  if (!ALLOWED_ROLES.has(role)) {
    throw codedError('invalid-argument', 'Unsupported target role.');
  }
  if (staffId && !STAFF_ID_RE.test(staffId)) {
    throw codedError('invalid-argument', 'Invalid staff mapping.');
  }

  return { email, password, displayName, role, ...(staffId ? { staffId } : {}) };
}

function buildManagedUserDocument({ uid, input, actorUid, now }) {
  const safeUid = String(uid || '').trim();
  const safeActorUid = String(actorUid || '').trim();
  if (!safeUid || !safeActorUid || !input) {
    throw codedError('invalid-argument', 'Missing managed-user document fields.');
  }

  return {
    uid: safeUid,
    email: input.email,
    displayName: input.displayName,
    username: input.email.split('@')[0],
    role: input.role,
    ...(input.staffId ? { staffId: input.staffId } : {}),
    createdBy: safeActorUid,
    createdAt: now,
    updatedAt: now,
  };
}

module.exports = {
  ALLOWED_ROLES,
  assertCanManageRole,
  buildManagedUserDocument,
  normalizeManagedUserInput,
};
