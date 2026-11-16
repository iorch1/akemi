#!/usr/bin/env bash
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

if [[ ! -f "${SRC}" ]]; then
  echo "Falta ${SRC}"
  exit 1
fi

if [[ ! -f "${DIST}/index.html" ]]; then
  echo "Falta el build en ${DIST}. Ejecuta: npm run build:cloud"
  exit 1
fi

cp "${SRC}" "${DEST}"
restorecon -v "${DEST}" 2>/dev/null || true
if command -v chcon >/dev/null; then
  chcon -R -t httpd_sys_content_t "${DIST}" 2>/dev/null || true
fi
apachectl configtest
systemctl reload httpd
echo "Listo: https://cloud.akhio.com/akemi/"