#!/usr/bin/env bash
# Administra varias instalaciones independientes de StudentScope MJ en el mismo servidor, una por cliente.
# Cada cliente tiene su propia base de datos, su API y su puerto: no comparten nada entre si.
#
# Uso:
#   ./clientes.sh nuevo <nombre> --admin <correo> [--puerto N] [--ejemplo]
#   ./clientes.sh lista
#   ./clientes.sh actualizar
#   ./clientes.sh respaldar
set -euo pipefail
cd "$(dirname "$0")"

DIR_CLIENTES=clientes
DIR_RESPALDOS=respaldos
PUERTO_INICIAL=8101
RESPALDOS_A_CONSERVAR=7

uso() {
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

fallar() {
  echo "Error: $*" >&2
  exit 1
}

compose() {
  local cliente=$1
  shift
  docker compose -p "sscope-$cliente" --env-file "$DIR_CLIENTES/$cliente.env" -f docker-compose.yml "$@"
}

nombres_de_clientes() {
  local archivo
  for archivo in "$DIR_CLIENTES"/*.env; do
    [ -e "$archivo" ] || continue
    basename "$archivo" .env
  done
}

aleatorio() {
  LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1" || true
}

clave_con_letras_y_numeros() {
  local clave
  while :; do
    clave=$(aleatorio 18)
    [[ $clave =~ [0-9] && $clave =~ [A-Za-z] ]] && break
  done
  printf '%s' "$clave"
}

puerto_ocupado() {
  local puerto=$1
  grep -qs "^WEB_PUERTO=$puerto\$" "$DIR_CLIENTES"/*.env && return 0
  (exec 3<>"/dev/tcp/127.0.0.1/$puerto") 2>/dev/null && return 0
  return 1
}

esperar_sano() {
  local cliente=$1 id estado="desconocido" intento
  id=$(compose "$cliente" ps -q api)
  for intento in $(seq 1 45); do
    estado=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || echo "desconocido")
    [ "$estado" = "healthy" ] && return 0
    [ "$estado" = "unhealthy" ] && break
    sleep 2
  done
  echo "  la API de $cliente no quedo sana (estado: $estado)" >&2
  return 1
}

cmd_nuevo() {
  local nombre=${1:-} admin="" puerto="" ejemplo=false
  [ -n "$nombre" ] || uso
  shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --admin) admin=${2:-}; shift 2 ;;
      --puerto) puerto=${2:-}; shift 2 ;;
      --ejemplo) ejemplo=true; shift ;;
      *) fallar "opcion desconocida: $1" ;;
    esac
  done

  [[ $nombre =~ ^[a-z][a-z0-9-]{1,30}$ ]] || fallar "el nombre usa letras minusculas, numeros y guiones (2 a 31 caracteres, empieza con letra)"
  [[ $nombre != *--* ]] || fallar "el nombre no puede llevar dos guiones seguidos"
  [[ $admin =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || fallar "falta --admin con un correo valido"
  mkdir -p "$DIR_CLIENTES"
  [ ! -e "$DIR_CLIENTES/$nombre.env" ] || fallar "el cliente $nombre ya existe"

  if [ -z "$puerto" ]; then
    puerto=$PUERTO_INICIAL
    while puerto_ocupado "$puerto"; do puerto=$((puerto + 1)); done
  else
    [[ $puerto =~ ^[0-9]+$ ]] || fallar "--puerto debe ser un numero"
    ! puerto_ocupado "$puerto" || fallar "el puerto $puerto ya esta en uso"
  fi

  local clave_admin
  clave_admin=$(clave_con_letras_y_numeros)

  umask 077
  cat > "$DIR_CLIENTES/$nombre.env" <<ENV
DB_NAME=studentscope_mj
DB_USER=studentscope
DB_PASSWORD=$(aleatorio 40)
JWT_SECRET=$(aleatorio 64)
ADMIN_EMAIL=$admin
ADMIN_PASSWORD=$clave_admin
SEMBRAR_EJEMPLO=$ejemplo
DEMO_HABILITADA=false
WEB_PUERTO=$puerto
ENV
  cat > "$DIR_CLIENTES/$nombre.credenciales.txt" <<TXT
Cliente: $nombre
Direccion local: http://127.0.0.1:$puerto
Administrador: $admin
Contrasena inicial: $clave_admin
Entregala por un canal seguro y pide que la cambie al entrar.
TXT

  echo "Levantando la instalacion de $nombre en el puerto $puerto..."
  compose "$nombre" up -d --build
  esperar_sano "$nombre" || fallar "revisa los registros con: docker compose -p sscope-$nombre logs api"

  echo
  echo "Listo: $nombre"
  echo "  Puerto: $puerto (apunta el subdominio de ese cliente en Cloudflare a http://localhost:$puerto)"
  echo "  Credenciales del administrador: $DIR_CLIENTES/$nombre.credenciales.txt"
}

cmd_lista() {
  local nombre puerto estado hay=false
  printf '%-24s %-8s %s\n' CLIENTE PUERTO ESTADO
  for nombre in $(nombres_de_clientes); do
    hay=true
    puerto=$(sed -n 's/^WEB_PUERTO=//p' "$DIR_CLIENTES/$nombre.env")
    if curl -fs -o /dev/null --max-time 3 "http://127.0.0.1:$puerto/api/health"; then
      estado=ok
    else
      estado="no responde"
    fi
    printf '%-24s %-8s %s\n' "$nombre" "$puerto" "$estado"
  done
  [ "$hay" = true ] || echo "(todavia no hay clientes)"
}

cmd_actualizar() {
  local clientes nombre fallaron=()
  mapfile -t clientes < <(nombres_de_clientes)
  [ "${#clientes[@]}" -gt 0 ] || { echo "No hay clientes."; return 0; }

  echo "Construyendo la imagen de la API una sola vez..."
  compose "${clientes[0]}" build api

  for nombre in "${clientes[@]}"; do
    echo "Actualizando $nombre..."
    compose "$nombre" up -d --no-build
    if esperar_sano "$nombre"; then
      echo "  $nombre: ok"
    else
      fallaron+=("$nombre")
    fi
  done

  echo
  if [ "${#fallaron[@]}" -gt 0 ]; then
    echo "No quedaron sanos: ${fallaron[*]}" >&2
    exit 1
  fi
  echo "Todos los clientes quedaron sanos (${#clientes[@]})."
}

cmd_respaldar() {
  local clientes nombre archivo fallaron=()
  mapfile -t clientes < <(nombres_de_clientes)
  [ "${#clientes[@]}" -gt 0 ] || { echo "No hay clientes."; return 0; }

  for nombre in "${clientes[@]}"; do
    mkdir -p "$DIR_RESPALDOS/$nombre"
    archivo="$DIR_RESPALDOS/$nombre/$(date +%Y%m%d-%H%M%S).sql.gz"
    if compose "$nombre" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "$archivo" \
      && [ "$(wc -c < "$archivo")" -gt 500 ]; then
      echo "$nombre: $archivo"
      ls -1t "$DIR_RESPALDOS/$nombre"/*.sql.gz | tail -n +$((RESPALDOS_A_CONSERVAR + 1)) | while read -r viejo; do rm -- "$viejo"; done
    else
      rm -f -- "$archivo"
      fallaron+=("$nombre")
    fi
  done

  if [ "${#fallaron[@]}" -gt 0 ]; then
    echo "Fallo el respaldo de: ${fallaron[*]}" >&2
    exit 1
  fi
}

case "${1:-}" in
  nuevo) shift; cmd_nuevo "$@" ;;
  lista) cmd_lista ;;
  actualizar) cmd_actualizar ;;
  respaldar) cmd_respaldar ;;
  *) uso ;;
esac
