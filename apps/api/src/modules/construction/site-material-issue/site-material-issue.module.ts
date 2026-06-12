import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { SiteMaterialIssueController } from './site-material-issue.controller.js';
import { SiteMaterialIssueService } from './site-material-issue.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SiteMaterialIssueController],
  providers: [SiteMaterialIssueService],
  exports: [SiteMaterialIssueService],
})
export class SiteMaterialIssueModule {}
