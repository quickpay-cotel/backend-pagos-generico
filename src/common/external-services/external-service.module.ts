import { Module } from '@nestjs/common';
import { ApiSipService } from './api.sip.service';
import { ApiIllaService } from './api.illa.service';
import { ApiBrevoService } from './api.brevo.service';
import { IsipassGraphqlService } from './isipass.graphql.service';

@Module({
  providers: [ApiSipService,ApiIllaService,ApiBrevoService,IsipassGraphqlService],
  exports: [ApiSipService,ApiIllaService,ApiBrevoService,IsipassGraphqlService],
})
export class ExternalServiceModule {}
