# Xe Khô Chữa Lành - POS & Kitchen Display System

> Warning
> `xekho` functions are currently aligned with cloud, but this repo still overlaps with `webapp-menu` in some feature areas.
> Read `TECH_AUDIT.md` before changing deploy ownership or consolidating features across repos.

Hệ thống quản lý bán hàng (POS) và màn hình bếp (KDS) cho quán ăn Xe Khô Chữa Lành, được xây dựng trên nền tảng Firebase.

## 🎯 Tính năng chính

### POS (Point of Sale)
- ✅ Quản lý bàn và đơn hàng realtime
- ✅ Gọi món, chỉnh sửa, thanh toán
- ✅ Tích hợp AI chatbot (Vertex AI)
- ✅ Quản lý kho, nhập hàng, báo cáo doanh thu
- ✅ Hỗ trợ nhiều role: admin, staff, kitchen
- ✅ Notification realtime từ bếp

### KDS (Kitchen Display System)
- ✅ Màn hình bếp hiển thị đơn hàng realtime
- ✅ Cập nhật trạng thái món: Nhận → Đang làm → Xong → Đã mang ra
- ✅ Báo chậm khi cần thêm thời gian
- ✅ Thông báo đẩy qua Telegram, FCM Web Push
- ✅ Urgency indicator theo thời gian chờ
- ✅ Chỉ hiển thị món của bàn đang mở

## 🛠 Tech Stack

### Frontend
- **Vanilla JavaScript** - No framework, pure JS
- **Firebase SDK v11** - Auth, Firestore, Functions, Messaging
- **CSS3** - Responsive design

### Backend
- **Firebase Firestore** - NoSQL database
- **Firebase Cloud Functions v2** - Serverless backend (Node.js)
- **Firebase Hosting** - Static hosting
- **Firebase Auth** - User authentication

### AI & Integrations
- **Vertex AI** - AI chatbot, OCR, image generation
- **Telegram Bot API** - Kitchen notifications
- **FCM (Firebase Cloud Messaging)** - Web push notifications
- **Zalo OA** - (Planned) Zalo Official Account integration

## 📁 Cấu trúc thư mục

```
xekho/
├── index.html              # POS main UI
├── kitchen.html            # Kitchen Display UI
├── app.js                  # POS application logic
├── db.js                   # Firebase/Firestore wrapper
├── store.js                # State management
├── style.css               # Main styles
├── ai-*.js                 # AI chatbot modules
├── firebase-messaging-sw.js # Service Worker for FCM
├── firestore.rules         # Firestore security rules
├── firebase.json           # Firebase config
├── functions/
│   ├── index.js            # Cloud Functions (triggers, HTTP endpoints)
│   ├── vertexAi.js         # Vertex AI integration
│   ├── geminiTools.js      # Gemini function calling tools
│   └── firestoreMegaTools.js # Firestore utilities
├── KDS_PLAN.md             # Kitchen Display System plan
├── CHATBOT_GUIDE.md        # AI chatbot guide
├── KITCHEN_GUIDE.md        # Kitchen staff guide
├── DEPLOYMENT_GUIDE.md     # Deployment instructions
└── TESTING_CHECKLIST.md    # Testing checklist
```

## 🚀 Setup Local Development

### 1. Prerequisites
- Node.js 20+ (for Firebase Functions)
- Firebase CLI: `npm install -g firebase-tools`
- Git

### 2. Clone & Install
```bash
git clone https://github.com/longnick/xekho.git
cd xekho
npm install

cd functions
npm install
cd ..
```

### 3. Firebase Project Setup
```bash
# Login to Firebase
firebase login

# Select your Firebase project
firebase use --add
# Chọn project: pos-v2-909ff
# Alias: default

# Get Firebase config
# Copy config từ Firebase Console > Project Settings > Your apps
# Paste vào db.js (firebaseConfig object)
```

### 4. Environment Variables

#### Functions Environment (.env file)
Tạo file `functions/.env.pos-v2-909ff`:
```bash
# Vertex AI
VERTEX_PROJECT_ID=pos-v2-909ff
VERTEX_LOCATION=asia-southeast1
VERTEX_TEXT_MODEL=gemini-2.0-flash-exp
VERTEX_IMAGE_MODEL=imagen-3.0-generate-001

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id
KITCHEN_NEW_ORDER_TELEGRAM_CHAT_ID=your_kitchen_chat_id

# Zalo OA (Optional - not yet implemented)
ZALO_OA_ACCESS_TOKEN=your_zalo_token
ZALO_GROUP_ID=your_zalo_group_id

# Service Account
VERTEX_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

#### Firebase Secrets (Production)
```bash
# Set secrets for Cloud Functions
firebase functions:secrets:set VERTEX_SERVICE_ACCOUNT_JSON
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set ZALO_OA_ACCESS_TOKEN
```

### 5. Run Local Emulators
```bash
# Start Firebase emulators
firebase emulators:start

# Access:
# - Hosting: http://localhost:5000
# - Functions: http://localhost:5001
# - Firestore: http://localhost:8080
```

### 6. Run Local Server (Alternative)
```bash
# Simple HTTP server
npm start
# hoặc
node server.js

# Access: http://localhost:3000
```

## 🔧 Firebase Configuration

### Firestore Collections

#### `users`
```javascript
{
  uid: string,
  email: string,
  role: 'admin' | 'staff' | 'kitchen',
  displayName: string,
  fcmTokens: string[],  // FCM device tokens
  pushPermission: string,
  createdAt: timestamp
}
```

#### `tables`
```javascript
{
  id: string,
  name: string,
  status: 'available' | 'occupied' | 'reserved',
  currentOrderId: string | null,
  updatedAt: timestamp
}
```

#### `orders`
```javascript
{
  id: string,
  tableId: string,
  tableName: string,
  items: [{
    id: string,
    name: string,
    price: number,
    qty: number,
    note: string,
    kitchenStatus: 'pending' | 'received' | 'cooking' | 'ready' | 'served',
    kitchenSentAt: timestamp,
    kitchenUpdatedAt: timestamp,
    servedAt: timestamp
  }],
  status: 'open' | 'paid' | 'cancelled',
  total: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `kitchen_notifications`
```javascript
{
  id: string,
  type: 'new_order' | 'ready' | 'delay',
  orderId: string,
  tableId: string,
  tableName: string,
  items: array,
  message: string,
  read: boolean,
  telegramSent: boolean,
  pushSent: boolean,
  zaloSent: boolean,  // Planned
  createdAt: timestamp
}
```

### Firestore Security Rules
Xem file `firestore.rules` để biết chi tiết. Các role:
- **admin**: Full access
- **staff**: Read/write orders, tables
- **kitchen**: Read orders, update kitchen status, read/write kitchen_notifications

## 📦 Deployment

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Cloud Functions
```bash
cd functions
npm run build  # nếu có TypeScript
cd ..
firebase deploy --only functions
```

### 3. Deploy Hosting
```bash
firebase deploy --only hosting
```

### 4. Deploy All
```bash
firebase deploy
```

**Production URLs:**
- POS: https://pos-v2-909ff.web.app
- Kitchen: https://pos-v2-909ff.web.app/kitchen

## 🔔 Notification Workflow

### POS → Kitchen Flow
```
1. Staff gọi món trên POS
   ↓
2. Order được tạo/update trong Firestore
   ↓
3. POS tự động tạo kitchen_notification document
   ↓
4. Cloud Function trigger: onKitchenNotificationCreated
   ↓
5. Gửi notification qua:
   - Telegram Bot (kitchen chat)
   - FCM Push (devices có role kitchen/admin)
   - Zalo OA (planned, chưa implement)
   ↓
6. Kitchen Display nhận realtime update
   ↓
7. Bếp cập nhật trạng thái món
   ↓
8. POS nhận notification realtime
```

### Kitchen Status Flow
```
pending → received → cooking → ready → served
         (Nhận)    (Đang làm) (Xong)  (Đã mang ra)
```

## 🔐 User Roles & Permissions

### Admin
- ✅ Full access to all features
- ✅ User management
- ✅ Settings, reports, inventory
- ✅ Kitchen display access

### Staff
- ✅ Manage tables and orders
- ✅ Call orders, payment
- ✅ View inventory
- ❌ Cannot access admin settings

### Kitchen
- ✅ View kitchen display
- ✅ Update kitchen status
- ✅ Receive notifications
- ❌ Cannot access POS or admin features

## 🧪 Testing

Xem file `TESTING_CHECKLIST.md` để biết chi tiết test cases.

### Quick Test
1. Login as staff → Gọi món
2. Login as kitchen → Xem màn hình bếp
3. Cập nhật trạng thái món
4. Kiểm tra notification trên POS

## 📚 Documentation

- **[KITCHEN_GUIDE.md](./KITCHEN_GUIDE.md)** - Hướng dẫn sử dụng cho nhân viên bếp
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Hướng dẫn deploy chi tiết
- **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** - Checklist test đầy đủ
- **[KDS_PLAN.md](./KDS_PLAN.md)** - Kitchen Display System plan (978 dòng)
- **[CHATBOT_GUIDE.md](./CHATBOT_GUIDE.md)** - AI chatbot guide

## 🐛 Troubleshooting

### Kitchen không nhận notification
1. Kiểm tra user role = 'kitchen' hoặc 'admin'
2. Kiểm tra FCM token đã được register
3. Kiểm tra browser notification permission
4. Xem logs trong Firebase Console > Functions

### POS không cập nhật realtime
1. Kiểm tra Firestore listeners đang active
2. Kiểm tra network connection
3. Hard refresh (Ctrl+Shift+R)

### Cloud Functions error
1. Xem logs: `firebase functions:log`
2. Kiểm tra environment variables/secrets
3. Kiểm tra Firestore rules

## 📞 Support

- GitHub Issues: https://github.com/longnick/xekho/issues
- Email: support@xekho.com (nếu có)

## 📄 License

Private project - All rights reserved

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-05  
**Firebase Project**: pos-v2-909ff
