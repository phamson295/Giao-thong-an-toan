# HƯỚNG DẪN CÀI ANDROID STUDIO VÀ CHẠY THỬ ỨNG DỤNG

> Áp dụng cho máy tính **Windows 10/11 (64-bit)**. Lập ngày 01/11/2026.
> Giao diện Android Studio có thể khác đôi chút giữa các phiên bản. Nếu không thấy đúng tên nút, tìm mục có tên gần giống.

---

## 0. Tổng quan: 3 mức chạy thử

| Mức | Chạy được gì | Cần cài | Thời gian |
|---|---|---|---|
| **Mức 1 – Chỉ ứng dụng** | Bản đồ 2D/3D, vị trí, tốc độ hiện tại, tải bản đồ offline | Node.js, Git, Android Studio | 1–2 giờ |
| **Mức 2 – Đầy đủ** | Thêm cảnh báo tốc độ giới hạn, camera, ngược chiều, cấm vượt, báo cáo cộng đồng | Thêm Docker Desktop (chạy backend) | Thêm 30–60 phút |
| **Mức 3 – Giả lập lái xe** | Cho "xe" chạy trên tuyến mẫu ngay trong máy ảo để nghe cảnh báo, không cần ra đường | Như mức 2 | 10 phút |

Nên đi lần lượt **Mức 1 → 2 → 3**.

---

## 1. Yêu cầu máy tính

| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| RAM | 8 GB | **16 GB** (máy ảo Android + Android Studio tốn nhiều RAM) |
| Ổ cứng trống | 30 GB | 50 GB, ổ SSD |
| CPU | Hỗ trợ ảo hóa (Intel VT-x / AMD-V) | |

**Kiểm tra ảo hóa:** mở Task Manager (Ctrl + Shift + Esc) → tab **Performance** → **CPU** → dòng **Virtualization** phải là **Enabled**.
Nếu là *Disabled*: vào BIOS bật Intel VT-x / AMD SVM (mỗi hãng máy một cách, tra "bật ảo hóa BIOS + tên hãng máy").
Nếu không bật được: bỏ qua máy ảo, dùng **điện thoại thật** (bước 4B).

---

## 2. Cài phần mềm nền

### 2.1. Node.js
1. Vào https://nodejs.org → tải bản **LTS** (Windows Installer .msi).
2. Cài đặt, giữ mặc định. Nếu có ô *"Automatically install the necessary tools"* thì **không cần tích**.
3. Kiểm tra: mở **Command Prompt** (gõ `cmd` trong ô tìm kiếm Windows), chạy:
   ```
   node -v
   npm -v
   ```
   Hiện số phiên bản (ví dụ `v22.x.x`) là thành công.

### 2.2. Git
1. Vào https://git-scm.com/download/win → tải và cài, giữ mặc định.
2. Kiểm tra: `git --version`

### 2.3. Android Studio
1. Vào https://developer.android.com/studio → **Download Android Studio** → đồng ý điều khoản → tải về.
2. Chạy file cài đặt, giữ mặc định. Đảm bảo có tích **Android Virtual Device**.
3. Mở Android Studio lần đầu → trình hướng dẫn **Setup Wizard**:
   - Chọn **Standard** → **Next** → chấp nhận các giấy phép (**Accept** từng mục) → **Finish**.
   - Chờ tải Android SDK (vài GB, 15–40 phút tùy mạng).
4. Bổ sung công cụ: ở màn hình chào → **More Actions** → **SDK Manager**:
   - Tab **SDK Platforms**: tích bản Android mới nhất.
   - Tab **SDK Tools**: tích **Android SDK Build-Tools**, **Android SDK Command-line Tools (latest)**, **Android Emulator**, **Android SDK Platform-Tools**.
   - Bấm **Apply** → **OK**.
   - Ghi lại đường dẫn **Android SDK Location** ở đầu cửa sổ, thường là:
     `C:\Users\<tên bạn>\AppData\Local\Android\Sdk`

### 2.4. Khai báo biến môi trường
Để các lệnh build tìm được Android SDK và Java (Android Studio có sẵn Java, không cần cài riêng):

1. Gõ **"environment variables"** trong ô tìm kiếm Windows → **Edit the system environment variables** → **Environment Variables…**
2. Ở khung **User variables** → **New**, tạo 2 biến:

   | Variable name | Variable value |
   |---|---|
   | `ANDROID_HOME` | `C:\Users\<tên bạn>\AppData\Local\Android\Sdk` |
   | `JAVA_HOME` | `C:\Program Files\Android\Android Studio\jbr` |

3. Chọn biến **Path** (User variables) → **Edit** → **New**, thêm 2 dòng:
   ```
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\emulator
   ```
4. **OK** để lưu. **Đóng hết cửa sổ Command Prompt cũ**, mở cửa sổ mới, kiểm tra:
   ```
   adb --version
   java -version
   ```

---

## 3. Tải mã nguồn và cài thư viện

> ⚠️ Windows giới hạn độ dài đường dẫn, dễ gây lỗi khi build. **Đặt dự án ở thư mục ngắn**, ví dụ `D:\AI_CLAUDE\Lai-xe-an-toan`.

```
cd /d D:\AI_CLAUDE
git clone https://github.com/phamson295/giao-thong-an-toan.git Lai-xe-an-toan
cd Lai-xe-an-toan
git checkout ccr-f6135564-hcnoq6
npm install
```

`npm install` tải khoảng 1 GB thư viện, mất 5–15 phút.

Tạo file cấu hình cho ứng dụng:
```
copy apps\mobile\.env.example apps\mobile\.env
```

---

## 4. Chuẩn bị thiết bị chạy thử

### 4A. Máy ảo Android (Emulator)
1. Android Studio → màn hình chào → **More Actions** → **Virtual Device Manager**.
2. Bấm **+** (Create Virtual Device) → chọn **Pixel 8** (hoặc bất kỳ máy Pixel nào) → **Next**.
3. Chọn system image bản mới nhất có ghi **x86_64** và **Google Play** hoặc **Google APIs** → tải về (biểu tượng ⬇) → **Next** → **Finish**.
4. Bấm ▶ để khởi động máy ảo. Chờ đến khi hiện màn hình chính Android.

### 4B. Điện thoại Android thật (Android 7.0 trở lên)
1. Trên điện thoại: **Cài đặt → Thông tin điện thoại** → chạm **7 lần** vào **Số hiệu bản tạo (Build number)** → hiện "Bạn đã là nhà phát triển".
2. **Cài đặt → Tùy chọn nhà phát triển (Developer options)** → bật **Gỡ lỗi USB (USB debugging)**.
3. Cắm cáp USB vào máy tính → trên điện thoại chọn **Cho phép** khi hỏi về gỡ lỗi USB.
4. Kiểm tra trên máy tính:
   ```
   adb devices
   ```
   Thấy một dòng có chữ `device` là kết nối thành công. Nếu là `unauthorized` thì xem lại thông báo trên điện thoại.

> Máy Xiaomi/Redmi cần bật thêm **"Cài đặt qua USB"** trong Tùy chọn nhà phát triển.

---

## 5. MỨC 1 – Chạy ứng dụng

Khi máy ảo đang mở (hoặc điện thoại đã cắm), chạy ở thư mục `D:\AI_CLAUDE\Lai-xe-an-toan`:
```
npm run android
```

Lệnh này tự sinh dự án Android, build và cài ứng dụng lên thiết bị.
- **Lần đầu mất 10–30 phút** (tải Gradle, biên dịch thư viện bản đồ). Các lần sau nhanh hơn nhiều.
- Khi xong, ứng dụng **"Giao thông an toàn"** tự mở. Chọn **Cho phép** khi hỏi quyền vị trí.

Kết quả mong đợi: bản đồ hiển thị, chấm vị trí, ô tốc độ ở góc dưới. Bấm nút **2D/3D** để đổi góc nhìn.
Góc trên hiện **"Offline – dùng dữ liệu đã tải"** là bình thường, vì chưa chạy backend.

**Sửa mã và xem ngay:** cửa sổ dòng lệnh vẫn để mở (Metro). Sửa file `.tsx` rồi lưu, ứng dụng tự cập nhật. Muốn tải lại thủ công: bấm `r` trong cửa sổ dòng lệnh.

---

## 6. MỨC 2 – Chạy backend để có dữ liệu cảnh báo

### 6.1. Cài Docker Desktop
1. Vào https://www.docker.com/products/docker-desktop → tải bản Windows → cài, giữ mặc định (dùng **WSL 2**).
2. Khởi động lại máy nếu được yêu cầu. Mở Docker Desktop, chờ biểu tượng cá voi chuyển sang trạng thái đang chạy.

### 6.2. Khởi động cơ sở dữ liệu và backend
Mở cửa sổ Command Prompt **mới** tại `D:\AI_CLAUDE\Lai-xe-an-toan`:
```
docker compose up -d db redis
npm run dev:api
```
Thấy dòng `API đang chạy tại http://localhost:3000` là thành công.

Kiểm tra bằng trình duyệt: mở
http://localhost:3000/hazards?bbox=105.8,20.9,105.9,21.1
→ hiện dữ liệu dạng JSON có 3 điểm mẫu (camera tốc độ, camera đèn đỏ, biển cấm vượt).

### 6.3. Trỏ ứng dụng tới backend
Mở file `apps\mobile\.env`:
- **Máy ảo:** giữ nguyên `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`.
- **Điện thoại thật** (cùng mạng WiFi với máy tính): chạy `ipconfig`, lấy dòng **IPv4 Address** (ví dụ `192.168.1.15`), sửa thành:
  ```
  EXPO_PUBLIC_API_URL=http://192.168.1.15:3000
  ```
  Lần đầu Windows hỏi tường lửa cho Node.js → chọn **Allow** (mạng Private).

Sau khi sửa `.env`: tắt cửa sổ Metro (Ctrl + C), chạy lại `npm run android`.

### 6.4. (Tùy chọn) Trang quản trị
```
npm run dev:admin
```
Mở http://localhost:3002 để xem bản đồ các điểm cảnh báo.

---

## 7. MỨC 3 – Giả lập lái xe trên máy ảo

Dữ liệu mẫu có một đoạn đường **một chiều, giới hạn 50 km/h**, một **camera tốc độ**, và một **đoạn cấm vượt** ở khu vực Hà Nội (tọa độ minh họa).
File `tools\gia-lap\tuyen-mau.gpx` mô phỏng xe chạy **60 km/h** qua các điểm này.

1. Ở thanh công cụ bên cạnh máy ảo, bấm **⋯ (Extended controls)** → **Location**.
2. Tab **Single points** (hoặc **Routes**, tùy phiên bản) → **Load GPX/KML** → chọn `D:\AI_CLAUDE\Lai-xe-an-toan\tools\gia-lap\tuyen-mau.gpx`.
3. Bấm ▶ **Play route**. Tốc độ phát để **1x**.

Những gì sẽ xảy ra (bật loa máy tính):

Kết quả đã chạy thử qua bộ máy cảnh báo (thời gian tính từ lúc bấm phát, lệch vài giây là bình thường):

| Giây thứ | Cảnh báo mong đợi |
|---|---|
| 1–2 | Hiện biển **50** cạnh ô tốc độ |
| ~4 | "Bạn đang vượt tốc độ. Tốc độ tối đa 50 ki lô mét trên giờ", ô tốc độ chuyển màu đỏ |
| ~5 | "Phía trước 350 mét có camera giám sát tốc độ, giới hạn 50" |
| ~16 | "Phía trước 150 mét có camera giám sát tốc độ, giới hạn 50" |
| ~23 | "Phía trước 300 mét có camera đèn đỏ" |
| ~45 và ~56 | "Phía trước 300 mét / 150 mét có biển cấm vượt" |
| ~65 | Rẽ sang đoạn thứ 2: biển đổi thành **60**, hiện nhãn **CẤM VƯỢT**, hết cảnh báo vượt tốc độ |

**Thử cảnh báo ngược chiều:** nạp file `tools\gia-lap\tuyen-nguoc-chieu.gpx` (xe đi từ Bắc xuống Nam trên đường một chiều, 40 km/h).
Khoảng giây thứ 6 sẽ nghe "Cảnh báo! Bạn đang đi ngược chiều đường một chiều", banner chuyển màu đỏ.
Camera tốc độ chỉ áp dụng chiều Nam → Bắc nên **không** được đọc ở tuyến này. Đây là hành vi đúng.

Muốn tạo tuyến khác: sửa tọa độ trong `tools\gia-lap\tao_tuyen.py` rồi chạy `python tao_tuyen.py` (cần cài Python).

> Nếu tab Location của máy ảo không có nút nạp GPX: dùng tab **Single points**, nhập lần lượt vài tọa độ (vĩ độ 21.000 → 21.002 → 21.004…, kinh độ 105.85) cách nhau 1 giây. Cách này kém mượt hơn.

**Giọng nói tiếng Việt:** nếu không nghe thấy, vào **Cài đặt Android → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói** → chọn công cụ Google → tải dữ liệu giọng **Tiếng Việt**.

---

## 8. Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân / Cách xử lý |
|---|---|
| `'adb' is not recognized…` | Chưa thêm `platform-tools` vào Path (bước 2.4), hoặc chưa mở cửa sổ dòng lệnh mới |
| `SDK location not found` | Chưa đặt biến `ANDROID_HOME`, hoặc sai đường dẫn |
| `JAVA_HOME is not set` / lỗi phiên bản Java | Đặt `JAVA_HOME` trỏ tới thư mục `jbr` của Android Studio (bước 2.4) |
| Lỗi `Filename longer than 260 characters`, lỗi CMake/ninja | Đường dẫn dự án quá dài → chuyển dự án về `D:\AI_CLAUDE\Lai-xe-an-toan` |
| `No connected devices` / `No emulators found` | Mở máy ảo trước, hoặc kiểm tra `adb devices` |
| Build báo hết bộ nhớ (`OutOfMemory`) | Đóng bớt chương trình; mở `apps\mobile\android\gradle.properties`, sửa dòng `org.gradle.jvmargs=-Xmx4096m` |
| Bản đồ trắng/xám | Thiết bị không có Internet. Kiểm tra mạng của máy ảo (mở trình duyệt Chrome trong máy ảo) |
| Luôn hiện "Offline", không có điểm cảnh báo | Backend chưa chạy, sai địa chỉ trong `.env`, hoặc tường lửa chặn cổng 3000 |
| `docker: command not found` / lỗi kết nối Docker | Mở Docker Desktop và chờ khởi động xong |
| Ứng dụng báo lỗi đỏ sau khi sửa mã | Đọc dòng lỗi đầu tiên; bấm `r` trong cửa sổ Metro để tải lại |
| Muốn build lại từ đầu | Xóa thư mục `apps\mobile\android` rồi chạy lại `npm run android` |

---

## 9. Tạo file cài đặt (.apk) để gửi cho người khác thử

Xem hướng dẫn riêng: [`docs/HUONG_DAN_TAO_APK.md`](HUONG_DAN_TAO_APK.md).
