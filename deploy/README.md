# Instalación en un servidor (producción)

Probado en Oracle Cloud (Ubuntu 24.04, ARM Ampere A1, 1 OCPU / 6 GB). Sirve para cualquier
servidor Linux con Docker.

## 1. Preparar el servidor (una sola vez)

- Docker y el plugin `docker compose`.
- Puertos **80** y **443** abiertos en el firewall del proveedor (en Oracle: *Security List →
  Ingress Rules*) y en el firewall interno del servidor (`iptables`).
- Recomendado: 4 GB de memoria de intercambio (swap) si el servidor tiene poca memoria.

## 2. Archivo `.env` del servidor

En la carpeta del proyecto, cree `.env` (nunca se sube a GitHub):

```env
# Dirección del sistema. Sin dominio propio sirve: <ip-con-guiones>.sslip.io (ej. 160-34-219-166.sslip.io)
DOMINIO=nomina.suempresa.com

DB_USER=nomina
DB_PASSWORD=<contraseña larga y aleatoria>
DB_NAME=nomina

JWT_SECRET=<texto largo y aleatorio>
JWT_EXPIRES_IN=8h

# Usuario administrador inicial (solo se usa si la base está vacía)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@suempresa.com
ADMIN_PASSWORD=<contraseña segura>

SEED_DEMO=false
```

Para generar valores aleatorios: `openssl rand -base64 36`.

## 3. Levantar el sistema

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Caddy obtiene solo el certificado HTTPS para `DOMINIO`. El sistema queda en `https://DOMINIO`.
La base de datos, el backend y el frontend no se publican a internet.

## 4. Actualizar a una versión nueva

Con el código nuevo en la carpeta del proyecto:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Las migraciones de la base de datos se aplican solas al arrancar el backend.

## 5. Respaldos automáticos

`deploy/respaldo.sh` guarda la base de datos y los documentos en `~/respaldos` (últimos 14 días).
Para ejecutarlo todos los días a las 2:00 a. m.:

```bash
chmod +x deploy/respaldo.sh
(crontab -l 2>/dev/null; echo "0 2 * * * $PWD/deploy/respaldo.sh >> $HOME/respaldos/respaldo.log 2>&1") | crontab -
```

Restaurar la base de datos desde un respaldo:

```bash
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < ~/respaldos/nomina_AAAA-MM-DD_HHMM.dump
```

## 6. Cambiar a un dominio propio

1. En el proveedor del dominio, cree un registro **A** que apunte a la IP pública del servidor.
2. Cambie `DOMINIO` en `.env` y vuelva a ejecutar el comando del paso 3.
