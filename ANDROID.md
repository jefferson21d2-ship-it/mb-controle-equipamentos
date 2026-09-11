# Aplicativo Android

O projeto Android usa Capacitor e reaproveita a mesma aplicação web. Ele já inclui a permissão de câmera necessária para leitura de QR Code e para captura de fotos.

## Requisitos no Windows

1. Instale o [Node.js 20 ou superior](https://nodejs.org/).
2. Instale o [Android Studio](https://developer.android.com/studio).
3. No Android Studio, abra **More Actions → SDK Manager** e instale:
   - Android SDK Platform 35;
   - Android SDK Build-Tools;
   - Android SDK Platform-Tools.
4. Em **More Actions → SDK Manager → SDK Tools**, confirme também o Android SDK Command-line Tools.
5. No Android Studio, abra **Settings → Build, Execution, Deployment → Build Tools → Gradle** e use o JDK embutido do Android Studio.

## Abrir no Android Studio

No PowerShell, dentro da pasta do projeto:

```powershell
npm.cmd ci
npm.cmd run android:sync
npm.cmd run android:open
```

No Android Studio:

1. Aguarde a sincronização do Gradle.
2. Conecte um celular com **Depuração USB** ativada ou crie um emulador.
3. Selecione o dispositivo no topo da janela.
4. Clique em **Run ▶**.
5. Na primeira leitura, permita o acesso à câmera.

## Gerar APK de teste

No PowerShell:

```powershell
npm.cmd run android:apk:debug
```

O arquivo será gerado em:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Esse APK é para testes internos. Para distribuição, gere um APK/AAB assinado pelo Android Studio em **Build → Generate Signed Bundle / APK**.

## Atualizar o app depois de alterar o código

Sempre que o código React/TypeScript mudar:

```powershell
npm.cmd run android:sync
```

Depois, execute novamente pelo Android Studio. O comando recompila a versão web e copia o resultado para o aplicativo Android.

## Alternativa sem APK

O mesmo sistema pode ser instalado como PWA no celular quando estiver publicado em HTTPS: abra o endereço no Chrome e escolha **Adicionar à tela inicial**. Para uso com QR Code, a página precisa estar em HTTPS; o APK Capacitor funciona instalado diretamente no Android.

## Identificação técnica

- Nome: `M&B Controle de Equipamentos`
- Application ID: `br.com.mbtopografia.controleequipamentos`
- Pasta nativa: `android/`
- Permissão adicionada: `android.permission.CAMERA`
