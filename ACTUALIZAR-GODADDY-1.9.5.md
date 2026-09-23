# Arcangel US 1.9.5

## Cambios

- Cada producto de la portada muestra su stock. Los productos sin cantidad definida muestran «Stock: consultar».
- Modo Live difumina las imágenes del catálogo y recuerda la preferencia en el navegador. En escritorio permite verlas al pasar el cursor. Los precios, nombres y cantidades siguen visibles.
- En Mi cuenta, «Salir» pasa a «Cerrar Sesión» e «Inicio» a «Catálogo de Inicio».
- Las compras muestran «Se activó» y «Fecha de activación». Se conserva la fecha registrada en la compra.
- Los controles de altavoz y avisos se muestran solo en Notificaciones Yape. Los servicios de audio y consulta siguen activos al navegar por otros apartados.
- Pagos aparece debajo de Clientes y contiene Recargas y Yape automático. Los accesos desde los avisos y Configurar celular dirigen a este apartado.
- Ventas conserva Inventario de cuentas, Ventas realizadas, Reportes y Reemplazos.

## Publicación en GoDaddy

Actualizar vista previa desde la rama main, esperar a que la compilación esté saludable, revisar los cambios y publicar como activo. Los recursos usan la versión 1.9.5 para renovar la caché.

Esta versión no cambia la base de datos ni los secretos. Conserva COMMERCE_KEY, SHOP_CATALOG_ID y las credenciales de base de datos existentes.

## Validación

Sintaxis completa del proyecto; pruebas de voz de recargas y Yape; navegación local entre Pagos, Ventas, Clientes y Notificaciones Yape; stock en portada; Modo Live en escritorio y móvil; textos de Mi cuenta.
