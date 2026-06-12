import { Module } from '@nestjs/common';
import { ContactController, ContactGroupController } from './contact.controller.js';
import { ContactService } from './contact.service.js';
import { ContactSyncListener } from './contact-sync.listener.js';

@Module({
  controllers: [ContactController, ContactGroupController],
  providers: [ContactService, ContactSyncListener],
  exports: [ContactService],
})
export class ContactModule {}
