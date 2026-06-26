import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/context.decorator';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Get('users')
  @ApiOperation({ summary: 'Lista usuários ativos para tela de seleção (sem senha)' })
  usersForLogin(
    @Query('tenantId') tenantId?: string,
    @Query('cnpj') cnpj?: string,
  ) {
    return this.auth.getUsersForLogin(tenantId, cnpj);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login por e-mail + senha' })
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Public()
  @Post('login-por-id')
  @ApiOperation({ summary: 'Login visual: seleciona usuário pelo ID e digita a senha' })
  loginPorId(@Body() body: { usuarioId: string; password: string }) {
    return this.auth.loginPorId(body.usuarioId, body.password);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Cadastra novo tenant + admin master' })
  register(@Body() body: any) {
    return this.auth.registerTenant(body);
  }
}
