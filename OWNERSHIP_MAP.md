# OWNERSHIP MAP

## Executive Summary

- `xekho` hiện khớp cloud `34/34`
- `webapp-menu` source có `67` exports, cloud có `63` functions live
- Runtime SA production đã thống nhất về `functions-runtime@pos-v2-909ff.iam.gserviceaccount.com`
- Rủi ro chính còn lại là:
  - ownership chồng chéo giữa `xekho` và `webapp-menu`
  - mojibake còn sót trong active code
  - Gemini-era wording / fallback chưa dọn xong

Phạm vi tài liệu này:

- chỉ chốt ownership production theo evidence hiện có trong [TECH_AUDIT.md](./TECH_AUDIT.md)
- không suy đoán beyond source + cloud verification đã có
- không dùng source-only function làm bằng chứng production

## Ownership Table

| Domain | Production owner repo | Main functions / files | Cloud status | Risk level | Do | Don't | Test path |
|---|---|---|---|---|---|---|---|
| POS core / staff UI | `xekho` | `index.html`, `app.js`, `db.js` | Active source, app-side domain, paired with deployed `xekho` functions | Medium | Giữ `xekho` là owner cho POS/staff flows | Không suy từ `webapp-menu` customer UI sang staff ownership | Mở staff UI, tạo bàn, gọi món, tính tiền |
| AI assistant / AI router | `xekho` | `functions/index.js`: `aiRouter`, `aiStatus`, `apiVoice`; `ai-core.js`; `ai-ui.js` | Live trong cloud codebase `xekho` | Medium-High | Xem `xekho` là production owner cho AI assistant nội bộ | Không dùng docs/patch cũ ở `webapp-menu` làm bằng chứng move | Test AI bubble, `aiStatus`, `aiRouter`, voice flow |
| Purchase OCR | `xekho` | `functions/index.js`: `purchaseOcr`; `functions/vertexAi.js`; `app.js` | Live trong cloud codebase `xekho` | High | Giữ OCR nhập hàng ở `xekho` | Không coi integration patch hay artifact là source-of-truth | Upload ảnh hóa đơn nhập hàng và đối chiếu parse |
| Telegram kitchen notification | `xekho` | `telegramWebhook`, `telegramOnKitchenOrderCreated`, `telegramOnKitchenOrderUpdated`, `telegramOnCompletedOrderCreated` | Live trong cloud codebase `xekho` | Medium | Giữ Telegram vận hành bếp ở `xekho` | Không dời ownership chỉ vì `webapp-menu` có Telegram-related code khác | Tạo order, cập nhật bếp, hoàn tất order, kiểm tra Telegram |
| Telegram scheduled daily report | `xekho` | `scheduledTelegramReport` | Live scheduler job đang trỏ `xekho:scheduledTelegramReport` | High | Xem `xekho` là production owner hiện tại | Không coi `webapp-menu:dailyReportTelegram` là production evidence | Đối chiếu scheduler `firebase-schedule-scheduledTelegramReport-asia-southeast1` |
| Public menu sync | `xekho` | `syncPublicMenuOnCatalogCreate`, `syncPublicMenuOnCatalogUpdate`, `syncPublicMenuOnCatalogDelete` | Live trong cloud codebase `xekho` | Medium-High | Giữ trigger sync catalog ở `xekho` cho tới khi có migration plan rõ | Không xoá chỉ vì public ordering UI nằm ở `webapp-menu` | Sửa `Product_Catalog`, quan sát dữ liệu public sync |
| Online order intake | `webapp-menu` | `createOnlineOrder`, `syncOnlineOrderToPosOnWrite`, `updateOnlineOrderStatusFromPos`, admin/commerce service files trong `src/` | Live trong cloud codebase `webapp-menu` | High | Xem `webapp-menu` là owner của intake/ordering web | Không lẫn với approve/reject callable của `xekho` | Tạo đơn online từ web menu, theo dõi sync sang POS |
| Online order approve/reject | `xekho` | `approveOnlineOrder`, `rejectOnlineOrder`, `app.js`, `db.js` | Live trong cloud codebase `xekho` | Medium | Giữ approve/reject staff-side ở `xekho` theo evidence hiện có | Không tự kết luận đã move sang `webapp-menu` vì domain gần nhau | Thử approve/reject từ staff UI |
| Payment webhooks PayOS/SePay | `webapp-menu` | `payosWebhook`, `sepayWebhook` | Live trong cloud codebase `webapp-menu` | High | Giữ webhook thanh toán ở `webapp-menu` | Không map ngược về `xekho` nếu chưa có evidence cloud/source | Gửi webhook sandbox PayOS / SePay |
| Marketing AI / director AI | `webapp-menu` | `aiAdsPostsNow`, `aiDirectorBrief`, `triggerAiDirectorBriefNow`, `functions/aiService.js`, `src/features/admin/**` | Live trong cloud codebase `webapp-menu` | High | Giữ marketing/director AI ở `webapp-menu` | Không dọn secret/provider path bằng giả định | Trigger admin callable / HTTP endpoint và kiểm tra output |
| Scheduled analytics / guardian / chief-of-staff / weather | `webapp-menu` | `scheduledWeatherForecast`, `scheduledTrendScan`, `scheduledRevenueSnapshot`, `scheduledBigQuerySync`, `scheduledEvaluator`, `scheduledGuardian`, `scheduledChiefOfStaff`, `scheduledFacebookPageSnapshot` | Hầu hết live; scheduler verified trong cloud | Medium | Giữ nhóm schedule analytics ở `webapp-menu` | Không dùng source-only schedule Telegram ở `webapp-menu` làm bằng chứng owner | Kiểm tra Scheduler jobs và manual trigger companion endpoints |
| FFmpeg worker pipeline | `webapp-menu` | `ffmpegWorkerEnqueueNow`, `ffmpegWorkerProcessNow`, `ffmpegWorkerDispatchNow`, `ffmpegWorkerRetryNow`, `ffmpegWorkerCleanupNow`, `ffmpegWorkerCallback`, `workers/ffmpeg-renderer` | Live trong cloud codebase `webapp-menu` | Medium-High | Giữ pipeline render ở `webapp-menu` | Không đụng worker ownership từ repo `xekho` | Enqueue job, verify dispatch/process/callback |

## Source-Only Functions In `webapp-menu`

Các function dưới đây có trong source `webapp-menu/functions/index.js` nhưng không được xác minh là live trên cloud hiện tại:

| Function | Status | Note |
|---|---|---|
| `scanWorkflowRunsNow` | `SOURCE_ONLY_NOT_LIVE` | Không được dùng làm production evidence |
| `onDineInOrderRequestCreated` | `SOURCE_ONLY_NOT_LIVE` | Không được dùng làm production evidence |
| `dailyReportTelegram` | `SOURCE_ONLY_NOT_LIVE` | Không được dùng để kết luận Telegram daily report đã thuộc `webapp-menu` |
| `testDailyReportTelegram` | `REMOVED_TEST_ONLY` | Đã gỡ khỏi `xekho`; không dùng làm production evidence |

Nguyên tắc áp dụng:

- source-only function không chứng minh ownership production
- source-only function không chứng minh feature đang live
- source-only function không được dùng làm lý do xoá function cùng domain ở repo còn lại

## Guard Rules

1. Không deploy all functions nếu chưa kiểm tra ownership.
2. Không di chuyển Telegram daily report từ `xekho` sang `webapp-menu` nếu chưa có migration plan.
3. Không xoá public menu sync trong `xekho` chỉ vì public ordering UI nằm ở `webapp-menu`.
4. Không dọn Gemini fallback bằng cách xoá thẳng nếu chưa xác nhận provider path còn dùng không.
5. Không coi file trong `artifacts`, `tmp-xekho-live`, `integration-patches`, `.bak`, `.backup*` là source-of-truth production mặc định.
6. Không suy ownership từ similarity domain; phải bám source active + cloud status.

## Operational Reading Guide

Khi kiểm tra feature từ nay trong workspace này:

- luôn tìm ở cả `xekho` và `webapp-menu`
- luôn tách:
  - active source
  - source-only
  - cloud live
  - artifact / backup / patch
- nếu cloud owner và source owner khác nhau, phải ghi rõ là drift thay vì tự kết luận move

## Current Ownership Conclusion

Theo evidence hiện tại trong source active và cloud:

- `xekho` là production owner cho:
  - POS core / staff UI
  - AI assistant / AI router
  - purchase OCR
  - Telegram kitchen notification
  - Telegram scheduled daily report
  - public menu sync
  - online order approve/reject

- `webapp-menu` là production owner cho:
  - online order intake
  - payment webhooks PayOS / SePay
  - marketing AI / director AI
  - scheduled analytics / guardian / chief-of-staff / weather
  - FFmpeg worker pipeline

Những kết luận trên chỉ phản ánh ownership production hiện tại, không phải quyết định kiến trúc vĩnh viễn.
