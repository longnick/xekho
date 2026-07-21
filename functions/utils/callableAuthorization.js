const { HttpsError } = require('firebase-functions/v2/https');

// Copied from reviewed R2 source: order/user mutation requires manager+, POS chat also permits staff.
const CALLABLE_ALLOWED_ROLES = {
  ORDER_APPROVE: ['manager', 'admin', 'owner', 'superadmin'],
  ORDER_REJECT: ['manager', 'admin', 'owner', 'superadmin'],
  USER_MANAGE: ['manager', 'admin', 'owner', 'superadmin'],
  POS_CHATBOT: ['staff', 'manager', 'admin', 'owner', 'superadmin'],
};

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

async function resolveCallerRole(db, auth, uid) {
  if (!uid) return '';

  const userSnap = await db.collection('users').doc(uid).get();
  if (userSnap.exists) return normalizeRole(userSnap.data()?.role);

  const decoded = await auth.getUser(uid);
  return normalizeRole(decoded.customClaims?.role);
}

async function authorizeCallable(request, { db, auth, allowedRoles, operation }) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Yêu cầu đăng nhập để thực hiện thao tác này.');
  }

  const role = await resolveCallerRole(db, auth, request.auth.uid);
  if (!allowedRoles.includes(role)) {
    throw new HttpsError('permission-denied', 'Bạn không có quyền thực hiện thao tác này.');
  }

  return { uid: request.auth.uid, role };
}

module.exports = { authorizeCallable, resolveCallerRole, CALLABLE_ALLOWED_ROLES };
