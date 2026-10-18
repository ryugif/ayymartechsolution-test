import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  /**
   * Connect to the database when the module is initialized. This ensures that the Prisma client is ready to use when the application starts.
   * @returns A promise that resolves when the connection is established.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnect from the database when the module is destroyed. This ensures that the Prisma client cleans up resources and closes the connection when the application shuts down.
   * @returns A promise that resolves when the disconnection is complete.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
