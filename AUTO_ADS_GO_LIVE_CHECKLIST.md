# AUTO-ADS GO LIVE CHECKLIST
## Xe Khô Chữa Lành — Checklist Triển Khai Production

> **Mục đích:** Đảm bảo hệ thống sẵn sàng go live và có kế hoạch xử lý sự cố.

---

## Điều Kiện Go Live Theo Sprint

### Sprint 0: Điều Kiện Tiên Quyết ✅

**Trạng thái:** Bắt buộc phải hoàn thành trước khi go live bất kỳ sprint nào.

**Checklist:**
- [ ] `/settings/restaurant_profile` đã có đầy đủ dữ liệu
  - [ ] Thông tin cơ bản (name, address, phone, hours)
  - [ ] Brand narrative (concept, vibe, price_range, usp)
  - [ ] Menu đầy đủ với giá vốn cho từng món
- [ ] `/settings/financial_profile` đã có đầy đủ dữ liệu
  - [ ] Chi phí cố định hàng tháng
  - [ ] Chi phí cố định mỗi ngày
  - [ ] Target doanh thu và lợi nhuận
  - [ ] Ngân sách Ads
- [ ] `/settings/cogs_ratio` đã có dữ liệu
- [ ] Prompt AI đã refactor để đọc context động
- [ ] Test thử: AI không còn bịa món

**Rủi ro nếu chưa hoàn thành:**
- 🔴 **CRITICAL:** AI sẽ bịa món không có trong menu
- 🔴 **CRITICAL:** Tính lãi/lỗ sai
- 🔴 **CRITICAL:** Quyết định chiến dịch dựa trên dữ liệu sai

---

### Sprint A: AI Core ✅

**Trạng thái:** Có thể go live sau khi Sprint 0 hoàn thành.

**Checklist:**
- [ ] `scheduledTrendScan` (08:00) chạy ổn định
  - [ ] Vertex AI credit đủ (ít nhất 100.000 tokens/ngày)
  - [ ] Google Search Grounding đã bật
  - [ ] Test 7 ngày liên tục không lỗi
- [ ] `scheduledAIDirector` (09:00) chạy ổn định
  - [ ] Tạo được brief hợp lý
  - [ ] Tạo được 3 bài viết
  - [ ] Brief mention đúng món trong menu
  - [ ] Test 7 ngày liên tục không lỗi
- [ ] Telegram Bot hoạt động
  - [ ] Gửi được brief đến operator
  - [ ] Gửi được 3 bài đến operator
  - [ ] Webhook không bị timeout

**Rủi ro:**
- 🟡 **MEDIUM:** Vertex AI hết credit → không tạo được brief/bài
- 🟡 **MEDIUM:** Telegram webhook timeout → operator không nhận được tin

**Giải pháp:**
- Monitor Vertex AI usage hàng ngày
- Set alert khi credit < 20%
- Có backup plan: tạo brief/bài thủ công

---

### Sprint B: Duyệt Bài ✅

**Trạng thái:** Có thể go live sau khi Sprint A hoàn thành.

**Checklist:**
- [ ] Telegram callback hoạt động
  - [ ] Duyệt brief: status cập nhật trong 5 giây
  - [ ] Bỏ brief: status cập nhật trong 5 giây
  - [ ] Duyệt bài: status cập nhật trong 5 giây
  - [ ] Sửa bài: content_edited lưu đúng
  - [ ] Bỏ bài: status cập nhật trong 5 giây
- [ ] Web Dashboard hoạt động
  - [ ] Duyệt brief trên web
  - [ ] Duyệt bài trên web
  - [ ] UI cập nhật real-time
- [ ] Marketing Actions log đầy đủ
  - [ ] Ghi lại ai duyệt/bỏ gì, khi nào
  - [ ] Nguồn quyết định (telegram/web) đúng

**Rủi ro:**
- 🟡 **MEDIUM:** Telegram callback lỗi → operator không duyệt được
- 🟢 **LOW:** Web Dashboard lỗi → dùng Telegram backup

**Giải pháp:**
- Test callback trước khi go live
- Có 2 kênh duyệt: Telegram + Web (backup lẫn nhau)

---

### Sprint B.2: Sổ Nam Tào ✅

**Trạng thái:** Có thể go live sau khi Sprint B hoàn thành.

**Checklist:**
- [ ] Tab "Sổ Nam Tào" hiển thị đầy đủ
  - [ ] Danh sách brief
  - [ ] Danh sách bộ bài
  - [ ] Filter theo ngày, trạng thái, nguồn
- [ ] Xem chi tiết brief/bài hoạt động
- [ ] (Optional) Google Sheets mirror hoạt động
  - [ ] Sync brief sang Sheets
  - [ ] Mỗi brief có sheet riêng
  - [ ] Link sheet hiển thị trên web

**Rủi ro:**
- 🟢 **LOW:** Sổ Nam Tào lỗi → không ảnh hưởng workflow chính
- 🟢 **LOW:** Google Sheets sync lỗi → vẫn có Firestore

**Giải pháp:**
- Sổ Nam Tào là tính năng phụ, không critical
- Firestore vẫn là source of truth

---

### Sprint B.5: Kho Tài Sản ✅

**Trạng thái:** Có thể go live sau khi Sprint B hoàn thành.

**Checklist:**
- [ ] Upload asset từ Admin hoạt động
  - [ ] Upload ảnh
  - [ ] Upload video
  - [ ] Metadata lưu đúng
- [ ] Telegram ingest asset hoạt động
  - [ ] Gửi ảnh vào Bot → lưu vào kho
  - [ ] Gửi video vào Bot → lưu vào kho
- [ ] AI chọn asset phù hợp
  - [ ] Chọn theo tags
  - [ ] Chọn theo mood
  - [ ] Không dùng lại asset trong 7 ngày
- [ ] Cloud Storage đủ dung lượng
  - [ ] Ít nhất 10GB free
  - [ ] Set alert khi < 2GB

**Rủi ro:**
- 🟡 **MEDIUM:** Kho asset trống → AI không có ảnh để dùng
- 🟡 **MEDIUM:** Cloud Storage đầy → không upload được

**Giải pháp:**
- Upload ít nhất 20 ảnh/video thật trước khi go live
- Monitor storage usage hàng tuần
- (Tương lai) Implement Imagen 3 fallback

---

### Sprint D: Daily Revenue Snapshot ✅

**Trạng thái:** Có thể go live sau khi Sprint 0 hoàn thành.

**Checklist:**
- [ ] `scheduledRevenueSnapshot` (22:30) chạy ổn định
  - [ ] Tạo snapshot mỗi ngày
  - [ ] Tính lãi đúng công thức
  - [ ] Test 7 ngày liên tục không lỗi
- [ ] Snapshot V1 từ `online_orders` hoạt động
  - [ ] Lấy được doanh thu
  - [ ] Lấy được top món bán chạy
  - [ ] Tính được giá vốn
- [ ] Manual trigger hoạt động
  - [ ] Bấm "Cập nhật snapshot" → tạo được

**Rủi ro:**
- 🟡 **MEDIUM:** Snapshot không tạo → AI không có dữ liệu kinh doanh
- 🟢 **LOW:** Tính lãi sai (do chưa có Meta spend thật)

**Giải pháp:**
- Monitor scheduled function hàng ngày
- Có manual trigger backup
- Chấp nhận V1: `ads_spend_today = 0` (chưa có Meta spend thật)

**Lưu ý:**
- V1 chỉ lấy `online_orders`, chưa có POS core
- `ads_spend_today` đang để 0, chưa lấy Meta spend thật
- Đủ để AI ra quyết định, nhưng chưa chính xác 100%

---

### Sprint E: Meta Ads Campaign Thật ⚠️

**Trạng thái:** CHƯA PRODUCTION-READY

**Checklist (Chưa hoàn thành):**
- [ ] Meta Marketing API tích hợp
  - [ ] System User Token
  - [ ] Ad Account ID
  - [ ] Page Access Token
- [ ] Tạo campaign thật hoạt động
  - [ ] Tạo campaign
  - [ ] Tạo ad set
  - [ ] Tạo ad
  - [ ] Set budget, targeting, schedule
- [ ] Monitor spend real-time
  - [ ] Lấy spend từ Meta Insights API
  - [ ] Lưu vào `daily_revenue_snapshot.ads_spend_today`
- [ ] Test với budget nhỏ (50.000đ/ngày)
  - [ ] Chạy 7 ngày
  - [ ] Không có lỗi
  - [ ] Spend đúng với budget set

**Rủi ro:**
- 🔴 **CRITICAL:** Meta API reject → không tạo được campaign
- 🔴 **CRITICAL:** Spend vượt budget → lỗ nặng
- 🔴 **CRITICAL:** Không pause được campaign lỗ → tiếp tục lỗ

**Điều kiện go live Sprint E:**
- ✅ Sprint 0, A, B, B.2, B.5, D đã hoàn thành
- ✅ Meta API keys đầy đủ
- ✅ Test với budget nhỏ 7 ngày không lỗi
- ✅ Có Guardian auto-pause campaign lỗ

**Nếu chưa đủ điều kiện:**
- ⏸️ **TẠM DỪNG Sprint E**
- ✅ Vẫn có thể go live Sprint 0-A-B-B.2-B.5-D
- ✅ Đăng bài Facebook thủ công (không tạo Ads campaign)

---

### Sprint F: Evaluator & Guardian ⚠️

**Trạng thái:** CHƯA PRODUCTION-READY

**Checklist (Chưa hoàn thành):**
- [ ] `scheduledEvaluator` (23:30) hoạt động
  - [ ] Lấy Meta spend thật
  - [ ] Tính lãi thật
  - [ ] Chấm điểm S/A/B/C/D
  - [ ] Lưu kết quả vào Firestore
- [ ] `scheduledGuardian` (mỗi 30 phút) hoạt động
  - [ ] Kiểm tra campaign cấp D
  - [ ] Auto-pause campaign lỗ nặng
  - [ ] Gửi alert Telegram
- [ ] Test với campaign thật
  - [ ] Chạy 7 ngày
  - [ ] Pause đúng campaign lỗ
  - [ ] Không pause nhầm campaign tốt

**Rủi ro:**
- 🔴 **CRITICAL:** Pause nhầm campaign tốt → mất cơ hội
- 🔴 **CRITICAL:** Không pause kịp campaign lỗ → lỗ nặng

**Điều kiện go live Sprint F:**
- ✅ Sprint E đã hoàn thành và chạy ổn định
- ✅ Meta Insights API hoạt động
- ✅ Test Guardian với campaign thật 7 ngày
- ✅ Có manual override để unblock campaign bị pause nhầm

**Nếu chưa đủ điều kiện:**
- ⏸️ **TẠM DỪNG Sprint F**
- ✅ Vẫn có thể chạy Sprint E (tạo campaign)
- ⚠️ Phải monitor campaign thủ công
- ⚠️ Pause campaign lỗ thủ công

---

## Kế Hoạch Go Live Từng Giai Đoạn

### Phase 1: Sprint 0 + A + B + B.2 + B.5 + D (KHUYẾN NGHỊ)

**Mục tiêu:** Chạy AI tạo brief/bài, duyệt trên Telegram/Web, lưu vào Sổ Nam Tào.

**Điều kiện:**
- ✅ Sprint 0 hoàn thành
- ✅ Sprint A test 7 ngày không lỗi
- ✅ Sprint B test 7 ngày không lỗi
- ✅ Sprint B.2 hoạt động
- ✅ Sprint B.5 có ít nhất 20 asset
- ✅ Sprint D test 7 ngày không lỗi

**Workflow:**
1. 08:00: AI quét trend
2. 09:00: AI tạo brief + 3 bài
3. 09:00-22:00: Operator duyệt trên Telegram/Web
4. Sau khi duyệt: Đăng Facebook thủ công (không tạo Ads campaign)
5. 22:30: Tạo snapshot doanh thu
6. Xem lại brief/bài trong Sổ Nam Tào

**Lợi ích:**
- ✅ AI giúp tạo nội dung nhanh
- ✅ Operator vẫn kiểm soát 100%
- ✅ Không rủi ro tài chính (chưa tạo Ads campaign tự động)

**Hạn chế:**
- ⚠️ Phải đăng Facebook thủ công
- ⚠️ Chưa có Ads campaign tự động

---

### Phase 2: Phase 1 + Sprint E (SAU KHI TEST KỸ)

**Mục tiêu:** Tạo Ads campaign tự động.

**Điều kiện:**
- ✅ Phase 1 chạy ổn định 30 ngày
- ✅ Meta API keys đầy đủ
- ✅ Test Sprint E với budget nhỏ 7 ngày không lỗi

**Workflow:**
1. (Giống Phase 1)
2. Sau khi duyệt: Bấm "Đăng ngay" → Tạo Ads campaign tự động
3. Monitor spend thủ công (chưa có Guardian)

**Lợi ích:**
- ✅ Tự động hóa hoàn toàn (từ tạo nội dung đến chạy Ads)

**Hạn chế:**
- ⚠️ Phải monitor spend thủ công
- ⚠️ Phải pause campaign lỗ thủ công

**Rủi ro:**
- 🔴 Spend vượt budget
- 🔴 Campaign lỗ không pause kịp

---

### Phase 3: Phase 2 + Sprint F (SAU KHI TEST KỸ)

**Mục tiêu:** Auto-pause campaign lỗ.

**Điều kiện:**
- ✅ Phase 2 chạy ổn định 30 ngày
- ✅ Test Sprint F với campaign thật 7 ngày không lỗi
- ✅ Guardian không pause nhầm campaign tốt

**Workflow:**
1. (Giống Phase 2)
2. 23:30: Evaluator chấm điểm campaign
3. Mỗi 30 phút: Guardian kiểm tra và auto-pause cấp D

**Lợi ích:**
- ✅ Tự động hóa hoàn toàn + tự động bảo vệ
- ✅ Giảm rủi ro lỗ nặng

**Hạn chế:**
- ⚠️ Có thể pause nhầm campaign tốt (false positive)

**Giải pháp:**
- Có manual override để unblock campaign
- Monitor Guardian hàng ngày

---

## Rollback Plan

### Khi Nào Cần Rollback?

**Trigger rollback khi:**
- 🔴 AI tạo brief/bài sai > 50% (mention món không có, nội dung không liên quan)
- 🔴 Telegram Bot không gửi được tin > 3 ngày liên tục
- 🔴 Scheduled functions lỗi > 3 ngày liên tục
- 🔴 Meta API reject > 5 lần/ngày
- 🔴 Spend vượt budget > 20%
- 🔴 Guardian pause nhầm campaign tốt > 3 lần/tuần

### Rollback Phase 3 → Phase 2

**Hành động:**
1. Tắt `scheduledGuardian`
2. Tắt `scheduledEvaluator`
3. Monitor và pause campaign thủ công

**Thời gian:** 5 phút

### Rollback Phase 2 → Phase 1

**Hành động:**
1. Tắt tính năng "Tạo Ads campaign tự động"
2. Pause tất cả campaign đang chạy
3. Đăng Facebook thủ công

**Thời gian:** 10 phút

### Rollback Phase 1 → Manual

**Hành động:**
1. Tắt `scheduledTrendScan`
2. Tắt `scheduledAIDirector`
3. Tắt `scheduledRevenueSnapshot`
4. Tạo brief/bài thủ công

**Thời gian:** 15 phút

---

## Monitoring & Logs

### Logs Cần Xem Hàng Ngày

**Firebase Console → Functions → Logs:**
1. `scheduledTrendScan` (08:00)
   - ✅ Success: "Trend scan completed"
   - ❌ Error: "Vertex AI error" / "Google Search error"

2. `scheduledAIDirector` (09:00)
   - ✅ Success: "Brief created" / "3 posts created"
   - ❌ Error: "Restaurant profile missing" / "Vertex AI error"

3. `scheduledRevenueSnapshot` (22:30)
   - ✅ Success: "Snapshot created"
   - ❌ Error: "No orders found" / "Firestore error"

4. `telegramWebhook`
   - ✅ Success: "Callback handled"
   - ❌ Error: "Timeout" / "Invalid callback"

**Firestore Console:**
1. `/trend_daily/{today}`: Có document mới mỗi ngày
2. `/director_briefs`: Có brief mới mỗi ngày
3. `/director_ads_posts`: Có 3 bài mới mỗi ngày
4. `/daily_revenue_snapshot/{today}`: Có snapshot mới mỗi ngày
5. `/marketing_actions`: Có log quyết định

**Telegram:**
1. Nhận brief lúc 09:00
2. Nhận 3 bài sau khi duyệt brief
3. Nhận alert khi có lỗi

---

## Cost & Credit Warning

### Vertex AI

**Usage:**
- Trend scan: ~5.000 tokens/ngày
- Brief: ~10.000 tokens/ngày
- 3 bài: ~15.000 tokens/ngày
- **Tổng:** ~30.000 tokens/ngày = ~900.000 tokens/tháng

**Cost:**
- Gemini 1.5 Pro: $3.5/1M tokens input, $10.5/1M tokens output
- Gemini Flash: $0.075/1M tokens input, $0.3/1M tokens output
- **Ước tính:** $5-10/tháng

**Alert:**
- Set alert khi usage > 80% quota
- Monitor hàng ngày

### Imagen 3 (Nếu dùng)

**Usage:**
- 1 ảnh = 1 request
- Nếu tạo 3 ảnh/ngày = 90 ảnh/tháng

**Cost:**
- $0.04/ảnh
- **Ước tính:** $3.6/tháng

**Alert:**
- Chỉ generate khi kho ảnh thật không đủ
- Cache ảnh đã tạo

### Meta Ads (Nếu chạy Sprint E)

**Budget:**
- Theo `ads_monthly_budget` trong Financial Profile
- Ví dụ: 5.000.000đ/tháng = ~166.666đ/ngày

**Alert:**
- Set alert khi spend > 110% budget
- Guardian auto-pause khi campaign lỗ nặng

### Cloud Storage

**Usage:**
- Ảnh: ~2MB/ảnh
- Video: ~10MB/video
- 100 asset = ~500MB

**Cost:**
- $0.02/GB/tháng
- **Ước tính:** $0.01/tháng (rất rẻ)

**Alert:**
- Set alert khi storage > 80% quota

---

## Checklist Tổng Kết Trước Go Live

### Sprint 0 (Bắt buộc)
- [ ] Restaurant Profile đầy đủ
- [ ] Financial Profile đầy đủ
- [ ] COGS Ratio hợp lý
- [ ] Prompt AI inject context động
- [ ] Test: AI không bịa món

### Sprint A (Bắt buộc)
- [ ] Trend scan test 7 ngày không lỗi
- [ ] AI Director test 7 ngày không lỗi
- [ ] Telegram Bot hoạt động
- [ ] Vertex AI credit đủ

### Sprint B (Bắt buộc)
- [ ] Telegram callback hoạt động
- [ ] Web Dashboard hoạt động
- [ ] Marketing Actions log đầy đủ

### Sprint B.2 (Khuyến nghị)
- [ ] Sổ Nam Tào hiển thị đầy đủ
- [ ] (Optional) Google Sheets mirror hoạt động

### Sprint B.5 (Khuyến nghị)
- [ ] Upload asset hoạt động
- [ ] Telegram ingest hoạt động
- [ ] AI chọn asset phù hợp
- [ ] Có ít nhất 20 asset trong kho

### Sprint D (Khuyến nghị)
- [ ] Snapshot test 7 ngày không lỗi
- [ ] Tính lãi đúng công thức
- [ ] Manual trigger hoạt động

### Sprint E (Tùy chọn - Chưa production-ready)
- [ ] Meta API keys đầy đủ
- [ ] Test với budget nhỏ 7 ngày không lỗi
- [ ] Monitor spend hoạt động

### Sprint F (Tùy chọn - Chưa production-ready)
- [ ] Evaluator test 7 ngày không lỗi
- [ ] Guardian test 7 ngày không lỗi
- [ ] Không pause nhầm campaign tốt

### Monitoring & Alerts
- [ ] Firebase Console logs setup
- [ ] Vertex AI usage alert setup
- [ ] Cloud Storage alert setup
- [ ] Telegram alert hoạt động

### Rollback Plan
- [ ] Đã test rollback Phase 3 → 2
- [ ] Đã test rollback Phase 2 → 1
- [ ] Đã test rollback Phase 1 → Manual
- [ ] Team biết cách rollback

---

## Khuyến Nghị Go Live

**Giai đoạn 1 (Tuần 1-4):**
- ✅ Go live Phase 1: Sprint 0 + A + B + B.2 + B.5 + D
- ✅ Đăng Facebook thủ công
- ✅ Monitor hàng ngày
- ✅ Thu thập feedback

**Giai đoạn 2 (Tuần 5-8):**
- ✅ Nếu Phase 1 ổn định → Go live Phase 2: + Sprint E
- ✅ Test với budget nhỏ (50.000đ/ngày)
- ✅ Monitor spend thủ công
- ✅ Pause campaign lỗ thủ công

**Giai đoạn 3 (Tuần 9+):**
- ✅ Nếu Phase 2 ổn định → Go live Phase 3: + Sprint F
- ✅ Guardian auto-pause campaign lỗ
- ✅ Monitor Guardian hàng ngày

**Lưu ý:**
- ⚠️ Không vội vàng go live Sprint E/F nếu chưa test kỹ
- ⚠️ Có thể dừng ở Phase 1 và vẫn có giá trị lớn
- ⚠️ Rollback nhanh nếu có vấn đề

---

*Xe Khô Chữa Lành — Auto-Ads Go Live Checklist | 05/2026*
