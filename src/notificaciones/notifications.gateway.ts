import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } }) // Comparte el puerto con HTTP
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationsGateway');

  handleConnection(client: any) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  // Escuchar los Eventos Personalizados, cuando el liente envia sms con  custom_event
  @SubscribeMessage('custom_event')
  handleCustomEvent(@MessageBody() data: any): string {
    this.logger.log(`Mensaje recibido: ${JSON.stringify(data)}`);
    return `Servidor recibió: ${data.message}`;
  }

  // Método para enviar notificaciones desde otros servicios
  sendNotification(event: string, payload: any) {
    this.server.emit(event, payload); // Emitir evento a todos los clientes
    this.logger.log(
      `Notificación emitida: ${event} - ${JSON.stringify(payload)}`,
    );
    console.log(' Notificar websoket : ', payload);
  }
}
