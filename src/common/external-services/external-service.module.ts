import { Module } from '@nestjs/common';
import { ApiSipService } from './api.sip.service';
import { ApiIllaService } from './api.illa.service';
import { ApiBrevoService } from './api.brevo.service';

@Module({
  providers: [ApiSipService,ApiIllaService,ApiBrevoService],
  exports: [ApiSipService,ApiIllaService,ApiBrevoService],
})
export class ExternalServiceModule {}
