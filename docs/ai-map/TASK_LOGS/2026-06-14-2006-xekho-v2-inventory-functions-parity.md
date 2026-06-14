# xekho_v2 inventory functions parity note — 2026-06-14 20:06 +0700

Repo: `/home/longnick/projects/xekho`

Purpose:
- Record that `xekho_v2` opened audited Kho vận Cloud Functions while keeping data shape compatible with original XE KHO inventory/menu management collections.

Compatibility contract:
- Inventory: `Inventory_Items.current_stock` and `stockQty`.
- Purchase history: `purchases` rows with `inventoryItemId`, `name/itemName`, `qty/quantity`, `unit`, `total/totalVnd`, `supplier/supplierName`, `date`.
- Stocktake: `stocktakes.systemQty`, `countedQty`, `varianceQty`, `unit`, `date`.
- Supplier: `suppliers.name/supplierName`, `contact`.
- Menu COGS: `Product_Catalog.cost` / `standard_cost`.

No legacy runtime code was changed in this repo.
