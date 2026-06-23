import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import type * as Prisma from '../../generated/prisma/client.js';

type PrismaClientInstance = Prisma.PrismaClient;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client!: PrismaClientInstance;

  async onModuleInit() {
    const { PrismaClient: PrismaClientClass }: typeof Prisma = await import('../../generated/prisma/client.js');
    const adapter = new PrismaLibSql({
      url: process.env.DATABASE_URL || 'file:./dev.db',
    });
    this.client = new PrismaClientClass({ adapter }) as PrismaClientInstance;
    await this.client.$connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }
}
