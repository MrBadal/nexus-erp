import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ScheduledJobsService } from './scheduled-jobs.service.js';

export const QUEUE_NAMES = {
  SCHEDULED: 'scheduled-jobs',
} as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.SCHEDULED,
    }),
  ],
  providers: [ScheduledJobsService],
  exports: [BullModule],
})
export class QueueModule {}
