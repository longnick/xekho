# Phân loại cây làm việc chưa gọn — chuẩn bị nhánh tổng duyệt

**Thời điểm quét:** 2026-07-11 (giờ Việt Nam)
**Nguồn:** `/home/longnick/projects/xekho` — nhánh gốc vẫn giữ nguyên, không reset/stash.
**Nhánh tổng duyệt sạch:** `task/security-integration-rehearsal` tại `/home/longnick/projects/xekho-security-integration`.

## Kết quả quét

- **84 path** đang dirty ở nhánh gốc (tăng từ số 83 ban đầu vì `firestore-debug.log` là file log do Emulator tạo).
- **32 path** đã giống hệt candidate security trong nhánh tổng duyệt: không sao chép lần nữa, tránh trùng code.
- **16 file tracked còn khác nhau**: phải tách theo hunk (mảnh thay đổi), không được chép cả file.
- **30 file chưa có trong integration** và **6 thư mục**: cần phân nhóm theo workstream trước khi commit.

## Không đưa vào integration release

| Nhóm | Lý do |
|---|---|
| `firestore-debug.log` | log tạm của Emulator |
| `.hermes/`, `.understand-anything/` | agent/cache metadata cục bộ |
| `sketches/` | phác thảo, không phải runtime release |

## Nhóm cần tách trước khi đưa vào integration

| Nhóm công việc | Path tiêu biểu | Cách xử lý |
|---|---|---|
| Chấm công / lương / vị trí | `app.js`, `db.js`, `style.css`, attendance docs/scripts/tests | tách riêng theo feature; có QA browser/mobile và không gộp với security |
| Scriptable widget | `functions/scriptableFinanceWidget.js`, `scripts/scriptable/`, Scriptable task logs | tách riêng; không đưa token/widget path vào security release |
| Zalo | `functions/zalo/`, Zalo task log | tách riêng webhook/config; không gộp security release |
| Security source hunk còn lẫn | `functions/index.js`, `app.js`, `db.js`, `index.html`, package files, shared AI-map docs | đối chiếu SHA package candidate, chỉ lấy hunk không trùng rồi test focused |
| Build/tunnel/tooling | `vite.config.mjs`, `eslint.config.mjs` | review độc lập, không tự đưa vào tổng duyệt |

## Quy tắc tiếp theo

1. Không sửa/reset/stash nhánh gốc dirty.
2. Dùng integration worktree là nơi duy nhất để sao chép/stage/commit.
3. Bắt đầu với một workstream có test độc lập; sau mỗi commit chạy gate tương ứng.
4. Chỉ khi toàn bộ workstream đã được phân loại và có commit rõ ràng mới chạy tổng duyệt (full rehearsal).
