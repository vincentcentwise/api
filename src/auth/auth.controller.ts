
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body()
    body: {
      email?: string;
      password?: string;
      schoolSlug?: string;
    },
  ) {
    const { email, password, schoolSlug } = body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof schoolSlug !== 'string' ||
      !email.trim() ||
      !password ||
      !schoolSlug.trim()
    ) {
      throw new BadRequestException(
        'Email, password, and school slug are required.',
      );
    }

    return this.authService.login(
      email,
      password,
      schoolSlug,
    );
  }
}
