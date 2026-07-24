import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LoginDto, RegisterDto } from '../dto';
import { AccessTokenGuard } from '../guards/access-token.guard';
import type { ClientContext } from '../interfaces/auth.interface';
import { AuthService } from '../services/auth.service';
import type { User } from '../../users/entities';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a business workspace and owner' })
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async register(
    @Body() input: RegisterDto,
    @UploadedFile() logo: Express.Multer.File | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(
      input,
      logo,
      this.clientContext(request),
    );
    this.setCookies(response, result.tokens);
    return result.session;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      input,
      this.clientContext(request),
    );
    this.setCookies(response, result.tokens);
    return result.session;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.tg_refresh as string | undefined;
    const result = await this.authService.refresh(
      token,
      this.clientContext(request),
    );
    this.setCookies(response, result.tokens);
    return result.session;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(
      request.cookies?.tg_refresh as string | undefined,
    );
    response.clearCookie('tg_access', this.cookieOptions());
    response.clearCookie('tg_refresh', {
      ...this.cookieOptions(),
      path: '/api/auth',
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  me(@CurrentUser() user: User) {
    return this.authService.safeSession(user);
  }

  private clientContext(request: Request): ClientContext {
    return {
      userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
      ipAddress: request.ip?.slice(0, 64) ?? null,
    };
  }

  private setCookies(
    response: Response,
    tokens: {
      accessToken: string;
      refreshToken: string;
      accessMaxAgeMs: number;
      refreshMaxAgeMs: number;
    },
  ) {
    response.cookie('tg_access', tokens.accessToken, {
      ...this.cookieOptions(),
      maxAge: tokens.accessMaxAgeMs,
    });
    response.cookie('tg_refresh', tokens.refreshToken, {
      ...this.cookieOptions(),
      path: '/api/auth',
      maxAge: tokens.refreshMaxAgeMs,
    });
  }

  private cookieOptions(): CookieOptions {
    const sameSite =
      this.configService.get<'lax' | 'strict' | 'none'>(
        'auth.cookieSameSite',
      ) ?? 'lax';
    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('auth.cookieSecure') ?? false,
      sameSite,
      domain: this.configService.get<string>('auth.cookieDomain'),
      path: '/',
    };
  }
}
