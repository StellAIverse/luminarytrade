import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('join')
  async join(@Body() body: { email: string; name?: string }) {
    return this.waitlistService.join(body.email, body.name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll() {
    return this.waitlistService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('notify/:id')
  async notify(@Param('id') id: string) {
    return this.waitlistService.notifyUser(id);
  }
}
