# Firestore Data Schema — XE KHÔ CHỮA LÀNH POS

> Auto-generated from codebase analysis (`db.js`, `firestore.rules`, `store.js`, `data.js`, `functions/index.js`).
> Last updated: 2026-06-02

---

## Overview

The application uses **Firebase Firestore** as its primary database for all business operations. A separate **Firebase Realtime Database (RTDB)** is used exclusively for staff presence/online-offline status.

**Project:** `pos-v2-909ff`
**Region:** `asia-southeast1`

---

## Collections

### 1. `config` (Settings)

**Description:** App-wide configuration. The main settings live in the single document `config/settings`.

| Field | Type | Description |
|---|---|---|
| `tableCount` | number | Number of tables (default: 20) |
| `currency` | string | Currency symbol (default: 'đ') |
| `taxRate` | number | Tax rate percentage |
| `storeName` | string | Store name |
| `storeAddress` | string | Store address |
| `storePhone` | string | Store phone number |
| `storeSlogan` | string | Store slogan |
| `bankName` | string | Bank name for QR payments |
| `bankAccount` | string | Bank account number |
| `bankOwner` | string | Bank account owner name |
| `autoBackup` | boolean | Enable auto backup |
| `storageQuotaMb` | number | Storage quota in MB |
| `ocrMode` | string | OCR mode ('auto') |
| `photoRetentionDays` | number | Photo retention days |
| `autoExportWeekly` | boolean | Auto export weekly |
| `autoExportMonthly` | boolean | Auto export monthly |
| `autoPushWeeklyReportToGoogleDrive` | boolean | Push weekly report to Google Drive |
| `reportExportType` | string | Report export type |
| `reportExportPeriod` | string | Report export period |
| `reportExportDate` | string | Report export date |
| `autoUploadToGoogleDrive` | boolean | Auto upload to Google Drive |
| `googleDriveUploadUrl` | string | Google Drive upload URL |
| `googleDriveFolderId` | string | Google Drive folder ID |
| `webPushVapidKey` | string | VAPID key for web push notifications |
| `kitchenNotifyAccepted` | boolean | Notify kitchen on order accepted |
| `kitchenNotifyReady` | boolean | Notify kitchen when ready |
| `zaloOaEnabled` | boolean | Zalo OA integration enabled |
| `zaloNotifyReady` | boolean | Zalo notification for ready orders |
| `zaloNotifyDelay` | boolean | Zalo notification for delays |
| `zaloMessagePrefix` | string | Zalo message prefix |
| `zaloGroupLabel` | string | Zalo group label |
| `activeAIEngine` | string | AI engine name (e.g., 'deepseek') |
| `forceOffline` | boolean | Force offline mode |
| `deepseekApiKey` | string | DeepSeek API key |
| `deepseekEndpoint` | string | DeepSeek API endpoint |
| `deepseekModel` | string | DeepSeek model name |
| `googleTTSKey` | string | Google TTS API key |
| `gemmaEndpoint` | string | Gemma API endpoint |
| `gemmaModel` | string | Gemma model name |
| `gemmaApiKey` | string | Gemma API key |

**Access:** Read: any signed-in user. Write: admin/manager only.
**Relationships:** Standalone configuration document.

---

### 2. `settings` (Sub-settings)

**Description:** Additional settings stored as sub-documents under the `settings` collection (not to be confused with `config/settings`).

#### `settings/financial_profile`
| Field | Type | Description |
|---|---|---|
| Various | mixed | Manager monthly salary, fixed costs, financial profile data |
| `updatedAt` | timestamp | Last updated |
| `updatedBy` | object | Audit: who updated |

#### `settings/telegram_report`
| Field | Type | Description |
|---|---|---|
| `enabled` | boolean | Telegram report enabled |
| `sendHour` | number | Hour to send report (default: 7) |
| `sendMinute` | number | Minute to send report (default: 0) |
| `includeRevenue` | boolean | Include revenue in report |
| `includePaymentBreakdown` | boolean | Include payment breakdown |
| `includeInvoiceCount` | boolean | Include invoice count |
| `includeTopItem` | boolean | Include top item |
| `includeRetailStock` | boolean | Include retail stock |
| `updatedAt` | timestamp | Last updated |
| `updatedBy` | object | Audit: who updated |

**Access:** Read: any signed-in user. Write: admin only.
**Relationships:** Merged into `window.appState.settings` at runtime.

---

### 3. `Product_Catalog` (Menu Items — Master)

**Description:** Master product/menu catalog. This is the **primary source of truth** for menu items, replacing the legacy `menu` collection.

| Field | Type | Description |
|---|---|---|
| `item_id` | string | Unique product ID (often = doc ID) |
| `display_name` | string | Product display name (Vietnamese) |
| `category` | string | Category (e.g., 'Khô Nướng', 'Đặc Biệt', 'Beer') |
| `sell_price` | number | Selling price in VND |
| `item_type` | string | 'Retail' or 'Finished' |
| `image_url` | string | Product image URL |
| `aliases` | string | Search aliases for the product |
| `kitchenRouting` | string | Kitchen routing: 'skip', 'all', or specific station |
| `linkedInventoryId` | string | Linked inventory item ID (for retail items) |
| `cost` | number | Cost price |
| `unit` | string | Unit of measure |
| `hidden` | boolean | Whether item is hidden from menu |
| `aiPrompt` | string | AI prompt for the product |
| `createdAt` | timestamp | Created timestamp |
| `updatedAt` | timestamp | Last updated |

**Access:** Read: any signed-in user. Write: admin only.
**Relationships:**
- → `Inventory_Items` via `linkedInventoryId` (for retail items)
- → `Recipes_BOM` via `parent_item_id` (for finished goods)
- Referenced by `orders.items[].id`, `history.items[].id`

---

### 4. `Inventory_Items` (Inventory — Master)

**Description:** Master inventory items. Primary source of truth for stock management.

| Field | Type | Description |
|---|---|---|
| `inv_id` | string | Unique inventory ID (often = doc ID) |
| `material_name` | string | Material/item name (Vietnamese) |
| `inv_type` | string | 'Retail' or 'Raw' |
| `base_unit` | string | Base unit of measure (e.g., 'phần', 'kg', 'lon') |
| `current_stock` | number | Current stock quantity |
| `min_alert` | number | Minimum stock alert threshold |
| `costPerUnit` | number | Cost per unit in VND |
| `hidden` | boolean | Whether item is hidden |
| `supplierName` | string | Supplier name |
| `supplierPhone` | string | Supplier phone |
| `supplierAddress` | string | Supplier address |
| `createdBy` | object | Audit: who created |
| `updatedBy` | object | Audit: who updated |
| `timestamp` | timestamp | Audit timestamp |
| `updatedAt` | timestamp | Last updated |

**Access:** Read & Write: any signed-in user.
**Relationships:**
- ← `Product_Catalog.linkedInventoryId` (retail items)
- ← `Recipes_BOM.ingredient_inv_id` (recipe ingredients)
- Stock deducted automatically on order payment via `orders.close()`

---

### 5. `Recipes_BOM` (Bill of Materials / Recipes)

**Description:** Recipe/bill-of-materials linking finished goods to their raw material ingredients.

| Field | Type | Description |
|---|---|---|
| `parent_item_id` | string | Product ID from `Product_Catalog` |
| `ingredient_inv_id` | string | Ingredient inventory ID from `Inventory_Items` |
| `ingredient_name` | string | Ingredient name |
| `quantity_needed` | number | Quantity needed per 1 unit of parent product |
| `unit` | string | Unit of measure |
| `updatedAt` | timestamp | Last updated |

**Document ID pattern:** `{parent_item_id}_{ingredient_inv_id}`

**Access:** Read & Write: any signed-in user.
**Relationships:**
- → `Product_Catalog` via `parent_item_id`
- → `Inventory_Items` via `ingredient_inv_id`

---

### 6. `orders` (Active Orders)

**Description:** Currently open/active orders. Orders are deleted from this collection when paid (moved to `history`) or cancelled.

| Field | Type | Description |
|---|---|---|
| `id` | string | Order ID (format: `ORD-{tableId}-{timestamp}`) |
| `tableId` | string | Table ID or 'takeaway' or 'online' |
| `tableName` | string | Display name of table |
| `staffUid` | string | Staff UID who opened the order |
| `items` | array | Array of order line items (see below) |
| `discount` | number | Discount amount |
| `discountType` | string | 'vnd' or 'percent' |
| `shipping` | number | Shipping fee |
| `vatAmount` | number | VAT amount |
| `note` | string | Order note |
| `status` | string | 'open', 'cancelled' |
| `openedAt` | timestamp | When order was opened |
| `source` | string | Order source (e.g., 'online_ordering') |
| `sourceChannel` | string | Source channel (e.g., 'website') |
| `onlineOrderId` | string | Linked online order ID |
| `onlineOrderCode` | string | Online order code |
| `clientOrderId` | string | Client-generated order ID |
| `customerName` | string | Customer name (online orders) |
| `customerPhone` | string | Customer phone (online orders) |
| `createdBy` | object | Audit: who created |
| `createdByRole` | string | Creator's role |
| `updatedBy` | object | Audit: who updated |
| `updatedAt` | timestamp | Last updated |
| `cancelledAt` | timestamp | When cancelled |
| `cancelledBy` | object | Who cancelled |
| `cancelReason` | string | Cancellation reason |
| `is_migrated` | boolean | Whether this is a migrated order |

**`items` array element:**
| Field | Type | Description |
|---|---|---|
| `id` | string | Menu item ID from `Product_Catalog` |
| `name` | string | Item name |
| `price` | number | Unit price |
| `qty` | number | Quantity |
| `note` | string | Item note |
| `lineItemId` | string | Unique line item ID |
| `kitchenStatus` | string | Kitchen status (e.g., 'served') |

**Access:** Read: any signed-in user. Create/Delete: signed-in non-kitchen. Update: non-kitchen OR kitchen (items only on open orders).
**Relationships:**
- → `tables` via `tableId`
- → `Product_Catalog` via `items[].id`
- → `history` when order is closed/paid
- → `online_orders` via `onlineOrderId`

---

### 7. `history` (Completed Orders)

**Description:** Archived completed orders. Created atomically when an order is paid.

| Field | Type | Description |
|---|---|---|
| `historyId` | string | History document ID |
| `id` | string | Original order ID |
| `tableId` | string | Table ID |
| `tableName` | string | Table name |
| `staffUid` | string | Staff UID |
| `items` | array | Order items (same structure as `orders.items`) |
| `discount` | number | Discount |
| `discountType` | string | 'vnd' or 'percent' |
| `shipping` | number | Shipping fee |
| `vatAmount` | number | VAT amount |
| `note` | string | Order note |
| `status` | string | 'completed' or 'cancelled' |
| `total` | number | Total amount paid |
| `cost` | number | Total cost |
| `payMethod` | string | Payment method |
| `paidAt` | timestamp | When paid |
| `paidBy` | object | Who processed payment |
| `timestamp` | timestamp | Audit timestamp |
| `onlineOrderId` | string | Linked online order ID |
| `onlineOrderCode` | string | Online order code |
| `source` | string | Order source |
| `cancelReason` | string | Cancellation reason (if cancelled) |
| `cancelledAt` | timestamp | When cancelled |
| `photos` | array | Order photos (base64, optional) |

**Access:** Read & Write: any signed-in user.
**Relationships:**
- ← `orders` (when order is paid/closed)
- → `Product_Catalog` via `items[].id`

---

### 8. `history_duplicates_archive`

**Description:** Archive for duplicate history records removed during cleanup.

| Field | Type | Description |
|---|---|---|
| `archiveId` | string | Archive document ID |
| `archivedAt` | string | ISO timestamp when archived |
| *(all original history fields)* | mixed | Original history data |

**Access:** Read & Write: any signed-in user.
**Relationships:** Archives from `history`.

---

### 9. `tables` (Table Definitions)

**Description:** Restaurant table definitions and current status.

| Field | Type | Description |
|---|---|---|
| `id` | number/string | Table ID (1–N or 'takeaway') |
| `name` | string | Display name (e.g., 'Bàn 1') |
| `status` | string | 'empty' or 'occupied' |
| `orderId` | string/null | Active order ID (null if empty) |
| `openTime` | timestamp/null | When table was occupied |
| `note` | string | Table note |

**Access:** Read: any signed-in user. Write: signed-in non-kitchen.
**Relationships:**
- ← `orders.tableId`
- Referenced by `orders` when order is opened/closed

---

### 10. `online_orders` (Online Delivery Orders)

**Description:** Online/delivery orders placed through the website ordering system.

| Field | Type | Description |
|---|---|---|
| `orderCode` | string | Human-readable order code |
| `status` | string | 'pending_payment', 'paid', 'approved', 'preparing', 'ready_to_serve', 'delivering', 'completed', 'cancelled', 'rejected' |
| `items` | array | Array of ordered items |
| `items[].productId` | string | Product ID |
| `items[].menuItemId` | string | Menu item ID (alias) |
| `items[].quantity` | number | Quantity |
| `items[].notes` | string | Item notes |
| `customer` | object | Customer information |
| `customer.fullName` | string | Customer name |
| `customer.phone` | string | Customer phone |
| `customer.addressLine1` | string | Address line 1 |
| `customer.ward` | string | Ward |
| `customer.district` | string | District |
| `customer.city` | string | City |
| `customer.note` | string | Customer note |
| `pricing` | object | Pricing details |
| `pricing.discountTotal` | number | Discount total |
| `pricing.shippingFee` | number | Shipping fee |
| `paymentMethod` | string | 'cod' or 'transfer' |
| `paymentStatus` | string | 'pending', 'paid' |
| `posOrderId` | string | Linked POS order ID |
| `posTableId` | string | POS table ID (typically 'online') |
| `posTableName` | string | POS table name |
| `createdAt` | timestamp | Created timestamp |
| `updatedAt` | timestamp | Last updated |
| `lastKitchenSyncAt` | timestamp | Last kitchen sync |

**Access:** Created by Cloud Functions (web ordering). Read/Update: staff/admin via Cloud Functions.
**Relationships:**
- → `orders` via `posOrderId` (created on approval)
- → `Product_Catalog` via `items[].productId`

---

### 11. `order_requests` (Customer Web Order Requests)

**Description:** Order requests submitted by customers via the public web menu.

| Field | Type | Description |
|---|---|---|
| `tableNumber` | number | Table number |
| `items` | array | Ordered items |
| `items[].menuItemId` | string | Menu item ID |
| `items[].name` | string | Item name |
| `items[].quantity` | number | Quantity |
| `items[].notes` | string | Item notes |
| `totalPrice` | number | Total price |
| `status` | string | 'pending_approval', 'approved', 'rejected' |
| `requestType` | string | 'menu_order' |
| `source` | string | 'customer_web' |
| `notes` | string | Order notes |
| `createdAt` | timestamp | Created timestamp |
| `approvedAt` | timestamp | When approved |
| `approvedBy` | string | Who approved |
| `rejectedAt` | timestamp | When rejected |
| `rejectedBy` | string | Who rejected |
| `approvalNote` | string | Rejection reason |

**Access:** Create: public (with validation). Get: if source='customer_web'. List/Update: staff. Delete: admin.
**Relationships:**
- → `tables` via `tableNumber`
- → `Product_Catalog` via `items[].menuItemId`

---

### 12. `service_requests` (Customer Service Requests)

**Description:** Service requests (e.g., calling staff) from customers.

| Field | Type | Description |
|---|---|---|
| `type` | string | 'call_staff' |
| `tableNumber` | number | Table number |
| `message` | string | Request message |
| `status` | string | 'pending', 'resolved' |
| `createdAt` | timestamp | Created timestamp |

**Access:** Create: public. Read/Update: staff. Delete: admin.

---

### 13. `payment_requests` (Customer Payment Requests)

**Description:** Payment requests from customers via web.

| Field | Type | Description |
|---|---|---|
| `status` | string | 'requested', 'processed' |
| `createdAt` | timestamp | Created timestamp |

**Access:** Create: public (status must be 'requested'). Read/Update: staff. Delete: admin.

---

### 14. `kitchen_notifications` (Kitchen Display)

**Description:** Notifications for the kitchen display system.

| Field | Type | Description |
|---|---|---|
| `status` | string | 'unread', 'read' |
| `items` | array | Notification items |
| `createdAt` | timestamp | Created timestamp |
| `readBy` | array | Array of UIDs who marked as read |
| *(additional fields from order context)* | mixed | Table info, order info, etc. |

**Access:** Read: any signed-in user. Create: kitchen or admin. Update: any signed-in user. Delete: admin.
**Relationships:**
- → `orders` (linked to active orders)
- → `tables` (table context)

---

### 15. `expenses` (Business Expenses)

**Description:** Daily business expenses.

| Field | Type | Description |
|---|---|---|
| `id` | string | Expense ID (doc ID) |
| `name` | string | Expense name/description |
| `amount` | number | Expense amount in VND |
| `category` | string | Expense category |
| `date` | string | ISO date string |

**Access:** Read & Write: any signed-in user.
**Relationships:** Referenced in financial reports.

---

### 16. `purchases` (Purchase Records)

**Description:** Inventory purchase records (restocking).

| Field | Type | Description |
|---|---|---|
| `id` | string | Purchase ID (doc ID) |
| `name` | string | Item name |
| `qty` | number | Quantity purchased |
| `unit` | string | Unit of measure |
| `price` | number | Total purchase price |
| `costPerUnit` | number | Cost per unit |
| `date` | string | ISO date string |
| `supplier` | string | Supplier name |
| `supplierId` | string | Supplier ID |

**Access:** Read & Write: any signed-in user.
**Relationships:**
- → `suppliers` via `supplierId`
- → `Inventory_Items` (restocks inventory)

---

### 17. `suppliers` (Supplier Directory)

**Description:** Supplier information.

| Field | Type | Description |
|---|---|---|
| `id` | string | Supplier ID (doc ID) |
| `name` | string | Supplier name |
| *(additional fields)* | mixed | Contact info, address, etc. |

**Access:** Read & Write: any signed-in user.
**Relationships:**
- ← `purchases.supplierId`
- ← `Inventory_Items` (supplier fields)

---

### 18. `Staff` (Staff Accounts)

**Description:** Staff member profiles for PIN-based POS login and personnel management.

| Field | Type | Description |
|---|---|---|
| `staff_id` | string | Staff ID (doc ID) |
| `full_name` | string | Full name |
| `pin_code` | string | 4-digit PIN code |
| `role` | string | 'staff', 'admin', etc. |
| `status` | string | 'active', 'inactive' |
| `hourly_rate` | number | Hourly pay rate |
| `telegram_user_id` | string | Telegram user ID |
| `telegram_username` | string | Telegram username |
| `telegram_chat_id` | string | Telegram chat ID |
| `require_location_checkin` | boolean | Require location for check-in |
| `createdBy` | object | Audit: who created |
| `updatedBy` | object | Audit: who updated |
| `timestamp` | timestamp | Audit timestamp |
| `updatedAt` | timestamp | Last updated |

**Access:** Read: any signed-in user. Create/Update/Delete: admin only.
**Relationships:**
- Referenced by `orders.staffUid`
- → attendance system via `telegram_user_id`

---

### 19. `users` (Firebase Auth Users)

**Description:** User profiles linked to Firebase Auth UIDs.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Firebase Auth UID (doc ID) |
| `email` | string | Email address |
| `displayName` | string | Display name |
| `username` | string | Username |
| `role` | string | 'admin', 'manager', 'staff', 'kitchen', 'disabled' |
| `fcmTokens` | array | FCM push notification tokens |
| `pushPermission` | string | Push notification permission status |
| `pushTokenUpdatedAt` | timestamp | When push token was updated |
| `createdAt` | timestamp | Created timestamp |

**Access:** Read: any signed-in user. Write: signed-in non-kitchen.
**Relationships:**
- Document ID = Firebase Auth UID
- Role determines access across all collections (via `firestore.rules`)

---

### 20. `attendance_daily` (Daily Attendance Summary)

**Description:** Daily attendance summary for staff.

| Field | Type | Description |
|---|---|---|
| `dateKey` | string | Date key (e.g., '2026-06-01') |
| *(staff attendance data)* | mixed | Daily attendance records |
| `updatedAt` | timestamp | Last updated |

**Access:** Read: any signed-in user. Create/Update/Delete: admin only.
**Relationships:**
- → `Staff` (staff members)

---

### 21. `attendance_shifts` (Shift Records)

**Description:** Individual shift check-in/check-out records.

| Field | Type | Description |
|---|---|---|
| `checkInAtMs` | number | Check-in timestamp (milliseconds) |
| *(shift data)* | mixed | Shift details |
| `updatedAt` | timestamp | Last updated |

**Access:** Read: any signed-in user. Create/Update/Delete: admin only.
**Relationships:**
- → `Staff` (staff members)

---

### 22. `shiftLogs` (Shift Close Logs)

**Description:** Records of shift close-out (chốt ca) events.

| Field | Type | Description |
|---|---|---|
| `id` | string | Log ID (doc ID) |
| `staffUid` | string | Staff UID |
| `staffName` | string | Staff name |
| `cashAtHand` | number | Cash at hand |
| `totalRevenue` | number | Total revenue for shift |
| `totalOrders` | number | Total orders for shift |
| `totalExpense` | number | Total expenses for shift |
| `note` | string | Shift note |
| `shiftStart` | mixed | Shift start time |
| `shiftEnd` | mixed | Shift end time |
| `loggedAt` | timestamp | When logged |

**Access:** Read & Write: any signed-in user.

---

### 23. `daily_revenue_snapshot` (Daily Revenue Snapshots)

**Description:** Daily revenue snapshots for historical reporting and ads analysis.

| Field | Type | Description |
|---|---|---|
| `date` | string | Date (YYYY-MM-DD) |
| `ads_spend_today` | number | Ads spend for the day |
| *(revenue metrics)* | mixed | Revenue, order count, etc. |

**Access:** Read & Write: any signed-in user (via rules, managed by Cloud Functions).
**Relationships:**
- → `history` (aggregated from completed orders)
- → `ads_daily_reports` (ads spend data)

---

### 24. `ads_daily_reports` (Advertising Reports)

**Description:** Manual advertising daily report data (Facebook, TikTok).

| Field | Type | Description |
|---|---|---|
| `date` | string | Date (YYYY-MM-DD format) |
| `facebook` | object | Facebook ads metrics |
| `facebook.spend` | number | Ad spend |
| `facebook.clicks` | number | Clicks |
| `facebook.interactions` | number | Interactions |
| `facebook.impressions` | number | Impressions |
| `facebook.reach` | number | Reach |
| `facebook.purchases` | number | Purchases |
| `facebook.addToCart` | number | Add to cart events |
| `tiktok` | object | TikTok ads metrics |
| `tiktok.spend` | number | Ad spend |
| `tiktok.clicks` | number | Clicks |
| `tiktok.interactions` | number | Interactions |
| `tiktok.impressions` | number | Impressions |
| `tiktok.reach` | number | Reach |
| `tiktok.purchases` | number | Purchases |
| `tiktok.addToCart` | number | Add to cart events |

**Access:** Managed by Cloud Functions.
**Relationships:**
- → `daily_revenue_snapshot.ads_spend_today`

---

### 25. `System_Logs` (Audit Logs)

**Description:** System audit log for tracking actions.

| Field | Type | Description |
|---|---|---|
| `id` | string | Log entry ID |
| `actionType` | string | Action type (e.g., 'order_cancelled') |
| `details` | object | Action details |
| `createdBy` | object | Actor info {id, name, role, uid} |
| `timestamp` | timestamp | When action occurred |

**Access:** Create: any signed-in user. Read: admin only. Update/Delete: **no one** (immutable).
**Relationships:** Standalone audit trail.

---

### 26. `public_menu` (Public Web Menu)

**Description:** Projected/synced menu items for the public-facing web ordering page.

| Field | Type | Description |
|---|---|---|
| `display_name` | string | Product display name |
| `sell_price` | number | Selling price |
| `category` | string | Category |
| `imageMode` | string | Image display mode |
| `image_url` | string | Image URL |
| `description` | string | Product description |
| `available` | boolean | Whether item is available |
| `item_type` | string | Item type |
| `kitchenRouting` | string | Kitchen routing |
| `linkedInventoryId` | string | Linked inventory ID |
| `hidden` | boolean | Whether hidden |
| `aiPrompt` | string | AI prompt |
| `updatedAt` | timestamp | Last synced |

**Access:** Read: public (unauthenticated). Create/Update/Delete: admin only.
**Relationships:**
- Synced from `Product_Catalog` by Cloud Functions

---

### 27. `menu` (Legacy Menu)

**Description:** Legacy menu collection. Superseded by `Product_Catalog` but still used as fallback.

| Field | Type | Description |
|---|---|---|
| `id` | string | Menu item ID |
| `name` | string | Item name |
| `category` | string | Category |
| `price` | number | Price |
| `unit` | string | Unit |
| `cost` | number | Cost |
| `itemType` | string | 'retail_item' or 'finished_good' |
| `linkedInventoryId` | string | Linked inventory ID |
| `kitchenRouting` | string | Kitchen routing |
| `ingredients` | array | Ingredient list [{name, qty, unit}] |
| `image_url` | string | Image URL |
| `hidden` | boolean | Whether hidden |
| `aliases` | string | Search aliases |

**Access:** Read & Write: any signed-in user.
**Note:** If `Product_Catalog` data exists, it takes priority over this collection.

---

### 28. `inventory` (Legacy Inventory)

**Description:** Legacy inventory collection. Superseded by `Inventory_Items` but still used as fallback.

| Field | Type | Description |
|---|---|---|
| `id` | string | Inventory item ID |
| `name` | string | Item name |
| `qty` | number | Current quantity |
| `unit` | string | Unit of measure |
| `minQty` | number | Minimum quantity alert |
| `costPerUnit` | number | Cost per unit |
| `itemType` | string | 'retail_item' or 'raw_material' |
| `hidden` | boolean | Whether hidden |

**Access:** Read & Write: any signed-in user.
**Note:** If `Inventory_Items` data exists, it takes priority.

---

### 29. `unitConversions` (Unit Conversion Rules)

**Description:** Unit conversion rules for recipe-to-purchase unit mapping.

| Field | Type | Description |
|---|---|---|
| `ingredientName` | string | Ingredient name |
| `recipeUnit` | string | Recipe unit |
| `purchaseUnit` | string | Purchase/inventory unit |
| `recipeQty` | number | Quantity in recipe unit |
| `purchaseQty` | number | Equivalent quantity in purchase unit |

**Access:** Read & Write: any signed-in user.
**Relationships:**
- → `Inventory_Items` via `ingredientName`
- Used during inventory deduction on order payment

---

### 30. `aiHistory` (AI Conversation History)

**Description:** AI assistant conversation history.

**Access:** Read & Write: any signed-in user.
**Note:** Primarily stored in localStorage; Firestore collection exists for persistence.

---

### 31. `pending_users` (Pending User Registrations)

**Description:** Users awaiting Firebase Auth account creation (migrated from local-only accounts).

**Access:** Read & Write: any signed-in user.
**Relationships:**
- → `users` (once Firebase Auth is created)

---

### 32. `media_assets`, `media_asset_tags`, `media_asset_scores`, `refined_media_assets`, `media_embeddings`

**Description:** Media asset management collections for product images and other media.

**Access:** Read: any signed-in user. Create/Update/Delete: admin only.

---

### 33. Telegram Internal Collections

These collections are used internally by Cloud Functions for Telegram bot integration:

| Collection | Purpose |
|---|---|
| `telegram_order_drafts` | Draft orders created via Telegram OCR |
| `telegram_order_draft_sessions` | Session mapping for Telegram order drafts |
| `telegram_kitchen_new_order_sent` | Deduplication for kitchen Telegram notifications |
| `telegram_completed_order_sent` | Deduplication for completed order Telegram notifications |
| `telegram_pending_actions` | Pending actions from Telegram interactions |

**Access:** Managed exclusively by Cloud Functions (server-side).

---

## Realtime Database (RTDB) Schema

### `presence/{uid}`

**Description:** Staff online/offline presence tracking.

| Field | Type | Description |
|---|---|---|
| `displayName` | string | Staff display name |
| `online` | boolean | Currently online |
| `lastSeen` | timestamp | Last seen timestamp (server timestamp) |

**Access:** Written by client on auth. Auto-set to offline on disconnect.

---

## Security Roles Summary

| Role | Description |
|---|---|
| `admin` | Full access. Owner email always has this role. |
| `manager` | Same as admin for most operations. |
| `staff` | Standard POS operations. Cannot manage users/staff. |
| `kitchen` | Limited: can only update `items` field on open orders. Cannot create/delete orders. |
| `disabled` | Blocked from all access (auto sign-out). |

---

## Key Relationships Diagram

```
Product_Catalog ──→ Recipes_BOM ──→ Inventory_Items
       │                                 ↑
       │ (items[].id)                    │ (deduction on payment)
       ↓                                 │
    orders ──(pay)──→ history ───────────┘
       │
       ↓ (tableId)
    tables

online_orders ──(approve)──→ orders

order_requests ──(approve)──→ orders

config/settings ←── settings/financial_profile
                  ←── settings/telegram_report

Staff ──→ attendance_daily
       ──→ attendance_shifts

users (Firebase Auth) ──→ RBAC for all collections
```

---

## Notes

1. **Dual collection architecture**: The app maintains both legacy collections (`menu`, `inventory`) and master collections (`Product_Catalog`, `Inventory_Items`, `Recipes_BOM`). When master data exists, it takes priority.

2. **Vietnamese text repair**: The app includes automatic Vietnamese text encoding repair (`_repairVietnameseString`) to fix mojibake issues in stored data.

3. **Audit trail**: Many collections include `createdBy`, `updatedBy`, `timestamp`, and `updatedAt` fields for audit purposes via `_withCreateAudit()` and `_withUpdateAudit()`.

4. **Atomic operations**: Order operations (open, add item, change qty, close) all use Firestore `runTransaction` for consistency.

5. **Inventory deduction**: Stock is automatically deducted from `Inventory_Items` when an order is paid, using recipe BOM data and unit conversion rules.

6. **Snapshot listeners**: The app uses 16+ `onSnapshot` listeners to maintain real-time `window.appState` synchronized with Firestore.
