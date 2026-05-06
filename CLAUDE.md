# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan

**Quản Lý Công Nợ** — ứng dụng quản lý chi tiêu nội bộ cho chi nhánh "133 Trung Kính". SPA thuần HTML/CSS/JS, backend là Supabase.

## Chạy ứng dụng

Không có build step. Mở trực tiếp file `index (4).html` trong trình duyệt (hoặc serve qua Live Server). Không cần `npm install`, không có bundler.

Cấu hình Supabase nằm ở đầu [js/api.js](js/api.js):
```js
const SUPABASE_URL  = '...';
const SUPABASE_ANON = '...';
```

## Kiến trúc

### Luồng dữ liệu chính

```
init() [logic.js]
  → loadAllData() [api.js]     ← fetch song song 6 bảng Supabase
  → renderAll(D) [ui.js]       ← render toàn bộ UI từ cache D
  → startRealtime() [api.js]   ← WebSocket Postgres changes → debounce 300ms → reload D + renderAll
```

Toàn bộ trạng thái ứng dụng nằm trong biến toàn cục `D` (khai báo trong [js/ui.js](js/ui.js)). Mỗi thay đổi realtime từ Supabase đều reload lại `D` và gọi `renderAll(D)`.

### Phân chia file JS

| File | Trách nhiệm |
|------|-------------|
| [js/api.js](js/api.js) | Khởi tạo Supabase client, `loadAllData()`, tính số dư (`calcSoDu`), thuật toán gợi ý thanh toán tối ưu (`calcGoiY` — min-cash-flow), realtime subscription |
| [js/ui.js](js/ui.js) | Biến global state, tất cả hàm `render*()`, pagination (`_pgRender`), helper UI (`toast`, `openModal`, `gotoPage`, v.v.) |
| [js/modal.js](js/modal.js) | Crop/image editor engine (canvas), form mở sửa (`moSuaPC/NQ/CQ/TT`), luồng QR thanh toán |
| [js/logic.js](js/logic.js) | Tất cả CRUD (insert/update/delete Supabase), upload ảnh lên Storage, hàm `init()` boot |

### Database schema (Supabase)

| Bảng | Mô tả |
|------|-------|
| `nhan_vien` | Nhân viên (`id`, `ho_ten`, `email`, `avatar_url`, `qr_url`) |
| `phieu_chi` | Phiếu chi (`id`, `mo_ta`, `so_tien_tong`, `nguoi_ung_id`, `ngay_tao`) |
| `chi_tiet_phieu_chi` | Phân bổ chi phí (`phieu_chi_id`, `nhan_vien_id`, `so_tien_chia`) |
| `thanh_toan` | Thanh toán công nợ (`nguoi_tra_id`, `nguoi_nhan_id`, `so_tien`) |
| `quy_nop` | Nộp quỹ chung (`nhan_vien_id`, `so_tien`, `mo_ta`, `ngay_nop`) |
| `quy_chi` | Chi quỹ chung (`mo_ta`, `so_tien`, `ngay_tao`) |
| `phien_ban` | Lịch sử phiên bản (`ver`, `updated`, `link`) |
| `phan_hoi` | Phản hồi người dùng (`noi_dung`) |

Storage buckets: `avatars` (ảnh đại diện, 200×200px) và `qrcodes` (QR ngân hàng, 600×600px).

### Tính số dư và gợi ý thanh toán

`calcSoDu()` tính net balance từng người:
- Khi tham gia phiếu chi: người ứng **+** phần của mình, các người khác **−** phần của họ
- Khi thanh toán: người trả **+**, người nhận **−**

`calcGoiY()` dùng thuật toán min-cash-flow: lấy danh sách creditors (soDu > 0) và debtors (soDu < 0), ghép cặp greedy để tối thiểu số giao dịch.

### Pagination

State lưu trong `_pgState[key]` (page, size). Mỗi bảng có key riêng: `'pc'`, `'nq'`, `'cq'`, `'tt'`. `_pgRender()` nhận array đã filter và render trực tiếp vào DOM.

### Kiểm tra phiên bản

`checkVersion()` so sánh URL hiện tại (chuẩn hóa bởi `_normalizeUrl()`) với bảng `phien_ban` trong DB. Nếu có bản mới hơn → hiện banner cập nhật tự động ẩn sau 12 giây.

## Quy ước code

- Tên biến/hàm: camelCase tiếng Việt (ví dụ: `hoTen`, `soTien`, `nguoiUngID`)
- Tên cột DB: snake_case (ví dụ: `ho_ten`, `so_tien`, `nguoi_ung_id`)
- ID bản ghi: prefix + timestamp + random 2 chữ số (ví dụ: `PC2504281530xx`, `NV2504281530xx`)
- Ngày tháng: định dạng `DD/MM/YYYY` (lưu thẳng vào DB dạng string)
- Số tiền: VNĐ, tối thiểu 1.000đ cho mọi giao dịch
- Không tự động xóa các chức năng trước đó khi chưa được sự cho phép
- Giao diện hiện đại luôn kèm hiệu ứng mượt mà
