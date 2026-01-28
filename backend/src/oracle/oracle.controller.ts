import { Body, Controller, Get, Post } from '@nestjs/common';
import { UpdateOracleDto } from './dto/update-oracle.dto';
import { OracleService } from './oracle.service';

@Controller('oracle')
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  @Post('update')
  async update(@Body() dto: UpdateOracleDto) {
    // DTO validation is handled by global validation pipe
    const result = await this.oracleService.updateSnapshot(dto);
    return { ok: true, ...result };
  }

  @Get('latest')
  async latest() {
    const values = await this.oracleService.getLatest();
    return { ok: true, values };
  }
}