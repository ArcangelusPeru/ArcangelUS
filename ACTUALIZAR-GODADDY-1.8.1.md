# Arcangel US 1.8.1 — Reemplazos y renovaciones

Esta actualización conserva las funciones anteriores y añade el flujo de cuentas caídas y renovaciones.

## Cuenta caída y reemplazo

En **Mis cuentas y compras**, una cuenta entregada puede mostrar **CUENTA CAÍDA · REEMPLAZAR**. Antes de confirmar se avisa que el cliente tiene un único intento. El servidor busca otra cuenta disponible del mismo producto con un correo diferente, entrega esa cuenta y marca la anterior como **Cancelada por reemplazo**. Si no hay otra cuenta válida, no se consume el intento.

En **Ventas → Reemplazos** queda una tabla con el cliente, la cuenta anterior, la cuenta nueva, el pedido y la fecha. La cuenta cancelada nunca vuelve a publicarse.

## Renovación controlada

Al editar una cuenta desde **Ventas → Inventario de cuentas** o desde **Pedidos → Editar cuenta vendida**, activa **Permitir renovación para esta cuenta**. Solo entonces el cliente verá **Renovar cuenta**. La renovación descuenta el precio del rol del cliente o revendedor y extiende la fecha según la duración configurada en el producto. Cada renovación queda en el historial de movimientos.

## Subir a GoDaddy

1. Descarga un respaldo antes de actualizar.
2. Usa **arcangel-us-godaddy-v1.8.1.zip** para **Actualizar vista previa**. Si GoDaddy pide una carpeta, descomprime el ZIP y selecciona la carpeta que contiene `package.json` y `start.cjs` en el primer nivel.
3. Conserva los secretos actuales (`DB_*`, `SHOP_CATALOG_ID`, `COMMERCE_KEY`, `ADMIN_PASSWORD`, `APP_URL` y demás variables). No generes una clave nueva.
4. Prueba la vista previa, activa la renovación en una cuenta de prueba y revisa la tabla **Reemplazos**.
5. Pulsa **Publicar como activo** y comprueba [https://arcangelpro.com/admin](https://arcangelpro.com/admin).

La información se guarda en MySQL. No restaures el catálogo inicial para aplicar esta actualización.

## Paquete reducido

**arcangel-us-actualizacion-v1.8.1.zip** contiene solo el código y las guías, sin catálogo, imágenes privadas ni datos de la demo. Usa el paquete completo si GoDaddy reemplaza toda la aplicación.


## Canales de venta por producto

En **Catálogo → Productos → Editar producto → Canales de venta** puedes elegir qué botones aparecen en cada ficha:

- **Desactivada (solo WhatsApp)**: muestra únicamente WhatsApp.
- **COMPRAR ACÁ · Pedido manual** o **Entrega automática**: habilita la compra con saldo.
- **Mostrar botón COMPRAR POR WHATSAPP**: déjalo marcado para mostrar también WhatsApp; desmárcalo para dejar solo COMPRAR ACÁ.

Guarda el producto para aplicar la configuración en la portada y en la ventana de detalle.
