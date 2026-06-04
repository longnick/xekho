# 📊 HƯỚNG DẪN CÀI ĐẶT BÁO CÁO TELEGRAM TỰ ĐỘNG

## 🎯 Tổng Quan

Hệ thống đã được cấu hình để tự động gửi báo cáo doanh thu + ads hàng ngày qua Telegram. Scheduler chạy mỗi 5 phút và kiểm tra xem có đến giờ gửi chưa.

---

## ✅ Đã Hoàn Thành

- ✅ Thêm function `scheduledTelegramReport` vào `functions/index.js`
- ✅ Scheduler chạy mỗi 5 phút, kiểm tra settings từ Firestore
- ✅ Hỗ trợ cấu hình linh hoạt (giờ gửi, nội dung báo cáo)
- ✅ Deduplication để tránh gửi trùng lặp
- ✅ Tự động tính target doanh thu và mood

---

## 🔧 CÀI ĐẶT

### Bước 1: Tạo Document Cấu Hình trong Firestore

Truy cập Firebase Console → Firestore Database → Tạo document:

**Collection:** `settings`  
**Document ID:** `telegram_report`

**Fields:**

```javascript
{
  // Bật/tắt báo cáo tự động
  telegramReportEnabled: true,
  
  // Giờ gửi (0-23, múi giờ Việt Nam)
  telegramReportSendHour: 7,
  
  // Phút gửi (0-59)
  telegramReportSendMinute: 0,
  
  // Nội dung báo cáo
  telegramReportIncludeRevenue: true,
  telegramReportIncludePaymentBreakdown: true,
  telegramReportIncludeInvoiceCount: true,
  telegramReportIncludeTopItem: true,
  telegramReportIncludeRetailStock: true,
  
  // Tự động cập nhật bởi hệ thống
  telegramReportLastSentRangeKey: "",
  lastSentAt: null
}
```

### Bước 2: Cấu Hình Target Doanh Thu (Optional)

**Collection:** `settings`  
**Document ID:** `financial_profile`

```javascript
{
  // Target doanh thu tháng (VNĐ)
  target_monthly_revenue: 90000000,
  
  // Chi phí cố định hàng ngày (VNĐ)
  daily_fixed_cost: 1000000,
  
  // Hoặc chi phí cố định tháng
  monthly_fixed_costs: {
    rent: 15000000,
    staff: 20000000,
    utilities: 3000000,
    other: 2000000,
    total: 40000000
  }
}
```

### Bước 3: Deploy Function

```bash
# Deploy scheduler function
firebase deploy --only functions:scheduledTelegramReport

# Hoặc deploy tất cả functions
firebase deploy --only functions
```

### Bước 4: Kiểm Tra Logs

```bash
# Xem logs của scheduler
firebase functions:log --only scheduledTelegramReport

# Hoặc xem tất cả logs
firebase functions:log
```

---

## 🧪 TEST THỬ

### Test Qua API Endpoint

```bash
# Test với giờ hiện tại
curl -X POST https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/testDailyReportTelegram \
  -H "Authorization: Bearer ***REVOKED_CREDENTIAL***" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test với giờ cụ thể
curl -X POST https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/testDailyReportTelegram \
  -H "Authorization: Bearer ***REVOKED_CREDENTIAL***" \
  -H "Content-Type: application/json" \
  -d '{"debugNow": "2026-05-15T07:00:00+07:00"}'
```

### Test Trong Code

```javascript
// Trong Firebase Console → Functions → scheduledTelegramReport → Test
// Hoặc gọi trực tiếp từ code
const result = await runDailyTelegramReport({
  force: true,
  isTest: true,
  debugNow: '2026-05-15T07:00:00+07:00'
});
```

---

## ⚙️ TÙY CHỈNH

### Thay Đổi Giờ Gửi

Cập nhật trong Firestore `settings/telegram_report`:

```javascript
{
  telegramReportSendHour: 8,  // Đổi sang 8:00 sáng
  telegramReportSendMinute: 30  // Đổi sang 8:30 sáng
}
```

**Không cần redeploy!** Thay đổi có hiệu lực ngay lập tức.

### Tắt Báo Cáo Tự Động

```javascript
{
  telegramReportEnabled: false
}
```

### Tùy Chỉnh Nội Dung

```javascript
{
  // Chỉ hiển thị doanh thu và số đơn
  telegramReportIncludeRevenue: true,
  telegramReportIncludePaymentBreakdown: false,
  telegramReportIncludeInvoiceCount: true,
  telegramReportIncludeTopItem: false,
  telegramReportIncludeRetailStock: false
}
```

---

## 📋 CẤU TRÚC BÁO CÁO

Báo cáo gửi hàng ngày bao gồm:

### 1. Tinh Thần Đầu Ngày
- AI đánh giá dựa trên % đạt target
- Động viên hoặc nhắc nhở cải thiện

### 2. Mốc Target Doanh Thu
- Thực tế / Target
- % hoàn thành

### 3. POS
- Doanh thu
- Số đơn
- AOV (Average Order Value)
- Giá vốn
- Lãi gộp

### 4. Facebook Ads
- Spend, Impression, Reach, Click
- CPM, CTR, CPC
- Purchase, Add to Cart

### 5. TikTok Ads
- Tương tự Facebook

### 6. Tổng Hợp
- ROAS (Return on Ad Spend)
- CPA (Cost Per Acquisition)
- Conversion Rate
- Lợi nhuận sau ads
- Lợi nhuận sau chi phí cố định

### 7. AI Insights
- Phân tích hiệu quả
- Gợi ý cải thiện

---

## 🔍 TROUBLESHOOTING

### Không Nhận Được Báo Cáo

1. **Kiểm tra settings:**
   ```javascript
   // Firestore: settings/telegram_report
   telegramReportEnabled: true  // Phải là true
   ```

2. **Kiểm tra giờ gửi:**
   ```javascript
   telegramReportSendHour: 7  // 0-23
   telegramReportSendMinute: 0  // 0-59
   ```

3. **Kiểm tra Telegram config:**
   ```bash
   # Environment variables phải có:
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_REPORT_CHAT_ID=your_chat_id
   # Hoặc
   TELEGRAM_OWNER_CHAT_ID=your_chat_id
   # Hoặc
   TELEGRAM_GROUP_CHAT_ID=your_chat_id
   ```

4. **Xem logs:**
   ```bash
   firebase functions:log --only scheduledTelegramReport
   ```

### Gửi Trùng Lặp

Hệ thống có deduplication tự động qua `telegramReportLastSentRangeKey`. Nếu vẫn bị trùng:

```javascript
// Reset trong Firestore
{
  telegramReportLastSentRangeKey: ""
}
```

### Báo Cáo Sai Dữ Liệu

1. **Kiểm tra timezone:** Báo cáo dùng múi giờ `Asia/Ho_Chi_Minh` (GMT+7)
2. **Kiểm tra range:** Báo cáo từ 6h sáng hôm trước đến 6h sáng hôm nay
3. **Kiểm tra Meta Ads config:**
   ```bash
   META_AD_ACCOUNT_ID=act_xxxxx
   META_ACCESS_TOKEN=your_token
   ```

---

## 📊 METRICS GIẢI THÍCH

| Metric | Ý Nghĩa | Tốt Khi |
|--------|---------|---------|
| **ROAS** | Doanh thu / Chi phí ads | > 3x |
| **CPA** | Chi phí / Đơn hàng | < AOV |
| **CTR** | Click / Impression | > 1% |
| **Conversion Rate** | Đơn / Click | > 2% |
| **AOV** | Doanh thu / Đơn | Cao hơn CPA |

---

## 🎯 BEST PRACTICES

1. **Đặt Target Hợp Lý:**
   - Target tháng = Chi phí cố định × 2-3
   - Target ngày = Target tháng / 30

2. **Theo Dõi Hàng Ngày:**
   - Đọc AI Insights
   - So sánh với ngày trước
   - Điều chỉnh ads nếu cần

3. **Tối Ưu Dần:**
   - Tắt ads có CPA cao
   - Tăng budget cho ads có ROAS tốt
   - Test creative mới thường xuyên

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:

1. Kiểm tra logs: `firebase functions:log`
2. Test thủ công: `/testDailyReportTelegram`
3. Xem document này: `TELEGRAM_REPORT_SETUP.md`

---

## 🔄 CẬP NHẬT

**Version:** 1.0  
**Ngày:** 15/05/2026  
**Tác giả:** Cline AI Assistant

**Changelog:**
- ✅ Thêm scheduler function
- ✅ Hỗ trợ cấu hình linh hoạt
- ✅ Tích hợp Meta Ads API
- ✅ AI Insights tự động
