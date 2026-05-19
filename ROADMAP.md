# 🗺️ ROADMAP - XE KHÔ CHỮA LÀNH
## Hoàn thiện phần còn lại (đã audit lại tiến độ thực tế)

**Version:** 1.0  
**Created:** 17/05/2026  
**Status:** 🟢 Active  
**Current Progress:** 95% Complete

---

## 📊 EXECUTIVE SUMMARY

### Tình trạng hiện tại:
- ✅ **POS Core System**: 95% - Production Ready
- 🟢 **Chief of Staff Tab**: 92% - Core Done, Facebook/Weather/BigQuery/realtime đã nối, còn polish UI
- 🟡 **Marketing AI Tab**: 93% - Luồng Telegram/approve đã siết lại, mobile navigator + skeleton loading + responsive breakpoint fixes đã lên live, listener nặng đã scope theo tab, còn cross-browser/accessibility/perf tests
- ✅ **Backend/Cloud Functions**: 92% - Đầy đủ tính năng chính, còn test coverage + hardening
- 🟡 **Testing & Deployment**: 74% - Smoke test chính đã có, hosting deploy liên tục ổn định, đã QA shell responsive ngoài live và verify bundle mới sau deploy, còn test coverage sâu

### Mục tiêu:
Hoàn thiện **15% còn lại** trong **4-6 tuần** để đạt **100% Production Ready**

### Timeline:
```
Week 1-2: Quick Wins & Critical Fixes     [Target: 85%]
Week 3-4: Feature Completion              [Target: 95%]
Week 5-6: Testing & Polish                [Target: 100%]
```

---

## 🎯 PHASE 1: QUICK WINS & CRITICAL FIXES
**Timeline:** Week 1-2  
**Target:** 78% → 85%

### Sprint 1.1: Rút gọn báo cáo Marketing ⚡
**Duration:** 2-3 giờ  
**Priority:** 🔴 Critical  
**Assignee:** TBD

#### Mục tiêu:
Giảm báo cáo Telegram từ 50-80 dòng → 15-20 dòng để dễ đọc trên mobile

#### Tasks:
- [x] **Task 1.1.1**: Sửa `buildDirectorBriefWeatherSection()`
  - File: `webapp-menu/functions/index.js` (dòng 9829-9864)
  - Rút từ 8 khung giờ → 2-3 khung quan trọng nhất
  - Format: 1 dòng tổng quan + 1 dòng cảnh báo
  - Estimate: 1h

- [x] **Task 1.1.2**: Sửa `compactDirectorBriefText()`
  - File: `webapp-menu/functions/index.js`
  - Giảm `maxChars` từ 420 → 300
  - Giảm `maxLines` từ 4 → 3
  - Estimate: 30min

- [x] **Task 1.1.3**: Cấu hình AI prompt
  - Thêm instruction: "Viết ngắn gọn 3-5 điểm, mỗi điểm 1 dòng"
  - Test với `testDirectorBrief` function
  - Estimate: 1h

#### Acceptance Criteria:
- ✅ Báo cáo Telegram ≤ 20 dòng
- ✅ Vẫn đủ thông tin để ra quyết định
- ✅ Format đẹp trên mobile (375px width)
- ✅ Test với 5 scenarios khác nhau

#### Deliverable:
Báo cáo Telegram ngắn gọn, dễ đọc, đủ dữ liệu

---

### Sprint 1.2: Facebook Sync Implementation 🔵
**Duration:** 1 ngày  
**Priority:** 🔴 High  
**Assignee:** TBD

#### Mục tiêu:
Hoàn thiện tích hợp Facebook Metrics cho Chief of Staff Tab

#### Tasks:
- [x] **Task 1.2.1**: Implement `syncFacebookData` Cloud Function
  - File: `webapp-menu/functions/index.js`
  - Fetch metrics: followers, engagement, page visits
  - Cache vào Firestore `facebook_cache` collection
  - Calculate changes (vs yesterday)
  - Estimate: 3h

- [x] **Task 1.2.2**: Tích hợp vào `scheduledChiefOfStaff`
  - Gọi Facebook API trong Chief analysis
  - Lưu metrics vào `executive_daily_briefs.facebook`
  - Handle API errors gracefully
  - Estimate: 2h

- [x] **Task 1.2.3**: Update ChiefOfStaffTab.tsx UI
  - File: `webapp-menu/src/features/admin/components/ChiefOfStaffTab.tsx`
  - Hiển thị Facebook metrics với progress bars
  - Add "Sync Now" button
  - Show last sync timestamp
  - Estimate: 2h

- [x] **Task 1.2.4**: Testing
  - Test với Facebook Page thật
  - Test error handling (invalid token, rate limit)
  - Estimate: 1h

#### Acceptance Criteria:
- ✅ Facebook metrics hiển thị chính xác
- ✅ Sync tự động mỗi ngày 9:00 AM
- ✅ Manual sync button hoạt động
- ✅ Error handling đầy đủ

#### Deliverable:
Chief of Staff hiển thị Facebook metrics realtime

---

### Sprint 1.3: Weather API Integration 🌤️
**Duration:** 4 giờ  
**Priority:** 🟡 Medium  
**Assignee:** TBD

#### Mục tiêu:
Tích hợp thời tiết vào Chief analysis để AI đưa ra insights

#### Tasks:
- [x] **Task 1.3.1**: Sửa `gatherChiefData()` function
  - File: `webapp-menu/functions/index.js`
  - Fetch weather từ OpenWeatherMap API
  - Parse và format dữ liệu (temp, description, forecast)
  - Estimate: 2h

- [x] **Task 1.3.2**: Update AI prompt trong `generateChiefBrief()`
  - Thêm weather context vào prompt
  - AI phân tích impact của thời tiết lên business
  - Example: "Mưa → gợi ý giao ship, combo tiết kiệm"
  - Estimate: 1.5h

- [x] **Task 1.3.3**: Testing
  - Test với nhiều điều kiện thời tiết khác nhau
  - Verify AI insights có ý nghĩa
  - Estimate: 30min

#### Acceptance Criteria:
- ✅ Weather data chính xác
- ✅ AI insights liên quan đến thời tiết
- ✅ Cache weather data 1 giờ (tránh spam API)

#### Deliverable:
Chief Brief có insights về thời tiết

---

## 🎯 PHASE 2: FEATURE COMPLETION
**Timeline:** Week 3-4  
**Target:** 85% → 95%

### Sprint 2.1: BigQuery Analytics Integration 📊
**Duration:** 2 ngày  
**Priority:** 🟡 Medium  
**Assignee:** TBD

#### Mục tiêu:
Query dữ liệu từ BigQuery cho Chief analysis để có insights sâu hơn

#### Tasks:
- [x] **Task 2.1.1**: Tạo BigQuery queries
  - Daily revenue trends (7 days, 30 days)
  - Top products by revenue
  - Customer behavior patterns
  - Order frequency analysis
  - Estimate: 4h

- [x] **Task 2.1.2**: Implement `queryBigQueryForChief()` function
  - File: `webapp-menu/functions/index.js`
  - Connect to BigQuery client
  - Execute queries và cache results (24h)
  - Handle query errors
  - Estimate: 3h

- [x] **Task 2.1.3**: Tích hợp vào Chief Score calculation
  - Thêm BigQuery metrics vào scoring algorithm
  - Weight: 10-15 points
  - Update `calculateChiefScore()` function
  - Estimate: 2h

- [x] **Task 2.1.4**: Testing
  - Test với BigQuery dataset thật
  - Verify query performance (< 5s)
  - Test caching mechanism
  - Estimate: 2h

#### Acceptance Criteria:
- ✅ BigQuery queries chạy thành công
- ✅ Data được cache 24h
- ✅ Chief Score tính đúng với BigQuery metrics
- ✅ Query time < 5s

#### Deliverable:
Chief Score dựa trên dữ liệu BigQuery

---

### Sprint 2.2: Mobile UI Polish 📱
**Duration:** 3 ngày  
**Priority:** 🔴 High  
**Assignee:** TBD

#### Mục tiêu:
Redesign Marketing AI Tab theo style Chief Tab (mobile-first)

#### Tasks:
- [ ] **Task 2.2.1**: Redesign 8 tabs của Marketing AI
  - Files: `webapp-menu/src/features/admin/components/*.tsx`
  - Apply Tailwind classes như ChiefOfStaffTab
  - Mobile-first approach (375px → 1920px)
  - Sticky header navigation
  - Estimate: 12h

- [x] **Task 2.2.2**: Optimize responsive breakpoints
  - Test trên iPhone SE (375px)
  - Test trên iPhone 14 Pro (393px)
  - Test trên iPad (768px)
  - Test trên Desktop (1920px)
  - Fix text overflow, layout shifts
  - Estimate: 4h

- [x] **Task 2.2.3**: Add loading states & skeletons
  - Skeleton screens cho slow API calls
  - Progress indicators
  - Smooth transitions
  - Estimate: 3h

- [ ] **Task 2.2.4**: Testing
  - Cross-browser testing (Chrome, Safari, Firefox)
  - Accessibility testing (ARIA labels, keyboard nav)
  - Performance testing (Lighthouse score > 90)
  - Estimate: 3h

#### Acceptance Criteria:
- ✅ Mobile responsive (375px - 1920px)
- ✅ No text/layout overflow
- ✅ Lighthouse score > 90
- ✅ Accessibility score > 90

#### Deliverable:
Marketing AI Tab đẹp và responsive như Chief Tab

---

### Sprint 2.3: Real-time Updates ⚡
**Duration:** 1 ngày  
**Priority:** 🟡 Medium  
**Assignee:** TBD

#### Mục tiêu:
Add Firestore listeners cho live updates (không cần refresh page)

#### Tasks:
- [x] **Task 2.3.1**: Add listeners trong ChiefOfStaffTab
  - File: `webapp-menu/src/features/admin/components/ChiefOfStaffTab.tsx`
  - Listen to `executive_daily_briefs` changes
  - Listen to `executive_alerts` changes
  - Auto-refresh UI khi có update
  - Estimate: 3h

- [x] **Task 2.3.2**: Add listeners trong Marketing AI tabs
  - Listen to `director_briefs` changes
  - Listen to `marketing_actions` changes
  - Listen to `marketing_evaluations` changes
  - Estimate: 3h

- [x] **Task 2.3.3**: Optimize listener performance
  - Debounce updates (avoid spam)
  - Unsubscribe on unmount
  - Handle connection errors
  - Estimate: 2h

#### Acceptance Criteria:
- ✅ UI tự động cập nhật khi có dữ liệu mới
- ✅ No memory leaks
- ✅ Smooth animations

#### Deliverable:
UI tự động cập nhật realtime

---

## 🎯 PHASE 3: TESTING & POLISH
**Timeline:** Week 5-6  
**Target:** 95% → 100%

### Sprint 3.1: Unit Tests 🧪
**Duration:** 3 ngày  
**Priority:** 🔴 Critical  
**Assignee:** TBD

#### Mục tiêu:
80% test coverage cho critical functions

#### Tasks:
- [ ] **Task 3.1.1**: Setup testing framework
  - Install Jest, @testing-library/react
  - Setup Firebase Emulator Suite
  - Configure test environment
  - Estimate: 2h

- [ ] **Task 3.1.2**: Viết unit tests cho Cloud Functions
  - `calculateChiefScore()` - 10 test cases
  - `generateChiefBrief()` - 5 test cases (mock AI)
  - `buildDirectorBriefWeatherSection()` - 8 test cases
  - `compactDirectorBriefText()` - 5 test cases
  - `syncFacebookData()` - 6 test cases (mock API)
  - Estimate: 12h

- [ ] **Task 3.1.3**: Viết unit tests cho React components
  - ChiefOfStaffTab.tsx - 8 test cases
  - Marketing AI tabs - 10 test cases
  - Estimate: 8h

- [ ] **Task 3.1.4**: Setup CI/CD
  - GitHub Actions workflow
  - Auto-run tests on PR
  - Block merge if tests fail
  - Estimate: 2h

#### Acceptance Criteria:
- ✅ 80% test coverage
- ✅ All tests passing
- ✅ CI/CD pipeline working

#### Deliverable:
80% test coverage, CI/CD pipeline

---

### Sprint 3.2: E2E Tests 🎭
**Duration:** 2 ngày  
**Priority:** 🟡 High  
**Assignee:** TBD

#### Mục tiêu:
Test user workflows end-to-end

#### Tasks:
- [ ] **Task 3.2.1**: Setup Playwright
  - Install Playwright
  - Configure test environment
  - Setup test data
  - Estimate: 2h

- [ ] **Task 3.2.2**: Viết E2E test scenarios
  - **Chief of Staff**: Load dashboard → View brief → Set goal → Generate plan
  - **Marketing AI**: Create brief → Approve → Publish → View stats
  - **POS**: Create order → Add items → Pay → Complete
  - Estimate: 10h

- [ ] **Task 3.2.3**: Run E2E tests nightly
  - Schedule in GitHub Actions
  - Send alerts on failures (Telegram/Email)
  - Estimate: 2h

#### Acceptance Criteria:
- ✅ 10+ E2E test scenarios passing
- ✅ Tests run nightly
- ✅ Alerts working

#### Deliverable:
10+ E2E test scenarios passing

---

### Sprint 3.3: Performance Optimization ⚡
**Duration:** 2 ngày  
**Priority:** 🟡 Medium  
**Assignee:** TBD

#### Mục tiêu:
Load time < 2s, optimize AI costs

#### Tasks:
- [ ] **Task 3.3.1**: Frontend optimization
  - Code splitting (React.lazy)
  - Lazy loading components
  - Image optimization (WebP, lazy load)
  - Cache API responses (24h)
  - Estimate: 6h

- [ ] **Task 3.3.2**: Backend optimization
  - Reduce AI API calls (cache results 24h)
  - Batch Firestore reads/writes
  - Optimize Cloud Function cold starts (min instances)
  - Estimate: 4h

- [ ] **Task 3.3.3**: Cost optimization
  - Monitor Vertex AI usage (BigQuery logs)
  - Switch to cheaper models where possible (Flash vs Pro)
  - Implement rate limiting (max 100 requests/day/user)
  - Estimate: 3h

- [ ] **Task 3.3.4**: Performance testing
  - Lighthouse audit (target > 90)
  - Load testing (100 concurrent users)
  - Monitor Cloud Function metrics
  - Estimate: 3h

#### Acceptance Criteria:
- ✅ Load time < 2s
- ✅ Lighthouse score > 90
- ✅ AI cost giảm 30%
- ✅ Handle 100 concurrent users

#### Deliverable:
Load time < 2s, AI cost giảm 30%

---

### Sprint 3.4: Security Audit 🔒
**Duration:** 1 ngày  
**Priority:** 🔴 Critical  
**Assignee:** TBD

#### Mục tiêu:
Đảm bảo security best practices

#### Tasks:
- [ ] **Task 3.4.1**: Review Firestore Security Rules
  - Test với Firebase Emulator
  - Fix any vulnerabilities
  - Add rate limiting rules
  - Estimate: 3h

- [ ] **Task 3.4.2**: Review Cloud Functions
  - Validate all inputs (sanitize, escape)
  - Add rate limiting (max 100 req/min)
  - Sanitize user data before AI calls
  - Estimate: 3h

- [ ] **Task 3.4.3**: Review API keys & secrets
  - Rotate sensitive keys
  - Use Firebase Secret Manager (not .env)
  - Remove hardcoded credentials
  - Audit git history for leaked secrets
  - Estimate: 2h

#### Acceptance Criteria:
- ✅ No security vulnerabilities
- ✅ All secrets in Secret Manager
- ✅ Rate limiting working
- ✅ Input validation đầy đủ

#### Deliverable:
Security audit report, fixes applied

---

## 📊 TRACKING & METRICS

### Definition of Done (DoD):
Mỗi Sprint phải đạt:
- ✅ Code reviewed & merged to `main`
- ✅ Tests passing (unit + E2E)
- ✅ Documentation updated
- ✅ Deployed to staging
- ✅ QA approved

### Weekly Progress Review:
- **Monday 9:00 AM**: Sprint planning
- **Wednesday 3:00 PM**: Mid-sprint check-in
- **Friday 5:00 PM**: Sprint demo & retrospective

### Success Metrics:
| Week | Target % | Key Deliverables |
|------|----------|------------------|
| Week 2 | 85% | Marketing report rút gọn, Facebook sync, Weather API |
| Week 4 | 95% | BigQuery integration, Mobile UI polish, Real-time updates |
| Week 6 | 100% | 80% test coverage, E2E tests, Performance optimized, Security audit |

### Progress Tracking:
```
Phase 1: Quick Wins & Critical Fixes
├── [x] Sprint 1.1: Rút gọn báo cáo Marketing (3/3 tasks)
├── [x] Sprint 1.2: Facebook Sync (4/4 tasks)
└── [x] Sprint 1.3: Weather API (3/3 tasks)

Phase 2: Feature Completion
├── [x] Sprint 2.1: BigQuery Analytics (4/4 tasks)
├── [~] Sprint 2.2: Mobile UI Polish (2/4 tasks)
└── [x] Sprint 2.3: Real-time Updates (3/3 tasks)

Phase 3: Testing & Polish
├── [ ] Sprint 3.1: Unit Tests (0/4 tasks)
├── [ ] Sprint 3.2: E2E Tests (0/3 tasks)
├── [ ] Sprint 3.3: Performance Optimization (0/4 tasks)
└── [ ] Sprint 3.4: Security Audit (0/3 tasks)

Total: 19/35 tasks completed (54%)
```

---

## 🚀 DEPLOYMENT STRATEGY

### Staging Environment:
- Deploy sau mỗi sprint
- QA testing 2-3 ngày
- Collect feedback từ internal users

### Production Rollout:
```
Week 6: Deploy Phase 1 (Quick Wins)
├── Gradual rollout: 10% users
├── Monitor errors, performance
└── Rollback plan ready

Week 7: Deploy Phase 2 (Features)
├── Gradual rollout: 50% users
├── A/B testing new UI
└── Collect user feedback

Week 8: Deploy Phase 3 (Polish)
├── Gradual rollout: 100% users
├── Final performance tuning
└── Celebrate! 🎉
```

### Rollback Plan:
- Keep previous version deployed
- Feature flags for new features
- Database migrations reversible
- Monitoring alerts (Sentry, Firebase Crashlytics)

---

## 📚 RELATED DOCUMENTS

- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Chi tiết technical implementation
- [CHIEF_OF_STAFF_FULL_IMPLEMENTATION_PLAN.md](./CHIEF_OF_STAFF_FULL_IMPLEMENTATION_PLAN.md) - Chief of Staff detailed plan
- [CHIEF_MARKETING_UI_ASSESSMENT.md](../webapp-menu/CHIEF_MARKETING_UI_ASSESSMENT.md) - Marketing AI UI assessment
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - Testing checklist
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment guide

---

## 🎯 NEXT ACTIONS

### Immediate (This Week):
1. ✅ Review và approve roadmap này
2. 🔄 Assign tasks cho team members
3. 🚀 Bắt đầu Sprint 1.1 (Rút gọn báo cáo Marketing)

### Short-term (Next 2 Weeks):
1. Complete Phase 1 (Quick Wins)
2. Setup testing framework
3. Deploy to staging

### Long-term (Next 6 Weeks):
1. Complete all 3 phases
2. Achieve 100% completion
3. Production deployment
4. Celebrate success! 🎉

---

**Last Updated:** 17/05/2026  
**Maintained By:** Development Team  
**Status:** 🟢 Active & In Progress
