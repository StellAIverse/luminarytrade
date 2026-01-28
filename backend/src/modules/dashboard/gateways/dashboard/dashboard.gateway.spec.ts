import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { DashboardGateway } from "./dashboard.gateway";
import { io, Socket as ClientSocket } from "socket.io-client";

describe("DashboardGateway (Integration)", () => {
  let app: INestApplication;
  let gateway: DashboardGateway;
  let socket: ClientSocket;
  const mockWallet = "0xTestWallet123";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [DashboardGateway],
    }).compile();

    app = moduleFixture.createNestApplication();
    // If WsAdapter still causes errors, Nest uses a default one for Socket.io
    await app.init();
    await app.listen(0); // Listen on a random available port

    gateway = moduleFixture.get<DashboardGateway>(DashboardGateway);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  it("should receive agent heartbeats scoped to the wallet room", (done) => {
    const address = app.getHttpServer().address();
    const port = typeof address === "string" ? address : address.port;

    // AC: Subscriptions scoped to user wallet
    socket = io(`http://localhost:${port}/dashboard`, {
      query: { wallet: mockWallet },
      transports: ["websocket"],
    });

    const testPayload = {
      agentId: "bot-001",
      status: "active",
      lastPing: Date.now(),
    };

    socket.on("connect", () => {
      // AC: Gateway broadcasts agent status updates
      gateway.broadcastAgentStatus(mockWallet, testPayload);
    });

    socket.on("connect_error", (err) => {
      done(err); // Fail the test immediately if connection fails
    });

    socket.on("agent_heartbeat", (data) => {
      expect(data).toEqual(testPayload);
      done();
    });
  });
});
