import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BoardModule } from './boards/board.module';
import { ListModule } from './lists/list.module';
import { CardModule } from './cards/card.module';
import { GatewaysModule } from './common/gateways/gateways.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BoardModule,
    ListModule,
    CardModule,
    GatewaysModule,
  ],
})
export class AppModule {}
