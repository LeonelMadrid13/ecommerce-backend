import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { LoginDto } from '../user/dto/login.dto.js';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @ApiOperation({ summary: 'Register a new user' })
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    const user = await this.userService.createUser(dto);
    return { id: user.id, email: user.email, name: user.name };
  }

  @ApiOperation({ summary: 'Login and get tokens' })
  @Post('login')
  @HttpCode(200)
  @Throttle({ global: { ttl: 60000, limit: 5 } })
  async login(@Body() dto: LoginDto) {
    const user = await this.userService.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user.id, user.email, user.role);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refresh(body.refresh_token);
  }

  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @Post('logout')
  @HttpCode(200)
  async logout(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    await this.authService.logout(body.refresh_token);
    return { message: 'Logged out successfully' };
  }
}
