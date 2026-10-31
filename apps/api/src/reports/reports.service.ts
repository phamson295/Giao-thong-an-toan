import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { HazardPoint } from '@gtat/shared';
import { PG_POOL } from '../database/database.module';
import { HAZARD_COLUMNS, toHazard } from '../hazards/hazards.repository';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { CommunityType, CreateReportDto, VoteDto } from './reports.dto';

/** Thời hạn hiệu lực của báo cáo cộng đồng (phút). null = vĩnh viễn, chờ kiểm duyệt. */
const TTL_MINUTES: Record<CommunityType, number | null> = {
  police_report: 60,
  accident_report: 120,
  road_work_report: 60 * 24 * 7,
  speed_camera: null,
};
const MERGE_RADIUS_M = 50; // báo cáo trùng loại trong 50 m => gộp thành "xác nhận"
const MAX_REPORTS_PER_HOUR = 10;

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(dto: CreateReportDto): Promise<HazardPoint> {
    const hazard = await this.tx(async (db) => {
      await this.checkRateLimit(db, dto.deviceId);
      const ttl = TTL_MINUTES[dto.type];
      const point = `ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography`;

      // Đã có điểm cùng loại gần đó => tăng xác nhận, gia hạn
      const existing = await db.query(
        `UPDATE hazards
            SET confirmations = confirmations + 1,
                updated_at = now(),
                expires_at = CASE WHEN $4::int IS NULL THEN NULL ELSE now() + make_interval(mins => $4::int) END
          WHERE id = (
                SELECT id FROM hazards
                 WHERE type = $3 AND deleted_at IS NULL
                   AND (expires_at IS NULL OR expires_at > now())
                   AND ST_DWithin(geom, ${point}, ${MERGE_RADIUS_M})
                 ORDER BY geom <-> ${point} LIMIT 1)
          RETURNING ${HAZARD_COLUMNS}`,
        [dto.lng, dto.lat, dto.type, ttl],
      );
      let row = existing.rows[0];
      if (!row) {
        const inserted = await db.query(
          `INSERT INTO hazards (type, geom, heading, source, expires_at)
           VALUES ($3, ${point}, $5, 'community',
                   CASE WHEN $4::int IS NULL THEN NULL ELSE now() + make_interval(mins => $4::int) END)
           RETURNING ${HAZARD_COLUMNS}`,
          [dto.lng, dto.lat, dto.type, ttl, dto.heading ?? null],
        );
        row = inserted.rows[0];
      }
      await db.query(
        `INSERT INTO reports (hazard_id, action, device_id, geom)
         VALUES ($1, 'create', $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography)`,
        [row.id, dto.deviceId, dto.lng, dto.lat],
      );
      return toHazard(row);
    });
    this.realtime.broadcastHazard(hazard);
    return hazard;
  }

  async vote(hazardId: string, dto: VoteDto): Promise<HazardPoint> {
    const hazard = await this.tx(async (db) => {
      await this.checkRateLimit(db, dto.deviceId);
      const col = dto.vote === 'confirm' ? 'confirmations' : 'denials';
      // Bị phủ nhận nhiều hơn xác nhận từ 3 lượt trở lên => xóa mềm
      const { rows } = await db.query(
        `UPDATE hazards
            SET ${col} = ${col} + 1,
                updated_at = now(),
                deleted_at = CASE
                  WHEN source = 'community' AND denials + $2 >= confirmations + 3 THEN now()
                  ELSE deleted_at END
          WHERE id = $1
          RETURNING ${HAZARD_COLUMNS}`,
        [hazardId, dto.vote === 'deny' ? 1 : 0],
      );
      if (!rows[0]) throw new NotFoundException('Không tìm thấy điểm cảnh báo');
      await db.query(
        `INSERT INTO reports (hazard_id, action, device_id) VALUES ($1, $2, $3)`,
        [hazardId, dto.vote, dto.deviceId],
      );
      return toHazard(rows[0]);
    });
    this.realtime.broadcastHazard(hazard);
    return hazard;
  }

  private async checkRateLimit(db: PoolClient, deviceId: string) {
    const { rows } = await db.query(
      `SELECT count(*)::int AS n FROM reports
        WHERE device_id = $1 AND created_at > now() - interval '1 hour'`,
      [deviceId],
    );
    if (rows[0].n >= MAX_REPORTS_PER_HOUR) {
      throw new HttpException('Bạn gửi quá nhiều báo cáo, vui lòng thử lại sau', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async tx<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
