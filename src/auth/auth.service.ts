import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(userId: string, email: string, role: string) {
    const accessToken = this.generateAccessToken(userId, email, role);
    const refreshToken = await this.generateRefreshToken(userId);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refresh(token: string) {
    const hashedToken = this.hashRefreshToken(token);

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        OR: [{ token: hashedToken }, { token }],
      },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // revoke current token — rotation
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const { user } = stored;
    const accessToken = this.generateAccessToken(
      user.id,
      user.email,
      user.role,
    );
    const refreshToken = await this.generateRefreshToken(user.id);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async logout(token: string) {
    const hashedToken = this.hashRefreshToken(token);

    await this.prisma.refreshToken.updateMany({
      where: {
        OR: [{ token: hashedToken }, { token }],
      },
      data: { revoked: true },
    });
  }

  private generateAccessToken(userId: string, email: string, role: string) {
    return this.jwtService.sign(
      { sub: userId, email, role },
      { expiresIn: '15m' },
    );
  }

  private async generateRefreshToken(userId: string) {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashRefreshToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: tokenHash, userId, expiresAt },
    });

    return token;
  }

  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
