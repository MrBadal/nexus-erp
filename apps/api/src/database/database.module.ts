import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export const DATABASE = 'DATABASE';
export type DrizzleDB = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = `postgresql://${configService.get<string>('database.user')}:${configService.get<string>('database.password')}@${configService.get<string>('database.host')}:${configService.get<number>('database.port')}/${configService.get<string>('database.database')}`;

        const client = postgres(connectionString);
        const db = drizzle(client, { schema });
        return db;
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
