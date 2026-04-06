// ============================================================
// DATA.JS - Dữ liệu Menu & Tồn kho - Gánh Khô Chữa Lành
// ============================================================

const DEFAULT_MENU = [
  // KHÔ NƯỚNG
  { id: 'm01', name: 'Khô cá mối', category: 'Khô Nướng', price: 25000, unit: 'phần', cost: 15000, ingredients: [{name:'Khô cá mối',qty:1,unit:'phần'}] },
  { id: 'm02', name: 'Cá chỉ vàng nướng', category: 'Khô Nướng', price: 25000, unit: 'phần', cost: 14000, ingredients: [{name:'Khô cá chỉ vàng',qty:1,unit:'phần'}] },
  { id: 'm03', name: 'Khô cá thiều nướng', category: 'Khô Nướng', price: 30000, unit: 'phần', cost: 18000, ingredients: [{name:'Khô cá thiều',qty:1,unit:'phần'}] },
  { id: 'm04', name: 'Khô cá bống nướng', category: 'Khô Nướng', price: 25000, unit: 'phần', cost: 14000, ingredients: [{name:'Khô cá bống',qty:1,unit:'phần'}] },
  { id: 'm05', name: 'Khô cá khoai', category: 'Khô Nướng', price: 30000, unit: 'phần', cost: 17000, ingredients: [{name:'Khô cá khoai',qty:1,unit:'phần'}] },
  { id: 'm06', name: 'Khô cá đao nướng', category: 'Khô Nướng', price: 25000, unit: 'phần', cost: 14000, ingredients: [{name:'Khô cá đao',qty:1,unit:'phần'}] },
  { id: 'm07', name: 'Khô cá đuối nướng', category: 'Khô Nướng', price: 60000, unit: 'phần', cost: 38000, ingredients: [{name:'Khô cá đuối',qty:1,unit:'phần'}] },
  { id: 'm08', name: 'Lạp vịt nướng', category: 'Khô Nướng', price: 20000, unit: 'phần', cost: 12000, ingredients: [{name:'Lạp vịt',qty:1,unit:'phần'}] },
  { id: 'm09', name: 'Khô cá bò Nướng', category: 'Khô Nướng', price: 25000, unit: 'phần', cost: 15000, ingredients: [{name:'Khô cá bò',qty:1,unit:'phần'}] },
  { id: 'm10', name: 'Mực khô nướng', category: 'Khô Nướng', price: 130000, unit: 'phần', cost: 80000, ingredients: [{name:'Mực khô',qty:1,unit:'phần'}] },

  // ĐẶC BIỆT
  { id: 'm11', name: 'Mực 1 nắng nướng muối ớt', category: 'Đặc Biệt', price: 230000, unit: 'phần', cost: 150000, ingredients: [{name:'Mực 1 nắng',qty:1,unit:'phần'},{name:'Muối ớt',qty:1,unit:'gói'}] },
  { id: 'm12', name: 'Mực 1 nắng nướng mọi', category: 'Đặc Biệt', price: 230000, unit: 'phần', cost: 150000, ingredients: [{name:'Mực 1 nắng',qty:1,unit:'phần'}] },
  { id: 'm13', name: 'Mực khô chiên bơ tỏi', category: 'Đặc Biệt', price: 180000, unit: 'phần', cost: 110000, ingredients: [{name:'Mực khô',qty:1,unit:'phần'},{name:'Bơ',qty:30,unit:'g'},{name:'Tỏi',qty:20,unit:'g'}] },
  { id: 'm14', name: 'Vịt lộn om bầu', category: 'Đặc Biệt', price: 39000, unit: 'phần', cost: 22000, ingredients: [{name:'Vịt lộn',qty:2,unit:'trứng'},{name:'Bầu',qty:100,unit:'g'}] },
  { id: 'm38', name: 'Tôm 1 nắng nướng muối ớt', category: 'Đặc Biệt', price: 180000, unit: 'phần', cost: 110000, ingredients: [{name:'Tôm 1 nắng',qty:1,unit:'phần'},{name:'Muối ớt',qty:1,unit:'gói'}] },

  // COMBO
  { id: 'm15', name: 'Combo 1', category: 'Phần Combo', price: 149000, unit: 'phần', cost: 90000, ingredients: [{name:'Mực khô',qty:0.5,unit:'phần'},{name:'Khô cá chỉ vàng',qty:1,unit:'phần'},{name:'Khô cá thiều',qty:1,unit:'phần'},{name:'Lạp vịt',qty:1,unit:'phần'}] },
  { id: 'm16', name: 'Combo 2', category: 'Phần Combo', price: 199000, unit: 'phần', cost: 125000, ingredients: [{name:'Mực khô',qty:1,unit:'phần'},{name:'Khô cá chỉ vàng',qty:1,unit:'phần'},{name:'Khô cá đuối',qty:1,unit:'phần'},{name:'Khô cá bò',qty:1,unit:'phần'},{name:'Lạp vịt',qty:1,unit:'phần'}] },
  { id: 'm17', name: 'Combo 3', category: 'Phần Combo', price: 249000, unit: 'phần', cost: 160000, ingredients: [{name:'Mực khô',qty:1,unit:'phần'},{name:'Khô cá đuối',qty:1,unit:'phần'},{name:'Lạp vịt',qty:1,unit:'phần'},{name:'Khô cá đao',qty:1,unit:'phần'},{name:'Gỏi xoài',qty:1,unit:'phần'},{name:'Vịt lộn',qty:2,unit:'trứng'}] },

  // MÓN ĂN KÈM
  { id: 'm18', name: 'Khô cá chỉ vàng chiên bơ', category: 'Món Ăn Kèm', price: 35000, unit: 'phần', cost: 20000, ingredients: [{name:'Khô cá chỉ vàng',qty:1,unit:'phần'},{name:'Bơ',qty:20,unit:'g'}] },
  { id: 'm19', name: 'Cá sụn xịn chiên giòn', category: 'Món Ăn Kèm', price: 100000, unit: 'phần', cost: 60000, ingredients: [{name:'Cá sụn xịn',qty:300,unit:'g'},{name:'Dầu ăn',qty:100,unit:'ml'}] },
  { id: 'm20', name: 'Ba chỉ nướng lá dổi', category: 'Món Ăn Kèm', price: 60000, unit: 'phần', cost: 35000, ingredients: [{name:'Ba chỉ heo',qty:200,unit:'g'},{name:'Lá dổi',qty:10,unit:'lá'}] },
  { id: 'm21', name: 'Gỏi xoài khô cá mối', category: 'Món Ăn Kèm', price: 60000, unit: 'phần', cost: 35000, ingredients: [{name:'Xoài xanh',qty:200,unit:'g'},{name:'Khô cá mối',qty:1,unit:'phần'}] },
  { id: 'm22', name: 'Bắp xào', category: 'Món Ăn Kèm', price: 35000, unit: 'phần', cost: 18000, ingredients: [{name:'Bắp ngô',qty:2,unit:'trái'}] },
  { id: 'm23', name: 'Đầu hũ chiên mỡ hành', category: 'Món Ăn Kèm', price: 50000, unit: 'phần', cost: 25000, ingredients: [{name:'Đậu phụ',qty:300,unit:'g'},{name:'Hành lá',qty:20,unit:'g'}] },
  { id: 'm24', name: 'Trứng bắc thảo tôm khô', category: 'Món Ăn Kèm', price: 70000, unit: 'phần', cost: 40000, ingredients: [{name:'Trứng bắc thảo',qty:2,unit:'trứng'},{name:'Củ kiệu',qty:50,unit:'g'},{name:'Tôm khô',qty:30,unit:'g'}] },
  { id: 'm25', name: 'Khoai tây chiên lắc phô mai', category: 'Món Ăn Kèm', price: 50000, unit: 'phần', cost: 28000, ingredients: [{name:'Khoai tây',qty:300,unit:'g'},{name:'Phô mai bột',qty:20,unit:'g'}] },
  { id: 'm26', name: 'Chân gà nướng', category: 'Món Ăn Kèm', price: 25000, unit: 'phần', cost: 14000, ingredients: [{name:'Chân gà',qty:4,unit:'cái'}] },

  // GIẢI KHÁT
  { id: 'm27', name: 'Trà đào', category: 'Giải Khát', price: 20000, unit: 'ly', cost: 8000, ingredients: [{name:'Trà đào',qty:1,unit:'ly'}] },
  { id: 'm28', name: 'Trà măng cầu', category: 'Giải Khát', price: 25000, unit: 'ly', cost: 10000, ingredients: [{name:'Trà măng cầu',qty:1,unit:'ly'}] },
  { id: 'm29', name: 'Trà tắc', category: 'Giải Khát', price: 20000, unit: 'ly', cost: 7000, ingredients: [{name:'Trà tắc',qty:1,unit:'ly'}] },
  { id: 'm30', name: 'Sting/Up/Pepsi/Sprite', category: 'Giải Khát', price: 15000, unit: 'lon', cost: 9000, ingredients: [{name:'Nước ngọt',qty:1,unit:'lon'}] },
  { id: 'm31', name: 'Bò húc', category: 'Giải Khát', price: 20000, unit: 'lon', cost: 12000, ingredients: [{name:'Bò húc',qty:1,unit:'lon'}] },

  // RƯỢU
  { id: 'm32', name: 'Mơ ngâm', category: 'Rượu', price: 50000, unit: 'ly', cost: 20000, ingredients: [{name:'Rượu mơ',qty:1,unit:'ly'}] },
  { id: 'm33', name: 'Dâu tằm', category: 'Rượu', price: 50000, unit: 'ly', cost: 20000, ingredients: [{name:'Rượu dâu tằm',qty:1,unit:'ly'}] },

  // BEER
  { id: 'm34', name: 'Bia Tiger Nâu', category: 'Beer', price: 18000, unit: 'lon', cost: 11000, ingredients: [{name:'Bia Tiger Nâu',qty:1,unit:'lon'}] },
  { id: 'm35', name: 'Bia Tiger Bạc', category: 'Beer', price: 18000, unit: 'lon', cost: 11000, ingredients: [{name:'Bia Tiger Bạc',qty:1,unit:'lon'}] },
  { id: 'm36', name: 'Ken Lớn', category: 'Beer', price: 22000, unit: 'lon', cost: 13000, ingredients: [{name:'Ken Lớn',qty:1,unit:'lon'}] },
  { id: 'm37', name: 'Sài Gòn', category: 'Beer', price: 18000, unit: 'lon', cost: 11000, ingredients: [{name:'Bia Sài Gòn',qty:1,unit:'lon'}] },
];

const DEFAULT_INVENTORY = [
  { id:'i01', name:'Khô cá mối', qty:50, unit:'phần', minQty:10, costPerUnit:15000 },
  { id:'i02', name:'Khô cá chỉ vàng', qty:50, unit:'phần', minQty:10, costPerUnit:14000 },
  { id:'i03', name:'Khô cá thiều', qty:40, unit:'phần', minQty:8, costPerUnit:18000 },
  { id:'i04', name:'Khô cá bống', qty:40, unit:'phần', minQty:8, costPerUnit:14000 },
  { id:'i05', name:'Khô cá khoai', qty:40, unit:'phần', minQty:8, costPerUnit:17000 },
  { id:'i06', name:'Khô cá đao', qty:40, unit:'phần', minQty:8, costPerUnit:14000 },
  { id:'i07', name:'Khô cá đuối', qty:30, unit:'phần', minQty:5, costPerUnit:38000 },
  { id:'i08', name:'Lạp vịt', qty:60, unit:'phần', minQty:15, costPerUnit:12000 },
  { id:'i09', name:'Khô cá bò', qty:40, unit:'phần', minQty:8, costPerUnit:15000 },
  { id:'i10', name:'Mực khô', qty:20, unit:'phần', minQty:5, costPerUnit:80000 },
  { id:'i11', name:'Mực 1 nắng', qty:15, unit:'phần', minQty:3, costPerUnit:150000 },
  { id:'i12', name:'Vịt lộn', qty:60, unit:'trứng', minQty:20, costPerUnit:11000 },
  { id:'i13', name:'Bầu', qty:5, unit:'kg', minQty:1, costPerUnit:15000 },
  { id:'i14', name:'Bơ', qty:500, unit:'g', minQty:100, costPerUnit:200 },
  { id:'i15', name:'Tỏi', qty:300, unit:'g', minQty:50, costPerUnit:50 },
  { id:'i16', name:'Cá sụn xịn', qty:3, unit:'kg', minQty:0.5, costPerUnit:200000 },
  { id:'i17', name:'Ba chỉ heo', qty:2, unit:'kg', minQty:0.5, costPerUnit:175000 },
  { id:'i18', name:'Xoài xanh', qty:3, unit:'kg', minQty:1, costPerUnit:20000 },
  { id:'i19', name:'Bắp ngô', qty:20, unit:'trái', minQty:5, costPerUnit:5000 },
  { id:'i20', name:'Đậu phụ', qty:2, unit:'kg', minQty:0.5, costPerUnit:25000 },
  { id:'i21', name:'Hành lá', qty:300, unit:'g', minQty:50, costPerUnit:40000 },
  { id:'i22', name:'Trứng bắc thảo', qty:20, unit:'trứng', minQty:5, costPerUnit:8000 },
  { id:'i23', name:'Củ kiệu', qty:500, unit:'g', minQty:100, costPerUnit:80000 },
  { id:'i24', name:'Tôm khô', qty:300, unit:'g', minQty:50, costPerUnit:400000 },
  { id:'i25', name:'Khoai tây', qty:2, unit:'kg', minQty:0.5, costPerUnit:30000 },
  { id:'i26', name:'Phô mai bột', qty:200, unit:'g', minQty:50, costPerUnit:200000 },
  { id:'i27', name:'Chân gà', qty:40, unit:'cái', minQty:10, costPerUnit:3500 },
  { id:'i28', name:'Trà đào', qty:30, unit:'ly', minQty:5, costPerUnit:8000 },
  { id:'i29', name:'Trà măng cầu', qty:30, unit:'ly', minQty:5, costPerUnit:10000 },
  { id:'i30', name:'Trà tắc', qty:30, unit:'ly', minQty:5, costPerUnit:7000 },
  { id:'i31', name:'Nước ngọt', qty:48, unit:'lon', minQty:12, costPerUnit:9000 },
  { id:'i32', name:'Bò húc', qty:24, unit:'lon', minQty:6, costPerUnit:12000 },
  { id:'i33', name:'Rượu mơ', qty:10, unit:'ly', minQty:3, costPerUnit:20000 },
  { id:'i34', name:'Rượu dâu tằm', qty:10, unit:'ly', minQty:3, costPerUnit:20000 },
  { id:'i35', name:'Bia Tiger Nâu', qty:48, unit:'lon', minQty:12, costPerUnit:11000 },
  { id:'i36', name:'Bia Tiger Bạc', qty:48, unit:'lon', minQty:12, costPerUnit:11000 },
  { id:'i37', name:'Ken Lớn', qty:24, unit:'lon', minQty:6, costPerUnit:13000 },
  { id:'i38', name:'Bia Sài Gòn', qty:48, unit:'lon', minQty:12, costPerUnit:11000 },
  { id:'i39', name:'Dầu ăn', qty:2, unit:'lít', minQty:0.5, costPerUnit:35000 },
  { id:'i40', name:'Lá dổi', qty:100, unit:'lá', minQty:20, costPerUnit:500 },
  { id:'i41', name:'Muối ớt', qty:20, unit:'gói', minQty:5, costPerUnit:5000 },
  { id:'i42', name:'Tôm 1 nắng', qty:10, unit:'phần', minQty:2, costPerUnit:100000 },
];

const CATEGORIES = ['Khô Nướng','Đặc Biệt','Phần Combo','Món Ăn Kèm','Giải Khát','Rượu','Beer'];

const PAYMENT_INFO = {
  bank: 'Vietinbank',
  account: '0937707900',
  name: 'Gánh Khô Chữa Lành',
};

// VietQR template
function getVietQR(amount, desc) {
  const acc = PAYMENT_INFO.account;
  const bank = '970415'; // Vietinbank BIN
  const encodedDesc = encodeURIComponent(desc || 'Thanh toan');
  return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodeURIComponent(PAYMENT_INFO.name)}`;
}
