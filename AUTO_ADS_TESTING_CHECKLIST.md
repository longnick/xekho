# AUTO-ADS TESTING CHECKLIST
## Xe Khô Chữa Lành — Checklist Kiểm Thử Hệ Thống Marketing AI

> **Mục đích:** Đảm bảo mọi chức năng Auto-Ads Engine hoạt động đúng trước khi go live.

---

## Sprint 0: Điều Kiện Tiên Quyết

### Test 1: Restaurant Profile

**Mục tiêu:** Đảm bảo Restaurant Profile đầy đủ và đúng format.

**Steps:**
1. Vào `/admin/online`
2. Tìm phần "Restaurant Profile"
3. Kiểm tra các field:
   - `name`: Có giá trị
   - `address`: Có giá trị
   - `phone`: Có giá trị
   - `open_hours`: Có giá trị
   - `concept`: Có giá trị
   - `vibe`: Có giá trị
   - `price_range`: Có giá trị
   - `usp`: Có giá trị
   - `menu`: Array có ít nhất 3 món

4. Kiểm tra từng món trong menu:
   - `name`: String không rỗng
   - `price`: Number > 0
   - `unit`: String không rỗng
   - `cost`: Number > 0

**Expected Result:**
- ✅ Tất cả field bắt buộc đều có giá trị
- ✅ Menu có ít nhất 3 món
- ✅ Mỗi món có đầy đủ: name, price, unit, cost
- ✅ Giá vốn (cost) < Giá bán (price) cho mọi món

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 2: Financial Profile

**Mục tiêu:** Đảm bảo Financial Profile đầy đủ và tính toán đúng.

**Steps:**
1. Vào `/admin/online`
2. Tìm phần "Financial Profile"
3. Kiểm tra các field:
   - `monthly_fixed_costs.total`: Number > 0
   - `daily_fixed_cost`: Number > 0
   - `target_monthly_revenue`: Number > 0
   - `target_monthly_profit`: Number > 0
   - `ads_monthly_budget`: Number > 0
   - `ads_daily_budget_avg`: Number > 0

4. Kiểm tra công thức:
   - `daily_fixed_cost ≈ monthly_fixed_costs.total / 30`
   - `ads_daily_budget_avg ≈ ads_monthly_budget / 30`

**Expected Result:**
- ✅ Tất cả field có giá trị > 0
- ✅ `daily_fixed_cost` = `total / 30` (sai số < 100đ)
- ✅ `ads_daily_budget_avg` = `ads_monthly_budget / 30` (sai số < 100đ)

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 3: COGS Ratio

**Mục tiêu:** Đảm bảo COGS Ratio hợp lý.

**Steps:**
1. Vào `/admin/online`
2. Tìm phần "COGS Ratio"
3. Kiểm tra:
   - `default_cogs_percent`: Number trong khoảng 20-60

**Expected Result:**
- ✅ `default_cogs_percent` nằm trong khoảng 20-60
- ✅ Giá trị phù hợp với thực tế kinh doanh

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 4: Sync Menu từ Product Catalog

**Mục tiêu:** Đảm bảo sync menu hoạt động đúng.

**Steps:**
1. Kiểm tra Firestore collection `Product_Catalog` có món
2. Vào `/admin/online`
3. Bấm nút "Sync Menu từ Product Catalog"
4. Đợi 3-5 giây
5. Kiểm tra `restaurant_profile.menu` đã cập nhật

**Expected Result:**
- ✅ Menu trong `restaurant_profile` khớp với `Product_Catalog`
- ✅ Giá bán khớp với `public_menu`
- ✅ Giá vốn được giữ nguyên (nếu đã có) hoặc cần điền thủ công

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 5: Prompt AI Inject Context

**Mục tiêu:** Đảm bảo prompt AI đọc context động từ Firestore.

**Steps:**
1. Mở Firebase Console → Functions → Logs
2. Trigger một AI function (ví dụ: `scheduledTrendScan`)
3. Xem log, tìm dòng chứa "Restaurant Context"
4. Kiểm tra context có chứa:
   - Tên quán
   - Menu đầy đủ
   - Chi phí cố định
   - Ngân sách Ads

**Expected Result:**
- ✅ Log hiển thị context đầy đủ
- ✅ Context chứa dữ liệu từ `restaurant_profile` và `financial_profile`
- ✅ Không còn hard-code tên quán/menu trong prompt

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

## Sprint A: AI Core

### Test 6: Scheduled Trend Scan

**Mục tiêu:** Đảm bảo AI quét trend tự động hàng ngày.

**Steps:**
1. Đợi đến 08:00 sáng (hoặc trigger thủ công)
2. Kiểm tra Firestore `/trend_daily/{today}`
3. Kiểm tra các field:
   - `date`: String YYYY-MM-DD
   - `keywords`: Array có ít nhất 1 keyword
   - `themes`: Array có ít nhất 1 theme
   - `opportunity_score`: Number 0-100
   - `status`: "ready"

**Expected Result:**
- ✅ Document `/trend_daily/{today}` được tạo
- ✅ `keywords` có ít nhất 3 từ khóa
- ✅ `themes` có ít nhất 2 chủ đề
- ✅ `opportunity_score` > 50
- ✅ `status` = "ready"

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 7: Manual Trend Scan

**Mục tiêu:** Đảm bảo quét trend thủ công hoạt động.

**Steps:**
1. Vào `/admin/online` → tab "Marketing AI"
2. Tìm phần "Trend Hôm Nay"
3. Bấm nút "Quét lại trend"
4. Đợi 10-15 giây
5. Kiểm tra trend mới hiển thị

**Expected Result:**
- ✅ Trend mới được tạo trong 15 giây
- ✅ UI hiển thị trend mới
- ✅ Firestore `/trend_daily/{today}` được cập nhật

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 8: Scheduled AI Director (Brief + Posts)

**Mục tiêu:** Đảm bảo AI tạo brief và bộ bài tự động.

**Steps:**
1. Đảm bảo Sprint 0 hoàn thành
2. Đảm bảo có trend hôm nay
3. Đảm bảo có daily_revenue_snapshot hôm qua
4. Đợi đến 09:00 sáng (hoặc trigger thủ công)
5. Kiểm tra Firestore:
   - `/director_briefs/{briefId}`: Brief mới
   - `/director_ads_posts/{postId}`: 3 bài mới

**Expected Result:**
- ✅ 1 brief được tạo trong `/director_briefs`
- ✅ 3 bài được tạo trong `/director_ads_posts`
- ✅ Brief chứa:
  - `situation_summary`: String không rỗng
  - `strategy`: Object có `focus`, `avoid`, `budget_total_vnd`
  - `creative_directives`: Array có 3 phần tử
- ✅ Mỗi bài chứa:
  - `content_full`: String 150-250 từ
  - `asset`: Object có `asset_id`, `url`
  - `targeting`: Object có `locations`, `age_min`, `age_max`
  - `budget_vnd`: Number > 0
  - `status`: "pending"

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 9: Brief Mention Món Thật

**Mục tiêu:** Đảm bảo brief chỉ mention món có trong menu.

**Steps:**
1. Lấy brief vừa tạo
2. Đọc `creative_directives[].featured_items`
3. So sánh với `restaurant_profile.menu[].name`

**Expected Result:**
- ✅ Mọi món trong `featured_items` đều có trong menu
- ✅ Không có món "bịa" không tồn tại

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 10: Telegram Nhận Brief

**Mục tiêu:** Đảm bảo Telegram Bot gửi brief đến operator.

**Steps:**
1. Sau khi AI tạo brief (09:00)
2. Kiểm tra Telegram Bot
3. Xem có nhận tin nhắn brief không

**Expected Result:**
- ✅ Nhận 1 tin nhắn brief trong vòng 1 phút sau khi tạo
- ✅ Tin nhắn chứa:
  - Tóm tắt tình hình (doanh thu, lãi)
  - Trend hôm nay
  - Chiến lược (focus, avoid, budget)
  - Nút [✅ Duyệt] và [❌ Bỏ]

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

## Sprint B: Duyệt Bài

### Test 11: Duyệt Brief trên Telegram

**Mục tiêu:** Đảm bảo duyệt brief trên Telegram hoạt động.

**Steps:**
1. Nhận tin nhắn brief trên Telegram
2. Bấm nút [✅ Duyệt]
3. Đợi 3-5 giây
4. Kiểm tra Firestore `/director_briefs/{briefId}`
   - `status`: "approved"
   - `decisionSource`: "telegram"
   - `decisionAt`: Timestamp

**Expected Result:**
- ✅ Brief status = "approved" trong 5 giây
- ✅ `decisionSource` = "telegram"
- ✅ `decisionAt` có giá trị
- ✅ Bot reply xác nhận: "Đã duyệt brief ✅"

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 12: Bỏ Brief trên Telegram

**Mục tiêu:** Đảm bảo bỏ brief trên Telegram hoạt động.

**Steps:**
1. Nhận tin nhắn brief trên Telegram
2. Bấm nút [❌ Bỏ]
3. Đợi 3-5 giây
4. Kiểm tra Firestore `/director_briefs/{briefId}`
   - `status`: "rejected"

**Expected Result:**
- ✅ Brief status = "rejected" trong 5 giây
- ✅ Bot reply xác nhận: "Đã bỏ brief ❌"
- ✅ Không tạo bài viết

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 13: Telegram Nhận 3 Bài

**Mục tiêu:** Đảm bảo Telegram Bot gửi 3 bài sau khi duyệt brief.

**Steps:**
1. Duyệt brief trên Telegram
2. Đợi 10-20 giây
3. Kiểm tra Telegram Bot

**Expected Result:**
- ✅ Nhận 3 tin nhắn (Bài 1/3, 2/3, 3/3)
- ✅ Mỗi tin chứa:
  - Preview nội dung (200 ký tự đầu)
  - Ảnh/video thumbnail
  - Budget, target, món highlight
  - Nút [✅ Duyệt], [✏️ Sửa], [❌ Bỏ]

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 14: Duyệt Bài trên Telegram

**Mục tiêu:** Đảm bảo duyệt bài trên Telegram hoạt động.

**Steps:**
1. Nhận tin nhắn bài trên Telegram
2. Bấm nút [✅ Duyệt]
3. Đợi 3-5 giây
4. Kiểm tra Firestore `/director_ads_posts/{postId}`
   - `status`: "approved"

**Expected Result:**
- ✅ Post status = "approved" trong 5 giây
- ✅ Bot reply xác nhận: "Đã duyệt bài 1/3 ✅"

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 15: Sửa Bài trên Telegram

**Mục tiêu:** Đảm bảo sửa bài trên Telegram hoạt động.

**Steps:**
1. Nhận tin nhắn bài trên Telegram
2. Bấm nút [✏️ Sửa]
3. Bot hỏi: "Nhắn nội dung sửa:"
4. Gửi tin nhắn text: "Nội dung mới đã sửa..."
5. Đợi 3-5 giây
6. Kiểm tra Firestore `/director_ads_posts/{postId}`
   - `content_edited`: "Nội dung mới đã sửa..."

**Expected Result:**
- ✅ Bot tạo session trong `/telegram_sessions/{chatId}`
- ✅ Bot reply: "Nhắn nội dung sửa:"
- ✅ Tin nhắn tiếp theo được lưu vào `content_edited`
- ✅ Bot reply xác nhận: "Đã lưu nội dung sửa ✅"

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 16: Bỏ Bài trên Telegram

**Mục tiêu:** Đảm bảo bỏ bài trên Telegram hoạt động.

**Steps:**
1. Nhận tin nhắn bài trên Telegram
2. Bấm nút [❌ Bỏ]
3. Đợi 3-5 giây
4. Kiểm tra Firestore `/director_ads_posts/{postId}`
   - `status`: "rejected"

**Expected Result:**
- ✅ Post status = "rejected" trong 5 giây
- ✅ Bot reply xác nhận: "Đã bỏ bài 1/3 ❌"

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 17: Duyệt Brief trên Web Dashboard

**Mục tiêu:** Đảm bảo duyệt brief trên web hoạt động.

**Steps:**
1. Vào `/admin/online` → tab "Marketing AI"
2. Tìm phần "Brief Đang Chờ Duyệt"
3. Click vào brief
4. Bấm nút "Duyệt"
5. Kiểm tra Firestore `/director_briefs/{briefId}`
   - `status`: "approved"
   - `decisionSource`: "web_dashboard"

**Expected Result:**
- ✅ Brief status = "approved"
- ✅ `decisionSource` = "web_dashboard"
- ✅ UI cập nhật ngay lập tức

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 18: Duyệt Bài trên Web Dashboard

**Mục tiêu:** Đảm bảo duyệt bài trên web hoạt động.

**Steps:**
1. Vào `/admin/online` → tab "Marketing AI"
2. Tìm phần "Bộ Bài A/B Đang Chờ Chọn"
3. Xem preview 3 bài
4. Bấm nút "Duyệt" cho 1 bài
5. Kiểm tra Firestore `/director_ads_posts/{postId}`
   - `status`: "approved"

**Expected Result:**
- ✅ Post status = "approved"
- ✅ UI cập nhật ngay lập tức

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

## Sprint B.2: Sổ Nam Tào

### Test 19: Xem Danh Sách Brief trong Sổ Nam Tào

**Mục tiêu:** Đảm bảo Sổ Nam Tào hiển thị danh sách brief.

**Steps:**
1. Vào `/admin/online` → tab "Sổ Nam Tào"
2. Kiểm tra danh sách brief

**Expected Result:**
- ✅ Hiển thị tất cả brief đã tạo
- ✅ Mỗi brief hiển thị:
  - Tiêu đề
  - Ngày tạo
  - Trạng thái
  - Nguồn quyết định
- ✅ Có filter theo ngày, trạng thái, nguồn

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 20: Xem Chi Tiết Brief

**Mục tiêu:** Đảm bảo xem chi tiết brief hoạt động.

**Steps:**
1. Vào tab "Sổ Nam Tào"
2. Click vào 1 brief
3. Xem chi tiết

**Expected Result:**
- ✅ Modal/page chi tiết mở ra
- ✅ Hiển thị:
  - Nội dung brief đầy đủ (300-800 từ)
  - Prompt snapshot
  - Quyết định cuối cùng
  - Lý do duyệt/bỏ (nếu có)

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 21: Xem Danh Sách Bộ Bài

**Mục tiêu:** Đảm bảo Sổ Nam Tào hiển thị danh sách bộ bài.

**Steps:**
1. Vào tab "Sổ Nam Tào"
2. Chuyển sang view "Bộ Bài"
3. Kiểm tra danh sách

**Expected Result:**
- ✅ Hiển thị tất cả bài đã tạo
- ✅ Mỗi bài hiển thị:
  - Tiêu đề/preview
  - Ngày tạo
  - Trạng thái
  - Asset thumbnail
- ✅ Có filter theo ngày, trạng thái

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 22: Xem Chi Tiết Bài

**Mục tiêu:** Đảm bảo xem chi tiết bài hoạt động.

**Steps:**
1. Vào tab "Sổ Nam Tào"
2. Click vào 1 bài
3. Xem chi tiết

**Expected Result:**
- ✅ Modal/page chi tiết mở ra
- ✅ Hiển thị:
  - Nội dung gốc (`content_full`)
  - Nội dung đã sửa (`content_edited`) nếu có
  - Nội dung cuối cùng (`content_final`)
  - Asset (ảnh/video)
  - Targeting, budget
  - Kết quả (nếu đã chạy)

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

## Sprint B.5: Kho Tài Sản

### Test 23: Upload Asset từ Admin

**Mục tiêu:** Đảm bảo upload asset từ web hoạt động.

**Steps:**
1. Vào `/admin/online` → tab "Kho Tài Sản"
2. Bấm nút "Upload"
3. Chọn file ảnh/video
4. Điền:
   - Title: "Test Asset"
   - Tags: "test, mực nướng"
   - Mood: "warm"
5. Bấm "Lưu"
6. Kiểm tra Firestore `/asset_library/{assetId}`

**Expected Result:**
- ✅ File được upload lên Cloud Storage
- ✅ Metadata được tạo trong Firestore
- ✅ Asset hiển thị trong danh sách
- ✅ Thumbnail được tạo (nếu là video)

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 24: Gửi Asset vào Telegram

**Mục tiêu:** Đảm bảo Telegram ingest asset hoạt động.

**Steps:**
1. Gửi ảnh/video vào Telegram Bot
2. Đợi 5-10 giây
3. Kiểm tra Firestore `/asset_library/{assetId}`
4. Kiểm tra Cloud Storage

**Expected Result:**
- ✅ Bot reply xác nhận: "Đã lưu asset vào kho ✅"
- ✅ File được tải về và upload lên Cloud Storage
- ✅ Metadata được tạo trong Firestore
- ✅ Asset hiển thị trong danh sách trên web

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 25: AI Chọn Asset Phù Hợp

**Mục tiêu:** Đảm bảo AI chọn asset đúng khi tạo bài.

**Steps:**
1. Upload 3 asset với tags khác nhau:
   - Asset A: tags = ["mực nướng", "đêm"]
   - Asset B: tags = ["bạch tuộc", "khói"]
   - Asset C: tags = ["đồ uống", "ly"]
2. Trigger AI tạo bài với món highlight = "Mực nướng"
3. Kiểm tra bài được tạo
4. Xem `asset.asset_id` có phải Asset A không

**Expected Result:**
- ✅ AI chọn Asset A (tags khớp với món highlight)
- ✅ Không chọn Asset B hoặc C

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 26: Xem Danh Sách Asset

**Mục tiêu:** Đảm bảo danh sách asset hiển thị đúng.

**Steps:**
1. Vào tab "Kho Tài Sản"
2. Xem danh sách

**Expected Result:**
- ✅ Grid view với thumbnail
- ✅ Mỗi asset hiển thị:
  - Thumbnail
  - Title
  - Tags
  - Type (image/video)
  - Times used
- ✅ Có filter theo type, tags, mood, source

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 27: Chỉnh Sửa Asset

**Mục tiêu:** Đảm bảo chỉnh sửa asset hoạt động.

**Steps:**
1. Vào tab "Kho Tài Sản"
2. Click vào 1 asset
3. Sửa tags: "mực nướng, đêm, khói"
4. Sửa mood: "cozy"
5. Bấm "Lưu"
6. Kiểm tra Firestore `/asset_library/{assetId}`

**Expected Result:**
- ✅ Tags được cập nhật
- ✅ Mood được cập nhật
- ✅ `updatedAt` được cập nhật

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

## Sprint D: Daily Revenue Snapshot

### Test 28: Tạo Snapshot Thủ Công

**Mục tiêu:** Đảm bảo tạo snapshot thủ công hoạt động.

**Steps:**
1. Vào tab "Marketing AI"
2. Tìm phần "Business Snapshot"
3. Bấm nút "Cập nhật snapshot"
4. Chọn ngày: hôm qua
5. Đợi 5-10 giây
6. Kiểm tra Firestore `/daily_revenue_snapshot/{date}`

**Expected Result:**
- ✅ Snapshot được tạo trong 10 giây
- ✅ Chứa:
  - `total_revenue`: Number > 0
  - `total_orders`: Number > 0
  - `top_items`: Array có ít nhất 1 món
  - `estimated_cogs`: Number > 0
  - `estimated_net_profit`: Number
- ✅ UI hiển thị snapshot

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 29: Snapshot Tự Động (22:30)

**Mục tiêu:** Đảm bảo snapshot tự động chạy hàng ngày.

**Steps:**
1. Đợi đến 22:30 tối
2. Kiểm tra Firestore `/daily_revenue_snapshot/{today}`
3. Kiểm tra log Cloud Functions

**Expected Result:**
- ✅ Snapshot được tạo tự động lúc 22:30
- ✅ Không có lỗi trong log
- ✅ Snapshot chứa dữ liệu đầy đủ

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

### Test 30: Snapshot Tính Lãi Đúng

**Mục tiêu:** Đảm bảo công thức tính lãi đúng.

**Steps:**
1. Lấy snapshot vừa tạo
2. Tính tay:
   - Lãi gộp = `total_revenue - estimated_cogs`
   - Lãi ròng = `total_revenue - estimated_cogs - ads_spend_today - fixed_cost_today`
3. So sánh với `estimated_gross_profit` và `estimated_net_profit`

**Expected Result:**
- ✅ `estimated_gross_profit` = `total_revenue - estimated_cogs`
- ✅ `estimated_net_profit` = `total_revenue - estimated_cogs - ads_spend_today - fixed_cost_today`
- ✅ Sai số < 1000đ

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________

---

## Sprint E: Publish Facebook (Nếu đã implement)

### Test 31: Đăng Bài Lên Facebook

**Mục tiêu:** Đảm bảo đăng bài lên Facebook hoạt động.

**Steps:**
1. Duyệt 1 bài
2. Bấm nút "Đăng ngay" (trên Telegram hoặc Web)
3. Đợi 10-20 giây
4. Kiểm tra Facebook Page
5. Kiểm tra Firestore `/director_ads_posts/{postId}`
   - `facebook_post_id`: String không rỗng

**Expected Result:**
- ✅ Bài được đăng lên Facebook trong 20 giây
- ✅ Nội dung khớp với `content_final` hoặc `content_edited`
- ✅ Ảnh/video được đính kèm
- ✅ `facebook_post_id` được lưu vào Firestore

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________
- [ ] N/A (chưa implement)

---

### Test 32: Lỗi Khi Đăng Facebook

**Mục tiêu:** Đảm bảo xử lý lỗi đúng khi đăng Facebook thất bại.

**Steps:**
1. Tạm thời vô hiệu hóa Page Access Token
2. Duyệt 1 bài
3. Bấm "Đăng ngay"
4. Kiểm tra log Cloud Functions

**Expected Result:**
- ✅ Hệ thống báo lỗi rõ ràng
- ✅ Không crash
- ✅ Log ghi lại lỗi chi tiết
- ✅ Operator nhận thông báo lỗi (Telegram hoặc UI)

**Actual Result:**
- [ ] Pass
- [ ] Fail (ghi lý do): _______________
- [ ] N/A (chưa implement)

---

## Tổng Kết Testing

### Tổng Số Test Cases: 32

**Sprint 0 (Điều Kiện Tiên Quyết):**
- [ ] Test 1-5: Pass (5/5)

**Sprint A (AI Core):**
- [ ] Test 6-10: Pass (5/5)

**Sprint B (Duyệt Bài):**
- [ ] Test 11-18: Pass (8/8)

**Sprint B.2 (Sổ Nam Tào):**
- [ ] Test 19-22: Pass (4/4)

**Sprint B.5 (Kho Tài Sản):**
- [ ] Test 23-27: Pass (5/5)

**Sprint D (Revenue Snapshot):**
- [ ] Test 28-30: Pass (3/3)

**Sprint E (Facebook Publish):**
- [ ] Test 31-32: Pass (2/2) hoặc N/A

---

## Ghi Chú Lỗi

**Lỗi tìm thấy trong quá trình test:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Lỗi đã fix:**

1. _______________________________________________
2. _______________________________________________

---

*Xe Khô Chữa Lành — Auto-Ads Testing Checklist | 05/2026*
