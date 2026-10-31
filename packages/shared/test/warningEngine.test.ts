import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AnnouncementFilter,
  WarningEngine,
  matchRoad,
  type GpsFix,
  type HazardPoint,
  type RoadRule,
} from '../src/index';

// Đoạn đường thẳng hướng Bắc (lng cố định), dài ~1,1 km, một chiều, giới hạn 50 km/h.
const road: RoadRule = {
  id: 'r1',
  coords: [
    [105.85, 21.0],
    [105.85, 21.01],
  ],
  speedLimitCar: 50,
  oneway: true,
  noOvertaking: true,
};

const fix = (o: Partial<GpsFix>): GpsFix => ({
  lng: 105.85,
  lat: 21.002,
  speedKmh: 40,
  heading: 0,
  accuracyM: 5,
  timestamp: 0,
  ...o,
});

const camera: HazardPoint = {
  id: 'cam1',
  type: 'speed_camera',
  lng: 105.85,
  lat: 21.004, // phía Bắc xe ~220 m
  heading: 0,
  value: 50,
  source: 'official',
  confirmations: 0,
  updatedAt: '2026-10-01T00:00:00Z',
  expiresAt: null,
};

test('map matching chọn đúng đường cùng phương', () => {
  const m = matchRoad(fix({}), [road]);
  assert.equal(m?.road.id, 'r1');
  // Xe chạy hướng Đông cắt ngang -> không khớp
  assert.equal(matchRoad(fix({ heading: 90 }), [road]), null);
});

test('chỉ cảnh báo vượt tốc độ sau 3 giây liên tục', () => {
  const e = new WarningEngine();
  const m = matchRoad(fix({}), [road]);
  const k = (t: number) => e.update(fix({ speedKmh: 60, timestamp: t }), m, []).map((w) => w.kind);
  assert.ok(!k(0).includes('overspeed'));
  assert.ok(!k(2000).includes('overspeed'));
  assert.ok(k(3000).includes('overspeed'));
  // Trong dung sai (53 <= 50+3) thì không cảnh báo và reset bộ đếm
  assert.ok(!e.update(fix({ speedKmh: 53, timestamp: 4000 }), m, []).some((w) => w.kind === 'overspeed'));
});

test('cảnh báo đi ngược chiều sau 5 giây', () => {
  const e = new WarningEngine();
  const f = (t: number) => fix({ heading: 180, timestamp: t });
  const m = matchRoad(f(0), [road]);
  assert.ok(m, 'phải khớp đường dù đi ngược chiều vẽ');
  assert.ok(!e.update(f(0), m, []).some((w) => w.kind === 'wrong_way'));
  assert.ok(e.update(f(5000), m, []).some((w) => w.kind === 'wrong_way'));
});

test('cảnh báo camera phía trước, bỏ qua camera phía sau và khác hướng', () => {
  const e = new WarningEngine();
  const ws = e.update(fix({}), null, [
    camera,
    { ...camera, id: 'behind', lat: 20.999 },
    { ...camera, id: 'opposite', heading: 180 },
  ]);
  const ids = ws.filter((w) => w.kind === 'hazard_ahead').map((w) => w.hazardId);
  assert.deepEqual(ids, ['cam1']);
  assert.match(ws.find((w) => w.hazardId === 'cam1')!.message, /Phía trước 200 mét có camera giám sát tốc độ, giới hạn 50/);
});

test('bỏ qua báo cáo cộng đồng đã hết hạn', () => {
  const e = new WarningEngine();
  const expired = { ...camera, id: 'p1', type: 'police_report' as const, expiresAt: '1970-01-01T00:00:00Z' };
  assert.equal(e.update(fix({ timestamp: 10_000 }), null, [expired]).length, 0);
});

test('bộ lọc chỉ đọc mỗi cảnh báo một lần', () => {
  const e = new WarningEngine();
  const f = new AnnouncementFilter();
  const ws = e.update(fix({}), null, [camera]);
  assert.equal(f.pickNew(ws, 0).length, 1);
  assert.equal(f.pickNew(ws, 1000).length, 0);
});
