import { Module } from "@nestjs/common";
import { DashboardGateway } from "./gateways/dashboard/dashboard.gateway";

@Module({
  providers: [DashboardGateway],
  exports: [DashboardGateway], // Important: This allows other modules to inject the gateway
})
export class DashboardModule {}
