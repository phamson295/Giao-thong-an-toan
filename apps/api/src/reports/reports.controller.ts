import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateReportDto, VoteDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  /** POST /reports  { type, lng, lat, heading?, deviceId } */
  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.service.create(dto);
  }

  /** POST /reports/:hazardId/vote  { vote: 'confirm' | 'deny', deviceId } */
  @Post(':hazardId/vote')
  vote(@Param('hazardId', ParseUUIDPipe) hazardId: string, @Body() dto: VoteDto) {
    return this.service.vote(hazardId, dto);
  }
}
