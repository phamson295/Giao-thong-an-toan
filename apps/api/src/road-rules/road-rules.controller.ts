import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import type { RoadRule } from '@gtat/shared';
import { parseBBox, parseSince } from '../common/bbox';
import { PG_POOL } from '../database/database.module';

@Controller('road-rules')
export class RoadRulesController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** GET /road-rules?bbox=...&since=...  – tải về máy để cảnh báo offline. */
  @Get()
  async list(@Query('bbox') bbox?: string, @Query('since') since?: string) {
    const serverTime = new Date().toISOString();
    const [w, s, e, n] = parseBBox(bbox, 1);
    const { rows } = await this.pool.query(
      `SELECT id::text, name,
              ST_AsGeoJSON(geom, 6)::json -> 'coordinates' AS coords,
              speed_limit_car AS "speedLimitCar", oneway, no_overtaking AS "noOvertaking"
         FROM road_rules
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND updated_at > $5
          AND (speed_limit_car IS NOT NULL OR oneway OR no_overtaking)
        LIMIT 50000`,
      [w, s, e, n, parseSince(since)],
    );
    return { serverTime, items: rows as RoadRule[] };
  }
}
