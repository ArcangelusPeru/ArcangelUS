# Arcangel US 1.4.1 · GoDaddy Node.js + MySQL

Para volver a subir el paquete completo y corregir la vinculación Yape, sigue **ACTUALIZAR-GODADDY-1.4.1.md**. Para las funciones de clientes y billetera, consulta **CLIENTES-Y-VENTAS.md**.

## Configuración del alojamiento

Conserva Node.js 22, el comando de compilación `npm run build` y el de inicio `npm start`. `npm run dev` también arranca el servidor protegido. GoDaddy instala `mysql2` desde `package-lock.json`. La raíz del código debe contener `package.json`, `start.cjs`, `server.mjs` y los demás módulos; conserva las carpetas internas.

| Secreto | Configuración |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Los proporciona la base MySQL adjunta a la aplicación. Conserva sus valores; no los reemplaces por vacíos. |
| `ADMIN_PASSWORD` | Tu contraseña actual del panel, de al menos 12 caracteres. |
| `SHOP_CATALOG_ID` | Conserva el valor de cada entorno: normalmente `pruebas` en Vista previa y `publicado` en Publicado. |
| `COMMERCE_ENABLED` | `true` para activar clientes y compras; omitido o `false` mantiene solo WhatsApp. |
| `COMMERCE_KEY` | Clave privada estable de 32 bytes en base64; necesaria al activar ventas. Sigue CLIENTES-Y-VENTAS.md. |
| `APP_URL` | Necesario para vincular Yape: en Publicado usa `https://arcangelpro.com`, sin `/admin`. Genera el código desde el panel publicado. En Vista previa, debe coincidir con su dirección o quedar sin configurar para que el panel detecte su origen; no vincules el celular a la vista previa privada. |
| `PORT` | Lo proporciona GoDaddy; no fijarlo manualmente. |
| `DB_SSL`, `DB_SSL_CA` | Solo si tu conexión MySQL lo requiere; `DB_SSL=true` verifica el certificado. |

No subas `.env`, claves, respaldos privados o `node_modules` al repositorio. Generar una nueva COMMERCE_KEY después de guardar inventario impide descifrarlo: conserva la original.

## Persistencia y separación

GoDaddy confirmó que reconstruye el sistema de archivos al publicar. Esta versión guarda los datos remotos en MySQL. Ante un error de conexión, informa del fallo; no cambia al disco temporal ni carga productos originales por su cuenta.

Vista previa y Publicado pueden compartir una base. `SHOP_CATALOG_ID` separa catálogo, imágenes, clientes, saldo, inventario y pedidos. Publicar código no copia datos entre esos catálogos. Cambiar ese secreto abre otro conjunto de datos; no recupera ni mueve los anteriores.

## Si el catálogo está vacío

Solo para una instalación nueva: abre `/admin` y restaura un respaldo `.jsonl.gz` o inicia explícitamente el catálogo incluido. La opción de importar el catálogo anterior solo sirve si aún existe en esa instancia. No puede recuperar archivos que GoDaddy ya eliminó.

Si tu tienda ya tiene productos en MySQL, no inicialices otra vez: conserva su identificador y actualiza el código.

## Respaldo

En el panel, **Respaldos → Descargar respaldo del catálogo** incluye productos, categorías, configuración e imágenes referenciadas en `uploads`. No incluye datos de clientes ni ventas. No cargues `.jsonl.gz` en «Importar SQL» de GoDaddy.

Para una copia de clientes, billeteras, pedidos e inventario usa **Base de datos → Exportar SQL**. Conserva `COMMERCE_KEY` de cada entorno por separado. Un SQL puede contener ambos catálogos; no lo importes sobre una tienda con ventas posteriores sin planificar la restauración.

Se conservan las últimas 50 versiones del catálogo. Las imágenes subidas no se eliminan automáticamente y consumen almacenamiento. Cada imagen admite hasta 12 MB. Una importación del catálogo valida los archivos antes de cambiar el contenido; el stock automático se calcula desde el inventario existente.

## Publicación

Comprueba en Vista previa el catálogo, una imagen, el registro, una recarga ficticia, una compra y la entrega. Reinicia ese entorno y comprueba la persistencia. Después publica como activo, verifica los secretos de Publicado y configura sus pagos/productos desde el panel de ese entorno.

Las pruebas locales de esta versión no sustituyen la comprobación después de instalarla en GoDaddy. No se han modificado desde este trabajo los datos de tu tienda publicada ni los de la web de referencia.
