import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/trello',
})
export class TrelloGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  afterInit() {
    console.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  emitBoardCreated(board: unknown) {
    this.server.emit('board:created', board);
  }

  emitBoardUpdated(board: unknown) {
    this.server.emit('board:updated', board);
  }

  emitBoardDeleted(data: { id: number; message: string }) {
    this.server.emit('board:deleted', data);
  }

  emitListCreated(list: unknown) {
    this.server.emit('list:created', list);
  }

  emitListUpdated(list: unknown) {
    this.server.emit('list:updated', list);
  }

  emitListDeleted(data: { id: number; message: string }) {
    this.server.emit('list:deleted', data);
  }

  emitListReordered(lists: unknown) {
    this.server.emit('list:reordered', lists);
  }

  emitCardCreated(card: unknown) {
    this.server.emit('card:created', card);
  }

  emitCardUpdated(card: unknown) {
    this.server.emit('card:updated', card);
  }

  emitCardDeleted(data: { id: number; message: string }) {
    this.server.emit('card:deleted', data);
  }

  emitCardMoved(data: {
    sourceListId: number;
    targetListId: number;
    sourceCards: unknown;
    targetCards: unknown;
  }) {
    this.server.emit('card:moved', data);
  }

  emitCommentAdded(comment: unknown) {
    this.server.emit('comment:added', comment);
  }

  emitCommentDeleted(data: { id: number; message: string }) {
    this.server.emit('comment:deleted', data);
  }

  emitLabelAdded(label: unknown) {
    this.server.emit('label:added', label);
  }

  emitLabelRemoved(data: { id: number; message: string }) {
    this.server.emit('label:removed', data);
  }
}
