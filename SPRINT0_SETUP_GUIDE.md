# SPRINT 0 SETUP GUIDE
## Xe Khô Chữa Lành — Điều Kiện Tiên Quyết Trước Khi Chạy AI

> **Triết lý:** Ba thứ sau đây phải có TRƯỚC KHI viết một dòng code AI nào — không có chúng, AI viết bài là đang bịa.

---

## Sprint 0 là gì?

Sprint 0 không phải là "tính năng" mà là **điều kiện tiên quyết** để hệ thống Auto-Ads Engine hoạt động đúng.

Nếu thiếu Sprint 0:
- ❌ AI không biết quán bán gì → bịa món không có trong menu
- ❌ AI không biết giá vốn → tính lãi/lỗ sai
- ❌ AI không biết chi phí cố định → đánh giá chiến dịch sai
- ❌ Prompt AI hard-code thông tin cũ → không cập nhật khi thay đổi menu

Khi có đủ Sprint 0:
- ✅ AI biết chính xác menu, giá bán, giá vốn
- ✅ AI tính được lãi thật (doanh thu - giá vốn - ads - chi phí cố định)
- ✅ Prompt AI đọc context động từ Firestore
- ✅ Thay đổi menu/giá chỉ cần sửa 1 chỗ, AI tự cập nhật

---

## Ba Điều Kiện Tiên Quyết

### 1. Restaurant Profile (Bộ nhớ cố định của AI)

**Firestore Path:** `/settings/restaurant_profile`

**Chứa gì:**
- Thông tin cơ bản: tên quán, địa chỉ, giờ mở cửa, số điện thoại
- Brand narrative: concept, vibe, price_range, usp
- **Menu đầy đủ**: tên món, giá bán, đơn vị, giá vốn

**Tại sao quan trọng:**
- Đây là "căn cước" của quán
- Inject vào **MỌI prompt AI** như system context
- AI dùng để biết món nào có thật, giá bao nhiêu, nên highlight món gì

### 2. Financial Profile (Tài chính đầy đủ)

**Firestore Path:** `/settings/financial_profile`

**Chứa gì:**
- Chi phí cố định hàng tháng: thuê mặt bằng, nhân viên, điện nước, khác
- Chi phí cố định mỗi ngày (total / 30)
- Target doanh thu và lợi nhuận tháng
- Ngân sách Ads tháng và trung bình mỗi ngày

**Tại sao quan trọng:**
- Để AI tính **lãi thật**, không chỉ so tiền Ads với doanh thu
- Công thức: `Lãi thật = Doanh thu - Giá vốn - Chi Ads - Chi phí cố định`

### 3. COGS Ratio (Tỉ lệ giá vốn)

**Firestore Path:** `/settings/cogs_ratio`

**Chứa gì:**
- `default_cogs_percent`: Tỉ lệ giá vốn trung bình (ví dụ: 40%)

**Tại sao quan trọng:**
- Dùng khi chưa tính được giá vốn chi tiết theo từng món
- Ước tính nhanh: `Giá vốn = Doanh thu × 40%`

---

## Hướng Dẫn Điền Dữ Liệu Sprint 0

### Bước 1: Truy cập Admin Dashboard

1. Mở trình duyệt, vào: `https://your-app.web.app/admin/online`
2. Đăng nhập bằng tài khoản admin
3. Tìm phần **"Sprint 0 Setup"** hoặc **"Restaurant Profile"**

### Bước 2: Điền Restaurant Profile

#### 2.1. Thông tin cơ bản

Các field này có thể **seed từ dữ liệu có sẵn**:
- `name`: Lấy từ `config/onlineStorefront`
- `address`: Lấy từ `config/onlineStorefront`
- `phone`: Lấy từ `config/onlineStorefront`
- `google_maps_url`: Nhập thủ công (link Google Maps của quán)
- `open_hours`: Nhập thủ công (ví dụ: "17:00–23:00")

#### 2.2. Brand Narrative (Phải nhập thủ công)

- `concept`: Mô tả ngắn gọn concept của quán
  - Ví dụ: *"Xe khô hải sản nướng than hoa vỉa hè, không khí đêm Bảo Lộc mát mẻ"*
- `vibe`: Không khí, cảm giác của quán
  - Ví dụ: *"Bình dân, gần gũi, phù hợp nhóm bạn và gia đình buổi tối"*
- `price_range`: Tầm giá trung bình
  - Ví dụ: *"150.000đ – 300.000đ / người"*
- `usp`: Điểm khác biệt (Unique Selling Proposition)
  - Ví dụ: *"Hải sản khô nướng tươi tại chỗ, kết hợp đồ uống signature, view đường phố Bảo Lộc"*

#### 2.3. Menu (Sync từ Product Catalog)

**Cách tốt nhất: Sync từ dữ liệu có sẵn**

1. Bấm nút **"Sync Menu từ Product Catalog"**
2. Hệ thống sẽ lấy:
   - Tên món từ `Product_Catalog`
   - Giá bán từ `public_menu`
   - Đơn vị từ `Product_Catalog`

3. **Bổ sung giá vốn thủ công:**
   - Nếu `Product_Catalog` đã có field `cost` → tự động lấy
   - Nếu chưa có → phải nhập thủ công cho từng món

**Ví dụ menu hoàn chỉnh:**
```json
[
  { "name": "Mực nướng",          "price": 45000,  "unit": "100g",  "cost": 28000 },
  { "name": "Bạch tuộc nướng",    "price": 55000,  "unit": "con",   "cost": 32000 },
  { "name": "Tôm khô nướng",      "price": 60000,  "unit": "100g",  "cost": 38000 },
  { "name": "Đồ uống signature",  "price": 35000,  "unit": "ly",    "cost": 12000 }
]
```

**Lưu ý quan trọng:**
- ⚠️ **Giá vốn phải chính xác** — nếu sai, AI sẽ tính lãi/lỗ sai
- ⚠️ **Cập nhật khi thay đổi** — thêm món mới, đổi giá phải cập nhật ngay

### Bước 3: Điền Financial Profile

1. Tính tổng chi phí cố định hàng tháng:
   - Thuê mặt bằng: ________ đ
   - Nhân viên: ________ đ
   - Điện nước: ________ đ
   - Khác: ________ đ
   - **Tổng:** ________ đ

2. Tính chi phí cố định mỗi ngày:
   - `daily_fixed_cost = total / 30`

3. Đặt target:
   - `target_monthly_revenue`: Doanh thu mục tiêu tháng
   - `target_monthly_profit`: Lợi nhuận mục tiêu tháng

4. Ngân sách Ads:
   - `ads_monthly_budget`: Ngân sách Ads tháng
   - `ads_daily_budget_avg = ads_monthly_budget / 30`

**Ví dụ:**
```json
{
  "monthly_fixed_costs": {
    "rent":       2000000,
    "staff":      5000000,
    "utilities":  800000,
    "other":      500000,
    "total":      8300000
  },
  "daily_fixed_cost": 276666,
  "target_monthly_revenue": 50000000,
  "target_monthly_profit":  15000000,
  "ads_monthly_budget":     5000000,
  "ads_daily_budget_avg":   166666
}
```

### Bước 4: Điền COGS Ratio

1. Tính tỉ lệ giá vốn trung bình:
   - Lấy dữ liệu 1 tháng gần nhất
   - `COGS % = (Tổng giá vốn / Tổng doanh thu) × 100`

2. Nhập vào field `default_cogs_percent`

**Ví dụ:**
```json
{
  "default_cogs_percent": 40,
  "note": "Tỉ lệ giá vốn trung bình nếu chưa tính được chi tiết theo món"
}
```

### Bước 5: Kiểm tra và Lưu

1. Bấm nút **"Lưu Restaurant Profile"**
2. Bấm nút **"Lưu Financial Profile"**
3. Bấm nút **"Lưu COGS Ratio"**

4. Kiểm tra lại:
   - ✅ Menu có đủ món đang bán không?
   - ✅ Giá vốn đã điền đủ chưa?
   - ✅ Chi phí cố định đã tính đúng chưa?
   - ✅ Brand narrative đã mô tả đúng quán chưa?

---

## Kết Quả Chuẩn Sau Khi Hoàn Thành Sprint 0

### 1. Firestore có đủ 3 documents

```
/settings/restaurant_profile   ✅ Đã có dữ liệu
/settings/financial_profile    ✅ Đã có dữ liệu
/settings/cogs_ratio           ✅ Đã có dữ liệu
```

### 2. Prompt AI đọc context động

Khi gọi AI, hệ thống sẽ tự động inject:

```
=== XE KHÔ CHỮA LÀNH ===
Địa chỉ: ..., Bảo Lộc, Lâm Đồng — Giờ mở: 17:00–23:00
Phong cách: Xe khô hải sản nướng than hoa vỉa hè...
Không khí: Bình dân, gần gũi...
Tầm giá: 150.000đ – 300.000đ / người
Điểm khác biệt: Hải sản khô nướng tươi tại chỗ...

MENU HIỆN TẠI:
- Mực nướng: 45.000đ/100g
- Bạch tuộc nướng: 55.000đ/con
- Tôm khô nướng: 60.000đ/100g
- Đồ uống signature: 35.000đ/ly

CHI PHÍ CỐ ĐỊNH/NGÀY: 276.666đ
NGÂN SÁCH ADS/THÁNG: 5.000.000đ
```

### 3. AI không còn bịa món

- ❌ Trước Sprint 0: AI có thể viết "Cá nướng muối ớt" (món không có)
- ✅ Sau Sprint 0: AI chỉ viết về món có trong menu

### 4. Tính lãi thật chính xác

```
Lãi thật mỗi ngày =
  Doanh thu POS
  - Giá vốn hàng bán (từ menu.cost × số lượng)
  - Chi phí Ads ngày đó
  - Chi phí cố định ngày đó

Ví dụ:
  Doanh thu:         4.200.000đ
  - Giá vốn:        -1.680.000đ  (40%)
  - Chi Ads:          -150.000đ
  - Chi phí cố định:  -276.666đ
  ─────────────────────────────
  Lãi thật:         2.093.334đ  (~49.8% margin)
```

---

## Các Lỗi Thường Gặp

### Lỗi 1: "AI vẫn bịa món không có trong menu"

**Nguyên nhân:**
- Menu trong `restaurant_profile` chưa đầy đủ
- Hoặc prompt AI chưa inject context

**Giải pháp:**
1. Kiểm tra `/settings/restaurant_profile` có đủ món không
2. Kiểm tra `functions/index.js` có gọi `getRestaurantContext()` không
3. Xem log Cloud Functions để đảm bảo context được inject

### Lỗi 2: "Lãi/lỗ tính sai"

**Nguyên nhân:**
- Giá vốn chưa điền hoặc điền sai
- Chi phí cố định chưa cập nhật

**Giải pháp:**
1. Kiểm tra lại `menu[].cost` trong `restaurant_profile`
2. Kiểm tra `daily_fixed_cost` trong `financial_profile`
3. Nếu dùng `default_cogs_percent`, đảm bảo tỉ lệ đúng

### Lỗi 3: "Không sync được menu từ Product Catalog"

**Nguyên nhân:**
- `Product_Catalog` hoặc `public_menu` chưa có dữ liệu
- Hoặc service chưa implement sync function

**Giải pháp:**
1. Kiểm tra Firestore collection `Product_Catalog` có món không
2. Kiểm tra `public_menu` có giá không
3. Nếu chưa có, nhập menu thủ công trước

### Lỗi 4: "Prompt AI vẫn hard-code thông tin cũ"

**Nguyên nhân:**
- Code chưa refactor để đọc từ Firestore
- Vẫn còn string hard-code trong prompt

**Giải pháp:**
1. Tìm tất cả prompt trong `functions/index.js`
2. Thay thế string hard-code bằng `${restaurantContext}`
3. Đảm bảo mọi prompt đều gọi `getRestaurantContext()` trước

### Lỗi 5: "Thay đổi menu nhưng AI không cập nhật"

**Nguyên nhân:**
- Sửa menu ở chỗ khác (Product Catalog) nhưng chưa sync sang `restaurant_profile`

**Giải pháp:**
1. Sau khi sửa `Product_Catalog`, phải bấm **"Sync Menu"** lại
2. Hoặc sửa trực tiếp trong `/settings/restaurant_profile`
3. Kiểm tra timestamp `updatedAt` để đảm bảo đã lưu

---

## Checklist Hoàn Thành Sprint 0

Trước khi chuyển sang Sprint A (AI Core), đảm bảo:

- [ ] `/settings/restaurant_profile` đã có đầy đủ:
  - [ ] Thông tin cơ bản (name, address, phone, hours)
  - [ ] Brand narrative (concept, vibe, price_range, usp)
  - [ ] Menu đầy đủ với giá vốn cho từng món
- [ ] `/settings/financial_profile` đã có đầy đủ:
  - [ ] Chi phí cố định hàng tháng
  - [ ] Chi phí cố định mỗi ngày
  - [ ] Target doanh thu và lợi nhuận
  - [ ] Ngân sách Ads
- [ ] `/settings/cogs_ratio` đã có:
  - [ ] Tỉ lệ giá vốn trung bình
- [ ] Prompt AI đã refactor:
  - [ ] Không còn hard-code tên quán/menu
  - [ ] Inject `restaurantContext` vào mọi prompt
- [ ] Test thử:
  - [ ] Gọi AI tạo brief → kiểm tra có mention món thật không
  - [ ] Tính lãi thật → kiểm tra công thức đúng không

**Khi tất cả checklist ✅ → Sprint 0 hoàn thành → Có thể chuyển sang Sprint A**

---

## Cập Nhật Dữ Liệu Sprint 0

Sprint 0 không phải "làm 1 lần rồi bỏ". Cần cập nhật khi:

### Khi nào cần cập nhật Restaurant Profile?

- ✏️ Thêm món mới vào menu
- ✏️ Đổi giá bán hoặc giá vốn
- ✏️ Thay đổi giờ mở cửa
- ✏️ Thay đổi concept/vibe (rebrand)

### Khi nào cần cập nhật Financial Profile?

- ✏️ Tăng/giảm lương nhân viên
- ✏️ Thay đổi mặt bằng (thuê mới)
- ✏️ Điều chỉnh ngân sách Ads
- ✏️ Đặt lại target doanh thu/lợi nhuận

### Khi nào cần cập nhật COGS Ratio?

- ✏️ Giá nguyên liệu thay đổi nhiều
- ✏️ Thay đổi nhà cung cấp
- ✏️ Tối ưu được quy trình → giảm giá vốn

**Quy tắc vàng:** Cập nhật Sprint 0 **TRƯỚC** khi chạy AI. Nếu không, AI sẽ dùng dữ liệu cũ và ra quyết định sai.

---

*Xe Khô Chữa Lành — Sprint 0 Setup Guide | 05/2026*
