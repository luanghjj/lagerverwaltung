# 📖 Hướng dẫn sử dụng Dành cho Nhân viên (Mitarbeiter - Handbuch)
**Lagerverwaltung / Quản lý kho Okyu Gastro Group** (Phiên bản: v2.0.0)

---

Tài liệu này tập trung hướng dẫn các **thao tác hàng ngày** dành cho quyền **Staff (Nhân viên)**. Giao diện của bạn đã được tối ưu và ẩn bớt các phần cài đặt quản trị phức tạp để bạn tập trung làm việc nhanh nhất.

## 1. Đăng nhập (Anmeldung)
- Mỗi nhân viên sẽ sử dụng một mã **PIN 6 chữ số** riêng biệt để đăng nhập. *(Jeder Mitarbeiter hat eine eigene 6-stellige PIN).*
- **Lưu ý:** Tuyệt đối không chia sẻ PIN cho người khác. Nếu quên, hãy nhờ Quản lý (Manager/Admin) cấp lại mã mới.

---

## 2. Thao tác hàng ngày (Tägliche Aufgaben)

### 📥 1. Nhập kho (Wareneingang) & 📤 Xuất kho (Warenausgang)
Đây là công việc thường xuyên nhất. Bạn có 2 cách để thực hiện:
- **Cách 1 - Quét Mã Vạch (Barcode Scannen):** 
  Tại ứng dụng, bấm vào biểu tượng camera/mã vạch. Đưa camera vào tem dán trên sản phẩm để ứng dụng tự động nhảy tới mặt hàng đó. Bấm "Cộng" (Nhập) hoặc "Trừ" (Xuất).
- **Cách 2 - Tìm kiếm thủ công (Manuelle Suche):** 
  Gõ tên sản phẩm vào ô tìm kiếm. Ứng dụng hỗ trợ nhận diện **tiếng Việt không dấu** (ví dụ: gõ `gao` sẽ tìm ra `Gạo`).
- **Mẹo (Tipp):** Nhìn xuống dưới sẽ thấy phần **"Zzuletzt gebucht" (Lịch sử gần đây)**, giúp bạn thao tác ngay với các sản phẩm vừa cầm trên tay mà không phải tìm lại.

### 🍽 2. Yêu cầu Bổ sung hàng từ Nhà hàng (Restaurant - Auffüllen)
*(Tính năng dành cho team Bếp, Quầy Bar, v.v... khi cần xuất hàng ra từ Kho tổng)*
- Mở tab **Auffüllen (Bổ sung)** để xem theo đúng khu vực làm việc của bạn (VD: Bar, Sushi).
- Hệ thống tự căn cứ vào lượng hàng hiện có tại nhà hàng và tính toán sẵn **Soll-Bestand (Sức chứa chuẩn)** cùng **Fehlmenge (Số lượng đang thiếu)**.
- Khi một món hiện trạng thái **Leer (Hết)** hoặc **Nachfüllen (Cần bổ sung)**, bạn chỉ cần bấm **"Tạo yêu cầu" (Anforderung erstellen)**. Kho tổng sẽ nhận được lệnh và xuất hàng đưa xuống.

### 🆕 3. Gặp Sản phẩm mới chưa có mã (Warte auf Genehmigung / Pending)
Nếu bạn quét một mã vạch chưa có sẵn trên ứng dụng:
- Màn hình tìm kiếm sẽ trống rỗng. Hãy bấm vào nút **"Tạo mới" (Neu)**.
- Nhập các tên cơ bản (Tên, Đơn vị...).
- **Lưu ý quan trọng:** Sản phẩm sau khi nhân viên tạo sẽ tự động bị rơi vào trạng thái là **"Chờ duyệt" (Pending)**. Bạn sẽ KHÔNG THE nhập/xuất kho được ngay lúc này. Hãy chờ Admin hoặc Quản lý truy cập vào để bấm duyệt thì sản phẩm mới chính thức **Aktiv**.

### 🛒 4. Thêm hàng vào Danh sách Cần Mua (Bestellliste)
Nếu trong quá trình làm việc bạn thấy hộp cuối cùng vừa được lấy ra, đồ sắp hết (dưới chuẩn):
- Bạn có quyền chủ động thêm món đó vào **DS Đặt hàng (Bestellliste)**. 
- Bạn có thể thao tác tay chọn món, hoặc sử dụng nút **"Thêm SP thiếu" (Kritische hinzufügen)** để app tự tìm các đồ đang cạn kho và đưa vào danh sách cho Quản lý chuẩn bị mua.

---

## 3. Chế độ Mất mạng & Đồng bộ tự động (Offline-Modus & Auto-Sync)

Vì tính chất kho đôi khi vào sâu hoặc xuống hầm hay bị rớt Wi-Fi/Sóng điện thoại:
- **Luôn có thể bấm được (Immer nutzbar):** Nếu mất kết nối, ở góc ứng dụng sẽ hiện ra cảnh báo màu vàng mang dòng chữ **"⚠ Offline"**.
- **Đừng lo lắng, cứ quét tiếp:** Bạn hoàn toàn vẫn được quét Camera, xuất kho, nhập kho, tạo hàng mới như bình thường. Hệ thống sẽ **Giữ tạm số liệu ở hàng đợi cục bộ** trên máy bạn.
- **Đồng bộ về máy chủ (Auto-Sync):** Ngay khi bạn cầm điện thoại ra tới khu vực chạy được 4G/Wifi, chiếc nhãn vàng Offline lập tức chớp tắt, ứng dụng tự động **đẩy hết thao tác vừa làm âm thầm lên máy chủ**. Bạn không cần bấm nút "Lưu" nào nữa. Không mất đi một thao tác quét Barcode nào.

---

## 4. Các lỗi hay gặp và cách xử lý (Häufige Fehler)

- 🔴 **Máy báo "Sai PIN" (Falscher PIN):** 
  Hãy thử lại con số, kiểm tra xem có gõ nhầm hay không. Nếu quá số lần/không thể nhớ, báo liền cho quản lý.
- 🔴 **Quét Barcode mãi không nhận (Scan fehlerhaft):** 
  Do ánh sáng chói, bóng bọc nilon, hoặc tem bị nhàu/mờ mực in. Bạn hãy đọc dãy số in ngay bên dưới đường kẻ sọc Barcode, gõ bộ số đó trực tiếp vào phần search nhé!
- 🔴 **Tạo sản phẩm mới báo "Trùng mã / Tên" (SKU-Duplikat / Name Existiert):** 
  Điều này có nghĩa là món đồ đó thực chất mã vạch đó đã có người khác tạo mất rồi. Khả năng cao là nó đang nằm kẹt ở trong danh sách *"Chờ quản lý duyệt" (Pending)* nên bạn tìm kiếm chưa ra. Cứ báo sếp lên duyệt là được.
- 🔴 **Sao điện thoại của mình không có mục cài đặt nhà cung cấp/Backup dữ liệu?**
  Là vì giao diện Staff của bạn đã được Ban quản trị che đi các mục không liên quan để bảo vệ dữ liệu tránh bấm nhầm và giữ menu sạch gọn, giúp bạn tìm chỗ làm việc nhanh và đúng quy trình.

---
*Nếu có bất cứ vướng mắc hay báo lỗi giao diện (như mất nút, không lưu số, không nhảy camera), Nhân viên vui lòng báo ngay vào nhóm Zalo/Telegram chung để Admin Hỗ trợ Kỹ thuật giải quyết.*
