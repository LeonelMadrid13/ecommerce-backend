import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req) {
    return this.userService.findById(req.user.id);
  }
}
