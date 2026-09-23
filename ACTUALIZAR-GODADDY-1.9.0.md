# Arcangel US 1.9.0

- Cada cuenta del inventario recibe un código permanente CTA-000123. Las cuentas existentes reciben su código al iniciar la aplicación; no se cambia al editar, vender, retirar o renovar.
- Los reemplazos conservan el código de la cuenta cancelada y el de la nueva.
- Ventas realizadas muestra cuenta, usuario comprador y tiempo restante según la fecha de vencimiento guardada. Las nuevas compras sin fechas usan la duración del producto cuando es un período definido. Las fechas anteriores se respetan.
- Clientes está en el menú principal debajo de Notificaciones Yape.
- Los altavoces de recargas y Yape se activan al iniciar sesión. El navegador puede requerir un clic para permitir audio. Mantener el panel abierto y el equipo despierto; la suspensión del navegador puede retrasar avisos.
- La portada incluye Cerrar sesión. Invalida la sesión del cliente y recarga el catálogo público sin sus precios de rol.
- Los recursos usan la versión 1.9.0 para renovar la caché del navegador.

## Publicación

Actualizar la vista previa desde la rama main, comprobar que la compilación esté saludable y publicar como activo. La actualización conserva los secretos y el catálogo configurados en cada entorno. No cambiar COMMERCE_KEY ni SHOP_CATALOG_ID.

La migración de códigos es aditiva: agrega un número único al inventario y mantiene sus identificadores y relaciones existentes.

## Validación

Comprobación de sintaxis del proyecto y pruebas locales de códigos persistentes, ventas, renovación, reemplazo, fechas, cola de voz, avisos en segundo plano y cierre de sesión con CSRF.
