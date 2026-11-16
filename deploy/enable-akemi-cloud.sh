#!/bin/bash
# Publica https://cloud.akhio.com/akemi/
# Uso: sudo bash /home/akhio/akemi-web/deploy/enable-akemi-cloud.sh
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Ejecuta: sudo bash /home/akhio/akemi-web/deploy/enable-akemi-cloud.sh"
  exit 1
fi

DEST="/etc/httpd/conf.d/akemi.conf"
SRC="/home/akhio/akemi-web/deploy/apache-akemi.conf"
DIST="/home/akhio/akemi-web/dist"
AKHIO_HOME="/home/akhio"
WEB_ROOT="/home/akhio/akemi-web"

if [[ ! -f "${SRC}" ]]; then
  echo "Falta ${SRC}"
  exit 1
fi

if [[ ! -f "${DIST}/index.html" ]]; then
  echo "Falta el build en ${DIST}. Ejecuta: npm run build:cloud"
  exit 1
fi

# httpd (usuario apache) debe poder atravesar ~akhio hasta dist/ (sin abrir listados).
for path in "${AKHIO_HOME}" "${WEB_ROOT}"; do
  if [[ -d "${path}" ]]; then
    chmod o+x "${path}"
  fi
done

# index.html en la raíz de dist/ suele ser legible; assets/ a menudo queda 700 tras scp → 403.
find "${DIST}" -type d -exec chmod a+rx {} +
find "${DIST}" -type f -exec chmod a+r {} +

cp "${SRC}" "${DEST}"
restorecon -v "${DEST}" 2>/dev/null || true
if command -v restorecon >/dev/null; then
  restorecon -Rv "${DIST}" || true
elif command -v chcon >/dev/null; then
  chcon -R -t httpd_sys_content_t "${DIST}" || true
fi

apachectl configtest
systemctl reload httpd

SAMPLE_JS=$(find "${DIST}/assets" -maxdepth 1 -name '*.js' -type f 2>/dev/null | head -1 || true)
if [[ -n "${SAMPLE_JS}" ]] && ! runuser -u apache -- test -r "${SAMPLE_JS}"; then
  echo "AVISO: apache no puede leer ${SAMPLE_JS} (revisa chmod/SELinux)."
  exit 1
fi

echo "Listo: https://cloud.akhio.com/akemi/"
echo "Comprueba: curl -sI https://cloud.akhio.com/akemi/assets/ | head -1  (debe ser 403 sin index; un .js concreto debe ser 200)"