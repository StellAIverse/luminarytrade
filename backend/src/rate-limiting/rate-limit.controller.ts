import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AdaptiveThrottleService } from "./services/adaptive-throttle.service";

@ApiTags("Rate Limiting")
@Controller("rate-limit")
export class RateLimitController {
  constructor(private readonly throttle: AdaptiveThrottleService) {}

  @Get("metrics")
  @ApiOperation({ summary: "Usage metrics per rate-limit key" })
  getMetrics() {
    return {
      cpuLoad: this.throttle.getCurrentLoad(),
      keys: this.throttle.getMetrics(),
    };
  }

  @Post(":key/whitelist")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Whitelist a rate-limit key (bypasses all limits)" })
  whitelist(@Param("key") key: string): void {
    this.throttle.whitelist_key(key);
  }

  @Post(":key/blacklist")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Blacklist a rate-limit key (always denied)" })
  blacklist(@Param("key") key: string): void {
    this.throttle.blacklist_key(key);
  }

  @Post(":key/reset")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Reset counters for a rate-limit key" })
  reset(@Param("key") key: string): void {
    this.throttle.resetKey(key);
  }

  @Post(":key/remove")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove key from whitelist and blacklist" })
  remove(@Param("key") key: string): void {
    this.throttle.removeFromLists(key);
  }
}
