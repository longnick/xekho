# AUTO-ADS ENGINE GUIDE
## Xe Khô Chữa Lành — Hướng Dẫn Sử Dụng Hệ Thống Marketing AI

> **Mục đích:** Hướng dẫn operator sử dụng thật các chức năng Marketing AI để tạo và quản lý chiến dịch quảng cáo tự động.

---

## Tổng Quan Luồng Auto-Ads Engine

### Luồng Hoạt Động Hàng Ngày

```
[08:00] Quét Trend
   ↓
   AI tìm trend hot hôm nay (Google Search + Vertex AI)
   Lưu vào: /trend_daily/{date}
   
[09:00] Tạo Brief & Bộ Bài
   ↓
   Strategy Layer: Phân tích doanh thu + trend → tạo Brief
   Creative Layer: Viết 3 bài Facebook Ads
   Image Layer: Chọn ảnh từ Kho Tài Sản
   ↓
   Gửi Telegram để duyệt
   
[09:00-22:00] Operator Duyệt Bài
   ↓
   Bấm nút trên Telegram hoặc Web Dashboard
   - ✅ Duyệt: Chấp nhận bài
   - ✏️ Sửa: Chỉnh sửa nội dung
   - ❌ Bỏ: Từ chối bài
   
[Sau khi duyệt] Đăng Bài
   ↓
   Bấm "Đăng ngay" → Bài lên Facebook
   (Tùy chọn: Tạo Ads campaign)
   
[22:30] Tạo Snapshot Doanh Thu
   ↓
   Tổng hợp doanh thu ngày hôm nay
   Lưu vào: /daily_revenue_snapshot/{date}
   
[23:30] Đánh Giá Chiến Dịch
   ↓
   Tính lãi thật = Doanh thu - Giá vốn - Ads - Chi phí cố định
   Chấm điểm S/A/B/C/D
   Tự động tắt campaign cấp D (lỗ nặng)
```

---

## Marketing AI Decision Center

### Đây là gì?

**Marketing AI Decision Center** là trung tâm ra quyết định cho operator. Đây KHÔNG phải là nơi đọc nội dung dài.

### Truy cập

1. Mở trình duyệt: `https://your-app.web.app/admin/online`
2. Đăng nhập admin
3. Chọn tab **"Marketing AI"**

### Các Phần Chính

#### 1. Business Snapshot (Ảnh Chụp Kinh Doanh)

**Hiển thị:**
- Doanh thu hôm qua
- Số đơn hàng
- Top món bán chạy
- Lãi ước tính

**Mục đích:**
- Cho AI biết tình hình kinh doanh để ra quyết định
- Operator xem nhanh hiệu quả ngày hôm qua

**Nếu hiển thị "Chưa có daily_revenue_snapshot":**
1. Bấm nút **"Cập nhật snapshot"**
2. Chọn ngày (mặc định: hôm qua)
3. Hệ thống sẽ tính toán và tạo snapshot

**Snapshot tự động:**
- Mỗi ngày lúc 22:30, hệ thống tự động tạo snapshot
- Nếu lần đầu sử dụng, phải tạo thủ công 1 lần

#### 2. Trend Hôm Nay

**Hiển thị:**
- Từ khóa hot đang trending
- Chủ đề đang được quan tâm
- Sự kiện sắp tới
- Điểm cơ hội (opportunity score)

**Mục đích:**
- AI dùng để tạo brief sát với trend thị trường
- Operator biết hôm nay nên focus vào chủ đề gì

**Cách hoạt động:**
- Mỗi sáng 08:00, AI tự động quét trend
- Dùng Google Search + Vertex AI
- Tìm trend ẩm thực, du lịch Bảo Lộc, sự kiện, lifestyle

**Nếu không có trend:**
- Bấm nút **"Quét lại trend"** để chạy thủ công

#### 3. Prompt Control (Điều Khiển Prompt)

**Chức năng:**
- Điều chỉnh tone của AI (formal, casual, emotional)
- Bật/tắt mention giá trong bài viết
- Chọn style ưu tiên (storytelling, benefit-driven, urgency)
- Điều chỉnh độ dài bài viết

**Khi nào dùng:**
- Muốn thay đổi phong cách viết của AI
- Test A/B style khác nhau
- Điều chỉnh theo phản hồi khách hàng

**Lưu ý:**
- Thay đổi prompt sẽ ảnh hưởng đến brief tiếp theo
- Nên test trước khi áp dụng lâu dài

#### 4. Brief Đang Chờ Duyệt

**Hiển thị:**
- Danh sách brief AI vừa tạo
- Tóm tắt ngắn (situation summary)
- Trạng thái: pending / approved / rejected
- Nguồn quyết định: telegram / web_dashboard / system

**Mục đích:**
- Xem nhanh brief nào đang chờ
- Duyệt hoặc bỏ brief

**Hành động:**
- **Xem chi tiết:** Click vào brief → mở Sổ Nam Tào
- **Duyệt:** Brief được chấp nhận → AI sẽ tạo bộ bài
- **Bỏ:** Brief bị từ chối → không tạo bài

#### 5. Bộ Bài A/B Đang Chờ Chọn

**Hiển thị:**
- 3 bài viết AI vừa tạo (Post A, B, C)
- Preview nội dung (200 ký tự đầu)
- Ảnh/video đi kèm
- Budget cho mỗi bài
- Target audience
- Món highlight

**Mục đích:**
- Chọn bài nào để đăng
- Sửa nội dung nếu cần
- Quyết định budget

**Hành động:**
- **✅ Duyệt:** Chấp nhận bài này
- **✏️ Sửa:** Chỉnh sửa nội dung
- **❌ Bỏ:** Từ chối bài này
- **🔄 Tạo lại:** Yêu cầu AI viết lại

#### 6. Timeline Quyết Định

**Hiển thị:**
- Lịch sử quyết định gần đây (20 mục)
- Ai duyệt/bỏ bài nào, khi nào
- Nguồn quyết định (Telegram / Web / System)

**Mục đích:**
- Audit trail: biết ai làm gì
- Xem lại quyết định đã chốt

---

## Business Snapshot

### Business Snapshot là gì?

**Business Snapshot** là ảnh chụp tình hình kinh doanh của quán mỗi ngày.

### Chứa Thông Tin Gì?

```json
{
  "date": "2026-05-05",
  "total_revenue": 4250000,        // Tổng doanh thu
  "total_orders": 47,               // Số đơn hàng
  "top_items": [                    // Top món bán chạy
    {"name": "Mực nướng", "qty": 34, "revenue": 1360000},
    {"name": "Bạch tuộc", "qty": 18, "revenue": 900000}
  ],
  "estimated_cogs": 1700000,        // Giá vốn ước tính
  "estimated_gross_profit": 2550000, // Lãi gộp
  "ads_spend_today": 150000,        // Chi phí Ads
  "fixed_cost_today": 276666,       // Chi phí cố định
  "estimated_net_profit": 2123334   // Lãi ròng
}
```

### AI Dùng Snapshot Như Thế Nào?

Khi tạo brief, AI sẽ đọc snapshot để:
- Biết món nào bán chạy → highlight món đó trong bài viết
- Biết doanh thu cao/thấp → điều chỉnh tone (tự tin / cẩn trọng)
- Biết lãi/lỗ → quyết định budget Ads hợp lý
- Tránh lặp lại style bài đã lỗ

### Cách Tạo Snapshot Thủ Công

1. Vào tab **"Marketing AI"**
2. Tìm phần **"Business Snapshot"**
3. Nếu hiển thị "Chưa có daily_revenue_snapshot":
   - Bấm nút **"Cập nhật snapshot"**
   - Chọn ngày (mặc định: hôm qua)
   - Đợi 5-10 giây
4. Snapshot sẽ hiển thị

### Snapshot Tự Động

- **Thời gian:** Mỗi ngày lúc 22:30
- **Nguồn dữ liệu:** 
  - V1: Từ `online_orders` (đơn online)
  - V2 (tương lai): Từ `online_orders` + POS core (đơn tại quán)
- **Lưu trữ:** Firestore `/daily_revenue_snapshot/{YYYY-MM-DD}`

---

## Trend Hôm Nay

### Trend là gì?

**Trend** là xu hướng đang hot trên thị trường hôm nay, được AI tự động quét và phân tích.

### Chứa Thông Tin Gì?

```json
{
  "date": "2026-05-05",
  "keywords": [
    {"term": "ăn đêm Bảo Lộc", "score": 85},
    {"term": "hải sản nướng", "score": 78}
  ],
  "themes": ["gia đình", "chill", "du lịch cuối tuần"],
  "platform_signals": {
    "facebook": "video ngắn đang outperform"
  },
  "upcoming_events": [
    {"name": "Lễ 30/4", "days_until": 15}
  ],
  "opportunity_score": 78
}
```

### AI Dùng Trend Như Thế Nào?

- Chọn góc độ bài viết phù hợp với trend
- Dùng từ khóa hot trong bài
- Điều chỉnh format (video nếu video đang hot)
- Tận dụng sự kiện sắp tới

### Cách Quét Trend Thủ Công

1. Vào tab **"Marketing AI"**
2. Tìm phần **"Trend Hôm Nay"**
3. Bấm nút **"Quét lại trend"**
4. Đợi 10-15 giây
5. Trend mới sẽ hiển thị

### Trend Tự Động

- **Thời gian:** Mỗi sáng 08:00
- **Nguồn:** Google Search + Vertex AI
- **Lưu trữ:** Firestore `/trend_daily/{YYYY-MM-DD}`

---

## Brief Đang Chờ Duyệt

### Brief là gì?

**Brief** là bản chỉ dẫn chiến lược do AI tạo ra, bao gồm:
- Tình hình kinh doanh hôm qua
- Trend hôm nay
- Góc độ nên đánh (angle)
- Tone nên dùng
- Món nên highlight
- Target audience
- Budget đề xuất

### Cấu Trúc Brief

```json
{
  "brief_id": "brief_20260505_001",
  "date": "2026-05-05",
  "situation_summary": "Doanh thu ổn, trend chill đang lên",
  "strategy": {
    "focus": "Nhóm 25-40 tuổi tìm trải nghiệm cuối tuần Bảo Lộc",
    "avoid": "Tránh bài giảm giá — 2 bài gần nhất style này đều lỗ",
    "budget_total_vnd": 300000,
    "budget_per_post": [150000, 100000, 50000]
  },
  "creative_directives": [
    {
      "post_index": 1,
      "angle": "Cảm xúc — đêm mát Bảo Lộc + mực nướng + bạn bè",
      "tone": "Thư giãn, gợi nhớ, không đề cập giá",
      "format_priority": "video",
      "keywords": ["Bảo Lộc", "ăn đêm", "chill"],
      "featured_items": ["Mực nướng", "Bạch tuộc"],
      "target_desc": "Phụ nữ 25-40, TP.HCM + Bảo Lộc"
    }
  ]
}
```

### Cách Duyệt Brief

#### Trên Web Dashboard

1. Vào tab **"Marketing AI"**
2. Tìm phần **"Brief Đang Chờ Duyệt"**
3. Click vào brief để xem chi tiết
4. Bấm **"Duyệt"** hoặc **"Bỏ"**

#### Trên Telegram

1. Nhận tin nhắn từ Bot lúc 09:00
2. Đọc brief summary
3. Bấm nút **[✅ Duyệt]** hoặc **[❌ Bỏ]**

### Khi Nào Nên Duyệt Brief?

✅ **Nên duyệt khi:**
- Strategy hợp lý với tình hình thực tế
- Món highlight đúng với menu hiện tại
- Budget phù hợp với ngân sách
- Angle phù hợp với brand

❌ **Nên bỏ khi:**
- Strategy không phù hợp
- Mention món không có trong menu
- Budget quá cao
- Angle không đúng với brand positioning

---

## Bộ Bài A/B

### Bộ Bài A/B là gì?

Sau khi duyệt brief, AI sẽ tạo **3 bài viết** (Post A, B, C) theo chỉ dẫn trong brief.

### Mỗi Bài Chứa Gì?

```json
{
  "post_id": "post_20260505_001",
  "brief_id": "brief_20260505_001",
  "post_index": 1,
  "content_full": "🔥 Đêm Bảo Lộc mát rượi...\n\n[nội dung]\n\n#XeKhoChuaLanh #BaoLoc",
  "asset": {
    "asset_id": "asset_047",
    "url": "https://storage.googleapis.com/...",
    "type": "video",
    "source": "real_photo"
  },
  "targeting": {
    "locations": ["Bảo Lộc", "TP.HCM"],
    "age_min": 25,
    "age_max": 45
  },
  "budget_vnd": 150000,
  "status": "pending"
}
```

### Cách Duyệt Bài

#### Trên Web Dashboard

1. Vào tab **"Marketing AI"**
2. Tìm phần **"Bộ Bài A/B Đang Chờ Chọn"**
3. Xem preview 3 bài
4. Chọn hành động:
   - **✅ Duyệt:** Chấp nhận bài
   - **✏️ Sửa:** Chỉnh sửa nội dung
   - **❌ Bỏ:** Từ chối bài
   - **🔄 Tạo lại:** Viết lại bài mới

#### Trên Telegram

1. Nhận 3 tin nhắn (mỗi bài 1 tin)
2. Mỗi tin có:
   - Preview nội dung (200 ký tự đầu)
   - Ảnh/video thumbnail
   - Budget, target, món highlight
3. Bấm nút:
   - **[✅ Duyệt]**
   - **[✏️ Sửa]**
   - **[❌ Bỏ]**

### Workflow Sửa Bài

1. Bấm nút **[✏️ Sửa]**
2. Bot hỏi: "Nhắn nội dung sửa:"
3. Gửi tin nhắn text với nội dung mới
4. Bot lưu `content_edited`
5. Bài sẽ dùng nội dung đã sửa khi đăng

### Workflow Tạo Lại Bài

1. Bấm nút **[🔄 Tạo lại]**
2. AI sẽ viết lại bài mới (giữ nguyên brief)
3. Nhận bài mới sau 10-15 giây

### Khi Nào Nên Duyệt Bài?

✅ **Nên duyệt khi:**
- Nội dung chính xác, không sai sót
- Tone phù hợp với brand
- Mention đúng món trong menu
- Ảnh/video phù hợp với nội dung
- CTA rõ ràng

❌ **Nên sửa/bỏ khi:**
- Có lỗi chính tả, ngữ pháp
- Tone không đúng
- Mention món không có
- Ảnh/video không phù hợp
- Nội dung quá dài/ngắn

---

## Sổ Nam Tào

### Sổ Nam Tào là gì?

**Sổ Nam Tào** là kho lưu trữ nội dung dài, dùng để đọc lại sau. Đây KHÔNG phải Decision Center.

### Chứa Gì?

- Brief đầy đủ (300-800 từ)
- Bộ bài đầy đủ (3 bài × 150-250 từ)
- Telegram archive
- Lịch sử quyết định chi tiết
- Lý do duyệt/bỏ

### Truy Cập

1. Vào `/admin/online`
2. Chọn tab **"Sổ Nam Tào"**

### Các Chức Năng

#### 1. Danh Sách Brief

- Hiển thị tất cả brief đã tạo
- Filter theo:
  - Ngày
  - Trạng thái (pending / approved / rejected)
  - Nguồn quyết định (telegram / web / system)

#### 2. Xem Chi Tiết Brief

- Click vào brief → mở modal/page chi tiết
- Hiển thị:
  - Nội dung brief đầy đủ
  - Prompt snapshot
  - Quyết định cuối cùng
  - Lý do duyệt/bỏ

#### 3. Danh Sách Bộ Bài

- Hiển thị tất cả bộ bài đã tạo
- Filter tương tự brief

#### 4. Xem Chi Tiết Bài

- Click vào bài → xem nội dung đầy đủ
- Hiển thị:
  - Nội dung gốc (`content_full`)
  - Nội dung đã sửa (`content_edited`)
  - Nội dung cuối cùng (`content_final`)
  - Asset đi kèm
  - Targeting, budget
  - Kết quả (nếu đã chạy)

#### 5. Link Google Sheets (Tùy chọn)

Nếu có mirror sang Google Sheets:
- Mỗi brief có link đến sheet riêng
- Click link → mở Google Sheets để đọc
- Tiện cho CMO đọc/chia sẻ nội bộ

### Khi Nào Dùng Sổ Nam Tào?

- 📖 Đọc lại brief/bài cũ
- 🔍 Tìm kiếm brief theo từ khóa
- 📊 Phân tích style nào hiệu quả
- 🗂️ Archive nội dung dài

---

## Kho Tài Sản

### Kho Tài Sản là gì?

**Kho Tài Sản** (Asset Library) là nơi quản lý ảnh/video của quán.

### Chứa Gì?

```json
{
  "asset_id": "asset_047",
  "type": "video",
  "url": "https://storage.googleapis.com/...",
  "thumbnail_url": "...",
  "tags": ["mực nướng", "đêm", "khói", "bàn nhậu"],
  "mood": "warm",
  "source": "real_photo",
  "times_used": 3,
  "avg_ctr_when_used": 1.8,
  "last_used_date": "2026-05-03",
  "active": true
}
```

### Nguồn Tài Sản

1. **Upload từ Admin Dashboard**
   - Vào tab **"Kho Tài Sản"**
   - Bấm **"Upload"**
   - Chọn file ảnh/video
   - Điền tags, mood, description

2. **Gửi vào Telegram Bot**
   - Gửi ảnh/video vào Bot
   - Bot tự động tải về Cloud Storage
   - Tạo metadata trong Firestore
   - Lưu vào Kho Tài Sản

3. **Imagen 3 Fallback** (Tương lai)
   - Khi kho ảnh thật không đủ
   - AI tự động generate ảnh
   - Lưu vào kho để dùng lại

4. **Canva Export** (Tương lai)
   - Tạo banner có text
   - Export PNG
   - Lưu vào kho

### Cách AI Chọn Ảnh

Khi tạo bài, AI sẽ:
1. Tìm trong Kho Tài Sản theo:
   - Tags phù hợp với nội dung
   - Mood phù hợp với tone
   - Chưa dùng trong 7 ngày gần đây
2. Nếu không có → fallback Imagen 3
3. Lưu asset đã chọn vào bài

### Quản Lý Kho Tài Sản

#### Xem Danh Sách

- Grid view: thumbnail + metadata
- Filter theo:
  - Type (image / video)
  - Tags
  - Mood
  - Source (real_photo / ai_generated / canva)
  - Active (true / false)

#### Chỉnh Sửa Asset

- Click vào asset → modal chi tiết
- Sửa:
  - Tags
  - Mood
  - Description
  - Active status

#### Xóa Asset

- Click **"Xóa"**
- Xác nhận
- Asset bị đánh dấu `active: false`
- Không xóa hẳn (để giữ lịch sử)

---

## Telegram Approve/Edit/Reject Workflow

### Telegram Bot là gì?

Telegram Bot cho phép operator duyệt bài nhanh trên điện thoại, không cần mở web.

### Setup Telegram Bot

1. Tìm bot: `@YourBotName` (thay bằng tên bot thật)
2. Bấm **Start**
3. Bot sẽ gửi tin nhắn chào mừng

### Workflow Hàng Ngày

#### 09:00 — Nhận Brief

```
📋 BRIEF HÔM NAY — Xe Khô Chữa Lành
Doanh thu hôm qua: 4.250.000đ | Lãi: 2.093.334đ
Trend: Ăn đêm Bảo Lộc, chill, du lịch cuối tuần

CHIẾN LƯỢC:
- Focus: Nhóm 25-40 tuổi tìm trải nghiệm cuối tuần
- Tránh: Bài giảm giá (2 bài gần nhất lỗ)
- Budget: 300.000đ (150k + 100k + 50k)

[✅ Duyệt]  [❌ Bỏ]
```

**Hành động:**
- Bấm **[✅ Duyệt]** → AI tạo 3 bài
- Bấm **[❌ Bỏ]** → Không tạo bài

#### 09:05 — Nhận 3 Bài (Nếu Duyệt Brief)

```
📋 BÀI 1/3 — Xe Khô Chữa Lành
Doanh thu hôm qua ổn, trend chill đang lên

🔥 Đêm Bảo Lộc mát rượi, ngồi vỉa hè nhâm nhi mực nướng...
[Preview 200 ký tự]

[Ảnh/Video thumbnail]

💰 150.000đ | 🎯 Phụ nữ 25-40, TP.HCM + Bảo Lộc
🍽️ Món highlight: Mực nướng, Bạch tuộc
💡 Góc cảm xúc, tone thư giãn

[✅ Duyệt]  [✏️ Sửa]  [❌ Bỏ]
```

**Hành động:**
- **[✅ Duyệt]:** Chấp nhận bài → status = approved
- **[✏️ Sửa]:** Chỉnh sửa nội dung
- **[❌ Bỏ]:** Từ chối bài → status = rejected

#### Workflow Sửa Bài

1. Bấm **[✏️ Sửa]**
2. Bot reply: "Nhắn nội dung sửa:"
3. Gửi tin nhắn text với nội dung mới:
   ```
   🔥 Đêm Bảo Lộc mát mẻ, ngồi vỉa hè thưởng thức mực nướng thơm lừng...
   
   [Nội dung đã sửa]
   
   #XeKhoChuaLanh #BaoLoc #AnDem
   ```
4. Bot xác nhận: "Đã lưu nội dung sửa ✅"
5. Bài sẽ dùng nội dung này khi đăng

#### Đăng Bài

Sau khi duyệt đủ bài:
```
✅ Đã duyệt 2/3 bài

[🚀 Đăng ngay]  [⏰ Đăng sau]
```

**Hành động:**
- **[🚀 Đăng ngay]:** Đăng lên Facebook ngay lập tức
- **[⏰ Đăng sau]:** Lên lịch đăng (chọn giờ)

### Telegram State Machine

Bot dùng state machine để theo dõi workflow:

```
/telegram_sessions/{chat_id}
{
  "waiting_for": "edit_post_20260505_002",
  "context": {"post_id": "post_20260505_002"},
  "expires_at": "Timestamp (15 phút)"
}
```

- Khi bấm **[✏️ Sửa]**, bot tạo session
- Tin nhắn tiếp theo sẽ được hiểu là nội dung sửa
- Session hết hạn sau 15 phút

---

## Những Phần Chưa Production-Ready

### 1. Meta Ads Campaign Thật

**Trạng thái hiện tại:**
- ✅ Đăng Facebook post: Đã có
- ❌ Tạo Ads campaign thật: Chưa có

**Cần làm:**
- Tích hợp Meta Marketing API
- Tạo campaign, ad set, ad
- Set budget, targeting, schedule
- Monitor spend real-time

**Rủi ro:**
- Meta API có thể reject
- Cần System User Token
- Cần Ad Account ID

### 2. Imagen 3 / Canva Fallback

**Trạng thái hiện tại:**
- ✅ Kho Tài Sản: Đã có
- ✅ Upload ảnh thật: Đã có
- ✅ Telegram ingest: Đã có
- ❌ Imagen 3 generate: Chưa có
- ❌ Canva export: Chưa có

**Cần làm:**
- Enable Imagen 3 trong Vertex AI
- Implement generate function
- Cache ảnh đã tạo
- (Optional) Tích hợp Canva API

**Rủi ro:**
- Imagen 3 tốn credit
- Ảnh AI không bằng ảnh thật

### 3. Meta Spend Thật

**Trạng thái hiện tại:**
- ✅ Daily revenue snapshot: Đã có (V1 từ online_orders)
- ❌ Meta spend thật: Chưa có (đang để 0)

**Cần làm:**
- Gọi Meta Insights API
- Lấy spend theo campaign
- Lưu vào `daily_revenue_snapshot.ads_spend_today`

**Rủi ro:**
- API rate limit
- Spend data có delay

### 4. Evaluator & Guardian

**Trạng thái hiện tại:**
- ✅ Tính lãi thật: Đã có công thức
- ❌ Chấm điểm S/A/B/C/D: Chưa chạy thật
- ❌ Auto-pause cấp D: Chưa có

**Cần làm:**
- Implement `scheduledEvaluator()` (23:30 hàng ngày)
- Implement `scheduledGuardian()` (mỗi 30 phút)
- Tích hợp Meta API để pause campaign

**Rủi ro:**
- Pause nhầm campaign tốt
- Không pause kịp campaign lỗ nặng

---

## Câu Hỏi Thường Gặp

### Q1: Tại sao AI bịa món không có trong menu?

**A:** Sprint 0 chưa đầy đủ. Kiểm tra:
- `/settings/restaurant_profile` có menu đầy đủ không?
- Prompt AI có inject `restaurantContext` không?

### Q2: Tại sao không nhận được tin nhắn Telegram?

**A:** Kiểm tra:
- Bot đã Start chưa?
- Chat ID đã đúng chưa?
- Cloud Function `telegramWebhook` có lỗi không?

### Q3: Tại sao bài viết không đăng lên Facebook?

**A:** Kiểm tra:
- Page Access Token còn hạn không?
- Có quyền `pages_manage_posts` không?
- Cloud Function `executeApprovedPosts` có lỗi không?

### Q4: Tại sao lãi/lỗ tính sai?

**A:** Kiểm tra:
- Giá vốn trong menu đã đúng chưa?
- Chi phí cố định đã cập nhật chưa?
- Meta spend có lấy được không? (hiện đang để 0)

### Q5: Tại sao không có trend hôm nay?

**A:** Kiểm tra:
- Scheduled function `scheduledTrendScan` có chạy không?
- Vertex AI credit còn không?
- Google Search Grounding có bật không?

---

*Xe Khô Chữa Lành — Auto-Ads Engine Guide | 05/2026*
