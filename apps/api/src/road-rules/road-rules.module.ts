import { Module } from '@nestjs/common';
import { RoadRulesController } from './road-rules.controller';

@Module({ controllers: [RoadRulesController] })
export class RoadRulesModule {}
