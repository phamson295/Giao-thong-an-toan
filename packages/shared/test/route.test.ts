import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AnnouncementFilter, WarningEngine, decodePolyline, formatDistance, formatDuration, matchRoad,
  navigationPrompts, parseLatLng, parseValhallaRoute, routeProgress, speedLimitFor,
  type GpsFix, type HazardPoint, type RoadRule,
} from '../src/index';

/** Mã hóa polyline (ngược với decodePolyline) để dựng dữ liệu thử. */
function encode(coords: [number, number][], precision = 6): string {
  const f = 10 ** precision;
  let out = '', pLat = 0, pLng = 0;
  const enc = (v: number) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    while (v >= 0x20) { out += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    out += String.fromCharCode(v + 63);
  };
  for (const [lng, lat] of coords) {
    const la = Math.round(lat * f), ln = Math.round(lng * f);
    enc(la - pLat); enc(ln - pLng); pLat = la; pLng = ln;
  }
  return out;
}

// Tuyến chữ L: đi Bắc ~1,1 km rồi rẽ phải đi Đông ~1 km
const shape: [number, number][] = [[105.85, 21.0], [105.85, 21.005], [105.85, 21.01], [105.855, 21.01], [105.86, 21.01]];
const valhalla = {
  trip: {
    summary: { length: 2.15, time: 240 },
    legs: [{
      shape: encode(shape),
      maneuvers: [
        { type: 1, street_names: ['Đường Láng'], length: 1.1, begin_shape_index: 0 },
        { type: 10, street_names: ['Phố Huế'], length: 1.05, begin_shape_index: 2 },
        { type: 4, length: 0, begin_shape_index: 4 },
      ],
    }],
  },
};
const dest = { lng: 105.86, lat: 21.01, name: 'Điểm thử' };

test('giải mã polyline đúng với ví dụ chuẩn của Google (độ chính xác 5)', () => {
  assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5), [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]]);
  assert.deepEqual(decodePolyline(encode(shape)), shape);
});

test('đọc tuyến Valhalla và soạn chỉ dẫn tiếng Việt', () => {
  const r = parseValhallaRoute(valhalla, dest);
  assert.equal(r.coords.length, 5);
  assert.deepEqual(r.steps.map((s) => s.instruction), ['Bắt đầu đi trên Đường Láng', 'Rẽ phải vào Phố Huế', 'Đã đến điểm đến']);
  assert.ok(Math.abs(r.distanceM - 2150) < 30, `dài ${r.distanceM}`);
  assert.throws(() => parseValhallaRoute({ error: 'No path could be found' }, dest), /No path/);
});

test('tiến độ trên tuyến: còn bao xa, chặng kế tiếp, đi chệch, đến nơi', () => {
  const r = parseValhallaRoute(valhalla, dest);
  const p1 = routeProgress(r, 105.85, 21.0073); // cách chỗ rẽ ~300 m
  assert.equal(p1.nextStep?.instruction, 'Rẽ phải vào Phố Huế');
  assert.ok(Math.abs(p1.distanceToNextStepM - 300) < 10, `${p1.distanceToNextStepM}`);
  assert.ok(p1.offRouteM < 1);
  assert.ok(Math.abs(p1.remainingS - 240 * (p1.remainingM / r.distanceM)) < 1);

  const off = routeProgress(r, 105.853, 21.005); // lệch sang Đông ~310 m
  assert.ok(off.offRouteM > 250);

  const end = routeProgress(r, 105.8599, 21.01, 3);
  assert.ok(end.arrived);
});

test('câu nhắc dẫn đường: nhắc xa rồi nhắc gần, mỗi câu một lần', () => {
  const r = parseValhallaRoute(valhalla, dest);
  const f = new AnnouncementFilter();
  const say = (lat: number) => f.pickNew(navigationPrompts(routeProgress(r, 105.85, lat), 40).map((p) => ({ ...p, kind: 'hazard_ahead' as const, severity: 'info' as const })), 0).map((w) => w.message);
  assert.deepEqual(say(21.002), []); // còn xa
  assert.deepEqual(say(21.0082), ['Còn 200 mét, rẽ phải vào Phố Huế']);
  assert.deepEqual(say(21.0085), []); // không lặp
  assert.deepEqual(say(21.0098), ['Rẽ phải vào Phố Huế']);
});

test('định dạng quãng đường, thời gian, tọa độ gõ tay', () => {
  assert.equal(formatDistance(847), '850 m');
  assert.equal(formatDistance(1234), '1,2 km');
  assert.equal(formatDistance(35400), '35 km');
  assert.equal(formatDuration(290), '5 phút');
  assert.equal(formatDuration(4800), '1 giờ 20 phút');
  assert.deepEqual(parseLatLng('21.0285, 105.8542'), { lat: 21.0285, lng: 105.8542 });
  assert.deepEqual(parseLatLng('21,0285 105,8542'), { lat: 21.0285, lng: 105.8542 });
  assert.equal(parseLatLng('Hà Nội'), null);
  assert.equal(parseLatLng('121.5, 30'), null);
});

test('xe máy dùng giới hạn riêng; tắt loại cảnh báo trong cài đặt', () => {
  const road: RoadRule = { id: 'r', coords: [[105.85, 21.0], [105.85, 21.01]], speedLimitCar: 60, speedLimitMoto: 50, oneway: false, noOvertaking: false };
  assert.equal(speedLimitFor(road, 'moto'), 50);
  assert.equal(speedLimitFor({ ...road, speedLimitMoto: null }, 'moto'), 60);
  const fix = (t: number): GpsFix => ({ lng: 105.85, lat: 21.002, speedKmh: 56, heading: 0, accuracyM: 5, timestamp: t });
  const cam: HazardPoint = { id: 'c', type: 'speed_camera', lng: 105.85, lat: 21.004, heading: 0, value: null, source: 'official', confirmations: 0, updatedAt: '', expiresAt: null };
  const m = matchRoad(fix(0), [road]);

  const car = new WarningEngine();
  car.update(fix(0), m, []);
  assert.ok(!car.update(fix(4000), m, []).some((w) => w.kind === 'overspeed'), 'ô tô 56 < 60: không cảnh báo');

  const moto = new WarningEngine({ vehicle: 'moto' });
  moto.update(fix(0), m, []);
  assert.ok(moto.update(fix(4000), m, [cam]).some((w) => w.kind === 'overspeed'), 'xe máy 56 > 50: cảnh báo');
  assert.ok(moto.update(fix(5000), m, [cam]).some((w) => w.hazardId === 'c'));
  moto.setConfig({ mutedHazardTypes: ['speed_camera'] });
  assert.ok(!moto.update(fix(6000), m, [cam]).some((w) => w.hazardId === 'c'), 'đã tắt cảnh báo camera');
});
