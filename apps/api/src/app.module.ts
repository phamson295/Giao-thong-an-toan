import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HazardsModule } from './hazards/hazards.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { RoadRulesModule } from './road-rules/road-rules.module';

@Module({
  imports: [DatabaseModule, RealtimeModule, HazardsModule, RoadRulesModule, ReportsModule],
})
export class AppModule {}
