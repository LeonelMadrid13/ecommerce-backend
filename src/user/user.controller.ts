// user/user.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service.js';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  @Post('register')
  async register(
    @Body() body: { name: string; email: string; password: string },
  ) {
    try {
      const user = await this.userService.createUser(body);
      return { id: user.id, email: user.email, name: user.name };
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      const user = await this.userService.validateUser(
        body.email,
        body.password,
      );
      if (!user) return { error: 'Invalid credentials' };

      console.log('SIGN JWT_SECRET:', process.env.JWT_SECRET);

      const payload = { sub: user.id, email: user.email, role: user.role };
      const token = this.jwtService.sign(payload);

      return { access_token: token };
    } catch (error) {
      return { error: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Req() req) {
    // req.user populated by JwtStrategy
    try {
      return this.userService.findById(req.user.id);
    } catch (error) {
      return { error: error.message };
    }
  }
}
