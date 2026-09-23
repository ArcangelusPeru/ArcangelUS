# Arcangel US 1.8.2 — Canales de compra

## Cambios

- Productos → Editar → Canales de venta tiene dos casillas independientes: COMPRAR ACÁ y COMPRAR POR WHATSAPP. Se muestran únicamente las opciones marcadas, tanto en las tarjetas como en «Ver más».
- COMPRAR ACÁ usa saldo y entrega una cuenta disponible automáticamente.
- Se retiró la modalidad de pedido manual y su contador y formulario de entrega. Los productos que antes tenían entrega manual dejan de aceptar nuevas compras con saldo; puedes habilitar entrega automática al cargar cuentas en su inventario.
- «Ventas realizadas» conserva el historial, la edición de cuentas vendidas y las devoluciones de saldo. Las ventas manuales anteriores se conservan para poder devolver su saldo si quedaron pendientes.
- Se mantienen las recargas por revisión, Yape automático, clientes, roles, reportes, reemplazos y renovaciones.

## Actualizar GoDaddy

1. Descarga un respaldo de tu base de datos antes de actualizar.
2. Sube **arcangel-us-godaddy-v1.8.2.zip** desde Actualizar vista previa. Si pide una carpeta, descomprime el ZIP y selecciona la carpeta con `package.json` y `start.cjs` en el primer nivel.
3. Conserva los secretos existentes, especialmente `SHOP_CATALOG_ID` y `COMMERCE_KEY`. No generes otra clave ni restaures el catálogo inicial.
4. Prueba los canales de un producto y abre «Ver más».
5. Publica como activo y revisa tu tienda.

La demo usa otra base de catálogo y datos ficticios. No se incluyen sus usuarios, saldos ni cuentas en el paquete.
