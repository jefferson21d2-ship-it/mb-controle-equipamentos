# M&B Controle de Equipamentos

PWA para inventário, QR Code, kits, saídas de campo, devoluções, manutenção e auditoria de equipamentos de topografia, GNSS e drones.

## O que foi preparado

- funcionamento offline com persistência local no navegador;
- login administrativo local com sessão de 12 horas;
- integração opcional com Google Sheets via Apps Script;
- PWA instalável em Android, iOS e desktop;
- build relativo compatível com qualquer repositório do GitHub Pages;
- GitHub Actions para publicar automaticamente a cada push na branch `main`.
- aplicativo Android nativo via Capacitor, com câmera habilitada para QR Code e fotos.

## Executar localmente

Requisitos: Node.js 20 ou superior.

```bash
npm ci
npm run dev
```

Para validar antes de publicar:

```bash
npm test
```

## Primeiro acesso

Na primeira abertura, o aplicativo solicita que você defina o usuário e uma senha com pelo menos 8 caracteres. A senha é armazenada apenas como hash no dispositivo e não existe uma senha padrão no código público.

Importante: em uma aplicação puramente estática, qualquer segredo enviado ao navegador pode ser inspecionado. Esse login é uma barreira local/offline, não uma autenticação de servidor. Para dados corporativos compartilhados, configure o Google Apps Script ou use um backend com autenticação real.

## Publicar gratuitamente no GitHub Pages

1. Crie um repositório no GitHub e envie todos os arquivos deste projeto.
2. Em **Settings → Pages**, selecione **GitHub Actions** como origem.
3. Em **Settings → Secrets and variables → Actions**, crie:
   - variável `MB_ADMIN_USERNAME` (opcional; padrão `admin`).
4. Faça push na branch `main`.
5. O workflow `.github/workflows/deploy-pages.yml` fará o build e a publicação.

O endereço ficará parecido com:

```text
https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/
```

## Dados e operação

Sem Google Sheets, os dados ficam no armazenamento local do navegador e não são compartilhados entre dispositivos. Para uma operação importante, mantenha a integração com o Google Sheets ativa e faça cópias da planilha.

Para operação em equipe, configure a URL do Web App do Apps Script na tela de Configuração e mantenha o backup local como contingência.

## Aplicativo Android

O projeto nativo está na pasta `android/`. O passo a passo completo para abrir no Android Studio, testar em um celular e gerar o APK está em [ANDROID.md](./ANDROID.md).
