# Testing Checklist - Xe Khô Chữa Lành POS & KDS

Checklist đầy đủ để test hệ thống POS và Kitchen Display trước khi đưa vào production.

## 📋 Test Environment Setup

### Prerequisites
- [ ] Firebase project configured
- [ ] Test users created (admin, staff, kitchen)
- [ ] Test data populated (products, tables)
- [ ] Telegram bot configured
- [ ] FCM enabled
- [ ] Browser notifications allowed

### Test Accounts
```
Admin:
- Email: admin@xekho.com
- Role: admin

Staff:
- Email: staff@xekho.com
- Role: staff

Kitchen:
- Email: kitchen@xekho.com
- Role: kitchen
```

---

## 🔐 1. Authentication & Authorization

### Login/Logout
- [ ] **Login với email/password hợp lệ** → Success
- [ ] **Login với email/password sai** → Error message
- [ ] **Login với email không tồn tại** → Error message
- [ ] **Logout** → Redirect to login page
- [ ] **Session persistence** → Refresh page vẫn đăng nhập
- [ ] **Auto-redirect** → Chưa login → redirect to login

### Role-Based Access
- [ ] **Admin** → Access POS, Kitchen, Admin settings
- [ ] **Staff** → Access POS only
- [ ] **Kitchen** → Access Kitchen display only
- [ ] **Staff try access /kitchen** → Redirect or error
- [ ] **Kitchen try access POS** → Redirect or error

---

## 🍽 2. POS - Order Management

### Table Management
- [ ] **View all tables** → Display correctly
- [ ] **Table status colors** → Available (green), Occupied (red)
- [ ] **Click table** → Open order modal
- [ ] **Create new order** → Order created in Firestore
- [ ] **View existing order** → Load items correctly

### Order Items
- [ ] **Add item to order** → Item appears in list
- [ ] **Add multiple items** → All items displayed
- [ ] **Update quantity** → Price recalculated
- [ ] **Remove item** → Item removed from list
- [ ] **Add note to item** → Note saved and displayed
- [ ] **Calculate total** → Correct sum

### Order Actions
- [ ] **Save order** → Saved to Firestore
- [ ] **Update order** → Changes reflected in Firestore
- [ ] **Send to kitchen** → kitchen_notification created
- [ ] **Payment** → Order status = 'paid', table freed
- [ ] **Cancel order** → Order status = 'cancelled'

### Kitchen Status Display (on POS)
- [ ] **Item status colors** → pending, received, cooking, ready, served
- [ ] **Kitchen badge** → Shows unread notification count
- [ ] **Kitchen notification toast** → Appears when kitchen updates
- [ ] **Click kitchen badge** → Opens kitchen notifications

---

## 🖥 3. Kitchen Display System

### Display & UI
- [ ] **Login as kitchen** → Access granted
- [ ] **View active orders** → Only open orders displayed
- [ ] **Order cards** → Show table, items, time
- [ ] **Urgency colors** → Green → Yellow → Orange → Red
- [ ] **Time elapsed** → Updates every minute
- [ ] **Responsive layout** → Works on tablet/desktop

### Order Reception
- [ ] **New order appears** → Realtime update
- [ ] **Click "Nhận tất cả"** → All items status = 'received'
- [ ] **Click "Nhận" on single item** → Item status = 'received'
- [ ] **Status update** → Reflected in Firestore immediately
- [ ] **POS receives update** → Badge/notification updated

### Order Completion
- [ ] **Click "Xong tất cả"** → All items status = 'ready'
- [ ] **Click "Xong" on single item** → Item status = 'ready'
- [ ] **POS notification** → Toast appears on POS
- [ ] **Click "Đã mang ra"** → Item status = 'served'
- [ ] **Order disappears** → When all items served or table paid

### Delay Notification
- [ ] **Click "Báo chậm"** → Notification sent
- [ ] **POS receives delay notification** → Toast displayed
- [ ] **Telegram notification** → Message sent to group
- [ ] **FCM notification** → Push sent to admin/staff

---

## 🔔 4. Notification System

### Telegram Notifications
- [ ] **New order** → Telegram message sent to kitchen group
- [ ] **Message format** → Table name, items, time
- [ ] **Message delivery** → Within 5 seconds
- [ ] **Error handling** → Logged if Telegram fails
- [ ] **No duplicate messages** → telegramSent flag works

### FCM Web Push
- [ ] **Browser permission** → Prompt appears on first visit
- [ ] **Token registration** → Saved to user.fcmTokens array
- [ ] **Foreground notification** → Toast appears when app open
- [ ] **Background notification** → System notification when app closed
- [ ] **Notification click** → Opens app/kitchen page
- [ ] **Multiple devices** → All devices receive notification
- [ ] **Invalid token cleanup** → Removed from array on error

### Zalo OA (Planned - Not Production Ready)
- [ ] **⚠️ SKIP** → Zalo integration chưa implement API call
- [ ] **Config exists** → ZALO_OA_ACCESS_TOKEN, ZALO_GROUP_ID
- [ ] **Flag tracking** → zaloSent flag in notifications
- [ ] **TODO** → Implement sendZaloMessage() function

---

## 🔥 5. Firestore Operations

### Data Integrity
- [ ] **Create order** → All fields correct
- [ ] **Update order** → Only changed fields updated
- [ ] **Delete order** → Soft delete (status = 'cancelled')
- [ ] **Concurrent updates** → No data loss
- [ ] **Timestamps** → createdAt, updatedAt correct

### Realtime Listeners
- [ ] **POS listens to orders** → Updates realtime
- [ ] **Kitchen listens to orders** → Updates realtime
- [ ] **POS listens to kitchen_notifications** → Updates realtime
- [ ] **Listener cleanup** → Unsubscribe on logout/unmount
- [ ] **Reconnection** → Auto-reconnect after network loss

### Security Rules
- [ ] **Admin** → Can read/write all collections
- [ ] **Staff** → Can read/write orders, tables
- [ ] **Kitchen** → Can read orders, update kitchen status
- [ ] **Kitchen** → Can read/write kitchen_notifications
- [ ] **Unauthenticated** → Cannot access any data
- [ ] **User A** → Cannot access User B's data

---

## 🤖 6. AI Chatbot (Vertex AI)

### Text Input
- [ ] **Ask question** → AI responds
- [ ] **Query revenue** → Correct data returned
- [ ] **Query inventory** → Correct data returned
- [ ] **Invalid query** → Graceful error message
- [ ] **Response time** → < 5 seconds

### Image Input
- [ ] **Upload image** → AI analyzes
- [ ] **OCR receipt** → Extracts text correctly
- [ ] **Generate menu image** → Image created
- [ ] **Invalid image** → Error handled

### Voice Input
- [ ] **Record voice** → Transcribed correctly
- [ ] **Vietnamese language** → Understood
- [ ] **Execute command** → Tool called correctly

---

## 📱 7. Mobile & Responsive

### POS on Mobile
- [ ] **Layout** → Responsive, usable
- [ ] **Touch targets** → Large enough (44px+)
- [ ] **Scrolling** → Smooth
- [ ] **Modals** → Full screen on mobile

### Kitchen Display on Tablet
- [ ] **Landscape mode** → Optimal layout
- [ ] **Portrait mode** → Still usable
- [ ] **Touch gestures** → Swipe, tap work
- [ ] **Font size** → Readable from distance

### PWA (Progressive Web App)
- [ ] **Add to Home Screen** → Works on iOS/Android
- [ ] **App icon** → Displays correctly
- [ ] **Splash screen** → Shows on launch
- [ ] **Offline fallback** → Basic UI works offline

---

## 🌐 8. Network & Performance

### Offline Handling
- [ ] **Disconnect network** → UI shows offline indicator
- [ ] **Reconnect** → Auto-sync data
- [ ] **Pending writes** → Queued and sent on reconnect
- [ ] **Error messages** → Clear, actionable

### Performance
- [ ] **Initial load** → < 3 seconds
- [ ] **Order creation** → < 1 second
- [ ] **Realtime update** → < 500ms latency
- [ ] **Large order list** → No lag (100+ orders)
- [ ] **Memory usage** → No leaks after 1 hour use

### Caching
- [ ] **Service Worker** → Caches static assets
- [ ] **Firestore cache** → Offline data available
- [ ] **Image caching** → Product images cached

---

## 🔒 9. Security Testing

### Input Validation
- [ ] **SQL injection** → N/A (NoSQL)
- [ ] **XSS** → User input sanitized
- [ ] **CSRF** → Firebase handles
- [ ] **Invalid data types** → Rejected
- [ ] **Negative quantities** → Rejected
- [ ] **Empty required fields** → Validation error

### Authentication
- [ ] **Token expiration** → Auto-refresh or re-login
- [ ] **Stolen token** → Cannot access from different IP (optional)
- [ ] **Brute force** → Rate limiting (Firebase handles)

### Authorization
- [ ] **Privilege escalation** → Cannot change own role
- [ ] **Direct Firestore access** → Rules block unauthorized
- [ ] **Functions auth** → Verify token on sensitive endpoints

---

## 🚨 10. Error Handling

### User Errors
- [ ] **Invalid input** → Clear error message
- [ ] **Network error** → Retry option
- [ ] **Permission denied** → Redirect to login
- [ ] **Not found** → 404 page

### System Errors
- [ ] **Firestore error** → Logged, user notified
- [ ] **Function error** → Logged, graceful fallback
- [ ] **AI error** → Fallback message
- [ ] **Notification error** → Logged, doesn't block order

### Logging
- [ ] **Client errors** → Logged to console (dev only)
- [ ] **Server errors** → Logged to Firebase Functions logs
- [ ] **Critical errors** → Alert sent to admin

---

## 🔄 11. Edge Cases & Race Conditions

### Concurrent Updates
- [ ] **Two staff update same order** → Last write wins (acceptable)
- [ ] **Kitchen updates while staff updates** → Both changes saved
- [ ] **Multiple kitchen devices** → All see same state
- [ ] **Order paid while kitchen updates** → Kitchen update ignored

### Timing Issues
- [ ] **Order deleted while kitchen viewing** → Graceful removal
- [ ] **Table freed while order open** → Order still accessible
- [ ] **User logged out while action pending** → Action cancelled

### Data Consistency
- [ ] **Orphaned notifications** → Cleaned up after 24h
- [ ] **Invalid references** → Handled gracefully
- [ ] **Missing fields** → Default values used

---

## 📊 12. Monitoring & Analytics

### Firebase Console
- [ ] **Firestore usage** → Within limits
- [ ] **Functions invocations** → No excessive calls
- [ ] **Hosting bandwidth** → Normal
- [ ] **Auth users** → Correct count

### Error Tracking
- [ ] **Functions errors** → Logged and visible
- [ ] **Client errors** → Reported (if tracking enabled)
- [ ] **Performance issues** → Identified

---

## ✅ 13. Pre-Production Final Checks

### Code Quality
- [ ] **No console.log in production** → Removed or conditional
- [ ] **No hardcoded secrets** → All in env/secrets
- [ ] **Error handling** → All async operations wrapped
- [ ] **Code comments** → Critical sections documented

### Configuration
- [ ] **Firebase config** → Production values
- [ ] **Environment variables** → All set
- [ ] **Secrets** → All configured
- [ ] **API keys** → Valid and not expired

### Documentation
- [ ] **README.md** → Complete and accurate
- [ ] **KITCHEN_GUIDE.md** → Reviewed by kitchen staff
- [ ] **DEPLOYMENT_GUIDE.md** → Tested by following steps
- [ ] **API docs** → Endpoints documented

### Backup & Rollback
- [ ] **Firestore backup** → Enabled
- [ ] **Code in Git** → Latest version pushed
- [ ] **Rollback plan** → Documented and tested
- [ ] **Emergency contacts** → Listed

---

## 🎯 Test Scenarios (End-to-End)

### Scenario 1: Happy Path
```
1. Staff login
2. Select table 1
3. Add 2 items (Phở, Cà phê)
4. Add note "Ít cay"
5. Send to kitchen
6. Kitchen login
7. See order appear
8. Click "Nhận tất cả"
9. Wait 5 minutes
10. Click "Xong tất cả"
11. POS sees notification
12. Staff marks "Đã mang ra"
13. Customer pays
14. Table freed

✅ Expected: All steps work smoothly
```

### Scenario 2: Delay Notification
```
1. Staff orders 3 items
2. Kitchen receives
3. Kitchen realizes delay
4. Click "Báo chậm" on 1 item
5. POS receives notification
6. Staff informs customer
7. Kitchen completes item
8. Mark "Xong"

✅ Expected: Delay notification sent, no errors
```

### Scenario 3: Concurrent Updates
```
1. Staff A opens order for table 1
2. Staff B opens same order
3. Staff A adds item X
4. Staff B adds item Y
5. Both save

✅ Expected: Both items saved, no data loss
```

### Scenario 4: Network Interruption
```
1. Kitchen viewing orders
2. Disconnect WiFi
3. Staff creates new order
4. Reconnect WiFi
5. Kitchen sees new order

✅ Expected: Auto-sync, no manual refresh needed
```

### Scenario 5: Multiple Devices
```
1. Kitchen device A and B both logged in
2. Staff sends order
3. Both devices receive notification
4. Device A clicks "Nhận"
5. Device B sees status update

✅ Expected: Realtime sync across devices
```

---

## 📝 Test Results Template

```markdown
## Test Session: [Date]
**Tester**: [Name]
**Environment**: [Production/Staging/Local]
**Browser**: [Chrome/Safari/Edge]
**Device**: [Desktop/Tablet/Mobile]

### Results Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

### Failed Tests
1. [Test Name]
   - Expected: [...]
   - Actual: [...]
   - Steps to reproduce: [...]
   - Priority: High/Medium/Low

### Notes
- [Any observations]
- [Performance issues]
- [Suggestions]

### Sign-off
- [ ] All critical tests passed
- [ ] No blocking issues
- [ ] Ready for production
```

---

## 🚀 Production Readiness Criteria

### Must Have (Blocking)
- [ ] ✅ All authentication tests passed
- [ ] ✅ All POS order management tests passed
- [ ] ✅ All kitchen display tests passed
- [ ] ✅ Telegram notifications working
- [ ] ✅ FCM notifications working
- [ ] ✅ Security rules tested and verified
- [ ] ✅ No critical bugs

### Should Have (Non-blocking)
- [ ] ✅ All edge cases tested
- [ ] ✅ Performance benchmarks met
- [ ] ✅ Mobile responsive tested
- [ ] ✅ Error handling verified
- [ ] ✅ Documentation complete

### Nice to Have (Future)
- [ ] ⚠️ Zalo integration (not implemented yet)
- [ ] ⚠️ Advanced analytics
- [ ] ⚠️ A/B testing
- [ ] ⚠️ Load testing (1000+ concurrent users)

---

**Version**: 1.0  
**Last Updated**: 2026-05-05  
**Status**: Ready for testing
