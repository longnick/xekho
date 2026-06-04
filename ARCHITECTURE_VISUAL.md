# 🏗️ SƠ ĐỒ KIẾN TRÚC HỆ THỐNG - VISUAL
## Xe Khô Chữa Lành - Dễ nhìn, Dễ hiểu

**Version:** 1.0 | **Date:** 17/05/2026

---

## 📊 SƠ ĐỒ TỔNG QUAN HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          👥 NGƯỜI DÙNG (USERS)                               │
├──────────────┬──────────────┬──────────────┬──────────────────────────────┤
│              │              │              │                              │
│  👨‍💼 Thu ngân  │  👨‍🍳 Bếp      │  👨‍💻 Admin    │  🛒 Khách hàng              │
│  (Cashier)  │  (Kitchen)   │  (Manager)   │  (Customer)                  │
│              │              │              │                              │
└──────┬───────┴──────┬───────┴──────┬───────┴──────────────┬───────────────┘
       │              │              │                      │
       │              │              │                      │
       ▼              ▼              ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        🖥️ FRONTEND APPLICATIONS                              │
├─────────────────────────────────────┬───────────────────────────────────────┤
│                                     │                                       │
│  📱 XEKHO (Vanilla JavaScript)      │  🎨 WEBAPP-MENU (React + TypeScript) │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────────────┐ │
│  │ • POS System                │   │  │ • Chief of Staff Dashboard      │ │
│  │ • Kitchen Display (KDS)     │   │  │ • Marketing AI (8 tabs)         │ │
│  │ • AI Chatbot (Voice+Text)   │   │  │ • Online Ordering               │ │
│  │ • Inventory Management      │   │  │ • Facebook Ads Manager          │ │
│  │ • Table Management          │   │  │ • Analytics Dashboard           │ │
│  └─────────────────────────────┘   │  └─────────────────────────────────┘ │
│                                     │                                       │
└──────────────┬──────────────────────┴──────────────┬────────────────────────┘
               │                                     │
               │         HTTP/HTTPS Requests         │
               │                                     │
               ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ☁️ FIREBASE CLOUD FUNCTIONS (Backend)                     │
├─────────────────────────────────────┬───────────────────────────────────────┤
│                                     │                                       │
│  ⚡ XEKHO Functions                 │  🎯 WEBAPP-MENU Functions             │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────────────┐ │
│  │ • aiRouter                  │   │  │ • scheduledChiefOfStaff         │ │
│  │ • purchaseOcr               │   │  │ • scheduledDirectorBrief        │ │
│  │ • telegramWebhook           │   │  │ • generateChiefTargetPlan       │ │
│  │ • scheduledReport           │   │  │ • renderVideoWithFFmpeg         │ │
│  │ • adminGenerateMenuImage    │   │  │ • publishToFacebook             │ │
│  │ • adminGenerateMenuDesc     │   │  │ • syncFacebookMetrics           │ │
│  └─────────────────────────────┘   │  └─────────────────────────────────┘ │
│                                     │                                       │
└──────────────┬──────────────────────┴──────────────┬────────────────────────┘
               │                                     │
               │         Read/Write Operations       │
               │                                     │
               ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      🗄️ FIRESTORE DATABASE (NoSQL)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📦 SHARED COLLECTIONS (Dùng chung giữa 2 apps)                            │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • public_menu          → Menu công khai cho khách                     │ │
│  │ • order_requests       → Đơn hàng online từ khách                     │ │
│  │ • service_requests     → Yêu cầu gọi nhân viên                        │ │
│  │ • history              → Lịch sử đơn hàng (POS + Online)              │ │
│  │ • Product_Catalog      → Danh mục sản phẩm                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  🍽️ XEKHO COLLECTIONS (POS riêng)                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • Inventory_Items      → Quản lý kho nguyên liệu                      │ │
│  │ • purchases            → Lịch sử nhập hàng                            │ │
│  │ • kitchen_notifications → Thông báo cho bếp                           │ │
│  │ • settings             → Cấu hình hệ thống                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  🎨 WEBAPP-MENU COLLECTIONS (Marketing riêng)                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • director_briefs      → Báo cáo Marketing AI hàng ngày               │ │
│  │ • marketing_actions    → Bài viết/content đã tạo                      │ │
│  │ • executive_daily_briefs → Báo cáo Chief of Staff                     │ │
│  │ • competitor_watch     → Theo dõi đối thủ                             │ │
│  │ • marketing_evaluations → Đánh giá hiệu quả content                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└──────────────┬──────────────────────────────────────────────────────────────┘
               │
               │         API Calls
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      🌐 EXTERNAL SERVICES (Dịch vụ bên ngoài)               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🤖 VERTEX AI (Google Cloud)                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • Gemini 2.5 Pro      → AI phức tạp (Chief analysis, chatbot)        │ │
│  │ • Gemini 2.5 Flash    → AI nhanh (content generation)                │ │
│  │ • Imagen 4.0          → Tạo ảnh từ text (menu, marketing)            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  📘 FACEBOOK GRAPH API                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • Page Metrics        → Followers, engagement, reach                  │ │
│  │ • Post Management     → Tạo/publish bài viết                          │ │
│  │ • Ads Management      → Quản lý quảng cáo                             │ │
│  │ • Insights            → Phân tích hiệu quả                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  📊 BIGQUERY (Analytics)                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • Daily KPI           → Doanh thu, đơn hàng, chi phí                  │ │
│  │ • Customer Behavior   → Phân tích hành vi khách                       │ │
│  │ • Marketing Posts     → Lưu trữ & phân tích content                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  📧 TELEGRAM BOT API                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • Kitchen Notifications → Thông báo đơn mới cho bếp                   │ │
│  │ • Daily Reports        → Báo cáo tự động 9h sáng                      │ │
│  │ • Director Briefs      → Marketing brief hàng ngày                    │ │
│  │ • Alerts               → Cảnh báo lỗi, hết hàng                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  🌤️ OPENWEATHERMAP API                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • Current Weather     → Thời tiết hiện tại Bảo Lộc                    │ │
│  │ • 5-day Forecast      → Dự báo 5 ngày (8 khung giờ/ngày)             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  🎬 FFMPEG (Video Processing)                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ • Video Rendering     → Render video từ ảnh + audio                  │ │
│  │ • Transcoding         → Chuyển đổi format (MP4, WebM)                │ │
│  │ • Thumbnail           → Tạo thumbnail từ video                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 LUỒNG ĐƠN HÀNG (ORDER FLOW)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LUỒNG ĐẶT MÓN & THANH TOÁN                          │
└─────────────────────────────────────────────────────────────────────────────┘

BƯỚC 1: KHÁCH ĐẶT MÓN ONLINE
┌──────────────┐
│  🛒 Khách    │
│   hàng       │
└──────┬───────┘
       │ 1. Browse menu
       │ 2. Add to cart
       │ 3. Checkout (table, name, phone)
       ▼
┌──────────────┐      ┌─────────────────┐
│ 🌐 Web App   │─────▶│ ☁️ Cloud        │
│ (Online      │      │   Functions     │
│  Ordering)   │      └────────┬────────┘
└──────────────┘               │
                               │ Save to Firestore
                               ▼
                        ┌──────────────┐
                        │ 🗄️ Firestore │
                        │ order_       │
                        │ requests     │
                        └──────┬───────┘
                               │
                               │ Trigger notification
                               ▼
                        ┌──────────────┐
                        │ 📧 Telegram  │
                        │ "Đơn mới!"   │
                        └──────────────┘

═══════════════════════════════════════════════════════════════════════════════

BƯỚC 2: NHÂN VIÊN DUYỆT ĐƠN
┌──────────────┐
│ 📱 POS       │
│ (XEKHO)      │
└──────┬───────┘
       │ Realtime listener
       │ (Firestore)
       ▼
┌──────────────────────────────┐
│  Hiển thị đơn mới            │
│  ┌────────────────────────┐  │
│  │ Bàn 5                  │  │
│  │ Khách: Nguyễn Văn A    │  │
│  │ 2x Khô bò = 100,000đ   │  │
│  │                        │  │
│  │ [Duyệt] [Từ chối]      │  │
│  └────────────────────────┘  │
└──────────────┬───────────────┘
               │ Admin click "Duyệt"
               ▼
        ┌──────────────┐
        │ ☁️ Cloud     │
        │   Functions  │
        └──────┬───────┘
               │ Update status: approved
               │ Create order in history
               ▼
        ┌──────────────┐
        │ 🗄️ Firestore │
        └──────────────┘

═══════════════════════════════════════════════════════════════════════════════

BƯỚC 3: BẾP NHẬN ĐƠN & NẤU
┌──────────────┐
│ 👨‍🍳 Kitchen   │
│   Display    │
│   (KDS)      │
└──────┬───────┘
       │ Realtime listener
       ▼
┌──────────────────────────────┐
│  Màn hình bếp                │
│  ┌────────────────────────┐  │
│  │ ⏰ 10:30 | Bàn 5       │  │
│  │ ────────────────────   │  │
│  │ 2x Khô bò              │  │
│  │                        │  │
│  │ Status: 🔴 Pending     │  │
│  │ [Nhận đơn]             │  │
│  └────────────────────────┘  │
└──────────────┬───────────────┘
               │ Click "Nhận đơn"
               ▼
        Status: 🟡 Cooking
               │
               │ Món xong
               ▼
        Status: 🟢 Ready
               │
               │ Notify POS
               ▼
┌──────────────────────────────┐
│ 📱 POS                       │
│ Badge update: 🔔 Món sẵn sàng│
└──────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

BƯỚC 4: THANH TOÁN & HOÀN THÀNH
┌──────────────┐
│ 📱 POS       │
└──────┬───────┘
       │ Khách thanh toán
       ▼
┌──────────────────────────────┐
│  Màn hình thanh toán         │
│  ┌────────────────────────┐  │
│  │ Tổng: 100,000đ         │  │
│  │                        │  │
│  │ [💵 Tiền mặt]          │  │
│  │ [💳 Chuyển khoản]      │  │
│  │ [💳 Thẻ]               │  │
│  └────────────────────────┘  │
└──────────────┬───────────────┘
               │ Chọn phương thức
               ▼
        ┌──────────────┐
        │ ☁️ Generate  │
        │    Bill      │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ 🖨️ In hóa đơn │
        │ + QR Banking │
        └──────────────┘
               │
               ▼
        ✅ Hoàn thành!
```

---

## 🎨 LUỒNG MARKETING AI (MARKETING FLOW)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG TẠO & PUBLISH CONTENT MARKETING                     │
└─────────────────────────────────────────────────────────────────────────────┘

BƯỚC 1: AI TẠO BRIEF TỰ ĐỘNG (9:00 AM)
┌──────────────┐
│ ⏰ Scheduler │
│ (CRON)       │
└──────┬───────┘
       │ Trigger: 0 9 * * *
       ▼
┌──────────────────────────────┐
│ ☁️ scheduledDirectorBrief    │
└──────┬───────────────────────┘
       │
       │ Fetch data từ nhiều nguồn:
       ├─────▶ 🗄️ Firestore (revenue, orders)
       ├─────▶ 📘 Facebook API (followers, engagement)
       ├─────▶ 🌤️ Weather API (thời tiết Bảo Lộc)
       └─────▶ 📊 BigQuery (analytics)
       │
       │ Gửi tất cả data cho AI
       ▼
┌──────────────────────────────┐
│ 🤖 Vertex AI                 │
│ (Gemini 2.5 Pro)             │
└──────┬───────────────────────┘
       │ AI phân tích & tạo brief:
       │ • Tóm tắt tình hình
       │ • Trend hôm nay
       │ • Ý tưởng content (3-5 ý)
       ▼
┌──────────────────────────────┐
│ 📝 Director Brief            │
│ ┌──────────────────────────┐ │
│ │ 📣 BRIEF MARKETING 9H    │ │
│ │ Ngày: 17/05/2026         │ │
│ │                          │ │
│ │ 🌤️ Thời tiết: Mưa nhẹ   │ │
│ │ 🔥 Trend: Stand banh mi  │ │
│ │                          │ │
│ │ 💡 Ý tưởng:              │ │
│ │ 1. Post về combo tiết    │ │
│ │    kiệm cho ngày mưa     │ │
│ │ 2. Video khô bò giao     │ │
│ │    tận nơi               │ │
│ │ 3. Story về trend viral  │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │ Save to Firestore
       │ + Send to Telegram
       ▼
┌──────────────┐    ┌──────────────┐
│ 🗄️ Firestore │    │ 📧 Telegram  │
│ director_    │    │ (Compact)    │
│ briefs       │    └──────────────┘
└──────────────┘

═══════════════════════════════════════════════════════════════════════════════

BƯỚC 2: ADMIN CHỌN Ý TƯỞNG & TẠO CONTENT
┌──────────────┐
│ 👨‍💻 Admin    │
└──────┬───────┘
       │ Mở Marketing AI Tab
       ▼
┌──────────────────────────────┐
│ 🎨 Marketing AI UI           │
│ ┌──────────────────────────┐ │
│ │ Brief hôm nay:           │ │
│ │ ☑️ Ý tưởng 1: Combo mưa  │ │ ◀── Chọn ý tưởng này
│ │ ☐ Ý tưởng 2: Video giao  │ │
│ │ ☐ Ý tưởng 3: Story trend │ │
│ │                          │ │
│ │ [Tạo content]            │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │ Click "Tạo content"
       ▼
┌──────────────────────────────┐
│ ☁️ generateMarketingAction   │
└──────┬───────────────────────┘
       │
       ├─────▶ 🤖 Gemini 2.5 Flash
       │       (Tạo text + hashtags)
       │
       └─────▶ 🤖 Imagen 4.0
               (Tạo ảnh từ prompt)
       │
       ▼
┌──────────────────────────────┐
│ 📝 Content đã tạo            │
│ ┌──────────────────────────┐ │
│ │ 🖼️ [Ảnh AI đẹp]          │ │
│ │                          │ │
│ │ 📝 Text:                 │ │
│ │ "Ngày mưa Bảo Lộc, ở     │ │
│ │ nhà ăn khô bò ấm áp...   │ │
│ │ Giao tận nơi 30 phút!"   │ │
│ │                          │ │
│ │ #️⃣ #XeKho #BaoLoc       │ │
│ │    #KhoBo #GiaoTanNoi    │ │
│ │                          │ │
│ │ [✅ Duyệt] [❌ Từ chối]  │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │ Save to Firestore
       ▼
┌──────────────┐
│ 🗄️ Firestore │
│ marketing_   │
│ actions      │
└──────────────┘

═══════════════════════════════════════════════════════════════════════════════

BƯỚC 3: PUBLISH LÊN FACEBOOK
┌──────────────┐
│ 👨‍💻 Admin    │
└──────┬───────┘
       │ Click "Duyệt" & "Publish"
       ▼
┌──────────────────────────────┐
│ ☁️ publishToFacebook         │
└──────┬───────────────────────┘
       │
       │ Upload ảnh + text
       ▼
┌──────────────────────────────┐
│ 📘 Facebook Graph API        │
│ POST /{page-id}/feed         │
└──────┬───────────────────────┘
       │ Return post_id
       ▼
┌──────────────────────────────┐
│ ✅ Published!                │
│ Post ID: 123456789           │
└──────┬───────────────────────┘
       │ Update Firestore
       │ + Log to BigQuery
       ▼
┌──────────────┐    ┌──────────────┐
│ 🗄️ Firestore │    │ 📊 BigQuery  │
│ status:      │    │ marketing_   │
│ published    │    │ posts        │
└──────────────┘    └──────────────┘

═══════════════════════════════════════════════════════════════════════════════

BƯỚC 4: THEO DÕI HIỆU QUẢ
┌──────────────┐
│ ⏰ Scheduler │
│ (Sau 24h)    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ ☁️ trackPostPerformance      │
└──────┬───────────────────────┘
       │
       │ Fetch insights
       ▼
┌──────────────────────────────┐
│ 📘 Facebook Graph API        │
│ GET /{post-id}/insights      │
└──────┬───────────────────────┘
       │ Return metrics
       ▼
┌──────────────────────────────┐
│ 📊 Performance Metrics       │
│ • Reach: 1,250 người         │
│ • Engagement: 85 tương tác   │
│ • Clicks: 32 clicks          │
│ • Shares: 5 shares           │
└──────┬───────────────────────┘
       │ Gửi cho AI đánh giá
       ▼
┌──────────────────────────────┐
│ 🤖 Vertex AI                 │
│ (Gemini 2.5 Flash)           │
└──────┬───────────────────────┘
       │ AI chấm điểm
       ▼
┌──────────────────────────────┐
│ 📝 Evaluation                │
│ Grade: A+                    │
│ Feedback: "Hook mạnh, ảnh    │
│ đẹp, timing tốt (mưa)"       │
└──────┬───────────────────────┘
       │ Save to Firestore
       ▼
┌──────────────┐
│ 🗄️ Firestore │
│ marketing_   │
│ evaluations  │
└──────────────┘
```

---

## 👔 LUỒNG CHIEF OF STAFF (CHIEF FLOW)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LUỒNG PHÂN TÍCH & ĐẶT MỤC TIÊU                         │
└─────────────────────────────────────────────────────────────────────────────┘

BƯỚC 1: PHÂN TÍCH TỰ ĐỘNG HÀNG NGÀY (9:00 AM)
┌──────────────┐
│ ⏰ Scheduler │
│ (CRON)       │
└──────┬───────┘
       │ Trigger: 0 9 * * *
       ▼
┌──────────────────────────────┐
│ ☁️ scheduledChiefOfStaff     │
└──────┬───────────────────────┘
       │
       │ Thu thập data từ nhiều nguồn:
       ├─────▶ 🗄️ Firestore (revenue 7 ngày, orders)
       ├─────▶ 📘 Facebook API (followers, engagement)
       ├─────▶ 🌤️ Weather API (thời tiết)
       ├─────▶ 📊 BigQuery (analytics, trends)
       └─────▶ 🗄️ Firestore (marketing briefs)
       │
       │ Gửi tất cả data cho AI
       ▼
┌──────────────────────────────┐
│ 🤖 Vertex AI                 │
│ (Gemini 2.5 Pro)             │
└──────┬───────────────────────┘
       │ AI phân tích sâu:
       │ • Tóm tắt tình hình
       │ • Rủi ro (Risks)
       │ • Thành công (Wins)
       │ • Khuyến nghị (Recommendations)
       ▼
┌──────────────────────────────┐
│ 📊 Executive Brief           │
│ ┌──────────────────────────┐ │
│ │ 👔 CHIEF OF STAFF        │ │
│ │ Ngày: 17/05/2026         │ │
│ │                          │ │
│ │ 🎯 Score: 85/100 (+5)    │ │
│ │ Status: 🟢 Healthy       │ │
│ │                          │ │
│ │ 📝 Summary:              │ │
│ │ Doanh thu tăng 10% so    │ │
│ │ với tuần trước. Marketing│ │
│ │ publish rate 100%.       │ │
│ │                          │ │
│ │ ⚠️ Risks:                │ │
│ │ • Chi phí ads tăng 15%   │ │
│ │ • Engagement giảm nhẹ    │ │
│ │                          │ │
│ │ ✅ Wins:                 │ │
│ │ • 45 followers mới       │ │
│ │ • 3 bài A+ grade         │ │
│ │                          │ │
│ │ 💡 Recommendations:      │ │
│ │ • Tăng tần suất post     │ │
│ │ • Focus video content    │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │ Calculate Chief Score
       │ (0-100 based on metrics)
       ▼
┌──────────────────────────────┐
│ 🎯 Chief Score: 85           │
│ ┌──────────────────────────┐ │
│ │ AI Audit:     98/100 ✅  │ │
│ │ Readiness:    85/100 🟡  │ │
│ │ Decisions:    3 today ✅ │ │
│ │ Workflow:     OK ✅      │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │ Save to Firestore
       ▼
┌──────────────┐
│ 🗄️ Firestore │
│ executive_   │
│ daily_briefs │
└──────────────┘

═══════════════════════════════════════════════════════════════════════════════

BƯỚC 2: ADMIN ĐẶT MỤC TIÊU
┌──────────────┐
│ 👨‍💻 Admin    │
└──────┬───────┘
       │ Mở Chief of Staff Tab
       ▼
┌──────────────────────────────┐
│ 📊 Chief of Staff UI         │
│ ┌──────────────────────────┐ │
│ │ Current Score: 85        │ │
│ │                          │ │
│ │ 🎯 Set Goal:             │ │
│ │ ┌──────────────────────┐ │ │
│ │ │ Tăng 500 like trong  │ │ │ ◀── Nhập mục tiêu
│ │ │ tháng 5              │ │ │
│ │ └──────────────────────┘ │ │
│ │                          │ │
│ │ Start: 01/05/2026        │ │
│ │ End:   31/05/2026        │ │
│ │                          │ │
│ │ [Generate Plan]          │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │ Click "Generate Plan"
       ▼
┌──────────────────────────────┐
│ ☁️ generateChiefTargetPlan   │
└──────┬───────────────────────┘
       │
       │ Gửi goal + current data
       ▼
┌──────────────────────────────┐
│ 🤖 Vertex AI                 │
│ (Gemini 2.5 Pro)             │
└──────┬───────────────────────┘
       │ AI phân tích & lập kế hoạch:
       │ • Phân tích mục tiêu
       │ • Tính toán KPI hàng ngày
       │ • Đề xuất hành động cụ thể
       │ • Tạo prompt cho Marketing AI
       ▼
┌──────────────────────────────┐
│ 📋 Action Plan               │
│ ┌──────────────────────────┐ │
│ │ 🎯 Goal: +500 likes      │ │
│ │ Timeline: 30 ngày        │ │
│ │                          │ │
│ │ 📊 KPI:                  │ │
│ │ • 17 likes/ngày          │ │
│ │ • 2 posts/ngày           │ │
│ │ • Budget: 200k/ngày      │ │
│ │                          │ │
│ │ 📝 Actions:              │ │
│ │ 1. Post 2 bài/ngày vào   │ │
│ │    khung 12h và 18h      │ │
│ │ 2. Chạy ads targeting    │ │
│ │    local 5km radius      │ │
│ │ 3. Focus hook mạnh +     │ │
│ │    CTA rõ ràng           │ │
│ │ 4. Tăng video content    │ │
│ │    (engagement cao hơn)  │ │
│ │                          │ │
│ │ 🤖 Prompt for Marketing: │ │
│ │ "Tập trung hook mạnh,    │ │
│ │ CTA rõ ràng, targeting   │ │
│ │ local audience..."       │ │
│ │                          │ │
│ │ 📈 Expected Outcome:     │ │
│ │ Đạt 500 likes sau 30 ngày│ │
│ │ với confidence 85%       │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │ Save to Firestore
       ▼
┌──────────────┐
│ 🗄️ Firestore │
│ executive_   │
│ daily_briefs │
│ .ownerGoal   │
└──────────────┘

═══════════════════════════════════════════════════════════════════════════════

BƯỚC 3: APPLY TO MARKETING AI
┌──────────────┐
│ 👨‍💻 Admin    │
└──────┬───────┘
       │ Click "Apply to Marketing AI"
       ▼
┌──────────────────────────────┐
│ ☁️ updateMarketingAITarget   │
└──────┬───────────────────────┘
       │
       │ Update Marketing AI settings
       ▼
┌──────────────────────────────┐
│ 🗄️ Firestore                │
│ marketing_ai_settings        │
│ ┌──────────────────────────┐ │
│ │ target: "+500 likes"     │ │
│ │ prompt_adjustment:       │ │
│ │ "Focus hook mạnh..."     │ │
│ │ active: true             │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │
       │ Marketing AI sẽ tự động
       │ điều chỉnh content theo
       │ mục tiêu này
       ▼
┌──────────────────────────────┐
│ ✅ Applied!                  │
│ Marketing AI đã nhận target  │
│ và sẽ optimize content       │
└──────────────────────────────┘
```

---

## 🔗 ĐIỂM TÍCH HỢP GIỮA 2 REPOS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHARED FIRESTORE COLLECTIONS                              │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │   🗄️ FIRESTORE DATABASE    │
                    │   (pos-v2-909ff)            │
                    └─────────────┬───────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
    ┌───────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │  public_menu      │ │ order_       │ │ service_         │
    │                   │ │ requests     │ │ requests         │
    │ Menu công khai    │ │              │ │                  │
    │ cho khách hàng    │ │ Đơn online   │ │ Gọi nhân viên    │
    └─────┬─────────┬───┘ └──┬───────┬───┘ └──┬───────────┬───┘
          │         │        │       │        │           │
          │         │        │       │        │           │
    ┌─────▼─────┐   │  ┌─────▼───┐   │  ┌─────▼───┐       │
    │  XEKHO    │   │  │ XEKHO   │   │  │ XEKHO   │       │
    │  (Write)  │   │  │ (Read)  │   │  │ (Read)  │       │
    └───────────┘   │  └─────────┘   │  └─────────┘       │
                    │                │                     │
              ┌─────▼─────┐    ┌─────▼─────┐        ┌─────▼─────┐
              │ WEBAPP-   │    │ WEBAPP-   │        │ WEBAPP-   │
              │ MENU      │    │ MENU      │        │ MENU      │
              │ (Read)    │    │ (Write)   │        │ (Write)   │
              └───────────┘    └───────────┘        └───────────┘

═══════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────┐
                    │   SYNC MECHANISM            │
                    └─────────────────────────────┘

    Product_Catalog (XEKHO)  ──sync──▶  public_menu (Shared)
         │                                    │
         │ Admin updates menu                │ Customer views menu
         │ in POS                             │ on website
         │                                    │
         ▼                                    ▼
    ┌─────────────┐                    ┌─────────────┐
    │ Cloud       │                    │ Online      │
    │ Function    │                    │ Ordering    │
    │ (Trigger)   │                    │ Page        │
    └─────────────┘                    └─────────────┘

═══════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────┐
                    │   REALTIME UPDATES          │
                    └─────────────────────────────┘

    XEKHO POS ◀──────────────────────────────▶ WEBAPP-MENU
       │                                            │
       │ Firestore Realtime Listeners               │
       │                                            │
       ├─ Listen: order_requests                   ├─ Write: order_requests
       ├─ Listen: service_requests                 ├─ Write: service_requests
       ├─ Write: history                           ├─ Read: history
       ├─ Write: kitchen_notifications             │
       └─ Read: public_menu                        └─ Read: public_menu

    Khi có thay đổi → Tự động cập nhật UI (không cần refresh)
```

---

## 📚 TÀI LIỆU LIÊN QUAN

- 📖 **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)** - Documentation đầy đủ với Mermaid diagrams
- 📄 **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)** - Tóm tắt 1 trang
- 🗺️ **[ROADMAP.md](./ROADMAP.md)** - Lộ trình phát triển (78% → 100%)
- 📋 **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Chi tiết implementation

---

**Last Updated:** 17/05/2026  
**Format:** ASCII Art (Dễ nhìn, không cần render)  
**Status:** 🟢 Production Ready
