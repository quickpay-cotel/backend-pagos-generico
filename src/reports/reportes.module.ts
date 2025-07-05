import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';

@Module({
  imports:[],
  controllers: [ReportesController],
  providers:[]
})
export class ReportesModule {}
