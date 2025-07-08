import { Module } from '@nestjs/common';

import { EmailService } from './email.service';


@Module({
  providers: [EmailService], // Proveedor del servicio de correo
  exports: [EmailService], // Exporta el servicio para otros módulos
})
export class EmailModule {}
