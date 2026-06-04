# Hướng dẫn sử dụng Màn hình Bếp (Kitchen Display)

Tài liệu này hướng dẫn nhân viên bếp sử dụng màn hình hiển thị đơn hàng.

## 📱 Truy cập Màn hình Bếp

### URL
```
https://pos-v2-909ff.web.app/kitchen
```

### Đăng nhập
1. Mở trình duyệt (Chrome, Edge, Safari)
2. Truy cập URL trên
3. Đăng nhập bằng tài khoản có role **kitchen** hoặc **admin**
   - Email: kitchen@xekho.com (ví dụ)
   - Password: (do admin cấp)

### Lưu ý quan trọng
- ✅ Chỉ tài khoản có role **kitchen** hoặc **admin** mới truy cập được
- ✅ Nên dùng máy tính/tablet cố định tại bếp
- ✅ Để trình duyệt luôn mở, không tắt
- ✅ Bật notification để nhận thông báo đơn mới

## 🖥 Giao diện Màn hình Bếp

### Các phần chính
```
┌─────────────────────────────────────────┐
│  [Logo] Màn hình Bếp    [User] [Logout] │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────┐  ┌──────────┐            │
│  │ Bàn 1    │  │ Bàn 3    │            │
│  │ 2 món    │  │ 1 món    │            │
│  │ 5 phút   │  │ 2 phút   │            │
│  │ [Nhận]   │  │ [Xong]   │            │
│  └──────────┘  └──────────┘            │
│                                          │
└─────────────────────────────────────────┘
```

### Màu sắc trạng thái
- 🟢 **Xanh lá**: Món mới, chưa nhận (< 5 phút)
- 🟡 **Vàng**: Đang làm (5-10 phút)
- 🟠 **Cam**: Cần chú ý (10-15 phút)
- 🔴 **Đỏ**: Khẩn cấp (> 15 phút)

## 📋 Quy trình xử lý đơn hàng

### 1. Khi có đơn mới
```
Đơn mới xuất hiện → Có thông báo âm thanh/popup
                  → Hiển thị ở đầu danh sách
                  → Màu xanh lá, trạng thái "Mới"
```

**Hành động:**
- Đọc kỹ món và ghi chú
- Nhấn nút **"Nhận tất cả"** hoặc **"Nhận"** từng món

### 2. Nhận đơn (Received)
**Cách làm:**
- Nhấn nút **"Nhận tất cả"** (nhận tất cả món của bàn)
- Hoặc nhấn **"Nhận"** trên từng món riêng lẻ

**Kết quả:**
- Trạng thái chuyển sang **"Đã nhận"**
- POS sẽ thấy món đã được bếp nhận
- Bắt đầu đếm thời gian chờ

### 3. Đang làm món (Cooking)
**Tự động:**
- Sau khi nhận, món tự động chuyển sang trạng thái **"Đang làm"**
- Màu sắc thay đổi theo thời gian chờ

**Không cần thao tác gì thêm**

### 4. Món xong (Ready)
**Cách làm:**
- Khi món đã hoàn thành, nhấn nút **"Xong tất cả"**
- Hoặc nhấn **"Xong"** trên từng món

**Kết quả:**
- Trạng thái chuyển sang **"Xong"**
- POS nhận thông báo món đã sẵn sàng
- Nhân viên phục vụ sẽ mang món ra

### 5. Đã mang ra (Served)
**Tự động:**
- Khi nhân viên phục vụ xác nhận đã mang món ra
- Món sẽ biến mất khỏi màn hình bếp

**Hoặc thủ công:**
- Nhấn nút **"Đã mang ra"** nếu cần

## ⚠️ Tính năng đặc biệt

### Báo chậm (Delay)
**Khi nào dùng:**
- Món cần thêm thời gian (nguyên liệu hết, bếp quá tải)
- Khách yêu cầu chế biến đặc biệt

**Cách làm:**
1. Nhấn nút **"Báo chậm"** trên món
2. Hệ thống gửi thông báo cho POS
3. Nhân viên phục vụ sẽ thông báo khách

**Kết quả:**
- POS nhận notification "Món X bị chậm"
- Telegram/FCM gửi thông báo
- Thời gian chờ được reset

### Ghi chú đặc biệt
**Chú ý:**
- Đọc kỹ ghi chú của từng món (ít cay, không hành, v.v.)
- Ghi chú hiển thị màu đỏ nếu quan trọng
- Hỏi lại nhân viên phục vụ nếu không rõ

## 🔔 Thông báo (Notifications)

### Bật thông báo trình duyệt
**Lần đầu truy cập:**
1. Trình duyệt hỏi "Allow notifications?"
2. Nhấn **"Allow"** / **"Cho phép"**

**Nếu đã chặn:**
1. Chrome: Nhấn biểu tượng 🔒 bên trái URL
2. Chọn "Site settings"
3. Notifications → Allow

### Các loại thông báo
- 🔔 **Đơn mới**: Có món mới cần làm
- ✅ **Món xong**: Món đã được đánh dấu xong
- ⏰ **Báo chậm**: Bếp báo món bị chậm

## 🚨 Xử lý sự cố

### Không thấy đơn mới
**Nguyên nhân & Giải pháp:**

1. **Mất kết nối mạng**
   - Kiểm tra WiFi/Internet
   - Đợi tự động kết nối lại
   - Refresh trang (F5)

2. **Chưa đăng nhập đúng role**
   - Đăng xuất và đăng nhập lại
   - Kiểm tra với admin xem role có đúng là "kitchen" không

3. **Trình duyệt bị lỗi**
   - Hard refresh: Ctrl + Shift + R (Windows) hoặc Cmd + Shift + R (Mac)
   - Xóa cache: Ctrl + Shift + Delete
   - Thử trình duyệt khác

### Đơn bị trùng/lặp
**Giải pháp:**
- Chỉ xử lý đơn có thời gian mới nhất
- Báo admin để kiểm tra
- Không nhấn nút nhiều lần

### Màn hình bị đơ/không cập nhật
**Giải pháp:**
1. Refresh trang (F5)
2. Nếu vẫn lỗi, đăng xuất và đăng nhập lại
3. Khởi động lại trình duyệt
4. Báo admin nếu vẫn không được

### Không nhận được thông báo
**Kiểm tra:**
1. Notification permission = Allow
2. Trình duyệt không bị mute
3. Máy tính không ở chế độ "Do not disturb"
4. Thử refresh trang

## 📱 Sử dụng trên Tablet/iPad

### Khuyến nghị
- ✅ Dùng Chrome hoặc Safari
- ✅ Để chế độ landscape (ngang)
- ✅ Bật "Keep screen on" (không tắt màn hình)
- ✅ Cố định tablet tại vị trí dễ nhìn

### Cài đặt như App (PWA)
**Chrome Android:**
1. Mở kitchen.html
2. Menu (⋮) → "Add to Home screen"
3. Đặt tên "Màn hình Bếp"
4. Mở từ Home screen như app

**Safari iOS:**
1. Mở kitchen.html
2. Nhấn nút Share (↑)
3. "Add to Home Screen"
4. Đặt tên "Màn hình Bếp"

## ⏰ Quy trình làm việc thực tế

### Ca sáng (6:00 - 14:00)
```
6:00  → Đăng nhập màn hình bếp
6:05  → Kiểm tra nguyên liệu, chuẩn bị
6:30  → Bắt đầu nhận đơn
...
13:45 → Xử lý đơn cuối cùng
14:00 → Đăng xuất (hoặc để cho ca chiều)
```

### Ca chiều (14:00 - 22:00)
```
14:00 → Đăng nhập (nếu ca sáng đã đăng xuất)
14:05 → Kiểm tra nguyên liệu
14:30 → Bắt đầu nhận đơn
...
21:45 → Xử lý đơn cuối cùng
22:00 → Đăng xuất
```

### Lưu ý
- Luôn để màn hình bật trong giờ làm việc
- Kiểm tra đơn mỗi 1-2 phút
- Ưu tiên đơn có màu đỏ/cam (đã chờ lâu)
- Báo chậm ngay nếu không kịp

## 🎯 Tips & Best Practices

### Tăng hiệu suất
1. **Nhận đơn ngay**: Đừng để đơn chờ lâu
2. **Ưu tiên theo màu**: Đỏ > Cam > Vàng > Xanh
3. **Nhóm món giống nhau**: Làm cùng lúc nếu được
4. **Báo chậm sớm**: Đừng đợi đến phút cuối

### Giao tiếp với POS
- Dùng nút "Báo chậm" thay vì gọi điện
- Cập nhật trạng thái đúng lúc
- Đọc kỹ ghi chú trước khi làm

### Bảo mật
- ❌ Không chia sẻ mật khẩu
- ❌ Không để người khác dùng tài khoản
- ✅ Đăng xuất khi rời khỏi bếp lâu
- ✅ Khóa màn hình nếu cần

## 📞 Liên hệ hỗ trợ

### Khi cần giúp đỡ
1. **Lỗi kỹ thuật**: Báo admin hoặc IT
2. **Không hiểu món**: Hỏi nhân viên phục vụ
3. **Hết nguyên liệu**: Báo quản lý

### Thông tin liên hệ
- Admin: [Số điện thoại]
- IT Support: [Số điện thoại]
- Quản lý bếp: [Số điện thoại]

---

## ❓ FAQ (Câu hỏi thường gặp)

### Q: Tôi có thể xem đơn đã xong không?
**A:** Không, màn hình chỉ hiển thị đơn đang mở. Đơn đã xong/đã thanh toán sẽ tự động biến mất.

### Q: Làm sao biết món nào cần làm trước?
**A:** Xem màu sắc và thời gian chờ. Màu đỏ = khẩn cấp, làm trước.

### Q: Nhấn nhầm "Xong", làm sao hoàn tác?
**A:** Không thể hoàn tác. Báo nhân viên phục vụ để họ cập nhật lại trên POS.

### Q: Tại sao có món không hiển thị?
**A:** Có thể món đó đã được đánh dấu "Đã mang ra" hoặc bàn đã thanh toán.

### Q: Có thể dùng điện thoại không?
**A:** Được, nhưng màn hình nhỏ, khó thao tác. Nên dùng tablet/máy tính.

### Q: Màn hình có tự động refresh không?
**A:** Có, realtime. Không cần refresh thủ công.

---

**Phiên bản**: 1.0  
**Cập nhật**: 2026-05-05  
**Người soạn**: Technical Team
