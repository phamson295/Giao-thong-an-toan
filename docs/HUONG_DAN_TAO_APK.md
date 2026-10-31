# HƯỚNG DẪN TẠO FILE APK GỬI ĐỒNG NGHIỆP CÀI THỬ

> Lập ngày 01/11/2026. Điều kiện: đã làm xong các bước 1–5 trong `docs/HUONG_DAN_CHAY_THU.md`, tức là chạy được ứng dụng trên máy ảo hoặc điện thoại của mình.

---

## 0. Việc phải quyết định trước: điện thoại đồng nghiệp lấy dữ liệu cảnh báo từ đâu?

Khi chạy thử, backend nằm **trên máy tính của bạn** (`localhost`, `10.0.2.2`, `192.168.x.x`). Điện thoại của đồng nghiệp ở nơi khác **không kết nối được** tới địa chỉ đó.

| Phương án | Đồng nghiệp dùng được | Công sức | Phù hợp khi |
|---|---|---|---|
| **A. Không có backend** | Bản đồ 2D/3D, vị trí, tốc độ, tải bản đồ offline. **Không có** cảnh báo camera/biển báo | Không cần làm gì thêm | Chỉ cần góp ý giao diện, độ mượt bản đồ |
| **B. Đường hầm tạm thời** (Cloudflare Tunnel) | Đầy đủ, trong lúc máy tính của bạn bật và đang chạy backend | 15 phút | Thử nghiệm nhóm nhỏ trong 1–2 ngày |
| **C. Thuê máy chủ (VPS) + tên miền** | Đầy đủ, mọi lúc | 0,5–1 ngày, chi phí VPS hằng tháng | Thử nghiệm lâu dài, nhiều người |

Địa chỉ backend được **gắn cứng vào APK lúc build**. Đổi địa chỉ thì phải build lại APK.

### Phương án B – Đường hầm tạm thời (nhanh nhất để có đủ chức năng)
1. Chạy backend trên máy tính như bước 6 của hướng dẫn chạy thử (`docker compose up -d db redis`, `npm run dev:api`).
2. Tải `cloudflared` cho Windows từ trang chính thức của Cloudflare (tìm "cloudflared download").
3. Mở cửa sổ dòng lệnh mới:
   ```
   cloudflared tunnel --url http://localhost:3000
   ```
4. Màn hình hiện một địa chỉ dạng `https://xxxx-xxxx.trycloudflare.com`. Đây là địa chỉ backend cho APK.
5. **Hạn chế:** mỗi lần chạy lại `cloudflared` thì địa chỉ đổi, phải build lại APK; máy tính tắt thì đồng nghiệp mất dữ liệu cảnh báo. Ứng dụng vẫn chạy bình thường bằng dữ liệu đã tải trước đó.

### Phương án C – Máy chủ riêng
Thuê VPS (Ubuntu, 2 GB RAM trở lên), trỏ tên miền (ví dụ `api.tenmien.vn`), cài Docker, chạy `docker compose up -d`, đặt HTTPS (gợi ý dùng Caddy, tự cấp chứng chỉ miễn phí).
Phần này cần hướng dẫn riêng. Báo tôi khi bạn đã có VPS.

---

## 1. So sánh 2 cách tạo APK

| Tiêu chí | **Cách 1: Build trên máy tính** | **Cách 2: Build đám mây Expo (EAS)** |
|---|---|---|
| Cần tài khoản | Không | Tài khoản miễn phí tại expo.dev |
| Cần Android Studio | Có (đã cài ở hướng dẫn chạy thử) | Không |
| Thời gian | 5–20 phút | 10–30 phút (có thể phải xếp hàng) |
| Mã nguồn | Ở lại máy bạn | Được tải lên máy chủ Expo để build |
| Chia sẻ | Tự gửi file .apk | Expo tạo sẵn đường link + mã QR để tải |
| Giới hạn | Không | Gói miễn phí giới hạn số lần build mỗi tháng (*chưa rõ con số hiện tại, xem expo.dev/pricing*) |

**Khuyến nghị:** dùng **Cách 1**, vì bạn đã cài sẵn Android Studio và mã nguồn không phải đưa ra ngoài.

---

## 2. CÁCH 1 – Build APK trên máy tính

### Bước 1. Đặt địa chỉ backend
Mở file `D:\AI_CLAUDE\giao-thong-app\apps\mobile\.env`, sửa theo phương án đã chọn ở mục 0:
```
EXPO_PUBLIC_API_URL=https://xxxx-xxxx.trycloudflare.com
```
(Phương án A: để nguyên, không cần sửa.)

### Bước 2. Tăng số phiên bản (từ lần gửi thứ 2 trở đi)
Mở `D:\AI_CLAUDE\giao-thong-app\apps\mobile\app.json`, tăng 2 giá trị:
```json
"version": "0.1.1",
...
"versionCode": 2,
```
`versionCode` **phải tăng** mỗi lần gửi bản mới. Nếu không tăng, điện thoại đồng nghiệp sẽ không cho cài đè lên bản cũ.

### Bước 3. Sinh lại dự án Android và build
Mở Command Prompt:
```
cd /d D:\AI_CLAUDE\giao-thong-app\apps\mobile
npx expo prebuild --platform android --clean
cd android
gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```
- `prebuild --clean`: sinh lại thư mục `android` theo cấu hình mới nhất.
- `assembleRelease`: build bản phát hành. Bản này **không cần** máy tính chạy Metro, nên gửi cho người khác được.
- `-PreactNativeArchitectures=...`: chỉ build cho chip điện thoại thật (ARM), bỏ phần cho máy ảo, giúp file nhỏ hơn.

Lần đầu mất 10–20 phút. Thấy dòng **`BUILD SUCCESSFUL`** là xong.

### Bước 4. Lấy file APK
File nằm tại:
```
D:\AI_CLAUDE\giao-thong-app\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```
Đổi tên cho dễ nhận biết, ví dụ `GiaoThongAnToan-0.1.1.apk`.

**Thử trước khi gửi:** cắm điện thoại của bạn và chạy
```
adb install -r app\build\outputs\apk\release\app-release.apk
```
Mở ứng dụng, kiểm tra bản đồ hiện được và có dữ liệu cảnh báo (nếu dùng phương án B/C).

### ⚠️ Về chữ ký ứng dụng
Bản build này được ký bằng **khóa thử nghiệm** có sẵn trong mẫu dự án. Dùng để thử nội bộ thì không sao, nhưng:
- **Không dùng** để đưa lên Google Play.
- Khi chuyển sang dùng khóa chính thức, đồng nghiệp phải **gỡ bản cũ** rồi mới cài được bản mới.

Khi chuẩn bị phát hành chính thức, cần tạo khóa riêng (keystore) và **cất giữ cẩn thận**: mất khóa thì không cập nhật được ứng dụng trên Google Play.

---

## 3. CÁCH 2 – Build đám mây bằng Expo (EAS)

### Bước 1. Tạo tài khoản và đăng nhập
1. Đăng ký miễn phí tại https://expo.dev/signup
2. Mở Command Prompt:
   ```
   cd /d D:\AI_CLAUDE\giao-thong-app\apps\mobile
   npx eas-cli login
   npx eas-cli init
   ```
   `init` gắn dự án với tài khoản của bạn. Lệnh sẽ tự thêm mã dự án vào `app.json`.

### Bước 2. Đặt địa chỉ backend
**Lưu ý:** build đám mây **không đọc** file `.env` của bạn (file này không được tải lên).
Mở `D:\AI_CLAUDE\giao-thong-app\apps\mobile\eas.json`, sửa dòng `EXPO_PUBLIC_API_URL` trong mục `"preview"`:
```json
"EXPO_PUBLIC_API_URL": "https://xxxx-xxxx.trycloudflare.com",
```
Phương án A: có thể để nguyên `https://api.example.vn`. Ứng dụng sẽ báo "Offline" nhưng bản đồ vẫn chạy.

### Bước 3. Tăng `versionCode` trong `app.json` (như Cách 1, bước 2)

### Bước 4. Build
```
npx eas-cli build -p android --profile preview
```
- Lần đầu, khi hỏi *"Generate a new Android Keystore?"* → chọn **Yes**. Expo tạo và giữ khóa ký giúp bạn, các lần build sau dùng chung khóa này.
- Chờ build xong. Màn hình hiện **đường link** và **mã QR**. Có thể xem tiến độ tại expo.dev → Projects → Builds.

### Bước 5. Chia sẻ
Gửi đường link cho đồng nghiệp. Mở trên điện thoại sẽ có nút **Install** để tải APK.

---

## 4. Gửi file và hướng dẫn đồng nghiệp cài đặt

### Cách gửi
| Kênh | Ghi chú |
|---|---|
| **Google Drive** | Tải file lên, chia sẻ link (quyền "Người xem") – **khuyến nghị** |
| Zalo | Gửi dạng file. Một số trường hợp Zalo/điện thoại cảnh báo file .apk, khi đó dùng Google Drive |
| Email | Gmail thường **chặn** file .apk đính kèm → gửi link Google Drive thay vì đính kèm |
| Link EAS (Cách 2) | Gửi thẳng đường link |

### Mẫu tin nhắn gửi kèm (sao chép và sửa lại)

> Gửi anh/chị bản thử nghiệm ứng dụng **Giao thông an toàn** phiên bản 0.1.1 (chỉ dùng trên điện thoại **Android 7.0 trở lên**).
>
> **Cách cài:**
> 1. Mở link, tải file `GiaoThongAnToan-0.1.1.apk`.
> 2. Bấm vào file vừa tải. Nếu máy báo *"Không được phép cài ứng dụng từ nguồn này"* → bấm **Cài đặt** → bật **Cho phép từ nguồn này** → quay lại bấm **Cài đặt**.
> 3. Nếu hiện cảnh báo của **Google Play Protect** → chọn **Thêm chi tiết** → **Vẫn cài đặt** (do ứng dụng chưa phát hành trên CH Play).
> 4. Mở ứng dụng → **Cho phép** truy cập vị trí.
>
> **Lưu ý khi dùng:** đặt điện thoại trên giá đỡ, không cầm tay khi lái xe. Cảnh báo chỉ mang tính tham khảo, luôn tuân theo biển báo thực tế.
>
> Góp ý (lỗi, cảnh báo sai, camera/biển báo thiếu) xin gửi kèm ảnh chụp màn hình và vị trí.

### iPhone thì sao?
File APK **chỉ cài được trên Android**. Muốn thử trên iPhone phải có tài khoản Apple Developer (99 USD/năm) và phân phối qua TestFlight. Phần này để sau.

---

## 5. Xử lý lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `BUILD FAILED` khi `assembleRelease` | Đọc dòng `What went wrong` ngay dưới, gửi tôi dòng đó |
| Lỗi đường dẫn quá dài | Đảm bảo dự án ở `D:\AI_CLAUDE\giao-thong-app` (xem hướng dẫn chạy thử, mục 8) |
| Đồng nghiệp báo *"Ứng dụng chưa được cài đặt"* khi cài bản mới | Chưa tăng `versionCode`, hoặc bản cũ ký bằng khóa khác → gỡ bản cũ rồi cài lại |
| *"Gói có vẻ không hợp lệ"* (parse error) | File tải về bị lỗi hoặc thiếu → tải lại; kiểm tra máy có Android 7.0 trở lên |
| Mở app bị thoát ngay | Cắm điện thoại vào máy tính, chạy `adb logcat *:E`, gửi tôi các dòng lỗi |
| Luôn hiện "Offline" | Backend chưa chạy, sai địa chỉ, hoặc địa chỉ đường hầm đã đổi → kiểm tra mục 0 |
| Bản đồ trắng | Điện thoại không có Internet khi mở lần đầu (chưa tải bản đồ offline) |

---

## 6. Lưu ý khi gửi bản thử nghiệm

- **Dữ liệu mẫu** trong `db/init/002_seed.sql` là tọa độ **giả lập** ở Hà Nội, không phải vị trí camera thật. Nên nói rõ với đồng nghiệp để tránh hiểu nhầm.
- Ứng dụng thu thập **vị trí** và gửi **báo cáo cộng đồng** kèm mã thiết bị ngẫu nhiên. Nếu thử nghiệm rộng, nên có thông báo ngắn về việc xử lý dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP).
- Ghi lại danh sách người được gửi và phiên bản đã gửi, để biết ai đang dùng bản cũ.
