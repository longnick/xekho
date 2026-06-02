# Roadmap triển khai tab Meta Ads POS trong `/admin/online`

Nguồn mockup:

- Desktop: `d:/APP - BACKUP/webapp-menu/docs/pos_meta_ads_mockup.png`
- Mobile: `d:/APP - BACKUP/webapp-menu/docs/pos_meta_ads_mobile_mockup.png`

Ngày rà soát: 2026-05-26

## 1. Mục tiêu

Tạo một tab **Quảng cáo** trong `/admin/online` để theo dõi hiệu quả Meta Ads trực tiếp trong POS, bám sát 100% hai mockup desktop và mobile.

Tab này phải hỗ trợ:

- Tổng chi phí quảng cáo.
- Doanh thu ước tính.
- ROI.
- Khách hàng mới.
- Biểu đồ chi phí và doanh thu theo 7 ngày.
- Danh sách campaign/ad đang chạy.
- Lượt nhấp **Inline Link Clicks / Click liên kết nội tuyến** từ Meta Ads.
- Form phản hồi hằng ngày để nhập số khách mới và ghi chú cuối ca.
- Responsive mobile giống mockup mobile.

## 2. Kết luận sau khi kiểm tra repo

Repo triển khai chính: `d:/APP - BACKUP/webapp-menu`

Các file liên quan hiện có:

- `src/features/admin/pages/OnlineManagementPage.tsx`
- `src/features/admin/online-management/constants/tabs.ts`
- `src/features/admin/services/onlineAdminService.ts`
- `src/features/commerce/types.ts`
- `functions/index.js`
- `functions/shared/helpers.js`
- `functions/shared/config.js`

MVP dữ liệu Ads hằng ngày đã có nền tảng:

- `AdsDailyReportRecord`
- `subscribeLatestAdsDailyReport`
- `subscribeAdsDailyReportsRange`
- `syncFacebookAdsDailyReportNow`
- `saveAdsDailyOfflineStats`

Backend hiện đã đọc được account-level Meta Ads daily insights, nhưng bảng campaign/ad phía dưới cần bổ sung campaign-level/ad-level API chi tiết hơn.

## 3. Kết quả kiểm tra token Meta hiện có

Token hiện có trong:

- `d:/APP - BACKUP/webapp-menu/functions/.env.pos-v2-909ff`

Các biến đã có:

- `FACEBOOK_ADS_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `FACEBOOK_AD_ACCOUNT_ID`

Kết quả gọi thử Meta Graph API `v23.0`:

| Hạng mục | Kết quả |
| --- | --- |
| `/me` | Thành công |
| Campaign insights 7 ngày | Thành công, đọc được 4 campaign insight rows |
| Campaign status | Thành công, đọc được 10 campaign rows |
| Ad creative thumbnail | Thành công, 25/25 ad mẫu có `creative.thumbnail_url` |
| Quyền token | Có `ads_read`, `ads_management`, `business_management` |
| Inline Link Clicks | Đọc được qua field `inline_link_clicks` và action `link_click` |
| Action dạng direction/map/location | Không dùng làm chỉ số chính cho mockup này |

Đánh giá:

1. Token hiện tại **đủ để triển khai phần lớn mục số 7** trong roadmap trước đó:
   - campaign/ad name
   - status/effective_status
   - reach
   - spend/clicks/CTR/CPC/CPM/impressions
   - thumbnail creative
   - date range
2. Token hiện tại **đọc được Inline Link Clicks**:
   - Campaign-level 7 ngày: đọc được `inline_link_clicks`.
   - Ad-level 7 ngày: đọc được `inline_link_clicks`.
   - Tổng mẫu kiểm tra 7 ngày: `86` inline link clicks.
   - Action `link_click` trong `actions` cũng khớp tổng `86`.

Kết luận cập nhật: mockup nên dùng nhãn **Inline Link Clicks** hoặc **Click liên kết**, không dùng nhãn **Get Directions / Chỉ đường** nếu không có dữ liệu chỉ đường thật từ Meta.

## 4. Roadmap UI desktop

### 4.1. Tạo tab `ads`

Cập nhật:

- `src/features/admin/online-management/constants/tabs.ts`
- `src/features/admin/pages/OnlineManagementPage.tsx`

Thêm tab:

- Key: `ads`
- Label: `Quảng cáo`
- Icon: ưu tiên icon từ `lucide-react`, ví dụ `Megaphone`, `BarChart3` hoặc `TrendingUp`.

### 4.2. Tạo component tab chính

Tạo file:

```txt
src/features/admin/online-management/tabs/AdsPerformanceTab.tsx
```

Component nhận props:

```ts
latestAdsDailyReport: AdsDailyReportRecord | null;
adsDailyReportRows: AdsDailyReportRecord[];
isSyncingAdsDailyReport: boolean;
isSavingAdsOfflineStats: boolean;
onSyncAdsDailyReport: () => Promise<void>;
onSaveAdsOfflineStats: (payload: {
  dateKey: string;
  newCustomers: number;
  notes: string;
}) => Promise<void>;
campaignRows: MetaAdsCampaignPerformanceRow[];
```

### 4.3. Desktop layout cần khớp mockup

Các vùng chính:

1. Sidebar POS dark:
   - Logo/tên quán.
   - Menu trái.
   - Item `Quảng cáo` active màu xanh.
   - Profile owner cuối sidebar.

2. Header:
   - Back button.
   - Title: `Hiệu quả quảng cáo`.
   - Subtitle: `Tổng quan hiệu quả quảng cáo trong 7 ngày qua`.
   - Date range dropdown.

3. Top cards:
   - Tổng chi phí quảng cáo.
   - Doanh thu ước tính.
   - ROI.
   - Khách hàng mới.

4. Middle chart:
   - Line xanh dương: chi phí.
   - Line xanh lá: doanh thu.
   - Legend.
   - Dropdown `Theo ngày`.
   - Ghi chú cập nhật dữ liệu.

5. Right feedback panel:
   - Input số khách mới.
   - Textarea ghi chú.
   - Counter 0/200.
   - Info box.
   - Button `Lưu phản hồi`.

6. Bottom campaign table:
   - Thumbnail.
   - Campaign name.
   - Status `Active`.
   - Reach.
   - Lượt nhấp `Inline Link Clicks`.
   - Link `Xem tất cả chiến dịch`.

## 5. Roadmap UI mobile

Mockup mobile cần có layout riêng, không chỉ co desktop xuống.

### 5.1. Mobile shell

Breakpoints đề xuất:

- Mobile: `< 768px`
- Tablet/Desktop: `>= 768px`

Mobile layout cần:

- Dark full-screen POS dashboard.
- Top status/header area gọn.
- Hamburger icon bên trái.
- Title giữa: `Hiệu quả Meta Ads`.
- Icon chart tròn bên phải.
- Date range select full-width.

### 5.2. Quick Stats

Hiển thị 4 card nén gọn theo hàng ngang:

- Chi phí.
- Doanh thu.
- ROI.
- Khách mới.

Mỗi card có:

- Icon tròn gradient.
- Label.
- Giá trị lớn.
- Tỷ lệ tăng/giảm.
- Sparkline mini.

Yêu cầu kỹ thuật:

- Dùng CSS grid 4 cột trên mobile rộng.
- Card phải có width ổn định, không nhảy layout.
- Sparkline nên dùng SVG nhỏ tự render, không thêm chart library lớn.

### 5.3. Compact Chart

Chart mobile cần:

- 2 line: chi phí và doanh thu.
- Legend trên cùng.
- Tooltip khi chạm vào điểm dữ liệu.
- Vertical dashed guide line tại điểm đang chọn.
- Hỗ trợ pointer/touch event.

State cần có:

```ts
selectedChartIndex: number | null;
```

Interaction:

- `onPointerMove`: chọn ngày gần nhất theo tọa độ X.
- `onPointerLeave`: có thể giữ điểm cuối hoặc bỏ tooltip.
- Trên mobile, tooltip nên cố định trong chart để không bị tràn màn hình.

### 5.4. Campaign Cards

Thay table desktop bằng card list:

Mỗi card gồm:

- Thumbnail lớn bên trái.
- Campaign/ad name.
- ID campaign/ad.
- Pill `Active`.
- Label `Inline Link Clicks`.
- Số click lớn bên phải.
- Chevron.

Swipe action:

- Giai đoạn 1: dựng UI card và click detail.
- Giai đoạn 2: thêm swipe left/right bằng pointer events hoặc `framer-motion`.
- Swipe left: tạm dừng campaign/ad.
- Swipe right: xem chi tiết.

Không bật pause thật ở giai đoạn đầu nếu chưa có xác nhận nghiệp vụ, vì đây là thao tác có rủi ro trực tiếp đến quảng cáo.

### 5.5. Quick Action Button

Mobile cần button cố định phía dưới:

- Text: `Phản hồi hằng ngày`.
- Icon message.
- Mở bottom sheet nhập:
  - số khách mới
  - ghi chú cuối ca
  - lưu phản hồi

Bottom sheet nên dùng state nội bộ:

```ts
isFeedbackSheetOpen: boolean;
```

## 6. Roadmap API campaign-level/ad-level

### 6.1. Type dữ liệu mới

Thêm type frontend:

```ts
export type MetaAdsCampaignPerformanceRow = {
  id: string;
  campaignId: string;
  campaignName: string;
  adId?: string;
  adName?: string;
  status: string;
  effectiveStatus: string;
  thumbnailUrl: string;
  reach: number;
  impressions: number;
  clicks: number;
  inlineLinkClicks: number;
  spend: number;
  cpc: number;
  ctr: number;
  dateStart: string;
  dateStop: string;
  rawActions: Array<{ action_type: string; value: number }>;
};
```

### 6.2. Backend helper mới

Thêm vào `functions/shared/helpers.js`:

```js
async function fetchMetaAdsCampaignPerformanceRows({
  since,
  until,
  limit = 50,
} = {}) {}
```

Nguồn dữ liệu đề xuất:

1. `/act_{adAccountId}/insights`
   - `level=campaign`
   - fields:
     - `campaign_id`
     - `campaign_name`
     - `spend`
     - `reach`
     - `clicks`
     - `cpc`
     - `cpm`
     - `ctr`
     - `impressions`
     - `actions`
2. `/act_{adAccountId}/campaigns`
   - fields:
     - `id`
     - `name`
     - `status`
     - `effective_status`
     - `start_time`
     - `stop_time`
3. `/act_{adAccountId}/ads`
   - fields:
     - `id`
     - `name`
     - `status`
     - `effective_status`
     - `campaign{id,name}`
     - `creative{id,name,thumbnail_url,image_url,object_story_id}`

Merge dữ liệu theo `campaign_id`.

### 6.3. Callable function mới

Thêm vào `functions/index.js`:

```js
exports.getFacebookAdsCampaignPerformance = onCall(...);
```

Input:

```ts
{
  since?: string;
  until?: string;
  limit?: number;
}
```

Output:

```ts
{
  ok: boolean;
  rows: MetaAdsCampaignPerformanceRow[];
  actionTypesSeen: string[];
  inlineLinkClickActionTypesSeen: string[];
  source: "meta-api";
  fetchedAt: string;
}
```

### 6.4. Mapping Inline Link Clicks

Ưu tiên đọc trực tiếp field:

```js
inline_link_clicks
```

Fallback từ `actions`:

```js
[
  "inline_link_click",
  "link_click",
  "outbound_click"
]
```

Trong lần kiểm tra ngày 2026-05-26, Meta trả về field `inline_link_clicks` và action `link_click`, tổng 7 ngày là `86`.

Nếu không có `inline_link_clicks`:

- Hiển thị `0` hoặc `--`.
- Tooltip: `Meta chưa trả Inline Link Clicks trong khoảng ngày này`.
- Có thể fallback sang `link_click` trong `actions`, nhưng vẫn ghi nhãn là `Inline Link Clicks` hoặc `Link clicks`.

## 7. Hướng dẫn lấy/cấp token Meta nếu thiếu dữ liệu

Token hiện tại đã có quyền tốt, nhưng nếu sau này đổi token hoặc không đọc được đủ dữ liệu, làm theo các bước sau.

### 7.1. Quyền cần có

Token nên có tối thiểu:

- `ads_read`
- `ads_management`
- `business_management`

Nếu cần đọc Page/post liên quan creative:

- `pages_read_engagement`
- `pages_show_list`

Nếu cần thao tác pause campaign/ad:

- `ads_management`

### 7.2. Cách lấy token ổn định

Khuyến nghị dùng **System User token** trong Meta Business Manager:

1. Vào Meta Business Settings.
2. Mở `Users` -> `System Users`.
3. Tạo hoặc chọn system user dành cho POS.
4. Gán asset:
   - Ad Account đang chạy quảng cáo.
   - Page liên quan nếu cần đọc creative/post.
5. Cấp quyền:
   - Manage campaigns hoặc View performance.
   - Page read nếu cần.
6. Generate token cho app Meta đang dùng.
7. Chọn permissions:
   - `ads_read`
   - `ads_management`
   - `business_management`
   - `pages_read_engagement`
   - `pages_show_list`
8. Lưu token vào Firebase Functions env.

### 7.3. Cấu hình trong repo/Firebase

Các biến cần có:

```txt
FACEBOOK_ADS_ACCESS_TOKEN=
FACEBOOK_PAGE_ACCESS_TOKEN=
FACEBOOK_AD_ACCOUNT_ID=act_xxxxxxxxxxxxx
```

Local:

```txt
d:/APP - BACKUP/webapp-menu/functions/.env.pos-v2-909ff
```

Production Firebase Functions:

```bash
firebase functions:config:get
firebase deploy --only functions
```

Với Firebase Functions v2 `defineString`, cần đảm bảo biến môi trường được nạp đúng trong runtime deploy. Không commit token vào git.

### 7.4. Checklist kiểm tra token

Sau khi có token, kiểm tra:

1. `/me?fields=id,name` trả thành công.
2. `/act_{adAccountId}/insights?level=campaign` trả rows.
3. `/act_{adAccountId}/campaigns` trả status/effective_status.
4. `/act_{adAccountId}/ads` trả `creative.thumbnail_url`.
5. `inline_link_clicks` có trong insights hoặc `actions` có `link_click`.

## 8. Kế hoạch thực thi theo phase

### Phase 1 - Dựng UI static giống mockup

Mục tiêu:

- [x] Thêm tab `Quảng cáo`.
- [x] Tạo `AdsPerformanceTab`.
- [x] Dựng desktop layout giống mockup.
- [x] Dựng mobile layout giống mockup.
- [x] Dùng mock/sample data nội bộ nếu API chưa wire xong.

Verification:

- Screenshot desktop so với `pos_meta_ads_mockup.png`.
- Screenshot mobile so với `pos_meta_ads_mobile_mockup.png`.

### Phase 2 - Wire dữ liệu Ads hằng ngày

Mục tiêu:

- [x] Top cards lấy từ `adsDailyReportRows`.
- [x] Chart lấy 7 ngày gần nhất.
- [x] Form phản hồi gọi `saveAdsDailyOfflineStats`.
- [x] Button refresh gọi `syncFacebookAdsDailyReportNow`.

### Phase 3 - Thêm campaign/ad API

Mục tiêu:

- [x] Thêm `fetchMetaAdsCampaignPerformanceRows`.
- [x] Thêm callable `getFacebookAdsCampaignPerformance`.
- [x] Thêm service frontend gọi callable.
- [x] Đổ dữ liệu vào desktop table và mobile campaign cards.

### Phase 4 - Mobile interactions

Mục tiêu:

- [x] Touch tooltip cho chart.
- [x] Pull to refresh (Refresh button UI).
- [x] Bottom sheet phản hồi hằng ngày.
- [x] Swipe action UI cho campaign cards (framer-motion).

Tạm thời chưa pause campaign thật cho đến khi có xác nhận.

### Phase 5 - QA và polish

Mục tiêu:

- [x] Chạy typecheck/build.
- [x] Kiểm tra console không lỗi.
- [x] Kiểm tra responsive.
- [x] So screenshot desktop/mobile với mockup.
- [x] Kiểm tra token không bị log ra client hoặc console.

Lệnh kiểm tra:

```bash
npm run typecheck
npm run build
node --check functions/index.js
node --check functions/shared/helpers.js
```

## 9. Rủi ro và quyết định cần chốt

1. **100% mockup trong shell hiện tại có thể khó khớp tuyệt đối.**
   - Nếu cần giống mockup tuyệt đối, tab `ads` nên render một full-screen dashboard riêng.

2. **Chỉ số đúng cho mockup là Inline Link Clicks.**
   - Không dùng nhãn `Get Directions` nếu dữ liệu thật là `inline_link_clicks`.
   - Desktop và mobile nên hiển thị `Inline Link Clicks` hoặc bản tiếng Việt `Click liên kết`.

3. **Pause campaign/ad là thao tác rủi ro.**
   - Phase đầu chỉ làm swipe UI.
   - Chỉ bật pause thật sau khi có confirm và cơ chế undo/confirm.

4. **Thumbnail có thể thay đổi theo creative.**
   - Token hiện tại lấy được thumbnail tốt.
   - Cần fallback placeholder nếu creative thiếu ảnh.

## 10. Definition of Done

Hoàn thành khi:

- [x] `/admin/online` có tab `Quảng cáo`.
- [x] Desktop giống mockup desktop.
- [x] Mobile giống mockup mobile.
- [x] Top cards, chart, feedback form dùng dữ liệu thật.
- [x] Campaign cards/table dùng Meta campaign/ad API thật.
- [x] Token không lộ ở frontend.
- [x] Typecheck và build pass.
- [x] Có screenshot QA desktop/mobile lưu lại để đối chiếu.

## 11. Trạng thái thực thi và QA

Ngày cập nhật: 2026-05-26

Đã đối chiếu lại sau Phase 4 và hoàn thiện thêm trong `d:/APP - BACKUP/webapp-menu`:

- Đã thêm tab `Quảng cáo` trong `/admin/online`.
- Đã tạo `AdsPerformanceTab`.
- Đã dựng desktop layout theo mockup.
- Đã dựng mobile layout theo mockup.
- Đã thêm chart tooltip trên mobile.
- Đã thêm bottom sheet `Phản hồi hằng ngày`.
- Đã thêm swipe campaign card:
  - Vuốt phải: mở sheet chi tiết campaign.
  - Vuốt trái: ghi nhận thao tác tạm dừng ở UI, chưa gửi lệnh pause thật.
- Đã thêm pull-to-refresh indicator trên mobile.
- Đã thêm API server-side `getFacebookAdsCampaignPerformance`.
- Đã thêm helper `fetchMetaAdsCampaignPerformanceRows`.
- Đã dùng `inline_link_clicks` / `link_click`, không dùng nhãn `Get Directions`.
- Đã thêm guard local demo để test UI không gọi Firebase callable thật.

QA đã chạy:

```bash
npm run typecheck
node --check functions/index.js
node --check functions/shared/helpers.js
npm run check:mojibake
npm run build
npm run e2e
npm run smoke:e2e
```

Kết quả:

- TypeScript: pass.
- Functions syntax check: pass.
- Mojibake check: pass, không phát sinh lỗi tiếng Việt.
- Production build: pass.
- Playwright suite repo: pass `4/4`.
- Smoke E2E step 4/5/6: pass.
- DOM E2E riêng cho Ads: pass.
  - Desktop tab render đúng.
  - Campaign table có `Inline Link Clicks`.
  - Mobile quick stats render đủ 4 chỉ số.
  - Chart tooltip hiển thị.
  - Bottom sheet phản hồi mở được.
  - Pull-to-refresh indicator đổi trạng thái.
  - Swipe phải mở chi tiết campaign.
  - Swipe trái hiển thị trạng thái tạm dừng mô phỏng.
  - Không có console error trong vòng test.

Phần còn lại trước production:

1. Deploy Firebase Functions để callable mới hoạt động trên production:
   - `syncFacebookAdsDailyReportNow`
   - `saveAdsDailyOfflineStats`
   - `getFacebookAdsCampaignPerformance`
2. Kiểm tra production token/env sau deploy.
3. Quyết định có bật pause campaign thật hay không.
   - Hiện tại UI chỉ mô phỏng để tránh tắt quảng cáo ngoài ý muốn.
4. Nếu muốn push notification mobile, cần thiết kế phase riêng vì roadmap này chưa triển khai notification runtime.
