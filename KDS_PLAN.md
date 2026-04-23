# KDS_PLAN.md - Kitchen Display System V2
# Xe Kho Chua Lanh | Ban tuong thich 100% voi app hien tai

---

## Tong quan

**Muc tieu:** Xay dung Kitchen Display System (KDS) real-time cho bep, co phan hoi hai chieu giua bep va nhan vien phuc vu/thu ngan, tuong thich hoan toan voi codebase hien tai cua app POS.

**Muc tieu cua ban V2:** Giu du chuc nang cua ban V1, nhung doi schema, luong auth, luong realtime va cloud functions de khop 100% voi app dang chay.

**Nen tang hien tai da co san:**
- Firebase Auth
- Firestore realtime listener
- Firebase Functions v2
- Firebase Hosting
- App POS web dang dung `db.js` voi Firebase Web SDK v10 modular
- Luong order hien tai dung `orders` collection, khong dung `tables.cart[]`

**URL hien tai:** `https://xe-kho.web.app`

---

## Ket luan kien truc V2

### Su that cua app hien tai

App hien tai **khong luu mon trong `tables.cart[]`**.

Thay vao do:
- `tables/{tableId}` chi giu metadata cua ban:
  - `status`
  - `orderId`
  - `openTime`
  - `note`
- `orders/{orderId}` moi la noi luu danh sach mon:
  - `tableId`
  - `tableName`
  - `items[]`
  - `discount`, `shipping`, `note`
  - `status = open|closed|cancelled`

### Quyet dinh V2

KDS se doc va cap nhat du lieu tren:
- `orders/{orderId}.items[]` de hien thi mon cho bep
- `tables/{tableId}` de lay ten ban, ghi chu, trang thai ban
- `kitchen_notifications/{docId}` de bep gui thong bao nguoc lai cho POS

**Khong dua KDS vao `tables.cart[]`.**

Ly do:
- khop 100% voi app hien tai
- khong pha vo luong order/pay/close dang chay
- tan dung duoc active order snapshot dang co san trong `db.js`

---

## Pham vi tinh nang

Ban V2 phai dat du cac tinh nang cua V1:

1. Man hinh bep realtime
2. Trang thai bep tren tung mon
3. POS nhan thong bao tu bep theo real-time
4. Zalo OA backup notification
5. Web Push FCM khi app thu nho/man hinh tat
6. Role `kitchen` tach biet
7. Route `/kitchen`
8. Bao mat Firestore rules theo role

---

## Schema du lieu V2

## 1. Collection `tables/{tableId}`

Khong thay doi lon schema hien tai. Van giu:

```json
{
  "id": "5",
  "status": "occupied",
  "orderId": "ORD-5-1714000000000",
  "openTime": "timestamp",
  "note": "it da"
}
```

`tables` chi dung de:
- map ban -> order dang mo
- hien thi note cua ban
- hien thi table status

## 2. Collection `orders/{orderId}`

Them metadata bep vao tung item trong `items[]`.

Schema item hien tai:

```json
{
  "id": "muc_kho",
  "name": "Muc kho",
  "price": 130000,
  "qty": 2,
  "note": ""
}
```

Schema item sau khi nang cap KDS:

```json
{
  "id": "muc_kho",
  "name": "Muc kho",
  "price": 130000,
  "qty": 2,
  "note": "",
  "itemType": "finished_good",
  "kitchenStatus": "pending",
  "kitchenSentAt": 1714000000000,
  "kitchenUpdatedAt": 1714000000000,
  "servedAt": null
}
```

### Quy uoc `kitchenStatus`

- `skip`: hang ban thang, khong qua bep
- `pending`: vua goi, chua bep nhan
- `cooking`: bep da nhan, dang lam
- `done`: bep lam xong, cho mang ra
- `served`: nhan vien da mang ra ban

### Mapping theo `itemType`

- `itemType = retail_item` -> default `kitchenStatus = skip`
- `itemType = finished_good` -> default `kitchenStatus = pending`

### Rule khoi tao item khi nhan vien them mon

Tai luong them mon trong POS:
- neu mon la ban thang -> them `kitchenStatus = skip`
- neu mon la mon bep -> them `kitchenStatus = pending` va `kitchenSentAt = Date.now()`

## 3. Collection moi `kitchen_notifications`

Dung cho phan hoi tu bep ve POS va de Cloud Functions bat trigger.

```json
{
  "type": "ready" | "delay" | "out_of_stock",
  "tableId": "5",
  "tableName": "Ban 5",
  "orderId": "ORD-5-1714000000000",
  "message": "Ban 5 xong roi - mang ra ngay",
  "items": ["Muc kho x2", "Ba chi nuong x1"],
  "createdAt": 1714000000000,
  "createdByUid": "kitchen_uid",
  "createdByRole": "kitchen",
  "readBy": [],
  "status": "unread",
  "zaloSent": false,
  "pushSent": false
}
```

---

## Auth va role V2

## 1. Firebase Auth

Van tao user bep rieng trong Firebase Authentication:
- Email: `bep@xekho.app`
- Password: admin tao san

## 2. Firestore `users/{uid}`

Them document cho bep:

```json
{
  "uid": "firebase_uid",
  "email": "bep@xekho.app",
  "displayName": "Bep",
  "username": "bep",
  "role": "kitchen",
  "createdAt": "timestamp"
}
```

## 3. Role matrix V2

| Tinh nang | kitchen | staff | admin |
|---|---|---|---|
| Xem `kitchen.html` | yes | no | yes |
| Cap nhat `orders.items[].kitchenStatus` | yes | no | yes |
| Tao `kitchen_notifications` | yes | no | yes |
| Xem POS `index.html` | no | yes | yes |
| Goi mon / tinh tien | no | yes | yes |
| Quan ly menu / kho / users | no | no | yes |

### Ghi chu

Codebase hien tai dang phan quyen UI chu yeu theo `staff` va `admin`.

V2 se:
- bo sung role `kitchen` o tang Firebase/Firestore
- tren `index.html`, role `kitchen` khong vao POS
- tren `kitchen.html`, role `staff` khong vao bep

---

## Firestore Rules V2

## Muc tieu

1. `kitchen` duoc doc `tables`, `orders`, `menu`, `users`
2. `kitchen` duoc sua **chi field `items` trong order dang mo**, khong duoc sua metadata khac
3. `kitchen` duoc tao `kitchen_notifications`
4. `staff` khong duoc sua `kitchenStatus` truc tiep

## Huong rules

Them helper:

```javascript
function isKitchen() {
  return userRole() == 'kitchen';
}

function isAdmin() {
  return userRole() in ['admin', 'manager'];
}

function isStaffLike() {
  return userRole() in ['staff', 'admin', 'manager'];
}
```

### Rules cho `orders`

Y tuong:
- `staff/admin` van duoc write theo luong POS hien tai
- `kitchen` chi duoc update order khi:
  - order van `status == 'open'`
  - chi thay doi field `items`
  - khong duoc sua `tableId`, `tableName`, `discount`, `shipping`, `note`, `status`

### Rules cho `kitchen_notifications`

```javascript
match /kitchen_notifications/{docId} {
  allow read: if signedIn();
  allow create: if isKitchen() || isAdmin();
  allow update: if signedIn();
  allow delete: if isAdmin();
}
```

### Ghi chu quan trong

Do Firestore Rules kho validate sau tung phan tu trong mang `items[]`, V2 uu tien:
- validate o muc field-level trong rules
- validate nghiep vu o `kitchen.html` va `app.js`
- neu can chat hon o phase sau, co the chuyen kitchen action sang callable/function-backed write

---

## Giao dien KDS V2

## File moi: `kitchen.html`

Trang rieng cho bep, deploy chung Hosting.

### Tech stack

- HTML/CSS/Vanilla JS
- Firebase Web SDK v10 modular
- auth + firestore listeners
- khong dung compat SDK
- khong dung chung `app.js` khong can thiet

### Auth flow

```javascript
onAuthStateChanged(auth, async user => {
  if (!user) {
    showKitchenLogin();
    return;
  }

  const userSnap = await getDoc(doc(db, 'users', user.uid));
  const role = (userSnap.data()?.role || '').toLowerCase();

  if (role === 'kitchen' || role === 'admin' || role === 'manager') {
    showKitchenDashboard();
    initKitchenListeners();
    return;
  }

  alert('Tai khoan nay khong co quyen vao man hinh bep');
  await signOut(auth);
  window.location.href = '/';
});
```

### UI login

- nen toi
- form email/password don gian
- khong co dang ky
- nut quay ve POS

### UI dashboard

V2 chon **Option 1 - Card theo ban** lam mac dinh vi phu hop quan nho/vua va de nhin tong quan.

Moi card hien:
- ten ban
- ghi chu ban
- dong ho dem tu item pending cu nhat
- danh sach item khong phai `skip`, khong phai `served`
- trang thai tung item
- nut:
  - `Nhan tat ca`
  - `Xong tat ca`
  - `Bao cham`
  - `Da mang ra`

### Filter

- Tat ca
- Cho lam
- Dang lam
- Xong

### Quy tac hien thi

- bo item `kitchenStatus = skip`
- bo item `kitchenStatus = served`
- sort card theo `kitchenSentAt` cu nhat len dau
- canh bao mau:
  - > 5 phut: cam
  - > 8 phut: do
  - tat ca `done`: xanh

---

## Nguon du lieu KDS V2

KDS **khong listener vao `tables.cart[]`**.

KDS se listener:

1. `tables`
2. `orders` where `status == 'open'`

### Du lieu render

Moi card ban duoc build bang cach:

1. Lay `tables/{tableId}`
2. Tim `orders` dang mo co `tableId` trung
3. Lay `items[]`
4. Loc cac item:
   - `kitchenStatus !== 'skip'`
   - `kitchenStatus !== 'served'`
5. Neu khong con item bep thi an card

### Loi the

- khong pha luong order hien tai
- dong bo voi POS dang chay
- bep thay ngay item moi khi nhan vien them mon

---

## Kitchen actions V2

Tat ca action cua bep deu update vao `orders/{orderId}.items[]`.

## 1. Nhan tat ca

Chuyen tat ca item:
- `pending` -> `cooking`
- cap nhat `kitchenUpdatedAt = Date.now()`

## 2. Xong tat ca

Chuyen tat ca item:
- `pending|cooking` -> `done`
- cap nhat `kitchenUpdatedAt`

## 3. Bao cham

Tao document moi trong `kitchen_notifications`:

```json
{
  "type": "delay",
  "tableId": "5",
  "tableName": "Ban 5",
  "orderId": "ORD-5-...",
  "message": "Ban 5 dang cham - bao khach cho them",
  "items": ["Muc kho x2"],
  "createdAt": 1714000000000,
  "readBy": [],
  "status": "unread",
  "zaloSent": false,
  "pushSent": false
}
```

## 4. Da mang ra

Chi cho bam khi tat ca item hien thi tren card da `done`.

Action:
1. Tao `kitchen_notifications` type `ready`
2. Update tat ca item `done` -> `served`
3. set `servedAt = Date.now()`

### Ghi chu nghiep vu

Action `Da mang ra` o day van do bep bam de bao san sang + ket thuc card.

Neu sau nay muon dung hon nghiep vu:
- bep chi bam `Xong`
- staff bam `Da mang ra` trong POS

Nhung de giu du chuc nang V1, V2 van cho phep luong hien tai.

---

## Phase 1 - POS listener cho kitchen_notifications

## Muc tieu

Trong POS `index.html + app.js`, nhan thong bao tu bep theo realtime.

## Hien thi tren POS

1. Badge tren header/nav
2. Toast popup
3. Danh dau ban co mon xong/cham

## Luong ky thuat

Sau khi Firebase auth xac thuc xong va role la `staff/admin`:
- listener `kitchen_notifications`
- dem thong bao ma `readBy` chua co uid hien tai
- show toast cho doc moi
- update badge

### Khong goi cho role kitchen

Role `kitchen` khong can listener nay trong POS.

## Pseudo-code dung kieu modular

```javascript
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';

function initKitchenNotificationListener() {
  const uid = window.appState?.uid;
  if (!uid) return;

  const q = query(
    collection(db, 'kitchen_notifications'),
    where('status', '==', 'unread'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, snap => {
    let unreadCount = 0;
    snap.forEach(d => {
      const notif = d.data();
      if (!Array.isArray(notif.readBy) || !notif.readBy.includes(uid)) {
        unreadCount++;
        showKitchenToast(notif, d.id);
      }
    });
    updateKitchenBadge(unreadCount);
  });
}

async function markKitchenNotifRead(docId) {
  await updateDoc(doc(db, 'kitchen_notifications', docId), {
    readBy: arrayUnion(window.appState.uid),
  });
}
```

## Vi tri tich hop trong app hien tai

Gan vao flow sau khi `db:signedIn` xong va role khong phai `kitchen`.

Can tranh:
- duplicate listener moi lan lock/unlock PIN
- toast lap lai khi snapshot re-fire

### Cach xu ly duplicate

Dung:
- 1 bien `window._kitchenNotifUnsub`
- 1 `Set` memory cho toast da hien trong session

---

## Phase 2 - Web Push FCM

## Muc tieu

Nhan vien nhan push notification khi POS dang background/thu nho.

## Files

- tao moi `firebase-messaging-sw.js`
- sua `index.html` neu can them icon/manifest
- sua `app.js` hoac `db.js` de init token
- sua `functions/index.js` de gui push

## Setup frontend

### Service worker

File root:

`/firebase-messaging-sw.js`

Dung Firebase Web Messaging compat trong service worker la hop ly, nhung phan app chinh van giu modular.

### App code

Chi khoi tao web push khi:
- da login Firebase
- role la `staff/admin`
- browser support `Notification` + `serviceWorker`

Luu token vao:

`users/{uid}.fcmTokens = []`

### Foreground

Khi app dang mo:
- khong show native notification
- show `showKitchenToast()` de dong bo UI

## Setup backend

Trong `functions/index.js` them trigger onCreate cho `kitchen_notifications/{docId}`:
- lay user role `staff/admin/manager`
- gom `fcmTokens`
- send push
- xu ly invalid token
- update `pushSent = true`

### Idempotency

Neu `pushSent == true` thi bo qua.

---

## Phase 3 - Zalo OA backup

## Muc tieu

Khi bep bao `ready` hoac `delay`, gui them thong bao vao nhom Zalo noi bo.

## Tuong thich voi code hien tai

`functions/index.js` dang la Functions v2, nen phai viet trigger theo style V2, khong dung mau V1 cu.

## Config

Dung params/secrets hoac config nhat quan trong functions.

Lua chon de dong bo voi code hien tai:
- uu tien `defineSecret` / `defineString`
- neu muon nhanh hon co the dung env file cua functions

### Bien can co

- `ZALO_OA_ACCESS_TOKEN`
- `ZALO_GROUP_ID`

## Trigger

Trigger `onDocumentCreated` cho `kitchen_notifications/{docId}`:
- neu `type` khong phai `ready|delay` -> return
- neu `zaloSent == true` -> return
- build message text
- POST toi Zalo OA API
- thanh cong -> update `zaloSent = true`
- fail -> log, khong throw vo han

---

## Route va deploy

## 1. `firebase.json`

Them hosting rewrites:

```json
{
  "hosting": {
    "rewrites": [
      { "source": "/kitchen", "destination": "/kitchen.html" }
    ]
  }
}
```

### Ghi chu

File hien tai chua co `hosting`, chi co `firestore` va `functions`.

V2 se can bo sung them block hosting, nhung phai giu cau hinh cu.

## 2. Assets nen co

Neu dung FCM webpush:
- `/icon-192.png`
- `/badge-72.png`

Neu chua co, tao them.

---

## Thay doi tren codebase hien tai

## File can tao moi

| File | Muc dich |
|---|---|
| `kitchen.html` | man hinh bep |
| `firebase-messaging-sw.js` | service worker cho web push |

## File can sua

| File | Muc dich |
|---|---|
| `app.js` | them kitchen badge, toast, listener, init web push, gan kitchenStatus khi them mon |
| `db.js` | neu can them helper update order items hoac helper role kitchen |
| `firestore.rules` | bo sung role kitchen va collection kitchen_notifications |
| `firebase.json` | them hosting rewrite `/kitchen` |
| `functions/index.js` | them trigger Zalo + Push |
| `functions/package.json` | them package neu can |
| `style.css` | them CSS toast/badge cho kitchen notification |
| `index.html` | them badge UI cho kitchen notifications |

---

## Chi tiet thay doi nghiep vu tren POS

## 1. Khi them mon vao order

Tai `addToOrder()` va/hoac luong `_cloudSyncItem({ type: 'add' })`, item dua len cloud can co:

- `itemType`
- `kitchenStatus`
- `kitchenSentAt`
- `kitchenUpdatedAt`
- `servedAt`

### Quy tac

Neu item la `retail_item`:

```json
{
  "kitchenStatus": "skip"
}
```

Neu item la `finished_good`:

```json
{
  "kitchenStatus": "pending",
  "kitchenSentAt": 1714000000000,
  "kitchenUpdatedAt": 1714000000000,
  "servedAt": null
}
```

## 2. Khi quantity tang/giam

Khong reset `kitchenStatus` cua item dang ton tai mot cach mu quang.

Rule V2:
- neu item da ton tai trong order -> tang `qty`, giu nguyen status hien tai
- neu item moi them vao -> ap dung status khoi tao nhu tren

## 3. Khi xoa item

Neu xoa item khoi order, KDS tu dong bien mat do order listener cap nhat.

## 4. Khi dong order / thanh toan

Khong can logic rieng cho KDS, vi order se roi khoi `status=open`.

---

## Kitchen page data model runtime

Tren `kitchen.html`, sau khi nghe `tables` va `orders`, build view model:

```javascript
[
  {
    tableId: '5',
    tableName: 'Ban 5',
    note: 'it da',
    orderId: 'ORD-5-...',
    items: [
      {
        id: 'muc_kho',
        name: 'Muc kho',
        qty: 2,
        kitchenStatus: 'pending',
        kitchenSentAt: 1714000000000
      }
    ],
    urgencyMinutes: 7,
    hasPending: true,
    hasCooking: false,
    hasDone: false
  }
]
```

---

## Tieu chi hoan thanh theo phase

## Phase 1 done khi

- POS hien badge khi bep gui `ready/delay`
- toast xuat hien dung 1 lan/document
- bam dong hoac auto 8s -> `readBy` duoc update
- role `kitchen` khong nghe listener nay

## Phase 2 done khi

- browser support -> xin permission thanh cong
- token luu vao `users/{uid}.fcmTokens`
- tao `kitchen_notifications` -> foreground co toast, background co push
- token loi duoc xoa khoi Firestore

## Phase 3 done khi

- tao `kitchen_notifications` type `ready|delay`
- Cloud Function gui Zalo dung format
- document duoc danh dau `zaloSent = true`
- retry khong gui 2 lan

## Kitchen page done khi

- login role kitchen thanh cong
- staff vao `/kitchen` bi chan
- item `skip` khong hien
- item `pending/cooking/done` hien dung
- bam action cap nhat dung `orders.items[]`
- bam `Bao cham` / `Da mang ra` tao notification dung schema

---

## Ke hoach implement de xuat

### Buoc 1 - Nen du lieu
- sua `app.js` de item moi co `kitchenStatus`
- verify order item schema tren cloud

### Buoc 2 - Kitchen page
- tao `kitchen.html`
- login + listener + action buttons

### Buoc 3 - POS listener
- badge + toast + mark read

### Buoc 4 - Rules + route
- cap nhat `firestore.rules`
- cap nhat `firebase.json`

### Buoc 5 - Zalo
- them function Zalo backup

### Buoc 6 - FCM
- them service worker + token + push trigger

### Buoc 7 - Test nghiep vu
- staff goi mon
- bep nhan
- bep xong
- POS nhan thong bao
- push + Zalo chay

---

## Uoc luong effort V2

Neu lam dung theo codebase hien tai:

| Hang muc | Uoc luong |
|---|---|
| Nang cap order item schema + sync logic | 4-6h |
| Tao `kitchen.html` day du | 8-12h |
| POS listener + toast + badge | 3-5h |
| Firestore rules + route | 2-4h |
| Zalo function | 2-4h |
| FCM frontend + backend | 5-8h |
| Test end-to-end + fix edge cases | 6-10h |

**Tong:** `30-49h` tuy muc do polish va test thuc te tren thiet bi.

---

## Rui ro va cach giam

## 1. Rui ro lon nhat

`orders.items[]` la mang, update theo item se de gap race condition neu POS va bep cung sua gan nhau.

### Giam rui ro

- uu tien doc moi nhat truoc khi update
- dung transaction neu can
- tranh de POS rewrite ca mang `items[]` mot cach mu quang sau khi bep da sua status

## 2. Duplicate notifications

Snapshot va function retry co the tao duplicate UX.

### Giam rui ro

- client: de-dup bang session set
- server: `pushSent`, `zaloSent`

## 3. Firestore rules cho nested array

Rules kho validate tung item chi tiet.

### Giam rui ro

- bo sung validate client
- neu can harden them, chuyen action bep qua Cloud Function/callable phase sau

---

## Prompt implementation V2 - Phase 1

```text
Ban dang lam viec voi codebase POS web "Xe Kho Chua Lanh".

Luu y quan trong:
- Codebase nay dung Firebase Web SDK v10 modular trong db.js
- Don hang dang luu trong collection orders, field items[]
- tables chi giu metadata ban, khong co tables.cart[]

TASK:
Implement Phase 1 KDS-compatible order item metadata + kitchen notification listener trong POS.

CAN LAM:
1. Khi them mon vao order, gan metadata bep vao item moi:
   - retail_item -> kitchenStatus='skip'
   - finished_good -> kitchenStatus='pending', kitchenSentAt=Date.now(), kitchenUpdatedAt=Date.now()
2. Khong reset status cua item cu khi tang qty
3. Them listener collection kitchen_notifications cho staff/admin
4. Show toast + badge + mark read
5. Khong chay listener nay neu role la kitchen

KHONG DUOC:
- khong doi schema sang tables.cart[]
- khong dung firebase compat pseudo-code
- khong pha logic POS hien tai
```

---

## Prompt implementation V2 - kitchen.html

```text
Tao file kitchen.html moi cho app POS "Xe Kho Chua Lanh".

CONTEXT THUC TE:
- Firebase SDK dang dung la v10 modular
- Du lieu order nam o orders/{orderId}.items[]
- tables/{tableId} chi co status/orderId/openTime/note
- users/{uid}.role co the la kitchen/staff/admin

TASK:
Tao man hinh KDS card theo ban.

CAN LAM:
1. Login email/password bang Firebase Auth
2. Check role trong users/{uid}
3. Chi cho kitchen/admin vao
4. Listener realtime tables + orders where status=open
5. Build card theo ban, loc item kitchenStatus != skip && != served
6. Action:
   - Nhan tat ca -> pending => cooking
   - Xong tat ca -> pending/cooking => done
   - Bao cham -> tao kitchen_notifications type=delay
   - Da mang ra -> tao kitchen_notifications type=ready va done => served
7. UI canh bao theo urgency >5p / >8p

KHONG DUOC:
- khong doc tables.cart[]
- khong redirect role staff vao KDS
```

---

## Prompt implementation V2 - Functions

```text
Ban dang sua Firebase Functions v2 cua project pos-v2-909ff.

CONTEXT:
- functions/index.js dang dung firebase-functions v2
- kitchen_notifications la collection moi
- can 2 trigger: Zalo OA + FCM push

TASK:
Them 2 trigger onDocumentCreated cho kitchen_notifications/{docId}

YEU CAU:
1. Zalo:
   - chi gui cho type ready|delay
   - bo qua neu zaloSent == true
   - gui thanh cong -> update zaloSent=true
   - fail -> log, khong throw retry vo han
2. Push:
   - lay users role staff/admin/manager
   - gom fcmTokens
   - gui push
   - xu ly invalid tokens
   - update pushSent=true

LUU Y:
- dung style Functions v2
- khong viet theo mau functions.firestore.document(...).onCreate cu
```

---

## Definition of Done tong the

Ban V2 duoc xem la xong khi:

1. Staff goi mon trong POS -> item mon bep vao trang thai `pending`
2. Kitchen page thay item moi real-time
3. Bep nhan/xong/bao cham/da mang ra duoc
4. POS nhan badge + toast
5. Background co push neu da cap quyen
6. Zalo nhan backup notification
7. Rules chan role sai
8. Route `/kitchen` deploy chay duoc
9. Khong pha vo luong order, tinh tien, close order hien tai

---

*Tai lieu V2 tao de thay the V1 vao ngay 23/04/2026, canh theo codebase hien tai cua repo xekho.*
