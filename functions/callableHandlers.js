function makeCallableHandlers({
  authorize,
  createManagedUser,
  runAskPosChatbot,
  approveOnlineOrder,
  rejectOnlineOrder,
  completeOnlineOrder,
  HttpsError,
  userManagementDeps = {},
}) {
  const orderId = request => {
    const raw = request.data?.orderId;
    const value = typeof raw === 'string' ? raw.trim() : '';
    const invalid = !value
      || value === '.'
      || value === '..'
      || value.includes('/')
      || /[\u0000-\u001f\u007f]/.test(value)
      || Buffer.byteLength(value, 'utf8') > 256;
    if (invalid) throw new HttpsError('invalid-argument', 'Mã đơn online không hợp lệ.');
    return value;
  };
  const actor = request => ({
    source: 'pos',
    userId: request.auth?.uid || '',
    username: request.auth?.token?.email || request.auth?.token?.name || 'pos_user',
  });

  return {
    async manageUserAccount(request) {
      const resolvedActor = await authorize(request, 'USER_MANAGE');
      return createManagedUser(request, { ...userManagementDeps, actor: resolvedActor });
    },
    async askPosChatbot(request) {
      await authorize(request, 'POS_CHATBOT');
      const userMessage = String(request.data?.userMessage || '').trim();
      if (!userMessage) throw new HttpsError('invalid-argument', 'Thiếu userMessage.');
      return runAskPosChatbot(userMessage);
    },
    async approveOnlineOrder(request) {
      await authorize(request, 'ORDER_APPROVE');
      return approveOnlineOrder(orderId(request), actor(request));
    },
    async rejectOnlineOrder(request) {
      await authorize(request, 'ORDER_REJECT');
      return rejectOnlineOrder(orderId(request), actor(request));
    },
    async completeOnlineOrder(request) {
      await authorize(request, 'ORDER_COMPLETE');
      return completeOnlineOrder(orderId(request), actor(request));
    },
  };
}

function toSafeCallableError(error, HttpsError, publicMessage) {
  if (error instanceof HttpsError) return error;
  return new HttpsError('internal', publicMessage);
}

function toSafeManagedUserError(error, HttpsError) {
  if (error instanceof HttpsError) return error;
  const publicErrors = {
    unauthenticated: 'Yêu cầu đăng nhập để quản lý tài khoản nhân viên.',
    'permission-denied': 'Bạn không có quyền quản lý tài khoản nhân viên.',
    'invalid-argument': 'Thông tin tài khoản nhân viên không hợp lệ.',
    'already-exists': 'Tài khoản nhân viên đã tồn tại.',
  };
  const code = Object.hasOwn(publicErrors, error?.code) ? error.code : 'internal';
  return new HttpsError(code, publicErrors[code] || 'Không thể quản lý tài khoản nhân viên.');
}

module.exports = { makeCallableHandlers, toSafeCallableError, toSafeManagedUserError };
