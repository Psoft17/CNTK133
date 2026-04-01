# 🧠 CLAUDE CODE TEAM – CONGNO APP

## 🎯 Mục tiêu
Xây dựng & phát triển ứng dụng quản lý công nợ nội bộ:
- UI đẹp, mượt, hiện đại
- Logic tài chính chính xác tuyệt đối
- Dễ mở rộng (multi-branch, multi-user)
- Tối ưu hiệu năng + realtime Supabase

---

# 🏢 CƠ CẤU TEAM (PHÒNG BAN)

## 1. 🧑‍💼 PRODUCT MANAGER (PM)
**Nhiệm vụ:**
- Quyết định feature
- Viết spec rõ ràng
- Ưu tiên roadmap

**Rule:**
- Không viết code
- Chỉ mô tả yêu cầu

**Prompt mẫu:**
> Bạn là Product Manager. Hãy viết spec chi tiết cho tính năng [X], bao gồm: user flow, edge case, data structure.

---

## 2. 🎨 UI/UX DESIGNER
**Nhiệm vụ:**
- Thiết kế layout
- Cải thiện trải nghiệm người dùng
- Tối ưu mobile

**Focus trong file hiện tại:**
- Sidebar
- Card dashboard
- Modal UX
- Responsive

**Prompt mẫu:**
> Bạn là UI/UX Designer. Hãy cải thiện giao diện phần [X] theo phong cách SaaS hiện đại, giữ tone hiện tại.

---

## 3. 💻 FRONTEND ENGINEER
**Nhiệm vụ:**
- Xử lý DOM
- Event (onclick, modal, form)
- Render UI

**File chính:**
- CongnoTK.html

**Rule:**
- Không đụng DB trực tiếp
- Tách function rõ ràng

**Prompt mẫu:**
> Bạn là Frontend Engineer. Refactor đoạn code này thành module rõ ràng, dễ maintain.

---

## 4. 🧠 BACKEND ENGINEER (Supabase)
**Nhiệm vụ:**
- Thiết kế database
- API logic
- Realtime

**Công nghệ:**
- Supabase
- Postgres

**Rule:**
- Không viết UI
- Luôn validate dữ liệu

**Prompt mẫu:**
> Bạn là Backend Engineer. Thiết kế schema Supabase cho tính năng [X], bao gồm table + relationship + index.

---

## 5. 📊 DATA ENGINEER
**Nhiệm vụ:**
- Tính toán công nợ
- Gợi ý thanh toán tối ưu
- Tổng hợp số liệu dashboard

**Quan trọng:**
- Logic balance
- Debt simplification

**Prompt mẫu:**
> Bạn là Data Engineer. Viết thuật toán tối ưu thanh toán giữa nhiều người sao cho ít giao dịch nhất.

---

## 6. 🧪 QA TESTER
**Nhiệm vụ:**
- Test logic
- Test UI
- Tìm bug

**Focus:**
- Tính tiền sai
- Edge case chia tiền
- Lỗi nhập liệu

**Prompt mẫu:**
> Bạn là QA. Hãy liệt kê toàn bộ test case cho tính năng [X], bao gồm edge case.

---

## 7. ⚡ PERFORMANCE ENGINEER
**Nhiệm vụ:**
- Tối ưu tốc độ
- Giảm lag UI
- Tối ưu query Supabase

**Prompt mẫu:**
> Bạn là Performance Engineer. Tối ưu đoạn code này để giảm re-render và tăng tốc độ load.

---

## 8. 🔐 SECURITY ENGINEER
**Nhiệm vụ:**
- Bảo mật dữ liệu
- Validate input
- Tránh hack Supabase

**Prompt mẫu:**
> Bạn là Security Engineer. Kiểm tra lỗ hổng bảo mật trong đoạn code này.

---

# 🧩 QUY TRÌNH LÀM VIỆC (FLOW)

1. PM → viết yêu cầu
2. UI → thiết kế giao diện
3. Backend → thiết kế DB
4. Frontend → code UI + logic
5. Data → xử lý thuật toán
6. QA → test
7. Performance → tối ưu
8. Security → kiểm tra

---

# 📦 QUY TẮC CODE

- Không viết code spaghetti
- Function < 50 dòng
- Tách logic rõ:
  - UI
  - Data
  - API

---

# 🧠 NGUYÊN TẮC LÀM VIỆC VỚI CLAUDE

Luôn bắt đầu prompt bằng role:

Ví dụ:
- "Bạn là Frontend Engineer..."
- "Bạn là Data Engineer..."

---

# 🚀 ROADMAP GỢI Ý

## Giai đoạn 1
- CRUD nhân viên
- CRUD phiếu chi

## Giai đoạn 2
- Tối ưu thanh toán
- Dashboard đẹp

## Giai đoạn 3
- QR thanh toán
- Avatar
- Upload ảnh

## Giai đoạn 4
- Multi user
- Login
- Phân quyền

---

# ⚠️ NGUYÊN TẮC QUAN TRỌNG

- Không sửa code trực tiếp → luôn refactor
- Không hardcode dữ liệu
- Luôn xử lý lỗi

---

# 💡 TIP

Nếu code lỗi → gọi QA + Debug:

> Bạn là QA + Debugger. Hãy tìm lỗi trong đoạn code này và sửa triệt để.