const geminiTools = [
  {
    functionDeclarations: [
      {
        name: 'truy_van_bao_cao',
        description: [
          'Truy van bao cao POS tu Firestore collection history va Inventory_Items.',
          'Dung khi nguoi dung hoi doanh thu, so hoa don, tien mat/chuyen khoan, mon ban chay, loi nhuan uoc tinh, hoac ton kho mat hang ban thang.',
          'Ngay thang tinh theo mui gio Viet Nam GMT+7.',
        ].join(' '),
        parameters: {
          type: 'OBJECT',
          properties: {
            loai_bao_cao: {
              type: 'STRING',
              enum: [
                'tong_quan',
                'doanh_thu',
                'mon_ban_chay',
                'loi_nhuan',
                'ton_kho_ban_thang',
              ],
              description: 'Loai bao cao can xem. Neu nguoi dung hoi chung chung, dung tong_quan.',
            },
            ngay: {
              type: 'STRING',
              description: 'Mot ngay cu the, vi du 2026-04-16 hoac 16/04/2026. Bo trong neu dung tu_ngay/den_ngay.',
            },
            thoi_diem: {
              type: 'STRING',
              description: 'Mot thoi diem cu the co ca gio, vi du 2026-05-10 17:00, 10/05/2026 17:00, hoac 2026-05-10T17:00:00+07:00.',
            },
            tu_ngay: {
              type: 'STRING',
              description: 'Ngay bat dau, vi du 2026-04-01 hoac 01/04/2026.',
            },
            den_ngay: {
              type: 'STRING',
              description: 'Ngay ket thuc, vi du 2026-04-30 hoac 30/04/2026.',
            },
            tu_thoi_diem: {
              type: 'STRING',
              description: 'Thoi diem bat dau co ca gio, vi du 2026-05-10 17:00 hoac 10/05/2026 17:00.',
            },
            den_thoi_diem: {
              type: 'STRING',
              description: 'Thoi diem ket thuc co ca gio. Neu nguoi dung noi "den bay gio" thi co the bo trong truong nay.',
            },
            khoang_thoi_gian: {
              type: 'STRING',
              enum: ['hom_nay', 'hom_qua', 'tuan_nay', 'thang_nay', 'nam_nay', 'den_bay_gio'],
              description: 'Dung cho cac cau nhu hom nay, hom qua, tuan nay, thang nay, nam nay, hoac den bay gio.',
            },
            ten_mon: {
              type: 'STRING',
              description: 'Ten mon hang neu nguoi dung muon loc rieng mot mon trong history.items. Dac biet quan trong cho cac cau hoi loi nhuan/doanh thu cua mot mon cu the, vi du bia Heineken.',
            },
            phuong_thuc_thanh_toan: {
              type: 'STRING',
              enum: ['cash', 'bank', 'all'],
              description: 'Loc theo payMethod trong history: cash, bank, hoac all.',
            },
            gioi_han: {
              type: 'NUMBER',
              description: 'So dong top/list tra ve. Mac dinh 10, toi da 50.',
            },
          },
          required: ['loai_bao_cao'],
        },
      },
      {
        name: 'tra_cuu_lich_su_nhap_kho',
        description: [
          'Tra cuu lich su nhap kho tu Firestore collection purchases.',
          'Dung khi nguoi dung hoi da nhap hang gi, tong tien nhap, so luong nhap, nha cung cap, lich su mua/nguyen lieu trong kho.',
          'Collection purchases co cac field id, name, qty, unit, price, costPerUnit, date, supplier, supplierId, supplierPhone, supplierAddress, note, photoBatchId.',
        ].join(' '),
        parameters: {
          type: 'OBJECT',
          properties: {
            ngay: {
              type: 'STRING',
              description: 'Mot ngay cu the, vi du 2026-04-16 hoac 16/04/2026. Bo trong neu dung tu_ngay/den_ngay.',
            },
            tu_ngay: {
              type: 'STRING',
              description: 'Ngay bat dau, vi du 2026-04-01 hoac 01/04/2026.',
            },
            den_ngay: {
              type: 'STRING',
              description: 'Ngay ket thuc, vi du 2026-04-30 hoac 30/04/2026.',
            },
            khoang_thoi_gian: {
              type: 'STRING',
              enum: ['hom_nay', 'hom_qua', 'tuan_nay', 'thang_nay', 'nam_nay'],
              description: 'Dung cho cac cau nhu hom nay, hom qua, tuan nay, thang nay, nam nay.',
            },
            ten_hang: {
              type: 'STRING',
              description: 'Ten hang/nguyen lieu can tra cuu trong purchases.name, vi du Tiger bac, muc kho, dau hu.',
            },
            nha_cung_cap: {
              type: 'STRING',
              description: 'Ten nha cung cap can loc theo purchases.supplier.',
            },
            gioi_han: {
              type: 'NUMBER',
              description: 'So dong lich su gan nhat tra ve. Mac dinh 10, toi da 50.',
            },
          },
        },
      },
      {
        name: 'nhap_hang_thu_cong',
        description: [
          'Tao phieu nhap hang thu cong tu tin nhan hoac anh hoa don.',
          'Tool nay la ACTION TOOL: khong ghi truc tiep vao purchases, chi tao hanh dong cho quan ly bam xac nhan tren Telegram.',
        ].join(' '),
        parameters: {
          type: 'OBJECT',
          properties: {
            items: {
              type: 'ARRAY',
              description: 'Danh sach hang can nhap.',
              items: {
                type: 'OBJECT',
                properties: {
                  ten_hang: { type: 'STRING', description: 'Ten hang/nguyen lieu.' },
                  so_luong: { type: 'NUMBER', description: 'So luong nhap.' },
                  don_vi: { type: 'STRING', description: 'Don vi tinh, vi du kg, lon, con, bich.' },
                  don_gia: { type: 'NUMBER', description: 'Don gia mot don vi neu co.' },
                  tong_tien: { type: 'NUMBER', description: 'Tong tien cua dong hang neu co.' },
                  ghi_chu: { type: 'STRING', description: 'Ghi chu rieng cho dong hang.' },
                },
                required: ['ten_hang', 'so_luong'],
              },
            },
            nha_cung_cap: { type: 'STRING', description: 'Ten nha cung cap neu co.' },
            ngay: { type: 'STRING', description: 'Ngay nhap hang, vi du 2026-04-26 hoac 26/04/2026. Mac dinh la hien tai.' },
            ghi_chu: { type: 'STRING', description: 'Ghi chu chung.' },
          },
          required: ['items'],
        },
      },
      {
        name: 'sua_menu',
        description: [
          'Tao yeu cau sua ten hoac gia cua mot mon/hang trong Inventory_Items.',
          'Tool nay la ACTION TOOL: khong ghi truc tiep, chi tao hanh dong cho quan ly xac nhan tren Telegram.',
        ].join(' '),
        parameters: {
          type: 'OBJECT',
          properties: {
            ma_hang: { type: 'STRING', description: 'Ma inv_id/doc id neu biet.' },
            ten_hang_hien_tai: { type: 'STRING', description: 'Ten hang/mon hien tai can tim.' },
            ten_moi: { type: 'STRING', description: 'Ten moi neu can doi.' },
            gia_moi: { type: 'NUMBER', description: 'Gia moi neu can doi.' },
            ghi_chu: { type: 'STRING', description: 'Ly do hoac ghi chu.' },
          },
        },
      },
      {
        name: 'goi_mon_ban',
        description: [
          'Tao yeu cau len order moi cho ban hoac mang ve.',
          'Tool nay la ACTION TOOL: khong ghi truc tiep vao orders/kitchen_notifications, chi tao hanh dong cho quan ly xac nhan tren Telegram.',
        ].join(' '),
        parameters: {
          type: 'OBJECT',
          properties: {
            ban: { type: 'STRING', description: 'So ban hoac takeaway/mang ve.' },
            items: {
              type: 'ARRAY',
              description: 'Danh sach mon can goi.',
              items: {
                type: 'OBJECT',
                properties: {
                  ma_mon: { type: 'STRING', description: 'Ma mon neu biet.' },
                  ten_mon: { type: 'STRING', description: 'Ten mon.' },
                  so_luong: { type: 'NUMBER', description: 'So luong.' },
                  gia: { type: 'NUMBER', description: 'Gia ban neu biet.' },
                  ghi_chu: { type: 'STRING', description: 'Ghi chu rieng cua mon.' },
                },
                required: ['ten_mon', 'so_luong'],
              },
            },
            ghi_chu: { type: 'STRING', description: 'Ghi chu chung cua order.' },
          },
          required: ['items'],
        },
      },
    ],
  },
];

module.exports = {
  geminiTools,
};
