/**
 * Chuẩn bị đi vào vùng không có sóng (ví dụ khu vực lõi rừng):
 *  1. Tải gói bản đồ (tile) về máy bằng OfflineManager của MapLibre.
 *  2. Tải dữ liệu cảnh báo (camera, biển báo, tốc độ) của vùng vào SQLite.
 * Tìm đường offline (GraphHopper/Valhalla trên máy) là bước sau – xem docs/KIEN_TRUC.md.
 */
import { OfflineManager } from '@maplibre/maplibre-react-native';
import { bboxAround, type BBox } from '@gtat/shared';
import { MAP_STYLE_URL } from '../config';
import { syncRegion } from '../sync/syncService';

export interface DownloadProgress {
  mapPercent: number;
  dataDone: boolean;
}

export async function downloadRegion(
  name: string,
  bbox: BBox,
  onProgress: (p: DownloadProgress) => void,
): Promise<void> {
  let dataDone = false;
  let mapPercent = 0;

  const mapTask = new Promise<void>((resolve, reject) => {
    OfflineManager.createPack(
      { mapStyle: MAP_STYLE_URL, bounds: bbox, minZoom: 8, maxZoom: 16, metadata: { name } },
      (_pack, status) => {
        mapPercent = Math.round(status.percentage);
        onProgress({ mapPercent, dataDone });
        if (status.state === 'complete') resolve();
      },
      (_pack, err) => reject(new Error(err.message)),
    ).catch(reject);
  });

  // Dữ liệu cảnh báo: chia nhỏ thành các ô 0,5° vì API giới hạn kích thước bbox
  const dataTask = (async () => {
    const [w, s, e, n] = bbox;
    for (let x = w; x < e; x += 0.5) {
      for (let y = s; y < n; y += 0.5) {
        await syncRegion([x, y, Math.min(x + 0.5, e), Math.min(y + 0.5, n)]);
      }
    }
    dataDone = true;
    onProgress({ mapPercent, dataDone });
  })();

  await Promise.all([mapTask, dataTask]);
}

/** Tiện ích: vùng vuông bán kính r km quanh vị trí hiện tại. */
export const regionAround = (lng: number, lat: number, radiusKm: number): BBox =>
  bboxAround(lng, lat, radiusKm * 1000);

export interface SavedRegion {
  id: string;
  name: string;
  percent: number;
  sizeMb: number;
  complete: boolean;
}

/** Danh sách các vùng bản đồ đã tải về máy. */
export async function listRegions(): Promise<SavedRegion[]> {
  const packs = await OfflineManager.getPacks();
  const out: SavedRegion[] = [];
  for (const p of packs) {
    const st = await p.status().catch(() => null);
    out.push({
      id: p.id,
      name: String(p.metadata?.name ?? 'Vùng chưa đặt tên'),
      percent: Math.round(st?.percentage ?? 0),
      sizeMb: Math.round(((st?.completedResourceSize ?? 0) / 1_048_576) * 10) / 10,
      complete: st?.state === 'complete',
    });
  }
  return out;
}

/** Xóa gói bản đồ của một vùng (dữ liệu cảnh báo trong SQLite vẫn giữ, vì rất nhẹ). */
export const deleteRegion = (id: string) => OfflineManager.deletePack(id);
