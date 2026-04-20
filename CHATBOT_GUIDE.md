# Hướng Dẫn Dùng Chatbot POS

Chatbot hiện hiểu tốt nhất khi câu lệnh ngắn, rõ, và chỉ làm một việc trong một câu.

## Nguyên tắc ra lệnh

- Luôn nói rõ `bàn số mấy` nếu là thao tác bán hàng.
- Luôn nói rõ `tên món` và `số lượng`.
- Với báo cáo, nên nói rõ `hôm nay`, `hôm qua`, `tuần này`, `tháng này`, hoặc ngày cụ thể.
- Nếu muốn nhập kho nhanh, nói rõ `nhập thêm + số lượng + tên hàng`.
- Tránh gộp nhiều việc trong một câu như: `bàn 2 gọi 2 bia rồi tính tiền luôn`.

## Các nhóm lệnh đang hỗ trợ tốt

### 1. Gọi món tại bàn

Mẫu câu:

- `Bàn 2 gọi 3 tiger bạc`
- `Bàn 5 thêm 1 khô cá bò, 2 pepsi`
- `Bàn 8 cho thêm 1 mực khô`

Mẹo:

- Dùng đúng tên món hoặc alias gần đúng.
- Nếu có nhiều món, ngăn cách bằng dấu phẩy.

### 2. Bớt hoặc xóa món

Mẫu câu:

- `Bớt 1 tiger bạc bàn 2`
- `Xóa 1 pepsi bàn 5`
- `Hủy 1 mực khô bàn 8`

### 3. Mở hoặc xem bàn

Mẫu câu:

- `Mở bàn 3`
- `Xem bàn 6`
- `Bàn nào đang trống`

### 4. Tính tiền

Mẫu câu:

- `Tính tiền bàn 5`
- `Thanh toán bàn 2`
- `Xuất bill bàn 9`

### 5. Hỏi doanh thu

Mẫu câu:

- `Hôm nay bán được bao nhiêu`
- `Doanh thu hôm qua`
- `Doanh thu tuần này`
- `Doanh thu tháng này`
- `Ngày 15/4 bán được bao nhiêu`

### 6. Hỏi nhập hàng

Mẫu câu:

- `Hôm nay nhập hàng bao nhiêu`
- `Tháng này nhập hàng bao nhiêu`
- `Báo cáo nhập hàng hôm qua`

### 7. Hỏi tồn kho

Mẫu câu:

- `Kiểm tra tồn kho khô cá bò`
- `Còn bao nhiêu mực khô`
- `Tồn kho pepsi`

### 8. Nhập kho nhanh

Mẫu câu:

- `Nhập thêm 10 mực khô`
- `Nhập 5 pepsi`
- `Nhập thêm 2 ký cá bò`

Lưu ý:

- Cách này phù hợp cho nhập nhanh.
- Nếu cần phiếu nhập đầy đủ nhà cung cấp, giá vốn, ảnh chứng từ thì nên dùng màn hình nhập hàng thủ công.

## Các kiểu thời gian nên dùng

- `hôm nay`
- `hôm qua`
- `tuần này`
- `tháng này`
- `ngày 15/4`
- `tháng 3`

## Những gì chatbot chưa nên dùng

- Sửa menu
- Xóa dữ liệu hàng loạt
- Gộp kho/phân loại dữ liệu master
- Ra lệnh nhiều bước trong một câu
- Các câu quá tự nhiên nhưng thiếu chủ thể, ví dụ: `làm cái kia đi`

## Cách nói để chatbot hiểu tốt nhất

- Tốt: `Bàn 4 gọi 2 tiger bạc`
- Tốt: `Bớt 1 pepsi bàn 4`
- Tốt: `Doanh thu tháng này`
- Chưa tốt: `bàn đó thêm cho em mấy chai giống hôm nãy`
- Chưa tốt: `xử lý bàn 4 luôn đi`

## Mẫu dùng nhanh cho nhân viên

- `Bàn 2 gọi 3 tiger bạc, 1 khô cá bò`
- `Bớt 1 tiger bạc bàn 2`
- `Tính tiền bàn 2`
- `Doanh thu hôm nay`
- `Tháng này nhập hàng bao nhiêu`
- `Kiểm tra tồn kho mực khô`
