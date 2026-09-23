# Arcangel US 1.7.0 — Usuarios y precios por rol

## Cambios incluidos

- **Yape:** Notificaciones Yape se actualiza cada 5 segundos mientras está visible, aunque el altavoz esté apagado. Al volver a la pestaña se vuelve a consultar. La actualización respeta los filtros y se pausa mientras editas un filtro o lees un detalle abierto.
- **Contraseñas:** en Ventas → Clientes → Cambiar contraseña puedes establecer una nueva. Se cierran las sesiones anteriores y se renueva el código de recuperación; se conservan el saldo, los pedidos y el historial.
- **Usuarios:** el registro solicita un usuario único de 3 a 40 caracteres. El acceso acepta usuario o correo electrónico. Los clientes existentes conservan su correo y contraseña; reciben un usuario automático que puedes cambiar desde Usuario y rol.
- **Roles:** solo el administrador asigna Cliente o Revendedor desde Ventas → Clientes → Usuario y rol. Los nuevos registros son clientes. Ninguno de estos roles da acceso al panel administrador.
- **Precios:** cada producto tiene un precio de cliente y otro de revendedor, además de sus precios anteriores opcionales. Cada cuenta recibe únicamente los precios de su rol y la compra se cobra según ese rol en el servidor. Sin iniciar sesión se muestran los productos y una invitación a entrar para consultar el precio.

Al actualizar, todos los clientes existentes conservan el rol Cliente. Los productos anteriores mantienen su precio y lo usan también para revendedores hasta que lo cambies. Revisa ambos campos en Productos antes de asignar revendedores.

## Subir a GoDaddy

1. Descarga un respaldo desde tu panel antes de actualizar.
2. Usa **arcangel-us-godaddy-v1.7.0.zip**, el paquete completo, para **Actualizar vista previa**. Si pide una carpeta, descomprímelo y selecciona la carpeta que contiene `package.json` y `start.cjs` en el primer nivel.
3. Conserva los valores de `DB_*`, `SHOP_CATALOG_ID`, `COMMERCE_KEY`, `ADMIN_PASSWORD`, `APP_URL` y las demás variables actuales de cada entorno. No generes otra clave de ventas ni cambies el catálogo para instalar esta versión.
4. El servidor añade automáticamente los campos necesarios en MySQL. Abre `/admin`, revisa Ventas → Clientes y los dos precios en Productos. Vista previa y Publicado pueden usar catálogos distintos; comprueba el catálogo mostrado en el panel.
5. Usa **Publicar como activo** y revisa [tu panel publicado](https://arcangelpro.com/admin). Si el navegador conserva el diseño anterior, actualiza con Ctrl+F5.

Los datos de MySQL se conservan. No uses «Usar catálogo inicial» ni restaures un respaldo solo para aplicar esta actualización. No necesitas cambiar la aplicación de Android.

## Paquete de actualización reducido

**arcangel-us-actualizacion-v1.7.0.zip** contiene el código y las guías, sin catálogo ni imágenes del negocio. Úsalo únicamente si vas a combinarlo con todos los archivos de tu proyecto existente. Si GoDaddy reemplaza la aplicación completa, utiliza el paquete completo indicado arriba.

La demo local contiene usuarios, saldo y avisos ficticios. Sus datos no están incluidos en estos paquetes.
