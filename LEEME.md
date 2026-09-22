# Arcangel US 1.3.7

Tienda con tu logo, olas rojas, catálogo editable y panel del dueño. Esta versión incluye clientes, billetera en soles, aprobación manual de recargas por Yape/Plin, compras con saldo, cuentas de inventario y entrega automática o manual por producto.

## Actualizar GoDaddy

Sigue **CLIENTES-Y-VENTAS.md** para actualizar tu proyecto actual y activar las funciones nuevas. Usa `arcangel-us-actualizacion-ventas-v1.3.7.zip` para reemplazar código en el proyecto existente. Para una carpeta completa, usa `arcangel-us-godaddy-v1.3.7.zip`.

Mantén tus secretos actuales, en particular `SHOP_CATALOG_ID` y `ADMIN_PASSWORD`. Para activar ventas se añaden `COMMERCE_ENABLED=true` y una `COMMERCE_KEY` privada que debes conservar. No se incluye ninguna clave ni contraseña de producción en estos archivos.

## Accesos separados

- Tienda: https://arcangelpro.com/
- Clientes: https://arcangelpro.com/cuenta
- Dueño: https://arcangelpro.com/admin

Registrarse como cliente no permite acceder a la administración. Cada cliente ve únicamente su billetera y sus compras. Tu panel conserva la contraseña del dueño configurada en GoDaddy.

## Tu panel

- **Productos:** agregar, editar imágenes, nombres, precios, descripciones, modalidad de entrega, disponibilidad y unidades. Arrastra el asa de una fila para ordenar desde un navegador de escritorio.
- **Categorías:** nombres, imágenes y orden de filtros.
- **Configurar web:** marca, logos, textos, WhatsApp, QR de pago de Yape/Plin, titular y colores.
- **Ventas:** revisión de recargas con avisos sonoros, inventario de cuentas, entregas, devoluciones de saldo y clientes.
- **Respaldos:** exportación del catálogo y sus imágenes. Para clientes, saldos y ventas, exporta SQL desde GoDaddy y conserva la clave de cifrado por separado.

Los productos existentes conservan la venta por WhatsApp hasta que elijas entrega manual o automática. En modalidad automática, el stock coincide con las cuentas disponibles. Las ventas por WhatsApp requieren marcar manualmente la cuenta vendida.

## Vista local del catálogo

Con Node.js instalado, haz doble clic en `INICIAR-TIENDA.cmd` y abre http://127.0.0.1:4173/ o http://127.0.0.1:4173/admin. Este modo se limita a este equipo y guarda el catálogo en archivos; no necesita MySQL. No expongas este modo local a Internet.

Las funciones de billetera y venta requieren el servidor protegido y MySQL: no funcionan con un servidor de archivos estáticos ni en el modo de catálogo local. En GoDaddy se instalan las dependencias de `package-lock.json` y se usa `npm start`.

## Datos y respaldos

En GoDaddy, catálogo, imágenes subidas, clientes y ventas se guardan en MySQL, separados por `SHOP_CATALOG_ID`. El disco de la aplicación no se utiliza como almacén persistente de ventas. Al actualizar no se restauran productos iniciales automáticamente.

En el modo de catálogo local, conserva `js/catalog.js`, `uploads` y `.backups`. Las compras reales deben usar el modo MySQL del alojamiento.

La guía **CLIENTES-Y-VENTAS.md** explica los límites, recuperación de acceso, respaldos y prueba antes de publicar. **SUBIR-A-GODADDY.md** resume la configuración del servidor.

## Usuarios (1.3.5)

En Ventas → Clientes puedes crear usuarios, suspender/reactivar y eliminar de forma recuperable. El filtro Eliminados permite restaurarlos sin perder saldo ni compras. En el acceso de clientes aparece Registrarse y se confirma la contraseña. Consulta CLIENTES-Y-VENTAS.md para los pasos.

## Recuperación asistida (1.3.5)

Ventas → Clientes permite consultar y copiar el código vigente de cada cliente. Las cuentas antiguas ofrecen generar un código nuevo de forma explícita. En Olvidé mi contraseña hay un botón de soporte a WhatsApp +51 929 688 960 con el mensaje preparado. Los códigos nuevos se guardan cifrados en MySQL y se actualizan cuando se recupera la contraseña.

## Cuentas vendidas, soporte y WhatsApp (1.3.6)

Puedes editar cuentas vendidas en Inventario y en Pedidos, incluidas las entregas manuales. Los datos corregidos llegan al comprador sin cambiar stock ni cobros. El cliente puede reportar fallas y consultar tu respuesta; atiéndelas en Ventas → Reportes. El panel avisa de nuevos reportes y puede emitir sonido al activarlo. El botón Comprar por WhatsApp destaca en verde con icono. Los reportes se guardan en MySQL y se incluyen en la exportación SQL; conserva las mismas claves y el identificador del catálogo.

## Tablas de administración (1.3.7)

Recargas, Pedidos, Clientes y Reportes ahora usan tablas con el estilo de Inventario, búsqueda, filtros, paginación y acciones por fila. Incluyen encabezados fijos y desplazamiento horizontal para celulares. Los formularios de revisión, entrega y respuesta se despliegan en la fila correspondiente. No requiere cambiar secretos ni importar SQL.
