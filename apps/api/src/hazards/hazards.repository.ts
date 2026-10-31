import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { BBox, HazardPoint } from '@gtat/shared';
import { PG_POOL } from '../database/database.module';

/** Câu SELECT chuẩn, chuyển hàng CSDL sang đúng kiểu HazardPoint dùng chung. */
export const HAZARD_COLUMNS = `
  id, type,
  ST_X(geom::geometry) AS lng, ST_Y(geom::geometry) AS lat,
  heading, value, source, confirmations,
  updated_at AS "updatedAt", expires_at AS "expiresAt",
  (deleted_at IS NOT NULL) AS deleted`;

export function toHazard(row: any): HazardPoint {
  return {
    ...row,
    updatedAt: new Date(row.updatedAt).toISOString(),
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
  };
}

@Injectable()
export class HazardsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Lấy điểm cảnh báo trong bbox đã thay đổi sau `since` (đồng bộ tăng dần).
   * Trả cả bản ghi đã xóa mềm để máy khách xóa khỏi bộ nhớ cục bộ.
   */
  async findInBBox([w, s, e, n]: BBox, since: Date): Promise<HazardPoint[]> {
    const { rows } = await this.pool.query(
      `SELECT ${HAZARD_COLUMNS}
         FROM hazards
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
          AND updated_at > $5
        ORDER BY updated_at
        LIMIT 5000`,
      [w, s, e, n, since],
    );
    return rows.map(toHazard);
  }

  async findById(id: string, db: Pool | PoolClient = this.pool): Promise<HazardPoint | null> {
    const { rows } = await db.query(`SELECT ${HAZARD_COLUMNS} FROM hazards WHERE id = $1`, [id]);
    return rows[0] ? toHazard(rows[0]) : null;
  }
}
