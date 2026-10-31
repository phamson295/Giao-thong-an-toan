-- Lược đồ CSDL không gian (PostgreSQL 16 + PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- Điểm cảnh báo: camera, biển báo, báo cáo cộng đồng
CREATE TABLE IF NOT EXISTS hazards (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text NOT NULL CHECK (type IN (
                   'speed_camera','red_light_camera','no_overtaking_start','no_overtaking_end',
                   'school','police_report','accident_report','road_work_report')),
  geom           geography(Point, 4326) NOT NULL,
  heading        smallint CHECK (heading BETWEEN 0 AND 359), -- NULL = mọi hướng
  value          smallint,                                    -- ví dụ tốc độ giới hạn
  source         text NOT NULL DEFAULT 'official'
                   CHECK (source IN ('official','osm','community','ai_camera')),
  confirmations  integer NOT NULL DEFAULT 0,
  denials        integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz,                                 -- báo cáo cộng đồng có hạn
  deleted_at     timestamptz                                  -- xóa mềm để máy khách đồng bộ được
);
CREATE INDEX IF NOT EXISTS hazards_geom_idx    ON hazards USING gist (geom);
CREATE INDEX IF NOT EXISTS hazards_updated_idx ON hazards (updated_at);

-- Quy tắc theo đoạn đường (nhập từ OSM, chỉnh tay qua trang quản trị)
CREATE TABLE IF NOT EXISTS road_rules (
  id               bigserial PRIMARY KEY,
  osm_way_id       bigint UNIQUE,
  name             text,
  geom             geometry(LineString, 4326) NOT NULL,
  speed_limit_car  smallint,
  speed_limit_moto smallint,
  oneway           boolean NOT NULL DEFAULT false,  -- true: chiều cho phép = chiều vẽ
  no_overtaking    boolean NOT NULL DEFAULT false,
  source           text NOT NULL DEFAULT 'osm',
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS road_rules_geom_idx    ON road_rules USING gist (geom);
CREATE INDEX IF NOT EXISTS road_rules_updated_idx ON road_rules (updated_at);

-- Nhật ký báo cáo cộng đồng (phục vụ kiểm duyệt, chống spam)
CREATE TABLE IF NOT EXISTS reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id   uuid REFERENCES hazards(id),
  action      text NOT NULL CHECK (action IN ('create','confirm','deny')),
  device_id   text NOT NULL,
  geom        geography(Point, 4326),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_device_idx ON reports (device_id, created_at);
