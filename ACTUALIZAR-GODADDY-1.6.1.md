# Arcangel US 1.6.1 — Nuevo espacio de clientes

## Qué cambia

- Menú lateral: Mi cuenta, Gestionar pedidos, Gestionar recargas, Historial y Reportes.
- Compras en tarjetas con imagen de la plataforma, correo, estado, vigencia y precio.
- Detalles, contraseña bajo solicitud, copiar datos y reportar la cuenta.
- Recargas e historial con búsqueda, filtros y paginación.
- Apartado de reportes con el estado y la respuesta de soporte.
- Menú desplegable y tarjetas adaptadas al celular.
- Altavoz de recargas manuales: al activarlo anuncia el monto de cada solicitud nueva. El botón «Probar voz de recarga» permite comprobarlo; las solicitudes siguen visibles aunque el navegador no tenga voz.

Se mantienen las compras, recargas, acceso de clientes y las funciones del administrador. Esta actualización no necesita cambiar la aplicación de Android.

## Subir a GoDaddy

1. Usa `arcangel-us-godaddy-v1.6.1.zip` como paquete completo para **Actualizar vista previa**. Si GoDaddy solicita una carpeta, descomprime el ZIP y selecciona la carpeta cuyo primer nivel contiene `package.json` y `start.cjs`.
2. Conserva los valores actuales de `SHOP_CATALOG_ID`, `COMMERCE_KEY`, `ADMIN_PASSWORD`, `DB_*` y las demás variables de tu aplicación. No generes una clave de ventas nueva.
3. Abre `/cuenta` en Vista previa y prueba el menú. El catálogo de pruebas puede mostrar datos distintos al publicado si usa otro `SHOP_CATALOG_ID`.
4. Cuando termines de revisar, usa **Publicar como activo**. Luego abre `https://arcangelpro.com/cuenta` y actualiza con Ctrl+F5 si el navegador conserva el diseño anterior.

Los datos guardados en MySQL permanecen asociados a su catálogo; no restaures el catálogo inicial para aplicar este cambio de diseño.

## Paquete de actualización

`arcangel-us-actualizacion-v1.6.1.zip` contiene el código actualizado y las guías, sin catálogo, imágenes del negocio, claves privadas ni datos de la demo. Úsalo solo cuando tu proceso permita combinar y reemplazar archivos en el proyecto existente. Para una carga que sustituye toda la aplicación, usa el paquete completo.

La demostración local usa cuentas y saldo ficticios; no está incluida como catálogo en el paquete.
