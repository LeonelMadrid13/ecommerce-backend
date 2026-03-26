import { Controller, Get, Post } from '@nestjs/common';

@Controller('user')
export class UserController {
  @Get('/profile/:id')
  getUserProfile() {
    // Logic to get user profile
    return { id: 1, name: 'John Doe', email: 'john.doe@example.com' };
  }

  @Post('/register')
  registerUser() {
    // Logic to register a new user
    return { message: 'User registered successfully' };
  }

  @Post('/login')
  loginUser() {
    // Logic to authenticate user and generate token
    return { message: 'User logged in successfully', token: 'your-jwt-token' };
  }
}
