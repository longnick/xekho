const admin = require('firebase-admin');
const fs = require('fs');

// 1. Kết nối Firebase
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function importMasterData() {
    try {
        // 2. Đọc file Master Data
        console.log("Đang đọc file GanhKho_MasterData.json...");
        const rawData = fs.readFileSync('GanhKho_MasterData.json', 'utf8');
        const masterData = JSON.parse(rawData);

        const batch = db.batch();
        let count = 0;

        // 3. Nạp bảng Product_Catalog (Thực đơn)
        console.log("Đang xử lý Product_Catalog...");
        for (const item of masterData.Product_Catalog) {
            const docRef = db.collection('Product_Catalog').doc(item.item_id);
            batch.set(docRef, item);
            count++;
        }

        // 4. Nạp bảng Inventory_Items (Kho nguyên liệu)
        console.log("Đang xử lý Inventory_Items...");
        for (const inv of masterData.Inventory_Items) {
            const docRef = db.collection('Inventory_Items').doc(inv.inv_id);
            batch.set(docRef, inv);
            count++;
        }

        // 5. Nạp bảng Recipes_BOM (Công thức định mức)
        console.log("Đang xử lý Recipes_BOM...");
        for (const bom of masterData.Recipes_BOM) {
            // Tạo ID ghép để không bị trùng (Ví dụ: combo_1_inv_ca_moi)
            const bomId = `${bom.parent_item_id}_${bom.ingredient_inv_id}`;
            const docRef = db.collection('Recipes_BOM').doc(bomId);
            batch.set(docRef, bom);
            count++;
        }

        // 6. Gửi toàn bộ lên Firebase
        console.log(`Đang đẩy ${count} dữ liệu lên Firestore. Vui lòng đợi...`);
        await batch.commit();
        
        console.log("✅ XONG! Đã nạp thành công bộ Master Data vào Firebase.");
    } catch (error) {
        console.error("❌ Xảy ra lỗi:", error);
    }
}

importMasterData();