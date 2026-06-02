# Deployment Guide - Xe Khô Chữa Lành POS & KDS

Hướng dẫn chi tiết deploy hệ thống POS và Kitchen Display lên Firebase Production.

> Warning
> `xekho` functions are currently aligned with cloud, but this project still overlaps with `webapp-menu` in some feature areas.
> Read `TECH_AUDIT.md` before changing deploy ownership, especially for Telegram reports and online-order related flows.

## 📋 Prerequisites

### 1. Tools Required
```bash
# Node.js 20+
node --version  # v20.x.x

# Firebase CLI
npm install -g firebase-tools
firebase --version  # 13.x.x+

# Git
git --version
```

### 2. Access Requirements
- ✅ Firebase project owner/editor access
- ✅ Google Cloud project access (for Vertex AI)
- ✅ Telegram Bot Token (for notifications)
- ✅ Zalo OA credentials (optional, not yet implemented)

## 🚀 Initial Firebase Project Setup

### Step 1: Create Firebase Project
1. Truy cập [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" hoặc chọn project có sẵn: **pos-v2-909ff**
3. Enable Google Analytics (optional)
4. Wait for project creation

### Step 2: Enable Firebase Services

#### Authentication
```bash
# Firebase Console > Authentication > Sign-in method
# Enable:
- Email/Password ✅
- Google (optional) ✅
```

#### Firestore Database
```bash
# Firebase Console > Firestore Database > Create database
# Mode: Production mode
# Location: asia-southeast1 (Singapore)
```

#### Cloud Functions
```bash
# Tự động enable khi deploy functions lần đầu
# Region: asia-southeast1
```

#### Hosting
```bash
# Firebase Console > Hosting > Get started
# Tự động setup khi deploy
```

#### Cloud Messaging (FCM)
```bash
# Firebase Console > Project Settings > Cloud Messaging
# Copy Server key và Sender ID
```

### Step 3: Firebase CLI Login
```bash
# Login
firebase login

# Verify login
firebase projects:list

# Select project
firebase use pos-v2-909ff
```

## 🔧 Environment Configuration

### 1. Frontend Configuration (db.js)

**File**: `db.js`

Cập nhật `firebaseConfig`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // From Firebase Console
  authDomain: "pos-v2-909ff.firebaseapp.com",
  projectId: "pos-v2-909ff",
  storageBucket: "pos-v2-909ff.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
};
```

**Lấy config:**
1. Firebase Console > Project Settings
2. Your apps > Web app
3. Copy config object

### 2. Functions Environment Variables

#### Local Development (.env file)
**File**: `functions/.env.pos-v2-909ff`

```bash
# Vertex AI Configuration
VERTEX_PROJECT_ID=pos-v2-909ff
VERTEX_LOCATION=asia-southeast1
VERTEX_TEXT_MODEL=gemini-2.0-flash-exp
VERTEX_IMAGE_MODEL=imagen-3.0-generate-001

# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
KITCHEN_NEW_ORDER_TELEGRAM_CHAT_ID=-1001234567890

# Zalo OA (Optional - skeleton only, not production-ready)
ZALO_OA_ACCESS_TOKEN=your_token_here
ZALO_GROUP_ID=your_group_id_here

# Vertex AI Service Account (JSON string)
VERTEX_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"pos-v2-909ff",...}
```

#### Production Secrets (Firebase)
```bash
# Set secrets for production
firebase functions:secrets:set VERTEX_SERVICE_ACCOUNT_JSON
# Paste JSON content when prompted

firebase functions:secrets:set TELEGRAM_BOT_TOKEN
# Enter token when prompted

firebase functions:secrets:set ZALO_OA_ACCESS_TOKEN
# Enter token when prompted (if using)

# List all secrets
firebase functions:secrets:access VERTEX_SERVICE_ACCOUNT_JSON
```

#### Environment Variables (Non-secret)
```bash
# Set via firebase.json or CLI
firebase functions:config:set \
  vertex.project_id="pos-v2-909ff" \
  vertex.location="asia-southeast1" \
  vertex.text_model="gemini-2.0-flash-exp" \
  telegram.chat_id="-1001234567890" \
  kitchen.telegram_chat_id="-1001234567890"

# Get current config
firebase functions:config:get
```

### 3. Vertex AI Service Account Setup

#### Create Service Account
```bash
# Google Cloud Console
# IAM & Admin > Service Accounts > Create Service Account

# Name: vertex-ai-functions
# Role: Vertex AI User
# Create key (JSON) → Download
```

#### Set as Secret
```bash
# Copy JSON content
cat vertex-ai-service-account.json

# Set as Firebase secret
firebase functions:secrets:set VERTEX_SERVICE_ACCOUNT_JSON
# Paste JSON content
```

### 4. Telegram Bot Setup

#### Create Bot
1. Mở Telegram, tìm @BotFather
2. Send `/newbot`
3. Đặt tên bot: "Xe Kho Kitchen Bot"
4. Đặt username: `xekho_kitchen_bot`
5. Copy token: `1234567890:ABCdefGHI...`

#### Get Chat ID
```bash
# Add bot vào group
# Send message trong group
# Truy cập:
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

# Tìm "chat":{"id":-1001234567890}
# Copy chat ID
```

### 5. Zalo OA Setup (Optional - Not Production Ready)

⚠️ **WARNING**: Zalo integration chỉ có skeleton code, chưa implement API call thực tế.

**Nếu muốn setup (cho tương lai):**
1. Đăng ký Zalo Official Account
2. Lấy Access Token từ Zalo Developer Portal
3. Lấy Group ID hoặc User ID
4. Set secrets (xem phần trên)

**Hiện tại**: Bỏ qua bước này, hệ thống vẫn hoạt động bình thường với Telegram + FCM.

## 📦 Deployment Steps

### Step 1: Deploy Firestore Rules

```bash
# Review rules
cat firestore.rules

# Deploy
firebase deploy --only firestore:rules

# Verify
# Firebase Console > Firestore > Rules
```

**Important Rules:**
- `isAdmin()`: Full access
- `isStaff()`: Read/write orders, tables
- `isKitchen()`: Read orders, update kitchen status
- `kitchen_notifications`: Kitchen/admin can read/update

### Step 2: Deploy Cloud Functions

#### Install Dependencies
```bash
cd functions
npm install
cd ..
```

#### Test Locally (Optional)
```bash
# Start emulators
firebase emulators:start --only functions,firestore

# Test functions at:
# http://localhost:5001/pos-v2-909ff/asia-southeast1/<function_name>
```

#### Deploy to Production
```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:onKitchenNotificationCreated
firebase deploy --only functions:aiRouter
firebase deploy --only functions:purchaseOcr

# Check deployment
firebase functions:log --only onKitchenNotificationCreated
```

**Deployed Functions:**
- ✅ `onKitchenNotificationCreated` - Kitchen notification trigger
- ✅ `aiRouter` - AI chatbot endpoint
- ✅ `purchaseOcr` - Purchase receipt OCR
- ✅ `adminGenerateMenuImage` - Menu image generation
- ✅ `telegramWebhook` - Telegram bot webhook

### Step 3: Deploy Hosting

#### Build (if needed)
```bash
# No build step for vanilla JS
# Just ensure all files are ready
```

#### Deploy
```bash
# Deploy hosting
firebase deploy --only hosting

# Verify
# https://pos-v2-909ff.web.app
# https://pos-v2-909ff.web.app/kitchen
```

**Deployed Files:**
- `index.html` → POS main page
- `kitchen.html` → Kitchen display
- `app.js`, `db.js`, `store.js` → Application logic
- `style.css` → Styles
- `firebase-messaging-sw.js` → Service Worker

### Step 4: Deploy All at Once

```bash
# Deploy everything
firebase deploy

# Output:
# ✔ Deploy complete!
# Hosting URL: https://pos-v2-909ff.web.app
# Functions:
#   - onKitchenNotificationCreated(asia-southeast1)
#   - aiRouter(asia-southeast1)
#   ...
```

## 🔐 Security Configuration

### 1. Firestore Security Rules

**Review before deploy:**
```bash
# Check rules
cat firestore.rules

# Key rules:
# - Users can only read/write their own data
# - Kitchen can update kitchen status in orders
# - Staff can create/update orders
# - Admin has full access
```

### 2. Functions Security

**CORS Configuration:**
```javascript
// Already configured in functions/index.js
const cors = require('cors')({ origin: true });
```

**Authentication:**
```javascript
// Verify admin requests
async function verifyAdminRequest(req) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(decodedToken.uid)
    .get();
  
  if (userDoc.data()?.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  return decodedToken;
}
```

### 3. API Keys & Secrets

**Never commit:**
- ❌ Service account JSON files
- ❌ API keys in code
- ❌ Telegram bot tokens
- ❌ Zalo access tokens

**Use:**
- ✅ Firebase secrets for sensitive data
- ✅ Environment variables for config
- ✅ `.gitignore` for local .env files

## 🧪 Post-Deployment Testing

### 1. Smoke Tests

```bash
# Test POS
curl https://pos-v2-909ff.web.app
# Should return 200 OK

# Test Kitchen
curl https://pos-v2-909ff.web.app/kitchen
# Should return 200 OK

# Test AI Router
curl -X POST https://asia-southeast1-pos-v2-909ff.cloudfunctions.net/aiRouter \
  -H "Content-Type: application/json" \
  -d '{"text":"hello"}'
```

### 2. Functional Tests

**POS → Kitchen Flow:**
1. Login as staff
2. Gọi món cho bàn 1
3. Kiểm tra kitchen_notifications collection
4. Login as kitchen
5. Xem màn hình bếp → Món hiển thị
6. Nhấn "Nhận tất cả"
7. Kiểm tra POS → Badge cập nhật

**Notification Tests:**
1. Gọi món mới
2. Kiểm tra Telegram group → Nhận message
3. Kiểm tra FCM → Browser notification
4. Kiểm tra Functions logs

### 3. Check Logs

```bash
# Functions logs
firebase functions:log

# Filter by function
firebase functions:log --only onKitchenNotificationCreated

# Real-time logs
firebase functions:log --follow

# Check errors
firebase functions:log | grep ERROR
```

## 📊 Monitoring & Maintenance

### 1. Firebase Console Monitoring

**Firestore:**
- Console > Firestore > Usage
- Monitor reads/writes/deletes
- Check for quota limits

**Functions:**
- Console > Functions > Dashboard
- Monitor invocations, errors, execution time
- Set up alerts for errors

**Hosting:**
- Console > Hosting > Usage
- Monitor bandwidth, requests

### 2. Set Up Alerts

```bash
# Firebase Console > Project Settings > Integrations
# Enable:
- Email alerts for quota limits
- Slack/Discord webhooks for errors
- Cloud Monitoring for advanced metrics
```

### 3. Cost Monitoring

**Free Tier Limits:**
- Firestore: 50K reads, 20K writes, 20K deletes per day
- Functions: 2M invocations, 400K GB-seconds per month
- Hosting: 10 GB storage, 360 MB/day transfer

**Monitor:**
```bash
# Firebase Console > Usage and billing
# Set budget alerts
```

## 🔄 Update & Rollback

### Update Deployment

```bash
# Pull latest code
git pull origin main

# Deploy updates
firebase deploy

# Or deploy specific service
firebase deploy --only functions:onKitchenNotificationCreated
firebase deploy --only hosting
```

### Rollback

```bash
# List deployments
firebase hosting:channel:list

# Rollback hosting
firebase hosting:rollback

# Rollback functions (manual)
# 1. Firebase Console > Functions
# 2. Select function > Versions
# 3. Rollback to previous version

# Or redeploy previous code
git checkout <previous-commit>
firebase deploy --only functions
git checkout main
```

## 🚨 Troubleshooting

### Functions Not Deploying

**Error**: "Deployment failed"
```bash
# Check Node version
node --version  # Should be 20+

# Check functions/package.json
cat functions/package.json
# "engines": { "node": "20" }

# Clear cache
rm -rf functions/node_modules
cd functions && npm install && cd ..

# Retry
firebase deploy --only functions --debug
```

### Firestore Rules Error

**Error**: "Permission denied"
```bash
# Check rules
firebase firestore:rules:get

# Test rules locally
firebase emulators:start --only firestore
# Use Firestore emulator UI to test rules

# Redeploy
firebase deploy --only firestore:rules
```

### Functions Timeout

**Error**: "Function execution took too long"
```bash
# Increase timeout in functions/index.js
exports.myFunction = onRequest({
  region: 'asia-southeast1',
  timeoutSeconds: 300,  // 5 minutes
  memory: '1GiB'
}, handler);

# Redeploy
firebase deploy --only functions:myFunction
```

### CORS Error

**Error**: "CORS policy blocked"
```bash
# Check CORS in functions
const cors = require('cors')({ origin: true });

exports.myFunction = onRequest((req, res) => {
  cors(req, res, async () => {
    // Your code
  });
});
```

## ✅ Pre-Production Checklist

### Code Review
- [ ] All console.log removed or replaced with logger
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] Security rules reviewed
- [ ] No hardcoded secrets

### Configuration
- [ ] Firebase config updated in db.js
- [ ] All secrets set in Firebase
- [ ] Environment variables configured
- [ ] Telegram bot tested
- [ ] FCM configured

### Testing
- [ ] POS login/logout works
- [ ] Kitchen display shows orders
- [ ] Notifications sent (Telegram + FCM)
- [ ] Order status updates realtime
- [ ] Security rules tested
- [ ] Mobile responsive tested

### Documentation
- [ ] README.md updated
- [ ] KITCHEN_GUIDE.md reviewed
- [ ] API endpoints documented
- [ ] Environment variables listed

### Monitoring
- [ ] Firebase alerts configured
- [ ] Budget alerts set
- [ ] Error tracking enabled
- [ ] Logs reviewed

### Backup
- [ ] Firestore backup enabled
- [ ] Code pushed to Git
- [ ] Secrets documented (securely)
- [ ] Rollback plan ready

## 📞 Support & Resources

### Firebase Resources
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Docs](https://firebase.google.com/docs/firestore)

### Vertex AI Resources
- [Vertex AI Console](https://console.cloud.google.com/vertex-ai)
- [Vertex AI / Gemini model docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models)

### Telegram Bot
- [Bot API Docs](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/botfather)

### Project Specific
- GitHub: https://github.com/longnick/xekho
- Firebase Project: pos-v2-909ff
- Region: asia-southeast1

---

**Version**: 1.0  
**Last Updated**: 2026-05-05  
**Maintainer**: Technical Team
