# 🔧 FIX LỖI ĐĂNG NHẬP - UNAUTHORIZED DOMAIN

## ❌ LỖI HIỆN TẠI
```
The current domain is not authorized for OAuth operations.
Add your domain (xe-kho.web.app) to the OAuth redirect domains list
```

## ✅ CÁCH FIX (5 PHÚT)

### Bước 1: Vào Firebase Console
1. Truy cập: https://console.firebase.google.com/
2. Chọn project: **pos-v2-909ff**

### Bước 2: Thêm Authorized Domain
1. Vào menu bên trái → **Authentication**
2. Click tab **Settings** (ở trên cùng)
3. Kéo xuống phần **Authorized domains**
4. Click nút **Add domain**
5. Nhập: `xe-kho.web.app`
6. Click **Add**

### Bước 3: Kiểm tra lại
Sau khi thêm, danh sách Authorized domains phải có:
- ✅ `localhost` (mặc định)
- ✅ `pos-v2-909ff.firebaseapp.com` (mặc định)
- ✅ `xe-kho.web.app` (vừa thêm)

### Bước 4: Test lại
1. Mở: https://xe-kho.web.app/
2. Thử đăng nhập với:
   - Email: `owner@ganhkho.vn` (hoặc email admin của bạn)
   - Password: mật khẩu của bạn
3. Nếu vẫn lỗi, xóa cache trình duyệt (Ctrl+Shift+Delete) và thử lại

## 📝 GHI CHÚ

### Tại sao lỗi này xảy ra?
- Firebase Authentication chỉ cho phép đăng nhập từ các domain được ủy quyền
- Khi deploy lên `xe-kho.web.app`, domain này chưa có trong danh sách
- Đây là biện pháp bảo mật của Firebase

### Nếu vẫn không được?
Kiểm tra thêm:
1. **Email/Password provider đã bật chưa?**
   - Authentication → Sign-in method
   - Email/Password phải ở trạng thái **Enabled**

2. **Có user nào trong hệ thống chưa?**
   - Authentication → Users
   - Nếu chưa có, tạo user mới hoặc dùng code tạo admin

3. **authDomain trong db.js có đúng không?**
   ```javascript
   authDomain: 'pos-v2-909ff.firebaseapp.com'
   ```

## 🚀 SAU KHI FIX

Website sẽ hoạt động bình thường:
- ✅ Đăng nhập thành công
- ✅ Lưu session
- ✅ Đồng bộ dữ liệu Firestore
- ✅ Realtime updates

---
**Thời gian fix:** ~5 phút  
**Độ khó:** ⭐ (Rất dễ)  
**Cần restart app:** Không (chỉ cần refresh browser)
