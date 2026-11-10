# HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG

> Cập nhật ngày 10/11/2026. Dành cho người dùng thử (không cần biết kỹ thuật).

## 1. Màn hình chính

```
┌──────────────────────────────────────┐
│ 🔍 Bạn muốn đi đâu?                  │  ← chạm để tìm điểm đến
│ [Mất mạng] [GPS yếu]                 │  ← trạng thái (chỉ hiện khi có vấn đề)
│ ┌──────────────────────────────────┐ │
│ │ 📍 Phía trước 300 mét có camera… │ │  ← dải cảnh báo
│ └──────────────────────────────────┘ │
│                                 (◎)  │  ← về vị trí của tôi (hiện khi đã kéo bản đồ)
│            BẢN ĐỒ               (2D) │  ← đổi 2D / 3D
│                                 (🔊) │  ← bật / tắt giọng nói
│                                 (⚙️) │  ← cài đặt
│  ╭────╮ ╭──╮                         │
│  │ 48 │ │50│          [⚠️ Báo cáo]   │  ← tốc độ, biển giới hạn, nút báo cáo
│  ╰────╯ ╰──╯                         │
└──────────────────────────────────────┘
```

- **Vòng tốc độ chuyển màu đỏ** khi vượt quá giới hạn.
- Nhãn **CẤM VƯỢT** hiện dưới biển tốc độ khi đang ở đoạn cấm vượt.

## 2. Dẫn đường

| Việc muốn làm | Thao tác |
|---|---|
| Tìm theo tên | Chạm ô **"Bạn muốn đi đâu?"** → gõ tên đường, địa danh (từ 3 ký tự) → chạm kết quả |
| Đi tới một tọa độ | Gõ thẳng tọa độ, vĩ độ trước: `21.0285, 105.8542` (không cần mạng để nhận tọa độ) |
| Đi tới điểm trên bản đồ | **Nhấn giữ** vào điểm đó → **Dẫn đường** |
| Đi lại nơi đã tìm | Mở ô tìm kiếm, chọn trong mục **Đã tìm gần đây** |
| Dừng dẫn đường | Nút đỏ **Kết thúc** ở thanh dưới cùng |

Khi đang dẫn đường: thẻ xanh phía trên hiện **mũi tên, khoảng cách tới chỗ rẽ và tên đường**; thanh dưới hiện **thời gian, quãng đường còn lại, giờ đến**.

**Tìm đường cần có mạng.** Tuyến đã tìm được lưu vào máy, nên:
- Đi vào vùng mất sóng, ứng dụng **vẫn dẫn tiếp** theo tuyến đã có.
- Tắt rồi mở lại ứng dụng, tuyến đang đi dở được khôi phục.
- Đi chệch tuyến: có mạng thì tự tìm lại đường; mất mạng thì nhắc quay lại đường màu xanh.

## 3. Báo cáo cho cộng đồng

1. Chạm **⚠️ Báo cáo**.
2. Chạm một trong 4 ô: **CSGT**, **Tai nạn**, **Công trình, sạt lở**, **Camera tốc độ**. Chạm là gửi ngay, kèm vị trí hiện tại.
3. Mất sóng: báo cáo được lưu lại, có mạng sẽ tự gửi.

Khi đi qua một điểm người khác đã báo, ứng dụng hỏi **"Ở đây còn … không?"** → chạm **Còn** hoặc **Không còn**. Không trả lời thì câu hỏi tự ẩn sau 12 giây.

## 4. Cài đặt (nút ⚙️)

| Mục | Ý nghĩa |
|---|---|
| Phương tiện | Ô tô / Xe máy – ảnh hưởng giới hạn tốc độ và cách tìm đường |
| Cảnh báo vượt tốc độ | Báo ngay khi chạm giới hạn, hoặc khi quá 3 km/h, 5 km/h |
| Đọc cảnh báo bằng giọng nói | Giống nút 🔊 ngoài màn hình chính |
| Loại cảnh báo | Bật/tắt riêng: camera; biển cấm vượt, trường học; báo cáo cộng đồng |
| Mở ứng dụng ở chế độ 3D | |
| Bản đồ offline | Xem mục 5 |

Cảnh báo **vượt tốc độ** và **đi ngược chiều** luôn bật, không tắt được.

## 5. Chuẩn bị trước khi vào vùng mất sóng

1. Khi còn WiFi/4G: **⚙️ → Bản đồ offline**.
2. Chọn bán kính **10, 20 hoặc 50 km** quanh vị trí hiện tại → **Tải vùng**. Giữ màn hình mở tới khi báo xong.
3. Nếu cần chỉ đường: tìm đường tới điểm đến **trước khi mất sóng**.

Muốn giải phóng bộ nhớ: vào lại màn hình này, chạm **Xóa** ở vùng không cần nữa.

## 6. Lưu ý an toàn

- Gắn điện thoại lên giá đỡ. **Không thao tác khi xe đang chạy**; nhờ người ngồi cạnh hoặc dừng xe.
- Cảnh báo chỉ để nhắc nhở. Luôn tuân theo biển báo và tình huống thực tế.
- Ở bản thử nghiệm, tên địa điểm gõ vào ô tìm kiếm và điểm đi, điểm đến được gửi tới dịch vụ tìm đường công cộng ở nước ngoài (xem `docs/KIEN_TRUC.md`, mục 7).
