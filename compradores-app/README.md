# Compradores ERP — app HETROS (Expo / React Native)

App dos compradores pra usar na pedra da CEAGESP:
- **Cotações**: vê o preço do dia (definido no painel Web) — com cache offline.
- **Nova OC**: cria Ordem de Compra puxando **fornecedores e produtos do mesmo banco**,
  escolhendo unidade (KG/UN/CX/BJ/PC/BD/MC/SC/DZ), quantidade e preço → **sobe pro sistema**.
- **Minhas OCs**: lista as OCs e permite **aprovar** (quem tem acesso ao módulo Compras — ex.: Leide/líder).

Consome a **mesma API/banco** do ERP (`/custos/:filial/cotacoes`, `/produtos`, `/fornecedores`, `/compras`).

---

## 1. Configurar a URL do backend
Em `app.json` → `expo.extra.apiUrl`. Hoje está no **túnel de teste** (localtunnel):
```
"apiUrl": "https://quiet-deer-tickle.loca.lt/api/v1"
```
> ⚠️ Esse túnel só funciona **enquanto o backend (localhost:3002) e o processo do túnel estiverem
> rodando neste PC**. Se cair, gere outro (`npx localtunnel --port 3002`) e troque a URL aqui.
> Para uso definitivo, **publique o backend** (Railway/Render) e ponha a URL pública fixa.

## 2. Testar AGORA no celular (sem gerar APK) — mais rápido
```bash
cd compradores-app
npx expo start
```
Abra o **Expo Go** no celular e escaneie o QR. Login: seu e-mail/senha do ERP
(ex.: `luid@hetros.com.br` / `admin123`).

## 3. Gerar o APK (standalone) via EAS
```bash
npm i -g eas-cli        # se não tiver
eas login               # conta Expo "luixik"
eas build -p android --profile preview
```
Sai um link com o **APK** pra instalar no celular. (Mantém o mesmo `projectId` e pacote
`com.hetros.compradores`, então é o MESMO app do seu build anterior.)

## Estrutura
- `src/config.js` — URL da API + paleta
- `src/api.js` — axios + token + **cache offline** (AsyncStorage)
- `src/auth.js` — login/sessão (guarda token e filial)
- `src/screens/` — Login, Cotações, NovaOC, MinhasOCs
- `App.js` — navegação (abas)
