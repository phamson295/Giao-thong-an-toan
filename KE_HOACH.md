# KẾ HOẠCH XÂY DỰNG ỨNG DỤNG DẪN ĐƯỜNG "GIAO THÔNG AN TOÀN"

> Tài liệu định hướng, lập ngày 31/10/2026. Đây là bản kế hoạch, chưa phải thiết kế kỹ thuật chi tiết.

---

## 1. Mục tiêu

Ứng dụng di động hỗ trợ lái xe ô tô (có thể mở rộng xe máy) với các chức năng:

| Nhóm | Chức năng |
|---|---|
| Bản đồ & dẫn đường | Hiển thị vị trí trên bản đồ 2D/3D, tìm đường, chỉ đường bằng giọng nói |
| Cảnh báo theo dữ liệu bản đồ | Tốc độ giới hạn từng đoạn, biển cấm vượt / đoạn cấm vượt, camera giao thông, đường một chiều (đi ngược chiều), khu dân cư, trường học, đường cao tốc |
| Cảnh báo theo cảm biến/camera (ADAS) | Lệch làn đường, khoảng cách với xe phía trước, nhận diện biển báo bằng camera |

---

## 2. Phân tích: chức năng nào khó, chức năng nào dễ

Đây là điểm quan trọng nhất để lên kế hoạch đúng. Các chức năng chia thành **3 mức độ** rất khác nhau:

| Mức | Chức năng | Cách hoạt động | Độ khó |
|---|---|---|---|
| **A – Dễ** | Vị trí trên bản đồ 2D/3D, chỉ đường | GPS + thư viện bản đồ có sẵn | Thấp |
| **A – Dễ** | Cảnh báo vượt tốc độ | GPS đo tốc độ, so với tốc độ giới hạn của đoạn đường | Thấp (nếu có dữ liệu) |
| **B – Trung bình** | Biển cấm vượt, đoạn cấm vượt, camera giao thông, đường ngược chiều | GPS + **cơ sở dữ liệu điểm/đoạn đường** + so khớp vị trí với đường (map matching) | Trung bình – **khó nhất là thu thập dữ liệu** |
| **C – Khó** | Cảnh báo làn đường, khoảng cách xe phía trước, nhận diện biển báo bằng hình ảnh | Camera điện thoại + trí tuệ nhân tạo (AI) xử lý hình ảnh theo thời gian thực | Cao |

**Kết luận:** Không nên làm tất cả cùng lúc. Làm nhóm A trước, sau đó B, cuối cùng C.

---

## 3. So sánh các hướng công nghệ

### 3.1. Nền tảng lập trình ứng dụng

| Phương án | Ưu điểm | Nhược điểm | Đánh giá |
|---|---|---|---|
| **Flutter (Dart)** | Một mã nguồn chạy cả Android và iOS; giao diện đẹp; cộng đồng lớn ở VN | Xử lý camera + AI phức tạp hơn native một chút | **Khuyến nghị** cho giai đoạn 1–2 |
| React Native (JavaScript) | Một mã nguồn cho 2 nền tảng; nhiều thư viện | Hiệu năng bản đồ 3D, camera kém hơn | Phù hợp nếu đã biết JavaScript |
| Native Android (Kotlin) | Hiệu năng cao nhất, xử lý camera/AI tốt nhất | Chỉ chạy Android; muốn có iOS phải viết lại | Phù hợp nếu chỉ cần Android |

> Với nền tảng Pascal + thuật toán cơ bản, Flutter (ngôn ngữ Dart) có cú pháp rõ ràng, dễ học hơn cả.

> **Cập nhật 31/10/2026:** Do nhóm đã quen Next.js/React/NestJS/PostGIS, chuyển sang **React Native (Expo) + MapLibre** cho ứng dụng di động và **NestJS + PostGIS + Redis** cho backend. Chi tiết và lý do: `docs/KIEN_TRUC.md`.

### 3.2. Bản đồ và dữ liệu đường

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| **OpenStreetMap (OSM) + MapLibre** | Miễn phí, mở; có sẵn thẻ dữ liệu `maxspeed` (tốc độ), `oneway` (một chiều), `overtaking` (cấm vượt), `highway=speed_camera` (camera); hỗ trợ 2D/3D, chạy offline | Dữ liệu ở Việt Nam **chưa đầy đủ**, phải tự bổ sung |
| Vietmap / Goong (nhà cung cấp Việt Nam) | Dữ liệu đường Việt Nam chi tiết hơn; Vietmap có dữ liệu biển báo, tốc độ | Thu phí theo lượt dùng; phụ thuộc nhà cung cấp |
| Google Maps / Mapbox | Bản đồ đẹp, 3D tốt, tìm đường tốt | Chi phí cao; **không cung cấp** dữ liệu tốc độ giới hạn/biển báo chi tiết cho bên thứ ba |

**Khuyến nghị:** Dùng **MapLibre + dữ liệu OSM** làm nền, xây dựng **cơ sở dữ liệu cảnh báo riêng** (tốc độ, cấm vượt, camera). Cân nhắc mua dữ liệu Vietmap nếu có kinh phí.

> Lưu ý: Tôi chưa xác minh được mức độ đầy đủ hiện tại của dữ liệu OSM tại từng tỉnh và giá dịch vụ của Vietmap/Goong – cần kiểm tra trực tiếp khi triển khai.

### 3.3. Tìm đường (routing)

- **OSRM, Valhalla, GraphHopper**: phần mềm mã nguồn mở, chạy trên máy chủ riêng với dữ liệu OSM. Valhalla hỗ trợ tốt cả ô tô và xe máy.
- Hoặc dùng API tìm đường của Vietmap/Goong (trả phí, nhanh triển khai).

### 3.4. AI xử lý camera (giai đoạn 3)

- Nhận diện xe phía trước, biển báo: mô hình **YOLO** (bản nhẹ, chạy trên điện thoại qua TensorFlow Lite / ONNX).
- Nhận diện làn đường: mô hình lane detection (ví dụ Ultra-Fast-Lane-Detection).
- Ước lượng khoảng cách: dựa vào kích thước khung xe trong ảnh + thông số camera; tính **thời gian va chạm (TTC) = khoảng cách / tốc độ tương đối**.
- Cần bộ dữ liệu ảnh biển báo **theo QCVN 41:2024/BGTVT** (biển báo Việt Nam khác biển quốc tế ở một số mẫu).

---

## 4. Thiết kế dữ liệu cảnh báo (phần cốt lõi)

### 4.1. Bảng dữ liệu đề xuất

**Bảng `DOAN_DUONG_TOC_DO`** (tốc độ giới hạn theo đoạn)

| Trường | Ý nghĩa | Ví dụ |
|---|---|---|
| id | Mã đoạn | 1024 |
| hinh_hoc | Đường gấp khúc (danh sách tọa độ) | LINESTRING(...) |
| huong | Áp dụng chiều nào: 2 chiều / xuôi / ngược | xuôi |
| toc_do_oto | Km/h | 60 |
| toc_do_xe_may | Km/h | 50 |
| loai_khu_vuc | Khu dân cư / ngoài khu dân cư / cao tốc | khu dân cư |
| nguon | OSM / khảo sát / người dùng | khảo sát |
| ngay_cap_nhat | | 15/10/2026 |

**Bảng `DIEM_CANH_BAO`** (biển báo, camera)

| Trường | Ý nghĩa | Ví dụ |
|---|---|---|
| id | | 553 |
| loai | camera_toc_do / camera_den_do / bien_cam_vuot / het_cam_vuot / truong_hoc ... | camera_toc_do |
| vi_do, kinh_do | Tọa độ | 21.0285, 105.8542 |
| huong_xe | Góc hướng xe áp dụng (0–360°) | 90 |
| gia_tri | Giá trị kèm theo (nếu có) | 50 km/h |

**Bảng `DOAN_CAM_VUOT`**: tương tự bảng tốc độ, lưu điểm bắt đầu – kết thúc.

**Đường một chiều**: lấy từ thẻ `oneway` của OSM, lưu kèm chiều cho phép.

### 4.2. Thuật toán cảnh báo (mô tả bằng giả mã)

```
Mỗi 1 giây:
  Đọc GPS -> (vi_tri, toc_do, huong_di)
  doan = MapMatching(vi_tri, huong_di)        // xác định xe đang ở đoạn đường nào

  // 1. Cảnh báo tốc độ
  gioi_han = doan.toc_do_oto
  Nếu toc_do > gioi_han + 3 km/h trong 3 giây liên tục:
      Phát âm thanh "Bạn đang vượt tốc độ, giới hạn 60"

  // 2. Cảnh báo đi ngược chiều
  Nếu doan là đường một chiều VÀ
     |huong_di - huong_cho_phep| > 120° VÀ toc_do > 5 km/h trong 5 giây:
      Cảnh báo "Bạn đang đi ngược chiều"

  // 3. Cảnh báo điểm phía trước (camera, biển cấm vượt...)
  Với mỗi diem trong DIEM_CANH_BAO cách xe < 500 m:
      Nếu diem nằm phía trước VÀ cùng hướng đi (lệch < 45°) VÀ chưa cảnh báo:
          Đọc "Phía trước 300 mét có camera giám sát tốc độ"

  // 4. Đoạn cấm vượt
  Nếu xe đang nằm trong DOAN_CAM_VUOT: hiển thị biểu tượng cấm vượt trên màn hình
```

Các điểm kỹ thuật cần chú ý:
- **Map matching** (gắn vị trí GPS vào đúng làn/đường): GPS điện thoại sai số 5–15 m, dễ nhầm đường song song hoặc cầu vượt. Dùng hướng di chuyển + lịch sử vị trí để chọn đúng đoạn.
- **Lọc nhiễu GPS**: dùng bộ lọc Kalman hoặc trung bình trượt, tránh cảnh báo sai.
- **Chống cảnh báo lặp**: mỗi điểm chỉ cảnh báo 1 lần mỗi lượt đi qua.

---

## 5. Lộ trình thực hiện

### Giai đoạn 0 – Chuẩn bị (2–4 tuần)
- Xác định phạm vi: thử nghiệm trước tại **1 tỉnh/thành** (ví dụ địa bàn quen thuộc).
- Học cơ bản Flutter/Dart (hoặc thuê/hợp tác lập trình viên).
- Đăng ký tài khoản nhà phát triển: Google Play (25 USD, một lần), Apple (99 USD/năm).
- Rà soát quy định pháp luật (mục 7).

### Giai đoạn 1 – MVP: Bản đồ + cảnh báo tốc độ (2–3 tháng)
- [ ] Hiển thị bản đồ 2D, chế độ 3D (nghiêng bản đồ, tòa nhà 3D), vị trí xe, hướng xe.
- [ ] Hiển thị tốc độ hiện tại và tốc độ giới hạn của đoạn đường.
- [ ] Cảnh báo vượt tốc độ bằng âm thanh + giọng nói tiếng Việt.
- [ ] Chạy nền khi tắt màn hình; hỗ trợ bản đồ offline.
- **Kết quả:** ứng dụng dùng được hằng ngày ở mức cơ bản.

### Giai đoạn 2 – Cảnh báo theo dữ liệu (3–4 tháng)
- [ ] Cơ sở dữ liệu điểm cảnh báo: camera, biển cấm vượt, đoạn cấm vượt, trường học, khu dân cư.
- [ ] Cảnh báo đi ngược chiều.
- [ ] Tìm đường và chỉ đường bằng giọng nói.
- [ ] Máy chủ + trang quản trị để cập nhật dữ liệu; điện thoại tự đồng bộ.
- [ ] Chức năng **người dùng báo cáo** (thêm/sửa camera, biển báo) có kiểm duyệt.
- **Kết quả:** đầy đủ các cảnh báo dựa trên bản đồ.

### Giai đoạn 3 – ADAS dùng camera (4–6 tháng, có thể làm song song khi có nhân lực)
- [ ] Nhận diện xe phía trước, cảnh báo khoảng cách / nguy cơ va chạm.
- [ ] Cảnh báo lệch làn đường.
- [ ] Nhận diện biển báo bằng camera (bổ sung, đối chiếu với dữ liệu bản đồ).
- **Yêu cầu:** điện thoại gắn cố định trên kính lái; máy cấu hình khá; cần thử nghiệm thực tế nhiều.

### Giai đoạn 4 – Hoàn thiện, phát hành (liên tục)
- Thử nghiệm thực tế trên nhiều tuyến, đo tỷ lệ cảnh báo sai.
- Phát hành trên Google Play / App Store.
- Cập nhật dữ liệu định kỳ.

---

## 6. Thu thập dữ liệu – phần tốn công nhất

| Nguồn | Nội dung | Ghi chú |
|---|---|---|
| OpenStreetMap | Đường, một chiều, một phần tốc độ, camera | Tải miễn phí bản Việt Nam (Geofabrik) |
| Quy định pháp luật | Tốc độ mặc định theo loại đường | Áp dụng khi đoạn đường không có biển riêng |
| Khảo sát thực địa | Biển báo, camera | Có thể quay video hành trình rồi ghi tọa độ |
| Cộng đồng người dùng | Báo cáo camera, biển mới | Cần cơ chế kiểm duyệt, xác nhận nhiều người |
| Nhà cung cấp (Vietmap…) | Dữ liệu biển báo, tốc độ | Trả phí |
| Văn bản cơ quan quản lý đường | Phương án tổ chức giao thông | Có thể xin/trích từ Sở Xây dựng (trước đây Sở GTVT) |

**Mẹo thực tế:** Ghi nhận tọa độ biển báo khi đi đường bằng chính ứng dụng (nút "Đánh dấu biển báo" một chạm) – sẽ tích lũy dữ liệu nhanh cho địa bàn thử nghiệm.

---

## 7. Lưu ý pháp lý và an toàn

| Vấn đề | Nội dung cần lưu ý |
|---|---|
| Tốc độ giới hạn | Theo Luật Trật tự, an toàn giao thông đường bộ 2024 và Thông tư 38/2024/TT-BGTVT về tốc độ, khoảng cách an toàn. Cần đối chiếu văn bản hiện hành khi xây dựng bảng tốc độ mặc định. |
| Biển báo | QCVN 41:2024/BGTVT – Quy chuẩn kỹ thuật quốc gia về báo hiệu đường bộ. |
| Sử dụng điện thoại khi lái xe | Pháp luật cấm người lái xe dùng tay cầm điện thoại khi xe đang chạy → ứng dụng **phải ưu tiên giọng nói**, hạn chế thao tác chạm khi xe chạy, khuyến cáo gắn giá đỡ. |
| Cảnh báo vị trí camera | **Tôi chưa chắc chắn** về quy định hiện hành có hạn chế việc công bố/cảnh báo vị trí camera giám sát hay không – cần tham vấn pháp chế trước khi phát hành. Nên định hướng nội dung là "nhắc nhở tuân thủ tốc độ", không phải "né phạt". |
| Dữ liệu cá nhân | Ứng dụng thu thập vị trí → phải tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (và Luật Bảo vệ dữ liệu cá nhân nếu đã có hiệu lực); có chính sách quyền riêng tư rõ ràng. |
| Bản đồ | Bản đồ phát hành tại Việt Nam phải thể hiện đúng chủ quyền (Hoàng Sa, Trường Sa…). Dữ liệu OSM yêu cầu ghi nguồn theo giấy phép ODbL. |
| Trách nhiệm | Ghi rõ: ứng dụng chỉ mang tính hỗ trợ, người lái xe phải tuân theo biển báo thực tế. |

> Các văn bản nêu trên cần kiểm tra lại hiệu lực, sửa đổi tại thời điểm triển khai.

---

## 8. Nhân lực và chi phí ước tính (tham khảo)

| Hạng mục | Tự làm (cá nhân) | Thuê nhóm nhỏ |
|---|---|---|
| Nhân lực | 1 người, học dần | 1 lập trình di động, 1 backend, 1 AI (giai đoạn 3), 1–2 người thu thập dữ liệu |
| Thời gian đến MVP | 4–6 tháng | 2–3 tháng |
| Máy chủ | 0–10 USD/tháng (giai đoạn đầu) | 20–100 USD/tháng |
| Dữ liệu bản đồ | Miễn phí (OSM) | Có thể mua dữ liệu thương mại |

> Số liệu chi phí chỉ mang tính ước lượng sơ bộ, chưa khảo sát giá thị trường.

---

## 9. Bước tiếp theo đề xuất

1. Chốt phạm vi thử nghiệm (tỉnh/tuyến đường) và nền tảng (chỉ Android hay cả iOS).
2. Dựng khung dự án Flutter + bản đồ MapLibre hiển thị vị trí và tốc độ (giai đoạn 1).
3. Tải dữ liệu OSM Việt Nam, kiểm tra mức độ đầy đủ dữ liệu tốc độ/một chiều tại địa bàn thử nghiệm.
4. Xây dựng file dữ liệu mẫu (vài chục điểm camera, biển cấm vượt) để thử thuật toán cảnh báo.

---

## 10. Bổ sung: Tự nhận diện biển báo bằng camera hành trình

### 10.1. Tính khả thi
**Làm được.** Công nghệ hiện nay (mô hình YOLO bản nhẹ) chạy được ngay trên điện thoại tầm trung. Đây là chức năng nhóm C (khó), nhưng dễ hơn cảnh báo làn đường và khoảng cách, nên **làm đầu tiên trong nhóm C**.

### 10.2. Nguồn hình ảnh – so sánh phương án

| Phương án | Ưu điểm | Nhược điểm | Đánh giá |
|---|---|---|---|
| **1. Camera điện thoại làm camera hành trình** | Đơn giản nhất, kiểm soát hoàn toàn hình ảnh, không cần thiết bị thêm | Điện thoại nóng, tốn pin khi gắn kính lái lâu; phải gắn đúng vị trí | **Khuyến nghị làm trước** |
| 2. Camera hành trình rời, truyền qua WiFi | Tận dụng thiết bị sẵn có, góc quay tốt | Mỗi hãng một giao thức riêng, nhiều loại không cho lấy hình trực tiếp; có độ trễ; điện thoại phải nối WiFi camera | Chỉ làm sau, với một vài mẫu camera cụ thể (cần thử từng mẫu) |
| 3. Xử lý video đã ghi (không trực tiếp) | Không cần xử lý nhanh; tự động **lập bản đồ biển báo** từ video + nhật ký GPS | Không cảnh báo tức thời | **Rất nên làm** – phục vụ thu thập dữ liệu cho giai đoạn 2 |
| 4. Thiết bị riêng (máy tính nhúng + camera) | Hiệu năng ổn định, chạy 24/7 | Phải làm phần cứng, chi phí cao | Chỉ khi hướng tới sản phẩm thương mại |

### 10.3. Cách hoạt động (2 bước)

```
Mỗi khung hình (xử lý 5–10 khung/giây là đủ):
  B1. PHÁT HIỆN: mô hình YOLO tìm vị trí các biển báo trong ảnh
  B2. PHÂN LOẠI: xác định đúng loại biển theo QCVN 41:2024
      (P.127 tốc độ tối đa + đọc con số; P.125 cấm vượt; P.102 cấm đi ngược chiều; ...)

  Xác nhận: cùng một biển xuất hiện ≥ 3 khung hình liên tiếp mới tính là thấy thật
  Kết hợp:
    - Trùng dữ liệu bản đồ  -> tăng độ tin cậy, hiển thị biển lên màn hình
    - Bản đồ chưa có biển   -> vẫn cảnh báo, đồng thời gửi về máy chủ làm "điểm đề xuất"
    - Bản đồ có, camera không thấy nhiều lần -> đánh dấu "cần kiểm tra lại" (biển có thể đã bị tháo)
```

### 10.4. Khó khăn cần lường trước

| Khó khăn | Hướng xử lý |
|---|---|
| Biển ban đêm, mưa, ngược sáng, bị cây che | Thu thập ảnh đủ các điều kiện khi huấn luyện; kết hợp dữ liệu bản đồ |
| Biển của đường bên cạnh, đường gom | So hướng biển, vị trí trong khung hình (bên phải/trên đầu) với làn xe đang đi |
| Biển phụ ("trừ xe buýt", "6h–22h", "ô tô con") | Giai đoạn đầu chỉ nhận diện biển chính; biển phụ để sau |
| Hiệu lực biển hết khi qua nút giao | Dùng dữ liệu bản đồ để xác định điểm hết hiệu lực |
| Điện thoại quá nóng | Giảm tần suất xử lý, giảm độ phân giải ảnh, khuyến cáo gắn chỗ khuất nắng |

### 10.5. Các bước thực hiện (khoảng 3–4 tháng)

1. **Thu thập ảnh:** quay video trên các tuyến thử nghiệm (ngày, đêm, mưa).
2. **Gán nhãn:** khoanh vùng biển báo trên ảnh (công cụ miễn phí: CVAT, Label Studio). Bắt đầu với khoảng 15–20 loại biển thường gặp, mỗi loại vài trăm ảnh.
   Có thể tận dụng bộ dữ liệu biển báo Việt Nam công khai (ví dụ bộ dữ liệu của cuộc thi Zalo AI Challenge 2020) – *cần kiểm tra giấy phép sử dụng*.
3. **Huấn luyện mô hình:** dùng Google Colab (miễn phí/giá rẻ), chuyển sang định dạng TensorFlow Lite để chạy trên điện thoại.
4. **Tích hợp vào ứng dụng:** màn hình camera, biểu tượng biển vừa thấy, cảnh báo giọng nói.
5. **Thử nghiệm thực tế:** đo tỷ lệ nhận đúng, bỏ sót, nhận nhầm; mục tiêu ban đầu ≥ 90% với biển rõ ràng ban ngày.

### 10.6. Lưu ý pháp lý
- Video ghi được có thể chứa khuôn mặt, biển số xe – là dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP. Khi gửi về máy chủ **chỉ gửi tọa độ + loại biển** (hoặc ảnh cắt riêng vùng biển báo), không gửi toàn bộ video.
- Kết quả nhận diện chỉ mang tính hỗ trợ; người lái phải tuân theo biển báo thực tế.
