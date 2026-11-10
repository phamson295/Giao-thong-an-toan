/**
 * Đồng bộ giữa máy chủ (Cloud) và SQLite cục bộ.
 *  - Kéo dữ liệu tăng dần theo vùng: chỉ tải bản ghi thay đổi sau lần đồng bộ trước.
 *  - Đẩy báo cáo trong hàng đợi (outbox) khi có mạng.
 *  - Nhận báo cáo cộng đồng realtime qua socket.io.
 * Mọi lỗi mạng đều bị nuốt: app vẫn chạy bằng dữ liệu cục bộ.
 */
import * as Crypto from 'expo-crypto';
import { io, type Socket } from 'socket.io-client';
import type { BBox, HazardPoint, HazardType, RoadRule } from '@gtat/shared';
import { API_URL } from '../config';
import {
  enqueue, getMeta, outboxItems, removeOutbox, setMeta, upsertHazards, upsertRoadRules,
} from '../db/localStore';

const regionKey = (b: BBox) => b.map((n) => n.toFixed(2)).join(',');

async function getJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Tải (hoặc cập nhật) dữ liệu cảnh báo của một vùng. Trả về số bản ghi mới. */
export async function syncRegion(bbox: BBox): Promise<number> {
  const key = regionKey(bbox);
  const since = (await getMeta(`since:${key}`)) ?? '';
  const q = `bbox=${bbox.join(',')}&since=${encodeURIComponent(since)}`;

  const [hz, rr] = await Promise.all([
    getJson<{ serverTime: string; items: HazardPoint[] }>(`/hazards?${q}`),
    getJson<{ serverTime: string; items: RoadRule[] }>(`/road-rules?${q}`),
  ]);
  await upsertHazards(hz.items);
  await upsertRoadRules(rr.items);
  // Dùng giờ máy chủ (không dùng giờ điện thoại) để tránh lệch đồng hồ
  await setMeta(`since:${key}`, hz.serverTime < rr.serverTime ? hz.serverTime : rr.serverTime);
  return hz.items.length + rr.items.length;
}

// ---------- Báo cáo cộng đồng ----------

let deviceIdCache: string | null = null;
/** Mã thiết bị ẩn danh, sinh ngẫu nhiên một lần – không gắn với danh tính người dùng. */
export async function getDeviceId(): Promise<string> {
  if (deviceIdCache) return deviceIdCache;
  let id = await getMeta('device_id');
  if (!id) {
    id = Crypto.randomUUID();
    await setMeta('device_id', id);
  }
  return (deviceIdCache = id);
}

/** Gửi báo cáo. Mất mạng thì xếp hàng, gửi sau. */
export async function report(type: HazardType, lng: number, lat: number, heading: number | null) {
  const body = { type, lng, lat, heading: heading === null ? undefined : Math.round(heading) % 360, deviceId: await getDeviceId() };
  await enqueue('/reports', body);
  await flushOutbox();
}

/** Xác nhận ("còn") hoặc phủ nhận ("không còn") một điểm do cộng đồng báo. */
export async function vote(hazardId: string, value: 'confirm' | 'deny') {
  await enqueue(`/reports/${hazardId}/vote`, { vote: value, deviceId: await getDeviceId() });
  await flushOutbox();
}

export async function flushOutbox(): Promise<void> {
  for (const item of await outboxItems()) {
    try {
      const res = await fetch(`${API_URL}${item.path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: item.body,
      });
      // 4xx (dữ liệu sai, quá giới hạn) => bỏ, không thử lại mãi
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await removeOutbox(item.id);
        if (res.ok) await upsertHazards([(await res.json()) as HazardPoint]);
      }
    } catch {
      return; // vẫn mất mạng – thử lại lần sau
    }
  }
}

// ---------- Realtime ----------

let socket: Socket | null = null;

export function connectRealtime(onHazard: (h: HazardPoint) => void): Socket {
  socket?.disconnect();
  socket = io(API_URL, { transports: ['websocket'], reconnection: true });
  socket.on('hazard:upsert', async (h: HazardPoint) => {
    await upsertHazards([h]);
    onHazard(h);
  });
  socket.on('connect', () => {
    flushOutbox().catch(() => undefined); // vừa có mạng trở lại => gửi hàng đợi
  });
  return socket;
}

/** Đăng ký nhận sự kiện của vùng quanh xe (gọi lại khi xe di chuyển xa). */
export function subscribeArea(bbox: BBox) {
  socket?.emit('subscribe', { bbox });
}
