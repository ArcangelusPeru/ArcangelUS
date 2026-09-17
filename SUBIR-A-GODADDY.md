# Arcangel US 1.2.0 · MySQL en GoDaddy

## Qué corrige

GoDaddy confirmó que el disco de la aplicación es temporal y se reconstruye al publicar. Esta versión guarda productos, categorías, configuración, stock e imágenes subidas en la base MySQL de la cuenta. No utiliza DATA_DIR para nuevos guardados remotos.

No se han recuperado los cambios que desaparecieron. Una base nueva no contiene los archivos de la versión anterior. Si soporte encuentra una copia de catalog.json y uploads, consérvala para convertirla/importarla antes de volver a publicar.

## 1. Comprobar la conexión antes de subir el código

La guía de la base de datos de esta aplicación, compartida el 17 de septiembre de 2026, confirma que GoDaddy configura automáticamente DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD al adjuntar la base. Aparecen en Configuración → Secretos y la aplicación los lee directamente. No los vuelvas a crear, no los reemplaces por valores vacíos y no subas un archivo .env con credenciales. No hace falta copiar el ejemplo de conexión ni ejecutar npm install manualmente: esta actualización incluye mysql2 en package.json y package-lock.json.

Conserva ADMIN_PASSWORD y configura únicamente el nuevo SHOP_CATALOG_ID con un valor distinto en cada entorno, como se indica abajo. Si la pantalla no permite distinguir Vista previa de Publicado, comprueba cómo asignar secretos por entorno antes de guardar; no establezcas un identificador compartido. El ejemplo de conexión mostrado no incluye SSL: esta versión coincide con ese ejemplo y no activa DB_SSL por defecto.

| Variable | Valor |
| --- | --- |
| DB_HOST | Servidor MySQL proporcionado por GoDaddy. |
| DB_PORT | Puerto MySQL de la guía; si se omite se usa 3306. |
| DB_NAME | Nombre de la base proporcionada por GoDaddy. |
| DB_USER | Usuario de esa base. |
| DB_PASSWORD | Contraseña de esa base. |
| ADMIN_PASSWORD | Conserva tu contraseña del panel (mínimo 12 caracteres). |
| SHOP_CATALOG_ID | `pruebas` en Vista previa y `publicado` en Publicado. |
| PORT | Lo proporciona GoDaddy; no fijarlo manualmente. |
| APP_URL | Opcional: origen exacto del entorno, sin /admin. |
| DB_SSL | Solo si la guía exige TLS, usar `true`. Si entrega una CA, usar DB_SSL_CA. Se verifica el certificado. |

La pantalla de GoDaddy indica que Vista previa y Publicado comparten base. SHOP_CATALOG_ID separa los registros e imágenes dentro de esa base: usa valores distintos por entorno. Cambiar el identificador abre otro catálogo; no mueve ni borra el anterior. Publicar código no copia los productos de `pruebas` a `publicado`.

Esta versión requiere la base y el identificador antes de arrancar. Si falta la conexión o hay un error, informa del fallo: no vuelve a guardar en el disco temporal ni restaura productos originales por su cuenta.

## 2. Actualizar el código

Si usas GitHub, conserva el proyecto y sustituye los archivos de código por los de la carpeta del paquete. Añade los archivos nuevos mysql-store.mjs, backup.mjs y .npmrc. Deben actualizarse juntos server.mjs, hosting.mjs, start.cjs, package.json, package-lock.json, admin/index.html, admin/admin.js y admin/admin.css. También se incluye un ZIP pequeño con esos archivos: arcangel-us-actualizacion-mysql-v1.2.0.zip. Descomprímelo para actualizar el repositorio; no es una aplicación completa para subir como proyecto nuevo.

Si cargas una aplicación completa, utiliza arcangel-us-godaddy-v1.2.0.zip. No subas node_modules ni archivos .env. La raíz debe contener package.json.

Mantén Node.js 22. Comandos: `npm run build` y `npm start`. También se admite `npm run dev`, con el mismo servidor protegido. GoDaddy instala mysql2 desde package-lock.json.

Prueba primero Vista previa. Solo publica cuando la conexión y el guardado se hayan comprobado allí y hayas preservado cualquier copia recuperable de la versión anterior.

## 3. Iniciar o importar el catálogo

Entra a /admin. Una base o identificador sin catálogo muestra Configurar catálogo y ofrece:

- Restaurar un respaldo .jsonl.gz descargado desde esta nueva versión.
- Importar el catálogo anterior de esta instancia, únicamente si sigue existiendo catalog.json en DATA_DIR con sus imágenes. No puede recuperar archivos destruidos por un despliegue.
- Usar catálogo inicial del paquete, mediante confirmación explícita. Son los productos originales, no los cambios perdidos.

La inicialización nunca sobrescribe un catálogo existente. Si ya hay datos en MySQL, la aplicación los lee sin importar el contenido del catálogo del ZIP.

## 4. Verificar en tu alojamiento

En `pruebas`, crea un producto, cambia su stock y sube una imagen. Descarga un respaldo desde Respaldos. Actualiza/republica solo la vista previa y comprueba que el producto, el stock y la imagen sigan allí. Comprueba también que `publicado` conserva sus propios productos.

Para pasar un catálogo completo de pruebas a publicado, usa descargar/restaurar respaldo de forma expresa. Al activar por primera vez el entorno Publicado con su catálogo vacío, la tienda mostrará que está en preparación hasta que entres al panel e importes o inicies ese catálogo. Planifica ese paso antes de cambiar el código público.

## Respaldos y límites

Respaldos → Descargar respaldo completo incluye todos los productos (también ocultos), categorías, configuración e imágenes referenciadas bajo uploads/. Las imágenes originales del diseño y las imágenes enlazadas desde otras webs no se incrustan; conserva también el ZIP del proyecto y los archivos externos que necesites.

El formato es JSON por líneas comprimido con gzip (.jsonl.gz). No lo cargues en la opción Importar SQL de GoDaddy. Usa Restaurar una copia dentro del panel de la tienda.

Se conservan las 50 revisiones anteriores del catálogo en MySQL; las imágenes subidas son inmutables y no se eliminan automáticamente. El consumo de almacenamiento de la base puede crecer. Cada imagen admite hasta 12 MB. La importación admite hasta 1 GB descomprimido y verifica que estén todas las imágenes antes de reemplazar el catálogo. Si se interrumpe la importación, pueden quedar imágenes sin referencia, pero el catálogo previo permanece activo. Los enlaces externos dependen de su proveedor.

Los respaldos dentro de MySQL no sustituyen a una copia descargada fuera de la cuenta. Exportar SQL en GoDaddy puede respaldar las tablas completas, incluidos ambos catálogos y las imágenes.

El stock sigue siendo manual después de cada venta por WhatsApp. Las sesiones de administración caducan y se cierran al reiniciar; esto no elimina el catálogo.

## Validación realizada

Pruebas locales sobre MariaDB 11.4.10 usando el protocolo MySQL y mysql2: catálogo e imágenes tras destruir la carpeta de aplicación, varias instancias con control de revisión, separación de catálogos, importación/exportación con imágenes, rechazo de respaldos incompletos y protección del panel. La conexión y persistencia en la base real de GoDaddy siguen pendientes de verificar antes de publicar.

Referencias: https://raw.githubusercontent.com/godaddy/nodejs-hosting-agent-skill/main/skills/godaddy-nodejs-hosting/contract.md y respuesta de soporte de GoDaddy aportada por el usuario el 17 de septiembre de 2026.
