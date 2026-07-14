# HETROS — Ponte Balança PRIX TI200 → WebSocket
# Roda no computador do touch. ERP conecta em ws://localhost:8765
# MODO DIAGNOSTICO — mostra os frames em hex para decodificar o protocolo

import serial, asyncio, websockets, re, sys, time

COM_PORT = 'COM4'
WS_PORT  = 8765
BAUDS    = [4800, 9600, 2400, 19200, 115200]   # 4800 primeiro (PRIX TI200)
POLL_COMMANDS = [b'\x05']  # ENQ — unico comando que a PRIX TI200 responde

FRAME_LEN = 8          # tamanho do frame observado
clients = set()
rawbuf = bytearray()
last_weight = {'val': 0.0, 'stable': False, 'ts': 0}

last_tens = 0   # digito das dezenas de kg, vem do frame ASCII

def parse_frame(frame):
    """Decodifica peso da PRIX TI200. A balanca alterna 2 frames:
      - Frame ASCII (byte[2] entre '0' e '9'): da o digito das DEZENAS de kg.
      - Frame de peso (byte[2] com bit alto): da UNIDADE + decimais.
    Estrutura do frame de peso: 02 30 [status] [B3] [B4] [B5] 34 [chk]
      unidade de kg = ((B3 & 0xFE) - 0x82) / 8
      1a decimal    = nibble alto de B4
      2a decimal    = nibble alto de B5
    Peso final = dezena*10 + unidade + dec1/10 + dec2/100
    """
    global last_tens
    if len(frame) < 6:
        return None, False
    b2 = frame[2]
    # Frame ASCII de dezena
    if 0x30 <= b2 <= 0x39:
        last_tens = b2 - 0x30
        return None, False
    # Frame de peso
    b3, b4, b5 = frame[3], frame[4], frame[5]
    d = (b3 & 0xFE) - 0x82
    if d < 0 or d % 8 != 0:
        return None, False
    unidade = d // 8
    dec1 = b4 >> 4
    dec2 = b5 >> 4
    if unidade > 9 or dec1 > 9 or dec2 > 9:
        return None, False
    peso = last_tens * 10 + unidade + dec1 / 10.0 + dec2 / 100.0
    return peso, True

def diag_frame(frame, now):
    """Mostra o frame em hex e o peso decodificado."""
    hexstr = ' '.join(f'{b:02X}' for b in frame)
    peso, ok = parse_frame(frame)
    if ok:
        print(f'[FRAME] {hexstr}  -->  PESO = {peso:.2f} kg')
        return peso
    else:
        print(f'[FRAME] {hexstr}  (status/ignorado)')
        return None

async def broadcast(weight, stable):
    global clients
    if not clients:
        return
    msg = f"{weight:.3f},{1 if stable else 0}"
    dead = set()
    for c in clients.copy():
        try:
            await c.send(msg)
        except:
            dead.add(c)
    clients -= dead

async def serial_loop():
    ser = None
    baud_used = None

    for baud in BAUDS:
        try:
            print(f"  Tentando COM4 a {baud} baud...")
            s = serial.Serial(COM_PORT, baud, timeout=0.3)
            s.write(b'\x05')
            await asyncio.sleep(0.5)
            data = s.read(32)
            if data:
                print(f"  Resposta recebida a {baud} baud!")
                ser = s
                baud_used = baud
                break
            s.close()
        except Exception as e:
            print(f"  Erro a {baud} baud: {e}")

    if not ser:
        print(f"  Sem resposta ao ENQ. Usando 4800 baud (padrao PRIX TI200)...")
        try:
            ser = serial.Serial(COM_PORT, 4800, timeout=0.1)
            baud_used = 4800
        except Exception as e:
            print(f"ERRO ao abrir porta serial: {e}")
            sys.exit(1)

    print(f"\nBalanca conectada em COM4 @ {baud_used} baud")
    print(f"WebSocket ativo em ws://localhost:{WS_PORT}\n")

    poll_idx = 0
    last_poll = 0
    last_broadcast = 0
    last_frame_time = 0  # timestamp do ultimo frame valido recebido da balanca
    prev_peso = None
    same_count = 0

    while True:
        now = time.time()

        # Cutuca a balanca SEMPRE (mesmo sem cliente), num ritmo que nao entope
        # o buffer dela. Assim ela nunca "dorme" e responde a mudancas de peso.
        if (now - last_poll) > 0.15:  # ENQ a cada 150ms
            cmd = POLL_COMMANDS[poll_idx % len(POLL_COMMANDS)]
            try:
                ser.write(cmd)
            except:
                pass
            poll_idx += 1
            last_poll = now

        try:
            # Leitura NAO-BLOQUEANTE: so le se houver bytes disponiveis
            waiting = ser.in_waiting
            if waiting > 0:
                raw = ser.read(waiting)
                rawbuf.extend(raw)
                while True:
                    try:
                        stx = rawbuf.index(0x02)
                    except ValueError:
                        break
                    if stx > 0:
                        del rawbuf[:stx]
                    # Acha o PROXIMO STX para delimitar o frame (tamanho variavel)
                    try:
                        nxt = rawbuf.index(0x02, 1)
                    except ValueError:
                        break  # frame ainda incompleto, espera mais bytes
                    frame = bytes(rawbuf[:nxt])
                    del rawbuf[:nxt]
                    peso = diag_frame(frame, now)
                    if peso is not None:
                        last_frame_time = now  # balanca respondeu
                        if peso == prev_peso:
                            same_count += 1
                        else:
                            same_count = 0
                            prev_peso = peso
                        stable = same_count >= 2  # 2 leituras iguais = estavel (~160ms)
                        last_weight['val'] = peso
                        last_weight['stable'] = stable
                        last_weight['ts'] = now
                        if now - last_broadcast > 0.05:  # broadcast a cada 50ms
                            await broadcast(peso, stable)
                            last_broadcast = now
        except Exception as e:
            print(f"Erro serial: {e}")

        # Reenvia ultimo peso periodicamente
        if clients and last_weight['ts'] > 0 and (now - last_broadcast) > 0.5:
            # Se balanca nao responde ha mais de 1s, manda como instavel
            # (evita browser ficar travado no ultimo valor estavel)
            is_fresh = (now - last_frame_time) < 1.0
            await broadcast(last_weight['val'], last_weight['stable'] and is_fresh)
            last_broadcast = now

        await asyncio.sleep(0.02)  # loop a cada 20ms (nao bloqueia asyncio)

async def ws_handler(websocket):
    clients.add(websocket)
    print(f"ERP conectado! ({len(clients)} cliente(s))")
    if last_weight['ts'] > 0:
        try:
            await websocket.send(f"{last_weight['val']:.3f},{1 if last_weight['stable'] else 0}")
        except:
            pass
    try:
        await websocket.wait_closed()
    finally:
        clients.discard(websocket)
        print(f"ERP desconectou ({len(clients)} restantes)")

async def main():
    print("=" * 42)
    print("  HETROS — Bridge Balanca (DIAGNOSTICO)")
    print("=" * 42)
    print(f"\nDetectando baudrate da balanca...")
    # Escuta em todas as interfaces (IPv4) para evitar problema de localhost/IPv6
    server = await websockets.serve(ws_handler, '0.0.0.0', WS_PORT)
    await asyncio.gather(server.wait_closed(), serial_loop())

try:
    asyncio.run(main())
except KeyboardInterrupt:
    print("\nEncerrado pelo usuario.")
except Exception as e:
    import traceback
    print("\n" + "=" * 42)
    print("ERRO! O bridge fechou por causa deste erro:")
    print("=" * 42)
    traceback.print_exc()
    print("=" * 42)
    input("\nPressione ENTER para fechar...")
