import { Module } from '@nestjs/common';
import { HazardsController } from './hazards.controller';
import { HazardsRepository } from './hazards.repository';

@Module({
  controllers: [HazardsController],
  providers: [HazardsRepository],
  exports: [HazardsRepository],
})
export class HazardsModule {}
