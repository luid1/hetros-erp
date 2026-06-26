import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>('skipAudit', [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (skip) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const method = req.method;

    // Só audita mutações
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next.handle();

    const user = req.user;
    if (!user) return next.handle();

    const modulo = this.reflector.getAllAndOverride<string>('modulo', [
      ctx.getHandler(), ctx.getClass(),
    ]) || 'SISTEMA';

    const acaoMap: Record<string, string> = {
      POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE',
    };

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              usuarioId: user.id,
              modulo,
              acao: acaoMap[method],
              entidade: req.route?.path || req.url,
              entidadeId: result?.id || req.params?.id,
              dadosDepois: result ? JSON.parse(JSON.stringify(result)) : null,
              ip: req.ip,
              userAgent: req.headers?.['user-agent'],
            },
          });
        } catch { /* Falha silenciosa — auditoria não pode derrubar a operação */ }
      }),
    );
  }
}
