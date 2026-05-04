import { Module } from '@nestjs/common';
import {
  AnnouncementController,
  EssAnnouncementController,
} from './announcement.controller.js';
import { AnnouncementService } from './announcement.service.js';

@Module({
  controllers: [AnnouncementController, EssAnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
