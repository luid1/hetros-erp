// ESC/POS — construção dos bytes crus para a impressora térmica (não-fiscal).
// Sem dependência nativa: monta um Buffer e usa iconv-lite p/ acentos (CP860/CP850).

const iconv = require('iconv-lite');

const ESC = 0x1b, GS = 0x1d, LF = 0x0a;

class EscPos {
  constructor(opts = {}) {
    this.colunas = opts.colunas || 48;      // 80mm=48, 58mm=32
    this.codepage = opts.codepage || 'CP860'; // CP860 = Português (acentos)
    this.chunks = [];
    this.raw([ESC, 0x40]);                  // ESC @ → reset
    this.setCodepage();
  }

  raw(bytes) { this.chunks.push(Buffer.from(bytes)); return this; }

  setCodepage() {
    // ESC t n → tabela de caracteres. CP860=Port. costuma ser n=3; CP850=n=2.
    const n = this.codepage === 'CP850' ? 2 : this.codepage === 'CP852' ? 18 : 3;
    return this.raw([ESC, 0x74, n]);
  }

  texto(s = '') {
    // Codifica na codepage da impressora (com fallback p/ ASCII sem acento)
    let buf;
    try { buf = iconv.encode(String(s), this.codepage); }
    catch { buf = Buffer.from(this.semAcento(String(s)), 'ascii'); }
    this.chunks.push(buf);
    return this;
  }

  semAcento(s) {
    // Remove marcas de acentuação (combining diacritics U+0300–U+036F) e não-ASCII
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\x20-\x7e]/g, '');
  }

  linha(s = '') { return this.texto(s).raw([LF]); }
  feed(n = 1) { for (let i = 0; i < n; i++) this.raw([LF]); return this; }

  align(a) { const n = a === 'center' ? 1 : a === 'right' ? 2 : 0; return this.raw([ESC, 0x61, n]); }
  bold(on) { return this.raw([ESC, 0x45, on ? 1 : 0]); }
  // GS ! n — largura/altura (0x00 normal, 0x11 dobro, 0x10 só largura, 0x01 só altura)
  tamanho(n) { return this.raw([GS, 0x21, n]); }
  normal() { return this.tamanho(0x00); }
  duplo() { return this.tamanho(0x11); }

  separador(ch = '-') { return this.linha(ch.repeat(this.colunas)); }

  // Linha "esquerda .... direita" ocupando a largura total
  colunaLR(esq, dir) {
    esq = String(esq); dir = String(dir);
    const espaco = Math.max(1, this.colunas - esq.length - dir.length);
    return this.linha(esq + ' '.repeat(espaco) + dir);
  }

  // QR Code nativo (GS ( k). data = string (ex.: chave/URL NFC-e)
  qrcode(data, moduloSize = 6) {
    const bytes = Buffer.from(String(data), 'utf8');
    const len = bytes.length + 3;
    const pL = len & 0xff, pH = (len >> 8) & 0xff;
    this.raw([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);      // modelo 2
    this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduloSize]);       // tamanho módulo
    this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]);             // correção erro L
    this.raw([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]);                 // armazena dados
    this.chunks.push(bytes);
    this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);             // imprime
    return this;
  }

  cortar(feedAntes = 3) {
    this.feed(feedAntes);
    // GS V 66 n — corte parcial com avanço
    return this.raw([GS, 0x56, 66, 0x00]);
  }

  build() { return Buffer.concat(this.chunks); }
}

module.exports = { EscPos };
