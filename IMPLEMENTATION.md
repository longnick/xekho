# 📋 IMPLEMENTATION GUIDE
## Chief of Staff & Marketing AI - Feature Enhancement & UI Redesign

**Version:** 1.0  
**Date:** 15/05/2026  
**Author:** Development Team  
**Status:** Ready for Implementation

---

## 📑 MỤC LỤC

1. [Tổng quan](#1-tổng-quan)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Chief of Staff Tab Implementation](#3-chief-of-staff-tab-implementation)
4. [Marketing AI Tab Implementation](#4-marketing-ai-tab-implementation)
5. [UI Redesign](#5-ui-redesign)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment Plan](#7-deployment-plan)
8. [Maintenance & Monitoring](#8-maintenance--monitoring)

---

## 1. TỔNG QUAN

### 1.1 Mục tiêu

**Chief of Staff Tab:**
- Tạo dashboard tổng quan cho chủ quán
- Tự động phân tích dữ liệu và đưa ra insights
- Tích hợp Facebook Page metrics
- Cho phép chủ quán đặt mục tiêu và nhận phương án từ AI

**Marketing AI Tab:**
- Redesign UI mobile-first, trực quan, gọn gàng
- Bổ sung đầy đủ các tính năng đã trao đổi
- Tối ưu workflow duyệt brief và chọn bài
- Tích hợp grade system và safety monitoring

### 1.2 Timeline Dự Kiến

```
Phase 1: Backend Foundation (Week 1-2)
├── Firestore schema setup
├── Cloud Functions endpoints
├── AI integration (Gemini/Vertex AI)
└── Cron jobs configuration

Phase 2: Chief of Staff Tab (Week 3-4)
├── Frontend components
├── API integration
├── Facebook sync
└── Testing

Phase 3: Marketing AI Tab (Week 5-6)
├── UI redesign
├── Multi-tab navigation
├── Brief workflow
└── Testing

Phase 4: Integration & Polish (Week 7-8)
├── Cross-tab integration
├── Performance optimization
├── E2E testing
└── Deployment
```

### 1.3 Success Metrics

- ✅ Mobile responsive (375px - 1920px)
- ✅ Load time < 2s
- ✅ No text/layout overflow
- ✅ 95%+ test coverage
- ✅ Zero critical bugs in production

---

## 2. TECH STACK & ARCHITECTURE

### 2.1 Current Stack

**Frontend:**
```javascript
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- Tailwind CSS (via CDN in mockups, need to integrate properly)
- No framework (consider migration to React/Vue later)
```

**Backend:**
```javascript
- Firebase Cloud Functions (Node.js)
- Firestore Database
- Firebase Authentication
- Firebase Storage
```

**AI/ML:**
```javascript
- Google Gemini API (via Vertex AI)
- OpenAI API (fallback)
```

**External APIs:**
```javascript
- Facebook Graph API
- Weather API
- BigQuery (for analytics)
```

### 2.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (app.js)                    │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Chief of Staff  │      │   Marketing AI   │        │
│  │      Tab         │      │       Tab        │        │
│  └──────────────────┘      └──────────────────┘        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Cloud Functions (functions/index.js)        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Chief Engine │  │ Brief Engine │  │ Grade Engine │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Firestore Database                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  chiefs  │  │  briefs  │  │  grades  │  │ fbData │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    External Services                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Gemini   │  │ Facebook │  │ Weather  │  │BigQuery│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 3. CHIEF OF STAFF TAB IMPLEMENTATION

### 3.1 Firestore Schema

#### Collection: `chiefs`

```javascript
{
  id: "chief_20260515_093000",
  timestamp: Timestamp,
  score: 85,
  trend: 5, // vs yesterday
  status: "healthy", // healthy | warning | critical
  statusMessage: "Hệ thống đang hoạt động tốt...",
  
  // Executive Brief
  brief: {
    summary: "Doanh thu hôm nay đạt 8.5 triệu...",
    risks: [
      "Chi phí ads tăng 12% so với tuần trước..."
    ],
    wins: [
      "Publish rate 100% trong 3 ngày liên tiếp",
      "Fanpage tăng 45 followers hôm nay"
    ],
    recommendations: [
      "Tăng tần suất post vào khung 18-20h...",
      "Test thêm video format..."
    ],
    generatedAt: Timestamp
  },
  
  // Metrics
  metrics: {
    aiAudit: 98,
    readiness: 85,
    decisions: 3,
    workflow: "OK"
  },
  
  // Alerts
  alerts: {
    count: 0,
    items: []
  },
  
  // Facebook Data (cached)
  facebook: {
    followers: 1250,
    followersChange: 45,
    engagement: 320,
    engagementChange: -12,
    visits: 180,
    visitsChange: 8,
    lastSync: Timestamp
  },
  
  // Owner Goals
  ownerGoal: {
    description: "Tăng 500 like fanpage trong tháng 5",
    startDate: "2026-05-01",
    endDate: "2026-05-31",
    chiefPlan: {
      summary: "Tăng 500 like = 17 like/ngày...",
      promptForMarketing: "Tập trung hook mạnh...",
      actions: [
        "Post 2 bài/ngày vào khung 12h và 18h",
        "Chạy ads 200k/ngày targeting local 5km"
      ]
    }
  },
  
  // Metadata
  userId: "user123",
  restaurantId: "rest456"
}
```

#### Collection: `chiefTimeline`

```javascript
{
  id: "timeline_20260515",
  date: "2026-05-15",
  score: 85,
  status: "healthy",
  brief: "...",
  userId: "user123"
}
```

### 3.2 Cloud Functions

#### File: `functions/chiefEngine.js`

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');

/**
 * Scheduled function: Run Chief analysis every day at 9:00 AM
 */
exports.runChiefAnalysis = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async (context) => {
    console.log('Starting Chief analysis...');
    
    const db = admin.firestore();
    const users = await db.collection('users').where('chiefEnabled', '==', true).get();
    
    for (const userDoc of users.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      try {
        // 1. Gather data
        const data = await gatherChiefData(userId, userData);
        
        // 2. Generate brief with AI
        const brief = await generateChiefBrief(data);
        
        // 3. Calculate score
        const score = calculateChiefScore(data);
        
        // 4. Save to Firestore
        await saveChiefReport(userId, {
          score,
          brief,
          data,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Chief analysis completed for user ${userId}`);
      } catch (error) {
        console.error(`Error analyzing for user ${userId}:`, error);
      }
    }
  });

/**
 * Gather all data needed for Chief analysis
 */
async function gatherChiefData(userId, userData) {
  const db = admin.firestore();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Get revenue data
  const revenueSnapshot = await db.collection('purchases')
    .where('userId', '==', userId)
    .where('timestamp', '>=', yesterday)
    .where('timestamp', '<', today)
    .get();
  
  const revenue = revenueSnapshot.docs.reduce((sum, doc) => {
    return sum + (doc.data().total || 0);
  }, 0);
  
  // Get marketing data
  const briefsSnapshot = await db.collection('briefs')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(7)
    .get();
  
  const briefs = briefsSnapshot.docs.map(doc => doc.data());
  
  // Get Facebook data (if available)
  let facebookData = null;
  if (userData.facebookPageId) {
    facebookData = await fetchFacebookMetrics(userData.facebookPageId, userData.facebookAccessToken);
  }
  
  // Get weather data
  const weather = await fetchWeatherData(userData.location || 'Ho Chi Minh');
  
  return {
    revenue,
    briefs,
    facebook: facebookData,
    weather,
    userData
  };
}

/**
 * Generate Chief brief using AI
 */
async function generateChiefBrief(data) {
  const vertexAI = new VertexAI({
    project: 'pos-v2-909ff',
    location: 'us-central1'
  });
  
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-pro'
  });
  
  const prompt = `
Bạn là Chief of Staff cho quán ăn. Phân tích dữ liệu sau và tạo executive brief:

**Dữ liệu:**
- Doanh thu hôm qua: ${data.revenue.toLocaleString('vi-VN')} VNĐ
- Số brief đã tạo 7 ngày qua: ${data.briefs.length}
- Thời tiết: ${data.weather.description}, ${data.weather.temp}°C
${data.facebook ? `- Facebook followers: ${data.facebook.followers} (${data.facebook.followersChange >= 0 ? '+' : ''}${data.facebook.followersChange})` : ''}

**Yêu cầu:**
Trả về JSON với format:
{
  "summary": "Tóm tắt tình hình (2-3 câu)",
  "risks": ["Risk 1", "Risk 2"],
  "wins": ["Win 1", "Win 2", "Win 3"],
  "recommendations": ["Action 1", "Action 2"]
}

Giọng điệu: Chuyên nghiệp nhưng thân thiện, xưng "em" gọi "sếp".
`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Failed to parse AI response');
}

/**
 * Calculate Chief score (0-100)
 */
function calculateChiefScore(data) {
  let score = 0;
  
  // Revenue score (40 points)
  const revenueTarget = data.userData.dailyRevenueTarget || 7000000;
  const revenueRatio = data.revenue / revenueTarget;
  score += Math.min(40, revenueRatio * 40);
  
  // Marketing score (30 points)
  const briefsLast7Days = data.briefs.length;
  const expectedBriefs = 7; // 1 per day
  score += Math.min(30, (briefsLast7Days / expectedBriefs) * 30);
  
  // Facebook score (20 points)
  if (data.facebook) {
    const followersGrowth = data.facebook.followersChange;
    if (followersGrowth > 0) {
      score += Math.min(20, followersGrowth * 0.5);
    }
  } else {
    score += 10; // Partial credit if no Facebook
  }
  
  // Workflow health (10 points)
  const hasRecentBrief = data.briefs.length > 0 && 
    (Date.now() - data.briefs[0].timestamp.toMillis()) < 86400000; // 24h
  if (hasRecentBrief) {
    score += 10;
  }
  
  return Math.round(Math.min(100, score));
}

/**
 * Save Chief report to Firestore
 */
async function saveChiefReport(userId, report) {
  const db = admin.firestore();
  const chiefId = `chief_${Date.now()}`;
  
  await db.collection('chiefs').doc(chiefId).set({
    id: chiefId,
    userId,
    ...report
  });
  
  // Also save to timeline
  const dateStr = new Date().toISOString().split('T')[0];
  await db.collection('chiefTimeline').doc(`${userId}_${dateStr}`).set({
    userId,
    date: dateStr,
    score: report.score,
    status: report.score >= 80 ? 'healthy' : report.score >= 60 ? 'warning' : 'critical',
    brief: report.brief.summary,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Fetch Facebook metrics
 */
async function fetchFacebookMetrics(pageId, accessToken) {
  const fetch = require('node-fetch');
  
  const url = `https://graph.facebook.com/v18.0/${pageId}?fields=followers_count,engagement,fan_count&access_token=${accessToken}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Get previous data to calculate change
  const db = admin.firestore();
  const prevDoc = await db.collection('facebookCache').doc(pageId).get();
  const prevData = prevDoc.exists ? prevDoc.data() : {};
  
  const metrics = {
    followers: data.fan_count || 0,
    followersChange: (data.fan_count || 0) - (prevData.followers || 0),
    engagement: data.engagement?.count || 0,
    engagementChange: (data.engagement?.count || 0) - (prevData.engagement || 0),
    visits: 0, // Need separate API call
    visitsChange: 0,
    lastSync: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Cache for next comparison
  await db.collection('facebookCache').doc(pageId).set({
    followers: metrics.followers,
    engagement: metrics.engagement,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return metrics;
}

/**
 * Fetch weather data
 */
async function fetchWeatherData(location) {
  const fetch = require('node-fetch');
  const apiKey = functions.config().weather?.apikey || process.env.WEATHER_API_KEY;
  
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=vi`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    temp: Math.round(data.main.temp),
    description: data.weather[0].description,
    icon: data.weather[0].icon
  };
}

/**
 * HTTP endpoint: Generate Chief plan from owner goal
 */
exports.generateChiefPlan = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { goalDescription, startDate, endDate } = data;
  const userId = context.auth.uid;
  
  // Get user data
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  // Generate plan with AI
  const vertexAI = new VertexAI({
    project: 'pos-v2-909ff',
    location: 'us-central1'
  });
  
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-pro'
  });
  
  const prompt = `
Bạn là Chief of Staff cho quán ăn. Chủ quán đặt mục tiêu:

**Mục tiêu:** ${goalDescription}
**Thời gian:** ${startDate} đến ${endDate}

**Thông tin quán:**
- Tên: ${userData.restaurantName || 'Quán ăn'}
- Loại hình: ${userData.businessType || 'Quán ăn'}
- Doanh thu trung bình: ${(userData.avgRevenue || 7000000).toLocaleString('vi-VN')} VNĐ/ngày

**Yêu cầu:**
Tạo phương án chi tiết để đạt mục tiêu. Trả về JSON:
{
  "summary": "Phân tích mục tiêu và cách tiếp cận (2-3 câu)",
  "promptForMarketing": "Prompt để điều chỉnh Marketing AI (1-2 câu)",
  "actions": [
    "Action item 1 (cụ thể, có số liệu)",
    "Action item 2",
    "Action item 3",
    "Action item 4"
  ],
  "expectedOutcome": "Kết quả dự kiến"
}

Giọng điệu: Chuyên nghiệp, thực tế, có số liệu cụ thể.
`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  // Parse JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new functions.https.HttpsError('internal', 'Failed to generate plan');
  }
  
  const plan = JSON.parse(jsonMatch[0]);
  
  // Save to Firestore
  const latestChief = await db.collection('chiefs')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();
  
  if (!latestChief.empty) {
    const chiefDoc = latestChief.docs[0];
    await chiefDoc.ref.update({
      'ownerGoal': {
        description: goalDescription,
        startDate,
        endDate,
        chiefPlan: plan,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });
  }
  
  return plan;
});

/**
 * HTTP endpoint: Sync Facebook data manually
 */
exports.syncFacebookData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const db = admin.firestore();
  
  // Get user's Facebook credentials
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  if (!userData.facebookPageId || !userData.facebookAccessToken) {
    throw new functions.https.HttpsError('failed-precondition', 'Facebook not connected');
  }
  
  // Fetch metrics
  const metrics = await fetchFacebookMetrics(userData.facebookPageId, userData.facebookAccessToken);
  
  // Update latest Chief report
  const latestChief = await db.collection('chiefs')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();
  
  if (!latestChief.empty) {
    await latestChief.docs[0].ref.update({
      facebook: metrics
    });
  }
  
  return metrics;
});

module.exports = {
  runChiefAnalysis: exports.runChiefAnalysis,
  generateChiefPlan: exports.generateChiefPlan,
  syncFacebookData: exports.syncFacebookData
};
```

### 3.3 Frontend Implementation

#### File: `ai-chief.js` (New file)

```javascript
/**
 * Chief of Staff Tab - Frontend Logic
 */

class ChiefOfStaff {
  constructor() {
    this.currentChief = null;
    this.timeline = [];
    this.init();
  }
  
  async init() {
    console.log('Initializing Chief of Staff...');
    await this.loadLatestChief();
    await this.loadTimeline();
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Load latest Chief report
   */
  async loadLatestChief() {
    try {
      const snapshot = await db.collection('chiefs')
        .where('userId', '==', currentUser.uid)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        this.currentChief = snapshot.docs[0].data();
      } else {
        // No Chief report yet, trigger generation
        await this.runChiefAnalysis();
      }
    } catch (error) {
      console.error('Error loading Chief:', error);
      showNotification('Không thể tải dữ liệu Chief', 'error');
    }
  }
  
  /**
   * Load timeline (last 7 days)
   */
  async loadTimeline() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const snapshot = await db.collection('chiefTimeline')
        .where('userId', '==', currentUser.uid)
        .where('timestamp', '>=', sevenDaysAgo)
        .orderBy('timestamp', 'asc')
        .get();
      
      this.timeline = snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error loading timeline:', error);
    }
  }
  
  /**
   * Render Chief UI
   */
  render() {
    const container = document.getElementById('chiefContainer');
    if (!container) return;
    
    if (!this.currentChief) {
      container.innerHTML = this.renderLoading();
      return;
    }
    
    container.innerHTML = `
      ${this.renderStatusHero()}
      ${this.renderQuickActions()}
      ${this.renderExecutiveBrief()}
      ${this.renderMetrics()}
      ${this.renderFacebookOverview()}
      ${this.renderTimeline()}
      ${this.renderOwnerGoals()}
    `;
  }
  
  /**
   * Render Status Hero Card
   */
  renderStatusHero() {
    const { score, trend, statusMessage } = this.currentChief;
    const scorePercent = (score / 100) * 226; // Circle circumference
    
    const scoreColor = score >= 80 ? 'text-green-400' : 
                       score >= 60 ? 'text-yellow-400' : 'text-red-400';
    
    const trendIcon = trend >= 0 ? 
      '<svg class="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>' :
      '<svg class="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>';
    
    return `
      <div class="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white lg:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <div class="relative h-20 w-20 lg:h-28 lg:w-28">
              <svg class="h-full w-full -rotate-90 transform">
                <circle cx="50%" cy="50%" r="36" stroke="currentColor" stroke-width="8" fill="none" class="text-slate-700"/>
                <circle cx="50%" cy="50%" r="36" stroke="currentColor" stroke-width="8" fill="none" 
                  stroke-dasharray="${scorePercent} 226" class="${scoreColor}" stroke-linecap="round"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold lg:text-3xl">${score}</span>
                <span class="text-xs opacity-75">Score</span>
              </div>
            </div>
            
            <div class="flex-1 min-w-0">
              <h2 class="text-xl font-bold lg:text-2xl">Chief of Staff</h2>
              <p class="mt-1 text-sm opacity-90 line-clamp-2 lg:text-base">${statusMessage}</p>
              <div class="mt-2 flex items-center gap-2 text-xs lg:text-sm">
                ${trendIcon}
                <span class="${trend >= 0 ? 'text-green-400' : 'text-red-400'}">
                  ${trend >= 0 ? '+' : ''}${trend} vs hôm qua
                </span>
              </div>
            </div>
          </div>
          
          <div class="hidden sm:grid sm:grid-cols-3 sm:gap-3 lg:gap-4">
            ${this.renderQuickStats()}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render Quick Stats
   */
  renderQuickStats() {
    const { alerts, metrics } = this.currentChief;
    
    return `
      <div class="rounded-lg bg-white/10 p-3 text-center backdrop-blur">
        <svg class="mx-auto h-5 w-5 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div class="mt-1 text-lg font-bold lg:text-xl">${alerts?.count || 0}</div>
        <div class="text-xs opacity-75">Alerts</div>
      </div>
      <div class="rounded-lg bg-white/10 p-3 text-center backdrop-blur">
        <svg class="mx-auto h-5 w-5 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="mt-1 text-lg font-bold lg:text-xl">${metrics?.decisions || 0}</div>
        <div class="text-xs opacity-75">Pending</div>
      </div>
      <div class="rounded-lg bg-white/10 p-3 text-center backdrop-blur">
        <svg class="mx-auto h-5 w-5 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <div class="mt-1 text-lg font-bold lg:text-xl">${metrics?.aiAudit || 0}%</div>
        <div class="text-xs opacity-75">Health</div>
      </div>
    `;
  }
  
  /**
   * Render Executive Brief (collapsible)
   */
  renderExecutiveBrief() {
    const { brief } = this.currentChief;
    if (!brief) return '';
    
    const timestamp = this.currentChief.timestamp?.toDate();
    const timeAgo = timestamp ? this.getTimeAgo(timestamp) : 'Vừa xong';
    
    return `
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button onclick="chief.toggleBrief()" class="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 active:bg-slate-100 transition">
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-slate-900 lg:text-lg">Executive Brief</h3>
            <p class="mt-0.5 text-xs text-slate-500 lg:text-sm">${timeAgo}</p>
          </div>
          <svg id="briefChevron" class="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        
        <div id="briefContent" class="hidden space-y-3 border-t border-slate-100 p-4 lg:space-y-4">
          <div class="rounded-lg bg-blue-50 p-3 lg:p-4">
            <p class="text-sm leading-relaxed text-slate-700 lg:text-base">${brief.summary}</p>
          </div>
          
          ${brief.risks?.length > 0 ? `
            <div class="rounded-lg bg-red-50 p-3 lg:p-4">
              <h4 class="flex items-center gap-2 font-semibold text-red-900 text-sm lg:text-base">
                <svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>Risks (${brief.risks.length})</span>
              </h4>
              <ul class="mt-2 space-y-1.5">
                ${brief.risks.map(risk => `
                  <li class="flex gap-2 text-sm text-red-800 lg:text-base">
                    <span class="flex-shrink-0">•</span>
                    <span class="flex-1 break-words">${risk}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${brief.wins?.length > 0 ? `
            <div class="rounded-lg bg-green-50 p-3 lg:p-4">
              <h4 class="flex items-center gap-2 font-semibold text-green-900 text-sm lg:text-base">
                <svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Wins (${brief.wins.length})</span>
              </h4>
              <ul class="mt-2 space-y-1.5">
                ${brief.wins.map(win => `
                  <li class="flex gap-2 text-sm text-green-800 lg:text-base">
                    <span class="flex-shrink-0">•</span>
                    <span class="flex-1 break-words">${win}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${brief.recommendations?.length > 0 ? `
            <div class="rounded-lg bg-purple-50 p-3 lg:p-4">
              <h4 class="flex items-center gap-2 font-semibold text-purple-900 text-sm lg:text-base">
                <svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <span>Next Actions (${brief.recommendations.length})</span>
              </h4>
              <ul class="mt-2 space-y-1.5">
                ${brief.recommendations.map(rec => `
                  <li class="flex gap-2 text-sm text-purple-800 lg:text-base">
                    <span class="flex-shrink-0">•</span>
                    <span class="flex-1 break-words">${rec}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Toggle brief visibility
   */
  toggleBrief() {
    const content = document.getElementById('briefContent');
    const chevron = document.getElementById('briefChevron');
    
    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      chevron.style.transform = 'rotate(180deg)';
    } else {
      content.classList.add('hidden');
      chevron.style.transform = 'rotate(0deg)';
    }
  }
  
  /**
   * Run Chief analysis manually
   */
  async runChiefAnalysis() {
    try {
      showNotification('Đang chạy Chief analysis...', 'info');
      
      // Call Cloud Function
      const runChief = firebase.functions().httpsCallable('runChiefAnalysisManual');
      await runChief();
      
      // Reload data
      await this.loadLatestChief();
      await this.loadTimeline();
      this.render();
      
      showNotification('Chief analysis hoàn tất!', 'success');
    } catch (error) {
      console.error('Error running Chief:', error);
      showNotification('Lỗi khi chạy Chief analysis', 'error');
    }
  }
  
  /**
   * Generate Chief plan from owner goal
   */
  async generatePlan() {
    const goalInput = document.getElementById('ownerGoalInput');
    const startDateInput = document.getElementById('goalStartDate');
    const endDateInput = document.getElementById('goalEndDate');
    
    const goalDescription = goalInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!goalDescription || !startDate || !endDate) {
      showNotification('Vui lòng điền đầy đủ thông tin', 'warning');
      return;
    }
    
    try {
      showNotification('Đang tạo phương án...', 'info');
      
      const generatePlan = firebase.functions().httpsCallable('generateChiefPlan');
      const result = await generatePlan({ goalDescription, startDate, endDate });
      
      // Display plan
      this.displayGeneratedPlan(result.data);
      
      showNotification('Phương án đã được tạo!', 'success');
    } catch (error) {
      console.error('Error generating plan:', error);
      showNotification('Lỗi khi tạo phương án', 'error');
    }
  }
  
  /**
   * Display generated plan
   */
  displayGeneratedPlan(plan) {
    const planContainer = document.getElementById('generatedPlan');
    if (!planContainer) return;
    
    planContainer.innerHTML = `
      <div class="rounded-lg border border-purple-200 bg-purple-50 p-4">
        <h4 class="font-semibold text-purple-900 text-sm">Phương án từ Chief</h4>
        <div class="mt-2 space-y-2 text-sm text-purple-800">
          <p><strong>Summary:</strong> ${plan.summary}</p>
          <p><strong>Prompt cho Marketing AI:</strong> ${plan.promptForMarketing}</p>
          <p><strong>Actions:</strong></p>
          <ul class="ml-4 space-y-1">
            ${plan.actions.map(action => `<li>• ${action}</li>`).join('')}
          </ul>
          ${plan.expectedOutcome ? `<p><strong>Kết quả dự kiến:</strong> ${plan.expectedOutcome}</p>` : ''}
        </div>
        <button onclick="chief.saveTargetToMarketing()" class="mt-3 w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 active:scale-95 transition">
          Lưu target vào Marketing AI
        </button>
      </div>
    `;
    
    planContainer.classList.remove('hidden');
  }
  
  /**
   * Helper: Get time ago string
   */
  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Run Chief button
    const runBtn = document.getElementById('runChiefBtn');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runChiefAnalysis());
    }
    
    // Generate plan button
    const generateBtn = document.getElementById('generatePlanBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generatePlan());
    }
    
    // Sync Facebook button
    const syncBtn = document.getElementById('syncFacebookBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.syncFacebook());
    }
  }
  
  // ... Additional methods for other components (Metrics, Timeline, etc.)
}

// Initialize Chief of Staff
let chief;
document.addEventListener('DOMContentLoaded', () => {
  if (currentUser) {
    chief = new ChiefOfStaff();
  }
});
```

---

## 4. MARKETING AI TAB IMPLEMENTATION

### 4.1 UI Redesign - Component Structure

```
marketing-ai-tab/
├── dashboard-hero.js          # Hero section với stats
├── sub-tabs-nav.js            # 7 sub-tabs navigation
├── overview-tab.js            # Content roadmap, alerts
├── decision-tab.js            # Brief list, A/B/C posts
├── input-tab.js               # Prompt configuration
├── safety-tab.js              # Grade system
├── ffmpeg-tab.js              # Video rendering queue
├── inspector-tab.js           # BigQuery analytics
└── guide-tab.js               # User guide
```

### 4.2 Decision Tab - Brief Workflow

#### Enhanced Firestore Schema

```javascript
// Collection: briefs
{
  id: "brief_20260515_093000",
  userId: "user123",
  status: "pending", // pending | approved | rejected
  
  // Content
  content: "Hôm nay trời mưa nhẹ...",
  fullContent: "Detailed brief content...",
  
  // Context data
  context: {
    weather: { temp: 22, description: "Mưa nhẹ" },
    revenue: 7800000,
    topDishes: ["Bún bò Huế", "Phở bò"],
    trends: ["#MonNgayMua", "#AnGiTroiLanh"]
  },
  
  // AI metadata
  aiModel: "gemini-1.5-pro",
  promptVersion: "v2.1",
  
  // Timestamps
  createdAt: Timestamp,
  approvedAt: Timestamp | null,
  approvedBy: "user123" | null,
  
  // Related posts
  postsGenerated: false,
  postIds: [] // IDs of A/B/C posts
}

// Collection: adsPosts
{
  id: "post_20260515_093001_A",
  briefId: "brief_20260515_093000",
  variant: "A", // A | B | C
  userId: "user123",
  
  // Content
  caption: "🍜 Trời lạnh rồi...",
  assetUrl: "https://...",
  assetType: "image", // image | video
  
  // Facebook data (after publish)
  facebookPostId: null,
  publishedAt: null,
  
  // Performance (updated periodically)
  performance: {
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    engagement: 0
  },
  
  // Status
  status: "draft", // draft | selected | published
  selectedAt: null,
  
  createdAt: Timestamp
}
```

#### Frontend: Decision Tab

```javascript
/**
 * Decision Tab - Brief & Post Management
 */

class DecisionTab {
  constructor() {
    this.briefs = [];
    this.posts = {};
    this.filters = {
      status: 'all',
      sort: 'newest',
      search: ''
    };
    this.pagination = {
      page: 1,
      perPage: 10,
      total: 0
    };
  }
  
  async init() {
    await this.loadBriefs();
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Load briefs with filters
   */
  async loadBriefs() {
    try {
      let query = db.collection('briefs')
        .where('userId', '==', currentUser.uid);
      
      // Apply status filter
      if (this.filters.status !== 'all') {
        query = query.where('status', '==', this.filters.status);
      }
      
      // Apply sort
      const sortField = this.filters.sort === 'newest' ? 'createdAt' : 
                       this.filters.sort === 'oldest' ? 'createdAt' : 'priority';
      const sortDir = this.filters.sort === 'oldest' ? 'asc' : 'desc';
      query = query.orderBy(sortField, sortDir);
      
      // Pagination
      query = query.limit(this.pagination.perPage);
      
      const snapshot = await query.get();
      this.briefs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load associated posts for each brief
      for (const brief of this.briefs) {
        if (brief.postsGenerated) {
          await this.loadPostsForBrief(brief.id);
        }
      }
      
      // Get total count for pagination
      const countSnapshot = await db.collection('briefs')
        .where('userId', '==', currentUser.uid)
        .get();
      this.pagination.total = countSnapshot.size;
      
    } catch (error) {
      console.error('Error loading briefs:', error);
      showNotification('Không thể tải briefs', 'error');
    }
  }
  
  /**
   * Load A/B/C posts for a brief
   */
  async loadPostsForBrief(briefId) {
    try {
      const snapshot = await db.collection('adsPosts')
        .where('briefId', '==', briefId)
        .orderBy('variant', 'asc')
        .get();
      
      this.posts[briefId] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error loading posts for brief ${briefId}:`, error);
    }
  }
  
  /**
   * Approve brief
   */
  async approveBrief(briefId) {
    try {
      showNotification('Đang duyệt brief...', 'info');
      
      // Update status
      await db.collection('briefs').doc(briefId).update({
        status: 'approved',
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        approvedBy: currentUser.uid
      });
      
      // Trigger post generation
      const generatePosts = firebase.functions().httpsCallable('generateABCPosts');
      await generatePosts({ briefId });
      
      // Reload
      await this.loadBriefs();
      this.render();
      
      showNotification('Brief đã được duyệt! Đang tạo bộ bài A/B/C...', 'success');
    } catch (error) {
      console.error('Error approving brief:', error);
      showNotification('Lỗi khi duyệt brief', 'error');
    }
  }
  
  /**
   * Reject brief
   */
  async rejectBrief(briefId) {
    try {
      await db.collection('briefs').doc(briefId).update({
        status: 'rejected',
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Reload
      await this.loadBriefs();
      this.render();
      
      showNotification('Brief đã bị từ chối', 'info');
    } catch (error) {
      console.error('Error rejecting brief:', error);
      showNotification('Lỗi khi từ chối brief', 'error');
    }
  }
  
  /**
   * Select post variant (A/B/C)
   */
  async selectPost(postId) {
    try {
      const post = Object.values(this.posts).flat().find(p => p.id === postId);
      if (!post) return;
      
      showNotification('Đang chọn bài...', 'info');
      
      // Mark as selected
      await db.collection('adsPosts').doc(postId).update({
        status: 'selected',
        selectedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Unselect other variants
      const otherPosts = this.posts[post.briefId].filter(p => p.id !== postId);
      for (const otherPost of otherPosts) {
        await db.collection('adsPosts').doc(otherPost.id).update({
          status: 'draft'
        });
      }
      
      // Reload
      await this.loadPostsForBrief(post.briefId);
      this.render();
      
      showNotification(`Đã chọn bài ${post.variant}!`, 'success');
    } catch (error) {
      console.error('Error selecting post:', error);
      showNotification('Lỗi khi chọn bài', 'error');
    }
  }
  
  /**
   * Render Decision Tab
   */
  render() {
    const container = document.getElementById('decisionTabContent');
    if (!container) return;
    
    container.innerHTML = `
      ${this.renderFilterBar()}
      ${this.renderBriefList()}
      ${this.renderPostsSection()}
      ${this.renderPagination()}
    `;
  }
  
  /**
   * Render filter bar
   */
  renderFilterBar() {
    return `
      <div class="rounded-xl border border-slate-200 bg-white p-3 lg:p-4">
        <button onclick="decisionTab.toggleFilter()" class="flex w-full items-center justify-between lg:hidden">
          <span class="font-semibold text-slate-900">Filters</span>
          <svg id="filterChevron" class="h-5 w-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        
        <div id="filterContent" class="hidden mt-3 space-y-3 lg:mt-0 lg:flex lg:items-center lg:gap-3 lg:space-y-0 lg:block">
          <input
            type="text"
            id="searchInput"
            placeholder="Tìm brief..."
            value="${this.filters.search}"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 lg:flex-1"
          />
          
          <select id="statusFilter" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 lg:w-auto">
            <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>Tất cả</option>
            <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>Chờ duyệt</option>
            <option value="approved" ${this.filters.status === 'approved' ? 'selected' : ''}>Đã duyệt</option>
            <option value="rejected" ${this.filters.status === 'rejected' ? 'selected' : ''}>Từ chối</option>
          </select>
          
          <select id="sortFilter" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 lg:w-auto">
            <option value="newest" ${this.filters.sort === 'newest' ? 'selected' : ''}>Mới nhất</option>
            <option value="oldest" ${this.filters.sort === 'oldest' ? 'selected' : ''}>Cũ nhất</option>
            <option value="priority" ${this.filters.sort === 'priority' ? 'selected' : ''}>Ưu tiên</option>
          </select>
        </div>
      </div>
    `;
  }
  
  /**
   * Render brief list
   */
  renderBriefList() {
    if (this.briefs.length === 0) {
      return `
        <div class="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p class="text-slate-500">Không có brief nào</p>
        </div>
      `;
    }
    
    return `
      <div class="space-y-3 mt-4">
        <h3 class="font-semibold text-slate-900 lg:text-lg">Briefs</h3>
        ${this.briefs.map(brief => this.renderBriefCard(brief)).join('')}
      </div>
    `;
  }
  
  /**
   * Render single brief card
   */
  renderBriefCard(brief) {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    
    const statusLabels = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối'
    };
    
    const createdAt = brief.createdAt?.toDate();
    const timeStr = createdAt ? this.formatDateTime(createdAt) : '';
    
    return `
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div class="flex items-start justify-between gap-3 p-3 lg:p-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[brief.status]}">
                ${statusLabels[brief.status]}
              </span>
              <span class="text-xs text-slate-500">${timeStr}</span>
            </div>
            <p class="mt-2 text-sm leading-relaxed text-slate-700 line-clamp-2 lg:text-base">
              ${brief.content}
            </p>
          </div>
          
          <button onclick="decisionTab.toggleBrief('${brief.id}')" class="flex-shrink-0 rounded-lg p-2 hover:bg-slate-100 active:bg-slate-200 transition">
            <svg id="briefChevron_${brief.id}" class="h-5 w-5 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>
        
        <div id="briefExpanded_${brief.id}" class="hidden border-t border-slate-100 p-3 lg:p-4">
          <p class="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words lg:text-base">
            ${brief.fullContent || brief.content}
          </p>
          
          ${brief.status === 'pending' ? `
            <div class="mt-4 flex gap-2">
              <button onclick="decisionTab.approveBrief('${brief.id}')" class="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 active:scale-95 transition">
                Duyệt
              </button>
              <button onclick="decisionTab.rejectBrief('${brief.id}')" class="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition">
                Từ chối
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Toggle brief expanded state
   */
  toggleBrief(briefId) {
    const content = document.getElementById(`briefExpanded_${briefId}`);
    const chevron = document.getElementById(`briefChevron_${briefId}`);
    
    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      chevron.style.transform = 'rotate(180deg)';
    } else {
      content.classList.add('hidden');
      chevron.style.transform = 'rotate(0deg)';
    }
  }
  
  /**
   * Format date time
   */
  formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  }
  
  // ... Additional methods for posts rendering, pagination, etc.
}

// Initialize
let decisionTab;
document.addEventListener('DOMContentLoaded', () => {
  if (currentUser) {
    decisionTab = new DecisionTab();
  }
});
```

---

## 5. UI REDESIGN

### 5.1 Tailwind CSS Integration

**Option 1: CDN (Quick, for prototyping)**
```html
<!-- In index.html -->
<script src="https://cdn.tailwindcss.com"></script>
```

**Option 2: Build Process (Production)**

```bash
# Install Tailwind
npm install -D tailwindcss

# Initialize config
npx tailwindcss init

# Create tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./app.js",
    "./ai-*.js"
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors if needed
      }
    }
  },
  plugins: []
}

# Create input.css
@tailwind base;
@tailwind components;
@tailwind utilities;

# Build command
npx tailwindcss -i ./input.css -o ./style.css --watch
```

### 5.2 Responsive Breakpoints

```css
/* Mobile First Approach */

/* Base: 375px - 639px (Mobile) */
.container {
  padding: 1rem; /* 16px */
}

/* sm: 640px+ (Large Mobile) */
@media (min-width: 640px) {
  .container {
    padding: 1.5rem; /* 24px */
  }
}

/* md: 768px+ (Tablet) */
@media (min-width: 768px) {
  /* ... */
}

/* lg: 1024px+ (Desktop) */
@media (min-width: 1024px) {
  .container {
    padding: 2rem; /* 32px */
  }
}

/* xl: 1280px+ (Large Desktop) */
@media (min-width: 1280px) {
  /* ... */
}
```

### 5.3 Component Migration Checklist

```markdown
## Phase 1: Setup
- [ ] Install Tailwind CSS
- [ ] Configure build process
- [ ] Create base styles
- [ ] Test responsive breakpoints

## Phase 2: Chief of Staff Tab
- [ ] Status Hero Card
- [ ] Quick Actions Bar
- [ ] Executive Brief
- [ ] Metrics Grid
- [ ] Facebook Overview
- [ ] Timeline
- [ ] Owner Goals

## Phase 3: Marketing AI Tab
- [ ] Dashboard Hero
- [ ] Sub-tabs Navigation
- [ ] Overview Tab
- [ ] Decision Tab
- [ ] Input Tab
- [ ] Safety Tab
- [ ] FFmpeg Tab
- [ ] Inspector Tab
- [ ] Guide Tab

## Phase 4: Polish
- [ ] Animations & transitions
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Dark mode (optional)
```

---

## 6. TESTING STRATEGY

### 6.1 Unit Tests

```javascript
// tests/chief.test.js
describe('Chief of Staff', () => {
  test('calculateChiefScore returns correct score', () => {
    const data = {
      revenue: 8000000,
      userData: { dailyRevenueTarget: 7000000 },
      briefs: [{}, {}, {}, {}, {}, {}, {}], // 7 briefs
      facebook: { followersChange: 50 }
    };
    
    const score = calculateChiefScore(data);
    expect(score).toBeGreaterThan(80);
  });
  
  test('generateChiefBrief returns valid JSON', async () => {
    const data = mockChiefData();
    const brief = await generateChiefBrief(data);
    
    expect(brief).toHaveProperty('summary');
    expect(brief).toHaveProperty('risks');
    expect(brief).toHaveProperty('wins');
    expect(brief).toHaveProperty('recommendations');
  });
});
```

### 6.2 Integration Tests

```javascript
// tests/integration/chief-workflow.test.js
describe('Chief Workflow Integration', () => {
  test('Full Chief analysis workflow', async () => {
    // 1. Trigger analysis
    await runChiefAnalysis();
    
    // 2. Verify data saved to Firestore
    const chief = await getLatestChief(testUserId);
    expect(chief).toBeDefined();
    expect(chief.score).toBeGreaterThan(0);
    
    // 3. Verify timeline updated
    const timeline = await getChiefTimeline(testUserId);
    expect(timeline.length).toBeGreaterThan(0);
  });
});
```

### 6.3 E2E Tests (Playwright/Cypress)

```javascript
// e2e/chief-tab.spec.js
test('Chief Tab - Full User Journey', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5000');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password123');
  await page.click('#loginBtn');
  
  // Navigate to Chief tab
  await page.click('[data-tab="chief"]');
  
  // Verify Status Hero visible
  await expect(page.locator('.chief-status-hero')).toBeVisible();
  
  // Click "Chạy lại Chief"
  await page.click('#runChiefBtn');
  await expect(page.locator('.notification')).toContainText('Đang chạy Chief');
  
  // Wait for completion
  await page.waitForSelector('.notification:has-text("hoàn tất")');
  
  // Verify score updated
  const score = await page.locator('.chief-score').textContent();
  expect(parseInt(score)).toBeGreaterThan(0);
});
```

### 6.4 Responsive Testing

```javascript
// Test on multiple viewports
const viewports = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 720 }
];

for (const viewport of viewports) {
  test(`Responsive - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('http://localhost:5000');
    
    // Verify no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
    
    // Verify text not truncated unexpectedly
    // ... additional checks
  });
}
```

---

## 7. DEPLOYMENT PLAN

### 7.1 Pre-Deployment Checklist

```markdown
## Code Quality
- [ ] All tests passing
- [ ] Code reviewed
- [ ] No console.errors in production
- [ ] Environment variables configured
- [ ] API keys secured

## Performance
- [ ] Lighthouse score > 90
- [ ] Load time < 2s
- [ ] Images optimized
- [ ] Code minified
- [ ] Lazy loading implemented

## Security
- [ ] Firestore rules updated
- [ ] Authentication working
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting configured

## Compatibility
- [ ] Tested on Chrome, Firefox, Safari, Edge
- [ ] Tested on iOS Safari, Android Chrome
- [ ] Responsive on all breakpoints
- [ ] No layout shifts (CLS < 0.1)
```

### 7.2 Deployment Steps

```bash
# 1. Build production assets
npm run build

# 2. Deploy Cloud Functions
firebase deploy --only functions

# 3. Deploy Firestore rules
firebase deploy --only firestore:rules

# 4. Deploy hosting
firebase deploy --only hosting

# 5. Verify deployment
curl https://pos-v2-909ff.web.app/health

# 6. Monitor logs
firebase functions:log --only runChiefAnalysis
```

### 7.3 Rollback Plan

```bash
# If issues detected, rollback to previous version
firebase hosting:rollback

# Rollback functions
firebase functions:delete runChiefAnalysis
firebase deploy --only functions

# Restore Firestore rules
firebase deploy --only firestore:rules
```

---

## 8. MAINTENANCE & MONITORING

### 8.1 Monitoring Setup

```javascript
// functions/monitoring.js
const { Logging } = require('@google-cloud/logging');
const logging = new Logging();

/**
 * Log Chief analysis metrics
 */
async function logChiefMetrics(userId, metrics) {
  const log = logging.log('chief-metrics');
  
  const entry = log.entry({
    resource: { type: 'cloud_function' },
    severity: 'INFO'
  }, {
    userId,
    score: metrics.score,
    revenue: metrics.revenue,
    timestamp: new Date().toISOString()
  });
  
  await log.write(entry);
}

/**
 * Alert on low scores
 */
async function alertLowScore(userId, score) {
  if (score < 60) {
    // Send Telegram notification
    await sendTelegramAlert({
      userId,
      message: `⚠️ Chief Score thấp: ${score}/100`,
      severity: 'warning'
    });
  }
}
```

### 8.2 Performance Monitoring

```javascript
// Track key metrics
const metrics = {
  chiefAnalysisTime: 0,
  briefGenerationTime: 0,
  postGenerationTime: 0,
  apiCallCount: 0,
  errorCount: 0
};

// Log to Cloud Monitoring
const { MetricServiceClient } = require('@google-cloud/monitoring');
const client = new MetricServiceClient();

async function recordMetric(metricName, value) {
  const projectId = 'pos-v2-909ff';
  const projectPath = client.projectPath(projectId);
  
  const dataPoint = {
    interval: {
      endTime: {
        seconds: Date.now() / 1000
      }
    },
    value: {
      doubleValue: value
    }
  };
  
  const timeSeries = {
    metric: {
      type: `custom.googleapis.com/${metricName}`
    },
    resource: {
      type: 'global'
    },
    points: [dataPoint]
  };
  
  await client.createTimeSeries({
    name: projectPath,
    timeSeries: [timeSeries]
  });
}
```

### 8.3 Error Handling

```javascript
/**
 * Global error handler
 */
function handleError(error, context) {
  console.error('Error:', error);
  
  // Log to Cloud Logging
  const { ErrorReporting } = require('@google-cloud/error-reporting');
  const errors = new ErrorReporting();
  errors.report(error);
  
  // Send alert if critical
  if (error.severity === 'critical') {
    sendTelegramAlert({
      message: `🚨 Critical Error: ${error.message}`,
      context,
      stack: error.stack
    });
  }
  
  // Return user-friendly message
  return {
    success: false,
    error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    code: error.code || 'UNKNOWN_ERROR'
  };
}
```

---

## 9. APPENDIX

### 9.1 Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm test                       # Run tests
npm run test:watch             # Watch mode

# Firebase
firebase emulators:start       # Start local emulators
firebase deploy                # Deploy all
firebase deploy --only hosting # Deploy hosting only
firebase functions:log         # View function logs

# Git
git checkout -b feature/chief-tab
git commit -m "feat: implement Chief tab"
git push origin feature/chief-tab
```

### 9.2 Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Vertex AI Docs](https://cloud.google.com/vertex-ai/docs)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)

### 9.3 Contact & Support

- **Developer:** Development Team
- **Email:** dev@example.com
- **Slack:** #xekho-dev
- **Documentation:** https://docs.xekho.com

---

**END OF IMPLEMENTATION GUIDE**

*Last Updated: 15/05/2026*
*Version: 1.0*
