# Kế hoạch tích hợp Theo dõi Facebook Ads vào Chief of Staff

Nguồn đầu vào: `d:/APP - BACKUP/webapp-menu/docs/TheodoivadanhgiaFacebookAds.md`

Ngày rà soát: 2026-05-26

## 1. Kết luận sau khi quét 2 repo

Đã rà soát cả hai repo:

- `d:/APP - BACKUP/xekho`
- `d:/APP - BACKUP/webapp-menu`

Kết luận chính:

1. `webapp-menu` là nơi đã có khung Chief of Staff, Weather workflow, Facebook Page snapshot và UI Chief hoàn chỉnh hơn.
2. `xekho` là nơi đang có báo cáo Ads + Doanh thu, Telegram daily report production và logic Meta Ads Insights chi tiết hơn cho spend, clicks, impressions, reach, actions, CPC, CPM, CTR, CPA.
3. Weather không cần nhập tay. `webapp-menu` đã có workflow OpenWeatherMap cho Bảo Lộc và lưu vào `settings/weather_forecast_daily`.
4. Cần thêm một lớp dữ liệu Ads hằng ngày chuẩn hóa để Chief of Staff đọc chung, thay vì để mỗi nơi tự tính riêng.
5. Trong `webapp-menu`, callable `getFacebookAdsCampaignStatusNow` đang được gọi ở frontend/backend nhưng khi quét source chính chưa thấy định nghĩa hàm `fetchFacebookAdsCampaignStatusNow`. Đây là điểm cần vá hoặc xác nhận trước khi coi campaign status là API dùng được.

## 2. API, function và collection đã tìm thấy

### 2.1. Repo `webapp-menu`

#### Weather API

Nguồn cấu hình:

- `functions/shared/config.js`
- Biến cấu hình: `OPENWEATHERMAP_API_KEY`

Hàm có sẵn:

- `fetchBaoLocWeatherForecast()`
- `syncMarketingWeatherForecast()`
- `runWeatherForecastWorkflow()`
- `normalizeWeatherForecastSnapshot()`
- `buildWeatherGuidance()`

Endpoint/scheduler có sẵn:

- `triggerWeatherForecastNow` - HTTP POST, cần Firebase ID token.
- `scheduledWeatherForecast` - chạy `30 7 * * *`, timezone `Asia/Ho_Chi_Minh`.

Firestore đang dùng:

- `settings/weather_forecast_daily`

Dữ liệu weather đang có:

```js
{
  date,
  city: "Bảo Lộc",
  source: "openweathermap_forecast_3h",
  weatherContext,
  summary,
  customerBehavior,
  marketingAdvice,
  planningAdvice,
  dominantCondition,
  tempMin,
  tempMax,
  maxPop,
  rainTotalMm,
  hourlyBuckets: [
    { timeLabel, temp, description, pop, rainMm }
  ]
}
```

Đánh giá: dùng được ngay cho kế hoạch này. Không cần người dùng ghi tay thời tiết nữa.

#### Facebook Page API

Nguồn cấu hình:

- `FACEBOOK_PAGE_ACCESS_TOKEN`
- Facebook Page ID lấy từ storefront settings.

Hàm có sẵn:

- `fetchFacebookPageMetricsForDate()`
- `refreshFacebookPageDailySnapshot()`
- `loadFacebookPageDailySnapshotsRange()`
- `summarizeFacebookTargetProgress()`

Endpoint/scheduler có sẵn:

- `refreshFacebookPageSnapshotNow` - callable.
- `scheduledFacebookPageSnapshot` - chạy `40 23 * * *`.

Firestore đang dùng:

- `facebook_page_daily_snapshots`

Chỉ số hiện có:

- Page likes/followers.
- Engagement.
- Page visits.

Đánh giá: dùng tốt cho Chief overview, nhưng không thay thế được Ads performance theo campaign.

#### Meta Ads spend trong Revenue Snapshot

Nguồn cấu hình:

- `FACEBOOK_ADS_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ACCESS_TOKEN` làm fallback.
- `FACEBOOK_AD_ACCOUNT_ID`

Hàm có sẵn:

- `fetchMetaAdsSpendForDate()`
- `buildDailyRevenueSnapshot()`

Endpoint/scheduler có sẵn:

- `triggerRevenueSnapshotNow` - HTTP POST, cần Firebase ID token.
- `scheduledRevenueSnapshot` - chạy `30 22 * * *`.

Firestore đang dùng:

- `daily_revenue_snapshot`

Meta Graph endpoint đang gọi:

- `GET https://graph.facebook.com/v23.0/act_{adAccountId}/insights`

Fields hiện dùng:

- `campaign_name`
- `spend`

Đánh giá: dùng được để có chi phí Ads trong ngày, nhưng chưa đủ KPI trong tài liệu gốc vì thiếu reach, impressions, CTR, CPC, frequency và direction/link clicks.

#### Chief of Staff

Model/cấu hình:

- `CHIEF_OF_STAFF_MODEL`
- `AI_RUNTIME_DIRECTOR_TELEGRAM_SECRETS`
- Feature flag: `chief_of_staff_enabled`

Endpoint/scheduler có sẵn:

- `chiefOfStaffNow` - HTTP POST, cần Firebase ID token.
- `scheduledChiefOfStaff` - chạy `58 23 * * *`.
- `generateChiefTargetPlanNow` - callable.

Firestore đang dùng:

- `executive_daily_briefs`
- `executive_alerts`
- `ai_audit_logs`
- `distribution_readiness_reports`
- `workflow_runs`, `workflow_steps`, `workflow_logs`

Frontend có sẵn:

- `src/features/admin/components/ChiefOfStaffTab.tsx`
- `src/features/admin/services/onlineAdminService.ts`

Đánh giá: đây là nơi nên gắn module Ads Intelligence vào Chief.

#### Điểm cần kiểm tra trong `webapp-menu`

- Frontend/backend có gọi `getFacebookAdsCampaignStatusNow`.
- Hàm này gọi `fetchFacebookAdsCampaignStatusNow()`.
- Khi quét source chính, chưa thấy định nghĩa `fetchFacebookAdsCampaignStatusNow`.

Hành động: trước khi dùng campaign status, cần thêm định nghĩa hàm này hoặc bỏ gọi nếu chỉ là stub cũ.

### 2.2. Repo `xekho`

#### Meta Ads Insights

Nguồn cấu hình:

- `META_AD_ACCOUNT_ID`
- `META_ACCESS_TOKEN`

Hàm có sẵn:

- `buildAdsDateRangeFromText()`
- `queryManualAdsDailyStats()`
- `fetchMetaAdsInsights()`
- `buildAdsChannelMetrics()`
- `sumAdsChannels()`
- `buildAdsRevenueTelegramData()`
- `buildAdsRevenueTelegramMessage()`

Meta Graph endpoint đang gọi:

- `GET https://graph.facebook.com/v23.0/{adAccountId}/insights`

Fields hiện dùng:

- `spend`
- `clicks`
- `cpc`
- `cpm`
- `ctr`
- `impressions`
- `reach`
- `actions`

Actions hiện đang đọc:

- `purchase`
- `omni_purchase`
- `offsite_conversion.fb_pixel_purchase`
- `add_to_cart`
- `omni_add_to_cart`
- `offsite_conversion.fb_pixel_add_to_cart`

Firestore đang dùng:

- `ads_daily_reports`

Schema hiện đọc từ `ads_daily_reports`:

```js
{
  date,
  facebook: {
    spend,
    clicks,
    interactions,
    impressions,
    reach,
    purchases,
    addToCart
  },
  tiktok: {
    spend,
    clicks,
    interactions,
    impressions,
    reach,
    purchases,
    addToCart
  }
}
```

Đánh giá: đây là logic Ads Insights tốt nhất đang có trong 2 repo. Cần mở rộng thêm `inlineLinkClicks`, `directionClicks`, `frequency` và dữ liệu offline.

#### Báo cáo Ads + Doanh thu

Frontend có sẵn:

- `index.html`: tab `Báo cáo Ads + Doanh thu`.
- `app.js`: `loadAdsRevenueReport()`, `buildAdsRevenueReportHtml()`.

Nguồn dữ liệu hiện dùng:

- `daily_revenue_snapshot.ads_spend_today`
- expenses có tên/category chứa `facebook`, `meta`, `tiktok`, `ads`, `quảng cáo`, `marketing`
- POS history/orders/purchases

Đánh giá: dùng tốt làm báo cáo vận hành trong POS, nhưng chưa phải Chief of Staff module.

#### Telegram Ads report

Endpoint/scheduler có sẵn:

- `testAdsReportTelegram`
- `adsRevenueReportApi`
- `scheduledTelegramReport`

Telegram command đang nhận:

- `ads hôm nay`
- `facebook ads hôm nay`
- `báo cáo ads`
- `báo cáo doanh thu ads`

Đánh giá: Telegram daily report production đang nghiêng về `xekho`. Khi tích hợp Chief, tránh tạo thêm một daily report trùng lịch nếu chưa có migration.

## 3. Kiến trúc đề xuất

### 3.1. Chọn ownership rõ ràng

Đề xuất ownership:

- `webapp-menu`: sở hữu Chief of Staff, Weather, Facebook Page snapshot, UI Chief.
- `xekho`: tiếp tục sở hữu POS report và Telegram daily report production trong giai đoạn đầu.
- `ads_daily_reports`: trở thành collection dùng chung cho Ads Intelligence.

Lý do:

- Chief đã có UI và scheduler ở `webapp-menu`.
- Weather workflow đã hoàn chỉnh ở `webapp-menu`.
- Ads report production và Telegram Ads command đang có ở `xekho`.

### 3.2. Collection chuẩn hóa: `ads_daily_reports/{YYYY-MM-DD}`

Schema đề xuất:

```js
{
  date: "2026-05-26",
  businessWindow: {
    from: "18:00",
    to: "24:00",
    timezone: "Asia/Ho_Chi_Minh"
  },
  facebook: {
    campaignName: "",
    spend: 0,
    budget: 0,
    reach: 0,
    impressions: 0,
    clicks: 0,
    inlineLinkClicks: 0,
    directionClicks: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    frequency: 0,
    purchases: 0,
    addToCart: 0,
    source: "meta-api"
  },
  offline: {
    newCustomersEstimated: 0,
    totalCustomersEstimated: 0,
    revenueInAdsWindow: 0,
    note: "",
    creativeNote: ""
  },
  weather: {
    source: "openweathermap_forecast_3h",
    city: "Bảo Lộc",
    summary: "",
    dominantCondition: "",
    tempMin: 0,
    tempMax: 0,
    maxPop: 0,
    rainTotalMm: 0,
    businessWindowImpact: "normal",
    hourlyBuckets: []
  },
  derived: {
    costPerDirectionClick: 0,
    costPerNewCustomer: 0,
    estimatedVisitRate: 0,
    roasAdsWindow: 0,
    profitAfterAdsWindow: 0,
    decision: "hold",
    score: 0,
    reasons: [],
    nextActions: []
  },
  sources: {
    metaAds: "xekho.fetchMetaAdsInsights",
    weather: "webapp-menu.settings/weather_forecast_daily",
    posRevenue: "daily_revenue_snapshot/history/orders",
    manualOffline: "admin_input"
  },
  createdAt,
  updatedAt,
  updatedBy
}
```

### 3.3. Vì sao không nhập tay thời tiết

Weather sẽ lấy từ `webapp-menu`:

- Gọi `triggerWeatherForecastNow` nếu cần refresh ngay.
- Đọc `settings/weather_forecast_daily`.
- Copy snapshot thời tiết vào `ads_daily_reports/{date}.weather`.

Người dùng chỉ nhập tay phần ngoại lệ:

- Mưa cục bộ không phản ánh trong API.
- Đường ngập, kẹt xe, sự kiện gần quán.
- Quán nghỉ, thiếu nhân sự, hết món chủ lực.

## 4. Rule engine cho Chief of Staff

Thêm hàm dùng chung:

```js
evaluateFacebookAdsDailyDecision(report)
```

Đầu ra:

```js
{
  score: 0,
  decision: "increase | decrease | pause | change_creative | hold",
  reasons: [],
  nextActions: [],
  confidence: "low | medium | high"
}
```

Rules MVP:

- `increase`: CPC chỉ đường ổn định, frequency < 4, khách mới tăng, ROAS/lợi nhuận sau ads dương.
- `pause`: CPC chỉ đường > 5.000đ hoặc spend > 0 nhưng không có khách mới, trừ trường hợp thời tiết xấu rõ ràng.
- `decrease`: frequency > 5, CPN cao hơn biên lợi nhuận trung bình trên một khách, hoặc lãi sau ads âm nhiều ngày liên tiếp.
- `change_creative`: CTR < 2% hoặc creative đã chạy hơn 14 ngày.
- `hold`: dữ liệu chưa đủ tin cậy, đặc biệt trong 3-5 ngày đầu.

Score gợi ý:

```text
Ads Health Score =
25% CTR
+ 20% CPC chỉ đường
+ 20% Frequency
+ 20% Khách mới / click chỉ đường
+ 15% Lợi nhuận sau ads
```

Weather impact:

- Nếu `maxPop >= 50` hoặc `rainTotalMm >= 1.5` trong khung 18h-24h, Chief không nên vội kết luận creative kém.
- Nếu trời mưa nhưng click chỉ đường vẫn cao, gợi ý đổi CTA sang giao hàng/đặt trước thay vì tắt ads ngay.
- Nếu thời tiết đẹp mà spend cao, CTR thấp, khách mới thấp, ưu tiên đổi creative/target.

## 5. Kế hoạch thực thi

### Phase 1 - Chốt contract dữ liệu

1. Dùng file này làm contract triển khai.
2. Giữ `ads_daily_reports` làm collection trung tâm.
3. Bổ sung mapping field cũ của `xekho` sang schema mới để không phá Telegram report hiện tại.
4. Xác nhận `FACEBOOK_AD_ACCOUNT_ID`/`META_AD_ACCOUNT_ID` dùng định dạng thống nhất: có hoặc không có prefix `act_`.

### Phase 2 - Backend Ads Intelligence

Ưu tiên triển khai trong `webapp-menu` nếu Chief nằm ở đó, nhưng có thể copy/adapt logic tốt từ `xekho`.

Việc cần làm:

1. Thêm hàm `fetchMetaAdsDailyInsights(dateKey)`:
   - Gọi Graph API `/insights`.
   - Lấy `spend, clicks, cpc, cpm, ctr, impressions, reach, frequency, actions`.
   - Parse `actions` để tìm `inline_link_click`, link click và các action liên quan đến direction nếu Meta trả về.
   - Nếu chưa map được direction action ổn định, lưu raw `actions` 3-5 ngày đầu để quan sát.
2. Thêm hàm `upsertAdsDailyReport(dateKey, patch)`:
   - Merge dữ liệu Meta Ads.
   - Merge dữ liệu weather.
   - Merge dữ liệu offline nhập tay.
   - Tính lại `derived`.
3. Thêm callable/HTTP:
   - `syncFacebookAdsDailyReportNow`
   - `saveAdsDailyOfflineStats`
   - `getChiefAdsBrief`
4. Cập nhật `daily_revenue_snapshot.ads_spend_today` để đọc từ `ads_daily_reports.facebook.spend` khi có dữ liệu chuẩn.

### Phase 3 - Weather integration

Tận dụng `webapp-menu`:

1. Gọi `syncMarketingWeatherForecast()` hoặc đọc `settings/weather_forecast_daily`.
2. Tính `businessWindowImpact` cho khung 18h-24h:
   - `bad`: mưa cao, mưa nhiều, dông, hoặc mưa đúng khung bán chính.
   - `normal`: thời tiết trung tính.
   - `good`: ít mưa, mát, phù hợp đi ăn tối.
3. Copy weather snapshot vào `ads_daily_reports/{date}.weather`.
4. UI chỉ cho nhập “ghi chú đặc biệt”, không bắt nhập thời tiết.

### Phase 4 - Frontend

Trong `webapp-menu`:

1. Thêm subscription `ads_daily_reports` vào `onlineAdminService.ts`.
2. Thêm card Ads Intelligence vào `ChiefOfStaffTab.tsx`:
   - Ads Health Score.
   - Decision hôm nay.
   - Spend, reach, direction clicks, CTR, CPC, frequency.
   - Khách mới ước tính, CPN, ROAS khung 18h-24h.
   - Weather impact.
   - 7 ngày gần nhất.
3. Thêm form “Chốt số cuối ngày”:
   - Khách mới ước tính.
   - Tổng khách ước tính.
   - Ghi chú nội dung/creative.
   - Ghi chú ngoại lệ.

Trong `xekho`:

1. Giữ tab `Báo cáo Ads + Doanh thu`.
2. Cập nhật để đọc schema mới của `ads_daily_reports`.
3. Không đổi lịch Telegram production nếu chưa có migration.

### Phase 5 - Chief brief

Mở rộng `runChiefOfStaffJob()` trong `webapp-menu`:

1. Đảm bảo trước khi chạy Chief:
   - Có revenue snapshot.
   - Có weather snapshot.
   - Có ads daily report.
2. Ghi vào `executive_daily_briefs/{date}`:
   - `adsSummary`
   - `weatherImpact`
   - `adsDecision`
   - `risks`
   - `wins`
   - `actions`
3. Chief UI đọc trực tiếp từ `executive_daily_briefs` và/hoặc `ads_daily_reports`.

### Phase 6 - Telegram

Giai đoạn đầu:

1. Giữ `xekho:scheduledTelegramReport` là owner daily Telegram report.
2. Cập nhật `buildAdsRevenueTelegramData()` để ưu tiên `ads_daily_reports` schema mới.
3. Thêm dòng weather impact vào báo cáo Ads.
4. Không bật thêm `webapp-menu:dailyReportTelegram` nếu chưa migration, để tránh gửi trùng.

Giai đoạn sau:

- Nếu muốn gom về `webapp-menu`, cần migration plan riêng cho Telegram scheduled report.

## 6. Thứ tự ưu tiên triển khai

1. Vá/hoàn thiện API Ads daily report trong `webapp-menu` hoặc copy logic từ `xekho`.
2. Thêm weather snapshot tự động vào `ads_daily_reports`.
3. Thêm rule engine `evaluateFacebookAdsDailyDecision()`.
4. Thêm UI card Ads Intelligence trong Chief.
5. Cập nhật Telegram report ở `xekho` để đọc schema mới.
6. Sau khi ổn định 3-5 ngày, map chính xác action type cho “Nhận chỉ đường”.

## 7. Rủi ro và điểm cần xác nhận

1. Meta API có thể không trả action “Nhận chỉ đường” dưới một tên cố định cho mọi campaign. Cần log raw `actions`.
2. `getFacebookAdsCampaignStatusNow` trong `webapp-menu` đang gọi hàm chưa tìm thấy định nghĩa. Cần vá trước khi dùng.
3. Doanh thu khung 18h-24h phụ thuộc timestamp đơn POS/history có chuẩn không.
4. Khách mới là dữ liệu ước tính/nhập tay, Chief phải hiển thị độ tin cậy thay vì coi là conversion chính xác.
5. Hai repo có phần Telegram report chồng nhau. Không migration vội khi chưa có kế hoạch tắt một bên.
6. Worktree `xekho` đang có nhiều file modified sẵn; khi implement cần tách commit cẩn thận, tránh sửa lan.

## 8. Definition of Done

Hoàn tất khi:

- Chief of Staff hiển thị Ads Health Score theo ngày.
- Thời tiết tự động lấy từ OpenWeatherMap, không cần nhập tay.
- Chủ quán chỉ cần nhập khách mới ước tính và ghi chú ngoại lệ.
- Hệ thống tự tính CPC chỉ đường, CPN, CTR, frequency, ROAS, profit after ads.
- Chief đưa ra quyết định rõ: tăng ngân sách, giảm, tạm dừng, đổi creative hoặc giữ nguyên.
- Telegram Ads report và UI Chief đọc cùng nguồn `ads_daily_reports`.
- Báo cáo cũ trong `xekho` không bị hỏng.
