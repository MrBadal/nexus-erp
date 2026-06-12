import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service.js';

@Module({
  providers: [IntegrationService],
})
export class IntegrationModule {}
