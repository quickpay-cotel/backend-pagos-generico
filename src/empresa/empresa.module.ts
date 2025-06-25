import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/database/database.module';
import { RepositoryModule } from 'src/common/repository/repository.module';
import { ExternalServiceModule } from 'src/common/external-services/external-service.module';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';

@Module({
  imports: [DatabaseModule, RepositoryModule, ExternalServiceModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [],
})
export class EmpresaModule {}
