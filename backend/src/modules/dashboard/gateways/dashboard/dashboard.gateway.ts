import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  namespace: "dashboard",
  cors: { origin: "*" },
})
export class DashboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DashboardGateway.name);

  /**
   * Handles new client connections.
   * Scopes the connection to a specific wallet room for private telemetry.
   */
  handleConnection(client: Socket) {
    const wallet = client.handshake.query.wallet as string;

    if (wallet) {
      client.join(wallet);
      this.logger.log(`Client ${client.id} subscribed to wallet: ${wallet}`);
    } else {
      this.logger.warn(
        `Connection rejected: No wallet address from client ${client.id}`,
      );
      client.disconnect();
    }
  }

  /**
   * Cleans up when a client disconnects.
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcasts agent telemetry or heartbeats to a specific wallet room.
   * @param walletAddress The unique wallet identifier for the user.
   * @param data The telemetry or status update payload.
   */
  broadcastAgentStatus(walletAddress: string, data: any) {
    this.server.to(walletAddress).emit("agent_heartbeat", data);
  }
}
