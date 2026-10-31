"""
Nhập dữ liệu từ file OpenStreetMap (.osm.pbf) vào PostGIS:
  - Đường có tốc độ tối đa (maxspeed), một chiều (oneway), cấm vượt (overtaking)  -> bảng road_rules
  - Điểm camera tốc độ (highway=speed_camera)                                   -> bảng hazards

Tải dữ liệu Việt Nam: https://download.geofabrik.de/asia/vietnam-latest.osm.pbf
Cắt theo tỉnh để chạy nhanh (cần osmium-tool):
  osmium extract -b 105.3,20.5,106.1,21.4 vietnam-latest.osm.pbf -o vung.osm.pbf

Chạy:
  pip install -r requirements.txt
  python import_osm.py vung.osm.pbf --db postgres://gtat:gtat@localhost:5432/gtat

Lưu ý: chỉ lấy tốc độ GHI RÕ trong OSM. Không tự suy tốc độ mặc định theo loại đường,
vì quy định phụ thuộc khu dân cư/loại phương tiện (Thông tư 38/2024/TT-BGTVT) – cần
bổ sung bằng khảo sát hoặc trang quản trị.
"""
import argparse
import re

import osmium
import psycopg

ROAD_TYPES = {
    "motorway", "trunk", "primary", "secondary", "tertiary", "unclassified",
    "residential", "motorway_link", "trunk_link", "primary_link", "secondary_link",
    "tertiary_link", "living_street", "service", "track",
}


def parse_speed(value: str | None) -> int | None:
    """'60' -> 60; '40 mph' -> 64; 'VN:urban' / 'none' -> None."""
    if not value:
        return None
    m = re.match(r"^\s*(\d+)\s*(mph)?", value)
    if not m:
        return None
    speed = int(m.group(1))
    return round(speed * 1.609) if m.group(2) else speed


class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.roads: list[tuple] = []
        self.cameras: list[tuple] = []

    def node(self, n):
        if n.tags.get("highway") == "speed_camera" and n.location.valid():
            self.cameras.append((n.id, n.location.lon, n.location.lat, parse_speed(n.tags.get("maxspeed"))))

    def way(self, w):
        tags = w.tags
        if tags.get("highway") not in ROAD_TYPES:
            return
        oneway_tag = tags.get("oneway", "no")
        oneway = oneway_tag in ("yes", "1", "true", "-1") or tags.get("junction") == "roundabout"
        no_overtaking = tags.get("overtaking") == "no" or tags.get("overtaking:forward") == "no"
        speed = parse_speed(tags.get("maxspeed"))
        if speed is None and not oneway and not no_overtaking:
            return  # không có thông tin cảnh báo => bỏ qua cho nhẹ CSDL
        try:
            coords = [(nd.lon, nd.lat) for nd in w.nodes]
        except osmium.InvalidLocationError:
            return
        if len(coords) < 2:
            return
        if oneway_tag == "-1":
            coords.reverse()  # quy ước: chiều cho phép = chiều vẽ
        wkt = "LINESTRING(" + ",".join(f"{x} {y}" for x, y in coords) + ")"
        self.roads.append((w.id, tags.get("name"), wkt, speed, parse_speed(tags.get("maxspeed:motorcycle")), oneway, no_overtaking))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pbf")
    ap.add_argument("--db", default="postgres://gtat:gtat@localhost:5432/gtat")
    args = ap.parse_args()

    h = Handler()
    h.apply_file(args.pbf, locations=True)  # locations=True: gắn tọa độ cho node của way
    print(f"Đọc được {len(h.roads)} đoạn đường, {len(h.cameras)} camera")

    with psycopg.connect(args.db) as conn, conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO road_rules (osm_way_id, name, geom, speed_limit_car, speed_limit_moto, oneway, no_overtaking, source)
               VALUES (%s, %s, ST_GeomFromText(%s, 4326), %s, %s, %s, %s, 'osm')
               ON CONFLICT (osm_way_id) DO UPDATE SET
                 name = EXCLUDED.name, geom = EXCLUDED.geom,
                 speed_limit_car = EXCLUDED.speed_limit_car, speed_limit_moto = EXCLUDED.speed_limit_moto,
                 oneway = EXCLUDED.oneway, no_overtaking = EXCLUDED.no_overtaking, updated_at = now()
               WHERE road_rules.source = 'osm'  -- không ghi đè dữ liệu đã chỉnh tay""",
            h.roads,
        )
        # Camera: tránh nhập trùng điểm đã có trong bán kính 30 m
        for osm_id, lon, lat, speed in h.cameras:
            cur.execute(
                """INSERT INTO hazards (type, geom, value, source)
                   SELECT 'speed_camera', ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, 'osm'
                   WHERE NOT EXISTS (
                     SELECT 1 FROM hazards WHERE type = 'speed_camera' AND deleted_at IS NULL
                       AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 30))""",
                (lon, lat, speed, lon, lat),
            )
    print("Hoàn tất.")


if __name__ == "__main__":
    main()
