const admin = require('firebase-admin');
const fs = require('fs');
const { loadServiceAccount } = require('./loadServiceAccount');

// 1. K???t n???i Firebase
const serviceAccount = loadServiceAccount(__dirname);
if (!serviceAccount) {
    throw new Error('Kh??ng t??m th???y file service account trong th?? m???c project.');
}
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function importMasterData() {
    try {
        // 2. Äá»c file Master Data
        console.log("Äang Ä‘á»c file GanhKho_MasterData.json...");
        const rawData = fs.readFileSync('GanhKho_MasterData.json', 'utf8');
        const masterData = JSON.parse(rawData);

        const batch = db.batch();
        let count = 0;

        // 3. Náº¡p báº£ng Product_Catalog (Thá»±c Ä‘Æ¡n)
        console.log("Äang xá»­ lÃ½ Product_Catalog...");
        for (const item of masterData.Product_Catalog) {
            const docRef = db.collection('Product_Catalog').doc(item.item_id);
            batch.set(docRef, item);
            count++;
        }

        // 4. Náº¡p báº£ng Inventory_Items (Kho nguyÃªn liá»‡u)
        console.log("Äang xá»­ lÃ½ Inventory_Items...");
        for (const inv of masterData.Inventory_Items) {
            const docRef = db.collection('Inventory_Items').doc(inv.inv_id);
            batch.set(docRef, inv);
            count++;
        }

        // 5. Náº¡p báº£ng Recipes_BOM (CÃ´ng thá»©c Ä‘á»‹nh má»©c)
        console.log("Äang xá»­ lÃ½ Recipes_BOM...");
        for (const bom of masterData.Recipes_BOM) {
            // Táº¡o ID ghÃ©p Ä‘á»ƒ khÃ´ng bá»‹ trÃ¹ng (VÃ­ dá»¥: combo_1_inv_ca_moi)
            const bomId = `${bom.parent_item_id}_${bom.ingredient_inv_id}`;
            const docRef = db.collection('Recipes_BOM').doc(bomId);
            batch.set(docRef, bom);
            count++;
        }

        // 6. Gá»­i toÃ n bá»™ lÃªn Firebase
        console.log(`Äang Ä‘áº©y ${count} dá»¯ liá»‡u lÃªn Firestore. Vui lÃ²ng Ä‘á»£i...`);
        await batch.commit();
        
        console.log("âœ… XONG! ÄÃ£ náº¡p thÃ nh cÃ´ng bá»™ Master Data vÃ o Firebase.");
    } catch (error) {
        console.error("âŒ Xáº£y ra lá»—i:", error);
    }
}

importMasterData();
