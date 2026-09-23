# Paquete completo para GoDaddy · Arcangel US 1.4.1

Archivo: **arcangel-us-godaddy-v1.4.1.zip**. Incluye el código y los recursos de la tienda, el panel, clientes, billetera y la corrección para liberar la vinculación Yape de vista previa. La APK 0.1.1 se sigue instalando en el celular; no está dentro de este ZIP.

## Subir la actualización

1. Usa tu aplicación existente **ArcangelUSperu** en GoDaddy. Conserva la base de datos y todos los secretos actuales, especialmente `SHOP_CATALOG_ID`, `COMMERCE_KEY` y `ADMIN_PASSWORD` de cada entorno.
2. Si GoDaddy permite subir un ZIP del proyecto, selecciona este archivo completo. Si utilizas carga de carpeta o el repositorio conectado, descomprímelo y coloca **su contenido** en la raíz del proyecto: `package.json` debe quedar al lado de `start.cjs`, no dentro de otra carpeta o dentro de un ZIP que quede sin descomprimir.
3. Ejecuta **Actualizar vista previa**. Conserva Node.js 22, compilación `npm run build` e inicio `npm start`.
4. Comprueba en los registros de arranque que diga **Arcangel US 1.4.1**. En **/admin → Ventas → Yape automático** debe aparecer **Catálogo actual**.

Si solo aparece la interfaz anterior, comprueba que GoDaddy esté desplegando la fuente donde reemplazaste los archivos. Una aplicación conectada a un repositorio debe recibir los archivos actualizados en esa rama.

## Liberar el número que quedó en vista previa

1. Abre **el panel de vista previa**, donde se generó la primera vinculación. En **Ventas → Yape automático**, abre **Liberar número de este catálogo**.
2. Revisa las solicitudes del panel y las notificaciones pendientes de la app. Si hay pagos por atender, resuélvelos antes de liberar; no rechaces un pago recibido solo para continuar.
3. Escribe el número receptor, marca la casilla de confirmación y pulsa **Liberar número**. Solo se elimina su vinculación; los clientes, saldos e historial permanecen en su catálogo original.
4. En GoDaddy pulsa **Publicar como activo**. En **Secretos → Publicar**, verifica `APP_URL=https://arcangelpro.com`. Si lo modificas, guarda y reinicia la aplicación publicada.
5. Entra a **https://arcangelpro.com/admin → Ventas → Yape automático**, genera el nuevo código y pégalo en la APK. Comprueba la conexión antes de activar los pagos automáticos.

Los datos existentes de MySQL se conservan al mantener sus secretos y catálogo. Este paquete no contiene una copia de tus clientes, saldos ni pagos y no restaura automáticamente el catálogo inicial. Para respaldar esos datos utiliza **Exportar SQL**; el respaldo de catálogo por sí solo no contiene ventas.
