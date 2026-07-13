import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  NfeProvider,
  AutorizacaoResultado,
  CancelamentoResultado,
  CartaCorrecaoResultado,
} from './nfe-provider.interface';

/**
 * Provider REAL (SEFAZ direto ou gateway como Focus NF-e).
 *
 * ⚠️ STUB DE SEGURANÇA: enquanto o certificado A1 e a assinatura XML não estiverem
 * implementados/configurados, QUALQUER chamada aqui lança erro claro em vez de fingir
 * que transmitiu. Isso impede transmissão real acidental e deixa explícito o que falta.
 *
 * Config esperada quando este provider é selecionado (NFE_PROVIDER=focus|sefaz):
 *  - FOCUS_NFE_TOKEN / FOCUS_NFE_URL  (gateway Focus), OU
 *  - certificado A1 (model CertificadoDigital ativo) + assinatura própria (SEFAZ direto).
 */
@Injectable()
export class RealNfeProvider implements NfeProvider {
  readonly nome = process.env.NFE_PROVIDER || 'real';
  readonly simulacao = false;
  private readonly logger = new Logger(RealNfeProvider.name);

  private readonly focusUrl = process.env.FOCUS_NFE_URL || 'https://homologacao.focusnfe.com.br';
  private readonly focusToken = process.env.FOCUS_NFE_TOKEN || '';

  private naoConfigurado(): never {
    const msg =
      'Transmissão real ao SEFAZ não está configurada. ' +
      'Defina FOCUS_NFE_TOKEN (gateway) ou cadastre um CertificadoDigital A1 ativo, ' +
      'ou mantenha NFE_PROVIDER=mock para operar em simulação.';
    this.logger.error(`❌ ${msg}`);
    throw new BadRequestException(msg);
  }

  async autorizar(_nfe: any): Promise<AutorizacaoResultado> {
    if (!this.focusToken) this.naoConfigurado();
    // TODO F.2b: montar XML completo + assinar (A1) + POST /v2/nfe no gateway.
    this.naoConfigurado();
  }

  async cancelar(_chaveAcesso: string, _motivo: string): Promise<CancelamentoResultado> {
    if (!this.focusToken) this.naoConfigurado();
    // TODO F.2b: DELETE /v2/nfe/{ref} (Focus) ou evento 110111 assinado (SEFAZ direto).
    this.naoConfigurado();
  }

  async cartaCorrecao(
    _chaveAcesso: string,
    _sequencia: number,
    _texto: string,
  ): Promise<CartaCorrecaoResultado> {
    if (!this.focusToken) this.naoConfigurado();
    // TODO F.2b: evento 110110 assinado.
    this.naoConfigurado();
  }
}
