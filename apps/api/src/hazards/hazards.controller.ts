import { Controller, Get, Query } from '@nestjs/common';
import { parseBBox, parseSince } from '../common/bbox';
import { HazardsRepository } from './hazards.repository';

@Controller('hazards')
export class HazardsController {
  constructor(private readonly repo: HazardsRepository) {}

  /** GET /hazards?bbox=105.7,20.9,105.9,21.1&since=2026-10-01T00:00:00Z */
  @Get()
  async list(@Query('bbox') bbox?: string, @Query('since') since?: string) {
    const serverTime = new Date().toISOString(); // máy khách lưu lại làm `since` lần sau
    const items = await this.repo.findInBBox(parseBBox(bbox), parseSince(since));
    return { serverTime, items };
  }
}
