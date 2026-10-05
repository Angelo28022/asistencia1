# Sistema de Asistencia — Liceo Santa Rosa de Lima

Cómo levantar la aplicación en tu PC con Docker, sin instalar XAMPP ni importar la base de datos a mano.

## 1. Instala Docker Desktop (una sola vez)

Descárgalo de https://www.docker.com/products/docker-desktop/ e instálalo. Ábrelo y espera a que abajo diga **Engine running**.

## 2. Levanta la aplicación

- **Windows:** doble clic en `iniciar.bat`
- **Linux/Mac:** en una terminal dentro de esta carpeta, ejecuta `./iniciar.sh`

La primera vez tarda unos minutos (descarga PHP y MariaDB). Al terminar se abre el navegador en el login.

## 3. Entra

- Dirección: http://localhost:8090/admin/vistas/login.html
- Usuario: `admin`
- Clave: `admin`
- Kiosko de marcaje: http://localhost:8090/vistas/asistencia.php

## Otros scripts

| Script | Qué hace |
|---|---|
| `detener.bat` / `detener.sh` | Apaga la aplicación. Los datos se conservan. |
| `reiniciar-datos.bat` / `reiniciar-datos.sh` | Borra todo y deja la base como en `control_asistencia (3).sql`. Pide confirmación. |
| `sembrar-datos.bat` / `sembrar-datos.sh` | Agrega 18 empleados de ejemplo y sus asistencias de las últimas 6 semanas (`seed/seed-datos.sql`). Se puede repetir sin duplicar y no toca los datos reales. Clave de los empleados de ejemplo: `123456`. |

## Problemas comunes

- **"No se encontró Docker" / "Docker Desktop no está abierto":** abre Docker Desktop y espera a que diga *Engine running*.
- **"port is already allocated":** otro programa usa el puerto 8090 o el 3308. Cámbialo en `docker-compose.yml` (la parte izquierda de `"8090:80"` o `"3308:3306"`).
- **Quiero ver la base de datos:** conéctate con HeidiSQL, DBeaver o similar a `localhost`, puerto `3308`, usuario `asistencia`, clave `asistencia`, base `control_asistencia`.
- **Cambié el código y no se ve:** vuelve a ejecutar `iniciar.bat`; reconstruye la imagen con tus cambios.
