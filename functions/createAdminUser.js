const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { getAuth } = require('firebase-admin/auth');

/**
 * HTTPS Cloud Function: Tạo tài khoản admin mới nếu chưa tồn tại
 * Method: POST
 * Body: { email: "admin@ganhkho.vn", password: "8899", displayName: "Admin POS" }
 * Response: { success: boolean, message: string, uid?: string, error?: string }
 */
exports.createAdminUser = onRequest(
  { cors: true, region: 'asia-southeast1' },
  async (req, res) => {
    // Chỉ cho phép POST
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
    }

    const { email = 'admin@ganhkho.vn', password = '8899', displayName = 'Admin POS' } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Thiếu email hoặc mật khẩu.' });
    }

    try {
      const auth = getAuth();

      // Kiểm tra nếu email đã tồn tại
      let existing;
      try {
        existing = await auth.getUserByEmail(email);
      } catch (e) {
        // Không tìm thấy -> tạo mới
      }

      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Tài khoản đã tồn tại.',
          uid: existing.uid,
        });
      }

      // Tạo user mới
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true, // tự động xác thực để tránh bước email
      });

      // Gán custom claim role = admin để phân quyền
      await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });

      logger.info(`[createAdminUser] Đã tạo admin mới: ${email} (${userRecord.uid})`);

      return res.status(201).json({
        success: true,
        message: 'Tạo tài khoản admin thành công.',
        uid: userRecord.uid,
      });
    } catch (err) {
      logger.error('[createAdminUser]', err);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo tài khoản.',
        error: err.message,
      });
    }
  }
);