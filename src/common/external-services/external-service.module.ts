import { Module } from '@nestjs/common';
import { ApiSipService } from './api.sip.service';

import { IsipassGraphqlService } from './isipass.graphql.service';

@Module({
  providers: [ApiSipService,IsipassGraphqlService],
  exports: [ApiSipService,IsipassGraphqlService],
})
export class ExternalServiceModule {}
