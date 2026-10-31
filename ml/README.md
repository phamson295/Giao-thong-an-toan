# Nhận diện biển báo bằng camera (Giai đoạn 3)

Kế hoạch chi tiết: xem mục 10 trong `KE_HOACH.md`.

Cấu trúc dự kiến:
```
ml/
├── datasets/      # ảnh + nhãn (không đưa lên git)
├── classes.yaml   # danh sách loại biển theo QCVN 41:2024 (P.127, P.125, P.102...)
├── train.py       # huấn luyện bằng Ultralytics YOLO
└── export.py      # xuất TensorFlow Lite / ONNX để chạy trên điện thoại
```

Kết quả nhận diện được gửi về backend với `source = 'ai_camera'` (chỉ gửi tọa độ + loại biển, không gửi ảnh toàn cảnh).
