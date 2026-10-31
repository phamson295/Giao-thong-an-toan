-- Dữ liệu mẫu để thử nghiệm (tọa độ minh họa, KHÔNG phải vị trí camera thật)
INSERT INTO hazards (type, geom, heading, value, source) VALUES
  ('speed_camera',        ST_GeogFromText('POINT(105.8500 21.0040)'),   0, 50, 'official'),
  ('red_light_camera',    ST_GeogFromText('POINT(105.8520 21.0060)'), NULL, NULL, 'official'),
  ('no_overtaking_start', ST_GeogFromText('POINT(105.8500 21.0100)'),   0, NULL, 'osm');

INSERT INTO road_rules (osm_way_id, name, geom, speed_limit_car, oneway, no_overtaking) VALUES
  (-1, 'Đường mẫu một chiều', ST_GeomFromText('LINESTRING(105.85 21.0, 105.85 21.01)', 4326), 50, true,  false),
  (-2, 'Đường mẫu cấm vượt',  ST_GeomFromText('LINESTRING(105.85 21.01, 105.86 21.02)', 4326), 60, false, true);
