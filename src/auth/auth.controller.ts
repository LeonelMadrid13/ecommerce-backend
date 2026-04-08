import {
  Controller,
  Post,
  Body,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { LoginDto } from '../user/dto/login.dto.js';
import { Throttle } from '@nestjs/throttler';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

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
  @Throttle({ global: { ttl: 60000, limit: 10 } })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @Post('logout')
  @HttpCode(200)
  @Throttle({ global: { ttl: 60000, limit: 20 } })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refresh_token);
    return { message: 'Logged out successfully' };
  }
}
