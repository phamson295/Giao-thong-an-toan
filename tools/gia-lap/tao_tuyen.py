"""
Sinh file GPX giả lập xe chạy đều trên một đường gấp khúc (dùng cho máy ảo Android).
  python tao_tuyen.py   -> tạo tuyen-mau.gpx và tuyen-nguoc-chieu.gpx
"""
import math
from datetime import datetime, timedelta, timezone


def to_xy(lng, lat, lat0):
    return (lng * 111_320 * math.cos(math.radians(lat0)), lat * 110_540)


def resample(path, speed_kmh):
    """Chia đường gấp khúc thành các điểm cách nhau đúng quãng đường đi trong 1 giây."""
    step = speed_kmh / 3.6
    lat0 = path[0][1]
    out = [path[0]]
    carry = 0.0  # quãng đường còn dư từ đoạn trước
    for (a, b) in zip(path, path[1:]):
        ax, ay = to_xy(*a, lat0)
        bx, by = to_xy(*b, lat0)
        seg = math.hypot(bx - ax, by - ay)
        d = step - carry
        while d <= seg:
            t = d / seg
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            d += step
        carry = seg - (d - step)
    return out


def write_gpx(name, pts):
    t0 = datetime(2026, 11, 1, 8, 0, 0, tzinfo=timezone.utc)
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<gpx version="1.1" creator="giao-thong-an-toan" xmlns="http://www.topografix.com/GPX/1/1">',
             f'  <trk><name>{name}</name><trkseg>']
    for i, (x, y) in enumerate(pts):
        ts = (t0 + timedelta(seconds=i)).strftime("%Y-%m-%dT%H:%M:%SZ")
        lines.append(f'    <trkpt lat="{y:.6f}" lon="{x:.6f}"><time>{ts}</time></trkpt>')
    lines += ['  </trkseg></trk>', '</gpx>']
    with open(name, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"{name}: {len(pts)} điểm ({len(pts)} giây)")


if __name__ == "__main__":
    # Khớp dữ liệu mẫu trong db/init/002_seed.sql
    # Đi đúng chiều đường một chiều (Nam -> Bắc), 60 km/h > giới hạn 50, rồi rẽ vào đoạn cấm vượt (giới hạn 60)
    write_gpx("tuyen-mau.gpx", resample([(105.85, 21.0003), (105.85, 21.01), (105.86, 21.02)], 60))
    # Đi ngược chiều đường một chiều (Bắc -> Nam), 40 km/h
    write_gpx("tuyen-nguoc-chieu.gpx", resample([(105.85, 21.0097), (105.85, 21.0003)], 40))
