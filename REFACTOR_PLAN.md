# XE KHÔ SAFE REFACTOR PLAN
# Kế hoạch refactor an toàn, từng sprint, không phá production

**Ngày cập nhật:** 2026-06-01 18:58
**Repo:** `/home/longnick/projects/xekho`
**Branch hiện tại:** `test/xe-kho-repo-implementer-skill`
**Mục tiêu:** Chuyển repo XE KHÔ từ monolith lớn sang codebase modular, secure, testable mà vẫn giữ POS/Firestore/Cloud Functions production ổn định.

> **Nguyên tắc chính:** Không refactor lớn khi baseline chưa sạch. Không đụng secret, migration, production DB, POS/payment/customer data nếu chưa được xác nhận rõ.

---

## 0. Tình trạng hiện tại cần tôn trọng

### 0.1 Kích thước thực tế đã kiểm tra

- `app.js`: khoảng **12,099 dòng**.
- `functions/index.js`: khoảng **8,368 dòng**.
- `functions/firestoreMegaTools.js`: khoảng **1,357 dòng** tại thời điểm kiểm tra, không phải 50K dòng.

### 0.2 Working tree đang dirty

Trước mọi refactor mới, phải chạy:

```bash
git branch --show-current
git status --short
git diff --stat
```

Nếu có nhiều file modified/untracked/deleted, phải phân loại trước:

- Work đang làm dở cần giữ.
- Generated/deploy/cache files.
- Secret/sensitive paths.
- Docs/plans mới.
- Source changes cần review riêng.

Không chạy `git add -A`. Chỉ stage file cụ thể sau khi đã đọc diff.

### 0.3 Sensitive paths đang là blocker bảo mật

Các path sensitive-looking đã thấy trong Git tracking/status:

- `functions/.env.gcloud-completed-order.yaml`
- `functions/.env.pos-v2-909ff`
- Firebase service account JSON path

Không đọc/paste nội dung các file này vào Telegram hoặc docs. Chỉ được nhắc path để xử lý an toàn.

---

## PHASE 0: SECURITY CONTAINMENT - Ưu tiên tuyệt đối

**Mục tiêu:** Ngăn tiếp tục lộ secret và chuẩn bị rotate/rewrite history an toàn.
**Risk:** Cao. Làm trên branch riêng, có backup, không deploy chung với refactor.

### Sprint 0.1 - Inventory không đọc secret

**Files:**

- Read only: Git index/status.
- Modify sau khi xác nhận: `.gitignore`.

**Steps:**

1. Liệt kê file sensitive đang được Git track bằng path-only command, không in nội dung:

   ```bash
   git ls-files | grep -Ei '(^|/)(\.env|.*\.env\.|serviceAccount|firebase-adminsdk|credential|secret|key)'
   ```

2. Kiểm tra `.gitignore` hiện tại.
3. Đề xuất danh sách path cần untrack.
4. Chờ xác nhận trước khi đụng file sensitive.

**Verification:**

- Báo cáo chỉ có path, không có secret value.

### Sprint 0.2 - Stop tracking secrets

**Chỉ làm sau khi anh xác nhận.**

**Commands mẫu:**

```bash
git rm --cached -- functions/.env.pos-v2-909ff
git rm --cached -- functions/.env.gcloud-completed-order.yaml
git rm --cached -- pos-v2-909ff-firebase-adminsdk-fbsvc-abdca8f1c5.json
```

**Update `.gitignore`:**

```gitignore
.env
.env.*
*.env.local
functions/.env.*
*serviceAccount*.json
*firebase-adminsdk*.json
*credential*.json
*secret*.json
*.json.bak
*.backup-*
firebase-debug.log
functions-list.json
```

**Verification:**

```bash
git status --short
git ls-files | grep -Ei '(^|/)(\.env|.*\.env\.|serviceAccount|firebase-adminsdk|credential|secret|key)'
```

Expected: sensitive files không còn tracked trong index sau commit cleanup.

### Sprint 0.3 - Rotate exposed credentials

**Không làm bằng agent nếu cần secret value.**

Owner/manual tasks:

- Rotate Firebase service account/key đã từng nằm trong Git.
- Rotate API keys/tokens nếu từng nằm trong `.env` tracked.
- Update Firebase/Cloud runtime secret store.
- Confirm app/functions vẫn chạy với secret mới.

### Sprint 0.4 - Git history cleanup riêng

**Không dùng `git filter-branch` trực tiếp trừ khi không còn lựa chọn.**
Ưu tiên:

- `git filter-repo`, hoặc
- BFG Repo Cleaner.

Trước khi rewrite history:

1. Backup repo local.
2. Confirm remote/branch strategy.
3. Rotate secrets trước hoặc ngay sau rewrite.
4. Thông báo tất cả clone cũ phải re-clone/rebase theo hướng dẫn.

---

## PHASE 0.5: BASELINE STABILIZATION - Chốt nền trước khi refactor

**Mục tiêu:** Có baseline đáng tin trước khi tách code.

### Sprint 0.5.1 - Phân loại dirty tree

**Steps:**

1. Run:

   ```bash
   git status --short
   git diff --stat
   ```

2. Với từng nhóm file, ghi vào task log:
   - Source changes.
   - Docs/plans.
   - Generated/cache/log files.
   - Sensitive paths.
   - Offline/POS production changes.

3. Không sửa code trong sprint này, trừ docs báo cáo nếu được yêu cầu.

**Verification:**

- Có danh sách rõ file nào thuộc nhóm nào.
- Không có source behavior change.

### Sprint 0.5.2 - Smoke/test baseline

**Safe commands trước tiên:**

```bash
node --check app.js
node --check db.js
node --check offlineRuntime.js
node --check offlineStatusUI.js
npm test
```

Nếu `npm test` fail:

- Ghi lỗi thật.
- Không tự chmod hoặc sửa Jest khi chưa biết root cause.
- Chỉ tạo sprint fix test infra riêng sau đó.

### Sprint 0.5.3 - Branch strategy

Đề xuất branch:

```bash
git checkout -b refactor/safe-modularization
```

Chỉ làm khi baseline/status đã được chốt. Không tạo branch mới giữa dirty tree chưa phân loại nếu có nguy cơ lẫn việc đang làm.

---

## PHASE 1: FRONTEND MODULARIZATION - Tách `app.js` an toàn

**Mục tiêu:** Giảm rủi ro bằng cách tách từ pure utilities trước, giữ backward compatibility.

### Loading strategy khuyến nghị

Không chuyển ngay toàn bộ sang ES modules/Vite.

Ưu tiên giai đoạn đầu:

- IIFE/global namespace compatibility pattern.
- `window.XekhoApp = window.XekhoApp || {}`.
- `app.js` vẫn là entry chính trong vài sprint đầu.
- Module mới export qua `window.XekhoApp.*` để không phá inline handlers/global order.

Chỉ chuyển sang `type="module"` hoặc Vite sau khi test/smoke đủ.

### Sprint 1.1 - Extract pure format utils

**Objective:** Tách các helper format ít side-effect nhất.

**Files:**

- Create: `app/utils/format.js`
- Modify: `index.html`
- Modify: `app.js`
- Test/create nếu cần: `scripts/verify-format-utils.js`

**Steps:**

1. Locate exact functions trong `app.js`: `fmt`, `fmtDate`, `fmtDateTime`, `fmtTime` hoặc tương đương.
2. Copy sang `app/utils/format.js` dạng IIFE:

   ```js
   (function (global) {
     const XekhoApp = global.XekhoApp = global.XekhoApp || {};
     XekhoApp.utils = XekhoApp.utils || {};
     XekhoApp.utils.format = {
       fmt,
       fmtDate,
       fmtDateTime,
       fmtTime,
     };
   })(window);
   ```

3. Giữ wrapper compatibility trong `app.js` nếu code cũ gọi global function.
4. Load script mới trước `app.js` trong `index.html`.
5. Run syntax checks.

**Verification:**

```bash
node --check app/utils/format.js
node --check app.js
```

Manual smoke:

- POS page load.
- Check currency/date display không lỗi.

### Sprint 1.2 - Extract HTML/DOM escape helpers

**Objective:** Tách `_escapeHtml` và helper DOM thuần.

**Files:**

- Create: `app/utils/dom.js`
- Modify: `index.html`
- Modify: `app.js`

**Verification:**

```bash
node --check app/utils/dom.js
node --check app.js
```

Manual smoke:

- Render menu/order rows.
- Text có ký tự đặc biệt không làm vỡ HTML.

### Sprint 1.3 - Extract toast/notification UI

**Objective:** Tách UI notification ít ảnh hưởng business logic.

**Files:**

- Create: `app/ui/toast.js`
- Modify: `index.html`
- Modify: `app.js`

**Verification:**

- Trigger thao tác tạo toast thành công/lỗi.
- Không duplicate DOM container.

### Sprint 1.4 - Extract theme helpers

**Files:**

- Create: `app/ui/theme.js`
- Modify: `index.html`
- Modify: `app.js`

**Verification:**

- Toggle/apply theme vẫn giữ localStorage/class đúng.

### Sprint 1.5 - Extract modal helpers

**Files:**

- Create: `app/ui/modal.js`
- Modify: `index.html`
- Modify: `app.js`

**Verification:**

- Open/close modal.
- Mobile Safari tap/click không kẹt overlay.

### Sprint 1.6 - Extract auth/session sau khi UI utils ổn

**Files dự kiến:**

- `app/auth/login.js`
- `app/auth/session.js`
- `app/auth/staff.js`

**Rule:** Auth/session có production risk, phải có manual checklist:

- Login/logout.
- Lock/unlock POS.
- Staff permission checks.
- Idle timer.

### Sprint 1.7 - POS order flow chỉ tách sau cùng

Không tách `pos/orders.js`, `pos/tables.js`, `pos/payments.js` cho tới khi:

- Security phase xong hoặc ít nhất đã contain.
- Baseline test/smoke rõ.
- Utils/UI/auth extraction đã chạy ổn.
- Offline auto sync production behavior được kiểm tra không regression.

POS checklist bắt buộc:

- Open table.
- Add item.
- Change quantity.
- Remove item.
- Update note/meta.
- Close order.
- Cancel order.
- Offline queue/auto sync status không lỗi.

---

## PHASE 2: CLOUD FUNCTIONS MODULARIZATION

**Mục tiêu:** Tách backend mà không đổi public endpoint behavior.

### Preconditions

- Có list exports/functions thực tế từ `functions/index.js`.
- Có test hoặc ít nhất syntax/runtime smoke.
- Không deploy production trong cùng sprint với split lớn.

### Sprint 2.1 - Map exports trước, chưa sửa

**Steps:**

1. Parse `functions/index.js` để liệt kê exported functions.
2. Nhóm theo domain:
   - orders
   - AI/chat/NLP/Vertex
   - media
   - auth/admin
   - scheduled jobs
   - notifications
   - utilities
3. Update `docs/ai-map/CODE_MAP.md` endpoint/API section.

### Sprint 2.2 - Extract pure utilities

**Files dự kiến:**

- `functions/utils/validation.js`
- `functions/utils/firestore.js`
- `functions/utils/http.js`

Rule:

- Không đổi function name/export name.
- `functions/index.js` vẫn re-export/call same handlers.

### Sprint 2.3+ - Extract domain handlers từng nhóm nhỏ

Mỗi sprint chỉ tách 1 nhóm:

- AI/chat.
- Media.
- Orders.
- Scheduled.
- Notifications.

Verification:

```bash
node --check functions/index.js
npm test
```

Deploy chỉ sau khi smoke local và review diff.

---

## PHASE 3: TESTING INFRASTRUCTURE

**Mục tiêu:** Test đáng tin trước khi refactor sâu.

### Sprint 3.1 - Diagnose Jest thật sự

Run:

```bash
npm test -- --runInBand
```

Nếu fail:

- Copy lỗi ngắn vào task log.
- Phân loại: permission, dependency, config, broken tests, environment.
- Không mặc định `chmod +x node_modules/.bin/jest` nếu chưa xác nhận lỗi permission.

### Sprint 3.2 - Add targeted verification scripts

Ưu tiên deterministic Node scripts cho modules đang tách:

- `scripts/verify-format-utils.js`
- `scripts/verify-dom-utils.js`
- Existing offline scripts phải tiếp tục chạy.

### Sprint 3.3 - ESLint chỉ sau khi baseline ổn

Không chạy `eslint --fix` toàn repo ngay vì có thể tạo diff lớn.
Bắt đầu bằng config nhẹ và lint targeted files.

---

## PHASE 4: BUILD TOOLING - Vite sau, không làm sớm

**Mục tiêu:** Có build/dev server hiện đại nhưng không phá Firebase Hosting/POS globals.

Preconditions:

- Frontend đã tách module ổn.
- Global dependency/script order đã map rõ.
- Có smoke checklist.

Steps:

1. Tạo Vite branch/spike riêng.
2. Không thay production entry ngay.
3. Verify Firebase SDK loading, service worker, POS globals, offline modules.
4. Chỉ merge khi build output tương thích hosting.

---

## PHASE 5: TYPESCRIPT MIGRATION - Optional dài hạn

Chỉ làm sau khi:

- Module boundaries rõ.
- Tests đủ cover core flows.
- Build tooling ổn.

Thứ tự nếu làm:

1. `app/utils/*`
2. `offlineSync.js`/adapter types bằng JSDoc trước.
3. `db.js`
4. POS order modules sau cùng.

Có thể bắt đầu bằng JSDoc + `// @ts-check` thay vì rename `.js` -> `.ts` ngay.

---

## PHASE 6: CI/CD

**Mục tiêu:** Tự động check nhưng không deploy nhầm production.

Start simple:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --runInBand
```

Deploy workflow phải là phase riêng, cần secrets GitHub/Firebase cấu hình đúng và review kỹ.

---

## Definition of Done cho mỗi sprint refactor

Mỗi sprint phải có:

- `git status --short` trước và sau.
- Diff chỉ ở file liên quan.
- `node --check` cho file JS touched.
- Test/verify script nếu có.
- Manual checklist nếu ảnh hưởng POS/UI/auth/offline.
- Update `docs/ai-map/CHANGELOG_AI.md`.
- Update `docs/ai-map/TODO_AI.md`.
- Create task log trong `docs/ai-map/TASK_LOGS/`.
- Không stage secret/cache/generated file ngoài scope.

---

## Commands cấm / cần xác nhận rõ

Không chạy nếu chưa có xác nhận riêng:

```bash
git reset --hard
git clean -fd
rm -rf
git push --force
firebase deploy
firebase emulators:start
npm run backfill:history-costs
node import_master.js
node import_migrated_history_purchases.js
```

Không dùng:

```bash
git add -A
```

Trừ khi anh xác nhận toàn bộ working tree an toàn.

---

## Roadmap thực tế đề xuất

1. **Sprint A:** Security inventory + `.gitignore` proposal, không đọc secret.
2. **Sprint B:** Sau xác nhận, untrack sensitive files và rotate key thủ công.
3. **Sprint C:** Baseline dirty-tree report + safe smoke/test.
4. **Sprint D:** Extract format utils bằng IIFE compatibility.
5. **Sprint E:** Extract DOM helpers.
6. **Sprint F:** Extract toast/theme/modal.
7. **Sprint G:** Map Cloud Functions exports, chưa sửa behavior.
8. **Sprint H:** Extract backend pure utils.
9. **Sprint I+:** POS/auth/order split từng nhóm nhỏ sau khi tests/smoke ổn.

---

## Ghi chú cho người implement

- Đọc `docs/ai-map/PROJECT_OVERVIEW.md`, `CODE_MAP.md`, `TODO_AI.md` trước khi làm.
- Với POS offline backup, giữ pattern sprint an toàn: queue/sync/runtime/status đã có, không wrap live order flow lại nếu không cần.
- Nếu task chỉ là audit/check thì không update task log.
- Nếu task sửa code/docs thì luôn update AI map.
- Nếu nghi ngờ file chứa secret: không mở nội dung, chỉ xử lý path-level theo xác nhận.
