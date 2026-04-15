import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { Server, Socket } from 'socket.io';
import { NewMessageDto } from './dtos/new-message.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenPayload } from 'src/auth/interfaces/jwt-token-payload.interface';


@WebSocketGateway({ cors: true })
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() wss: Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService,
  ) { }

  async handleConnection(client: Socket) {
    const token = client.handshake.headers.authentication as string;
    try {
      const payload: JwtTokenPayload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient(client, payload.id);
    } catch (error) {
      client.disconnect();
      console.log(error);
      return
    }

    this.wss.emit('clients-updated', this.messagesWsService.getConnectedClients());

  }

  handleDisconnect(client: Socket) {
    this.messagesWsService.removeClient(client.id);
  }


  @SubscribeMessage('message-from-client')
  handleMessageFromClient(client: Socket, payload: NewMessageDto) {

    //! Emite unicamente al cliente
    // client.emit('message-from-server', {
    //   fullName: 'Andro',
    //   message: payload.message || 'no-message!!'
    // });

    //! Emitir a todos MENOS, al cliente inicial
    // client.broadcast.emit('message-from-server', {
    //   fullName: 'Andro',
    //   message: payload.message || 'no-message!!'
    // });

    this.wss.emit('message-from-server', {
      fullName: this.messagesWsService.getFullName(client.id),
      message: payload.message || 'no-message!!'
    });
  }
}
