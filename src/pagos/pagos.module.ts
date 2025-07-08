import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/database/database.module';
import { RepositoryModule } from 'src/common/repository/repository.module';
import { ExternalServiceModule } from 'src/common/external-services/external-service.module';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { DeudasController } from './deudas.controller';
import { DeudasService } from './deudas.service';
import { NotificationsGateway } from 'src/notificaciones/notifications.gateway';
import { DominiosController } from './dominios.controller';
import { DominiosService } from './dominios.service';
import { EmailModule } from 'src/common/correos/email.module';

@Module({
  imports: [DatabaseModule, RepositoryModule, ExternalServiceModule,EmailModule],
  controllers: [PagosController, DeudasController, DominiosController],
  providers: [NotificationsGateway, PagosService, DeudasService, DominiosService],
  exports: [],
})
export class PagosModule {}
