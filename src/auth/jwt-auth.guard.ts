import { AuthGuard } from '@nestjs/passport';

export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    console.log('GUARD JWT_SECRET: ', process.env.JWT_SECRET);
    // console.log('GUARD:', { err, user, info }); // 👈 THIS WILL TELL US EVERYTHING
    return user;
  }
}
