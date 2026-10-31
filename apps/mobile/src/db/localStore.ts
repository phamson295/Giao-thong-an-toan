/**
 * Bộ nhớ cục bộ (SQLite) – nguồn dữ liệu DUY NHẤT cho bộ máy cảnh báo.
 * Online hay offline, cảnh báo luôn đọc từ đây => hành vi giống nhau ở mọi nơi.
 * Mạng chỉ dùng để làm mới dữ liệu (syncService).
 */
import * as SQLite from 'expo-sqlite';
import { bboxAround, type BBox, type HazardPoint, type HazardType, type RoadRule } from '@gtat/shared';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync('gtat.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS hazards (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, lng REAL NOT NULL, lat REAL NOT NULL,
        heading INTEGER, value INTEGER, source TEXT NOT NULL, confirmations INTEGER NOT NULL,
        updated_at TEXT NOT NULL, expires_at TEXT
      );
      CREATE INDEX IF NOT EXISTS hazards_lat_lng ON hazards(lat, lng);

      -- Đoạn đường: lưu khung bao (min/max) để lọc nhanh, coords dạng JSON
      CREATE TABLE IF NOT EXISTS road_rules (
        id TEXT PRIMARY KEY, name TEXT, coords TEXT NOT NULL,
        speed_limit_car INTEGER, oneway INTEGER NOT NULL, no_overtaking INTEGER NOT NULL,
        min_lng REAL, min_lat REAL, max_lng REAL, max_lat REAL
      );
      CREATE INDEX IF NOT EXISTS road_rules_box ON road_rules(min_lat, max_lat, min_lng, max_lng);

      -- Hàng đợi báo cáo gửi khi có mạng trở lại (offline-first)
      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, body TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      -- Ghi nhớ thời điểm đồng bộ cuối theo từng vùng
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    return db;
  })();
  return dbPromise;
}

// ---------- Hazards ----------

export async function upsertHazards(items: HazardPoint[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const h of items) {
      if (h.deleted) {
        await db.runAsync('DELETE FROM hazards WHERE id = ?', h.id);
        continue;
      }
      await db.runAsync(
        `INSERT OR REPLACE INTO hazards
           (id, type, lng, lat, heading, value, source, confirmations, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        h.id, h.type, h.lng, h.lat, h.heading, h.value, h.source, h.confirmations, h.updatedAt, h.expiresAt,
      );
    }
  });
}

type HazardRow = {
  id: string; type: HazardType; lng: number; lat: number; heading: number | null;
  value: number | null; source: HazardPoint['source']; confirmations: number;
  updated_at: string; expires_at: string | null;
};

const rowToHazard = (r: HazardRow): HazardPoint => ({
  id: r.id, type: r.type, lng: r.lng, lat: r.lat, heading: r.heading, value: r.value,
  source: r.source, confirmations: r.confirmations, updatedAt: r.updated_at, expiresAt: r.expires_at,
});

export async function hazardsInBBox([w, s, e, n]: BBox): Promise<HazardPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HazardRow>(
    `SELECT * FROM hazards
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
        AND (expires_at IS NULL OR expires_at > ?)`,
    s, n, w, e, new Date().toISOString(),
  );
  return rows.map(rowToHazard);
}

export const hazardsNear = (lng: number, lat: number, radiusM: number) =>
  hazardsInBBox(bboxAround(lng, lat, radiusM));

// ---------- Road rules ----------

export async function upsertRoadRules(items: RoadRule[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of items) {
      const lngs = r.coords.map((c) => c[0]);
      const lats = r.coords.map((c) => c[1]);
      await db.runAsync(
        `INSERT OR REPLACE INTO road_rules
           (id, name, coords, speed_limit_car, oneway, no_overtaking, min_lng, min_lat, max_lng, max_lat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id, r.name ?? null, JSON.stringify(r.coords), r.speedLimitCar, r.oneway ? 1 : 0,
        r.noOvertaking ? 1 : 0, Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats),
      );
    }
  });
}

type RoadRow = {
  id: string; name: string | null; coords: string; speed_limit_car: number | null;
  oneway: number; no_overtaking: number;
};

export async function roadRulesNear(lng: number, lat: number, radiusM = 60): Promise<RoadRule[]> {
  const [w, s, e, n] = bboxAround(lng, lat, radiusM);
  const db = await getDb();
  const rows = await db.getAllAsync<RoadRow>(
    `SELECT id, name, coords, speed_limit_car, oneway, no_overtaking FROM road_rules
      WHERE max_lat >= ? AND min_lat <= ? AND max_lng >= ? AND min_lng <= ?`,
    s, n, w, e,
  );
  return rows.map((r) => ({
    id: r.id, name: r.name, coords: JSON.parse(r.coords), speedLimitCar: r.speed_limit_car,
    oneway: r.oneway === 1, noOvertaking: r.no_overtaking === 1,
  }));
}

// ---------- Outbox (báo cáo chờ gửi) ----------

export async function enqueue(path: string, body: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO outbox (path, body, created_at) VALUES (?, ?, ?)', path, JSON.stringify(body), Date.now());
}

export async function outboxItems() {
  const db = await getDb();
  return db.getAllAsync<{ id: number; path: string; body: string }>('SELECT id, path, body FROM outbox ORDER BY id LIMIT 50');
}

export async function removeOutbox(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
}

// ---------- Meta ----------

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
}
