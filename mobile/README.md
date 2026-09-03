# BlackPortfolio Mobile Beta

Aplicación Expo/React Native para Android, tabletas y dispositivos en ambas orientaciones. Hereda los tokens V4 (`Spectral`, `Libre Franklin`, papel navy/cobalto, láminas documentales) sin reutilizar la navegación web.

## Inicio local

```powershell
cd mobile
npm install
npx expo start
```

Configura `EXPO_PUBLIC_API_URL` sólo si se necesita apuntar a otro entorno; por defecto usa el API de Railway de producción. Firebase usa el mismo proyecto público de la app web y la API continúa validando el ID token y la sesión 2FA en el servidor.

## Android

```powershell
cd mobile
npx expo-doctor
npm run android
npm run android:apk
```

`preview` en `eas.json` genera un APK instalable para pruebas internas; `production` conserva el AAB para Play Store. En la primera compilación EAS pedirá iniciar sesión y asociar el proyecto de Expo.

## Seguridad y arquitectura

- Tras el inicio con correo/contraseña, el flujo respeta el OTP 2FA ya emitido por FastAPI y guarda sólo el token de sesión 2FA en SecureStore.
- La huella usa `expo-local-authentication` con nivel `strong`, no permite el fallback de PIN y bloquea la vista al volver de segundo plano.
- `src/knowledge/v4Graph.ts` es la proyección móvil y consultable de `graphify-out/graph.json`: hace explícitos los límites entre Auth, API, persistencia, Tracker, Markets y los módulos analíticos.
