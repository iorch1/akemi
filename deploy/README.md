# Despliegue en cloud.akhio.com/akemi/

Static SPA servida por Apache en el servidor **akhio** (mismo patrón que `/cotizador/`).

## Build

```bash
npm ci
npm run build:cloud
```

Genera `dist/` con `--base=/akemi/` y `.htaccess` para fallback SPA.

## Subir archivos

En el servidor:

```bash
ssh akhio
mkdir -p ~/akemi-web/dist
```

Desde tu PC (tras `npm run build:cloud`):

```powershell
scp -r dist/* akhio:~/akemi-web/dist/
scp -r deploy akhio:~/akemi-web/
```

O clona el repo en el servidor, `git pull` y `PATH=/opt/node24/bin:$PATH npm run build:cloud`.

## Apache (una vez, sudo)

Los `.sh` del repo van con finales de línea Unix (LF). Si `set: pipefail: nombre de opción inválido`, el script tiene CRLF: `sed -i 's/\r$//' ~/akemi-web/deploy/enable-akemi-cloud.sh` o vuelve a copiar desde GitHub.

```bash
sudo bash ~/akemi-web/deploy/enable-akemi-cloud.sh
```

URL: **https://cloud.akhio.com/akemi/**

## Actualizar solo ficheros

```bash
npm run build:cloud
# rsync/scp a ~/akemi-web/dist/
```

Tras cada `scp`/`rsync` a `dist/`, vuelve a fijar permisos (o ejecuta de nuevo el script enable):

```bash
find ~/akemi-web/dist -type d -exec chmod a+rx {} +
find ~/akemi-web/dist -type f -exec chmod a+r {} +
sudo restorecon -Rv ~/akemi-web/dist   # SELinux en RHEL/Fedora
```

## Página en blanco (HTML 200, JS/CSS 403)

Causa habitual: `dist/assets/` sin bit de ejecución para «others» (Apache no puede entrar al directorio). El `index.html` en la raíz de `dist/` sigue en 200.

```bash
chmod o+x ~ ~/akemi-web
find ~/akemi-web/dist -type d -exec chmod a+rx {} +
find ~/akemi-web/dist -type f -exec chmod a+r {} +
sudo restorecon -Rv ~/akemi-web/dist
sudo bash ~/akemi-web/deploy/enable-akemi-cloud.sh
curl -sI "$(curl -s https://cloud.akhio.com/akemi/ | sed -n 's/.*src=\"\([^\"]*\.js\)\".*/\1/p' | head -1 | sed 's|^|https://cloud.akhio.com|')" | head -1
```

Debe verse `HTTP/... 200` en el bundle `.js`. No hace falta recargar Apache si solo cambian assets y los permisos ya están bien.