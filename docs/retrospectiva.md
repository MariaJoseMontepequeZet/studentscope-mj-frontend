# Retrospectiva de StudentScope MJ v3

Cierre del plan de 21 días. Se escribe para quien quiera entender qué se hizo, qué quedó pendiente y qué se aprendió, sin maquillar los resultados.

## Qué se propuso

Pasar de una aplicación que guardaba todo en el navegador a un sistema completo: base de datos, API con cuentas y roles, despliegue automatizado, calidad medible y un par de piezas diferenciadoras (automatización, análisis y un modelo de riesgo de abandono).

## Qué se entregó

| Área | Resultado |
| :--- | :--- |
| Frontend | SPA sin frameworks dividida en módulos ES, sin XSS conocido, accesible con teclado, con demo pública. |
| Backend | API Express con PostgreSQL, migraciones, cuentas, roles, sesiones que se cierran al cambiar la contraseña y cuenta de demostración. |
| Despliegue | Docker Compose, Caddy, túnel de Cloudflare y despliegue automático con GitHub Actions. |
| Calidad | Frontend 112 pruebas, backend 245 con PostgreSQL, servicio de riesgo 33 con `pytest`, portafolio 195. ESLint y Prettier en el frontend. |
| Documentación | README por repositorio, referencia de la API, colección de Postman con 45 peticiones, arquitectura con diagrama y guía de Docker. |
| Extras | Plantillas de n8n, vistas de PostgreSQL para Power BI y un servicio de Python que estima el riesgo de abandono. |

## Qué salió bien

* **Una rama y un pull request por tarea**, siempre hacia `dev`. La historia es legible y cada cambio se pudo revisar por separado.
* **Probar contra la base real.** Las pruebas con PostgreSQL encontraron cosas que un repositorio falso no habría mostrado (restricciones, transacciones, la migración de cada cambio).
* **Comprobar que las pruebas fallan.** Romper a propósito el código (una mutación) y ver que la prueba cae evitó varias pruebas que pasaban sin comprobar nada.
* **Probar en un navegador de verdad.** El refactor a módulos tenía un error de rutas que ESLint no podía ver y que solo apareció al abrir la aplicación; ahora hay una prueba que lo vigila.
* **Decir cuando los datos no alcanzan.** Con solo 3 abandonos en los datos de ejemplo, el modelo de riesgo no puede demostrar que acierta. En lugar de presentar un 90 % de AUC, el servicio lo declara en cada respuesta y la evaluación se compara con el azar mediante una prueba de permutaciones.

## Qué salió mal o se aprendió a la mala

* **Interruptores falsos.** La pantalla de Configuración tenía cinco interruptores de notificaciones y un botón "Guardar" que mostraba un aviso de éxito sin guardar nada. Se quitaron: una interfaz que promete lo que no hace es peor que no tenerla.
* **Texto fijo disfrazado de dato.** Las tarjetas del dashboard mostraban "+3", "+5%" y "+8 vs mes anterior" escritos a mano. Ahora muestran datos reales de la API.
* **Archivos que git no veía.** Una regla local para ocultar `docs/` hizo que varios commits salieran sin la documentación que describían, y las pruebas que leían esos archivos habrían fallado en un clon limpio. Se detectó al revisar qué contenía cada commit, no por una prueba. Lección: mirar `git show --stat` antes de dar un commit por bueno.
* **Una etiqueta que enseñaba lo contrario.** Entrenar con "inactivo" como "abandono" habría aprendido que quien más avanza más abandona, porque los inactivos incluyen a quienes terminaron el curso. Se corrigió definiendo abandono como inactivo sin completar el curso.
* **Una sola mezcla de etiquetas engaña.** Para comprobar que no hay fuga de datos se mezclaron las etiquetas una vez y salió un AUC de 0,74 por pura casualidad. Hay que repetirlo muchas veces y mirar la distribución.
* **Un registro borrado por error en una prueba manual.** Se restauró con sus datos. Desde entonces, en las pruebas manuales el registro de prueba se busca por correo, nunca por posición.

## Qué queda pendiente

* **Límite de intentos de inicio de sesión por IP.** Hoy es por correo. Uno por IP bloquearía a todos a la vez porque, detrás de Cloudflare y Caddy, la API ve siempre la IP del proxy. Hay que confirmar primero qué cabecera trae la IP real.
* **Tablero completo de Power BI y publicación en la nube.** La conexión a las vistas y las medidas se probaron en Power BI Desktop; no se armó un tablero completo ni se publicó.
* **Disparadores programados de n8n.** Las tres plantillas se ejecutaron a mano con envío real de correo; no se esperó a la hora programada (lunes y diario a las 8:00).
* **El modelo de riesgo** necesita al menos 30 abandonos reales para poder medirse.
* **Caché de Cloudflare.** Añade `Cache-Control: max-age=14400` a los `.js` y `.css` y pisa el `no-cache` del servidor: quien ya visitó el sitio puede ver scripts viejos hasta 4 horas. Se arregla en el panel de Cloudflare (Browser Cache TTL en "Respect Existing Headers") y purgando la caché.
* **Rotar el token del túnel de Cloudflare**, que apareció en capturas de pantalla.

## Qué haría distinto

* Escribir la prueba antes de dar por buena la corrección, sobre todo en lo que toca datos.
* Revisar el contenido de cada commit y no solo el estado del repositorio.
* Definir cuanto antes qué significa cada estado del dominio (inactivo, abandono, completó), porque cambia lo que se puede medir.
