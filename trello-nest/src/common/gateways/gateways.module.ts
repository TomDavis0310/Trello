import { Global, Module } from '@nestjs/common';
import { TrelloGateway } from './trello.gateway';

@Global()
@Module({
  providers: [TrelloGateway],
  exports: [TrelloGateway],
})
export class GatewaysModule {}
