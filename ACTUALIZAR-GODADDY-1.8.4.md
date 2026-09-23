# Arcangel US 1.8.4 — Detalles de las cuentas compradas

## Cambios

- «Ver detalles» abre una ficha con logo y plataforma, contacto de soporte, fechas, duración, estado, tipo de servicio, renovación e importe.
- Correo, contraseña, perfil y PIN tienen botones individuales para copiar. La contraseña se puede mostrar u ocultar.
- «Copiar toda la información» conserva el formato de entrega con la advertencia, nombre de plataforma, correo, contraseña, perfil y PIN.
- Las instrucciones y el enlace de acceso se muestran cuando la cuenta los incluye.
- Se mantienen los reportes, el reemplazo de cuenta y la renovación habilitada por el dueño. No se activan renovaciones automáticas ni cobros recurrentes.
- La ficha se adapta a celulares y permite desplazarse para consultar toda la información.

## Subir a GoDaddy

1. Conserva un respaldo de la base de datos antes de actualizar.
2. Sube **arcangel-us-godaddy-v1.8.4.zip** mediante Actualizar vista previa. Si pide una carpeta, descomprime el ZIP y selecciona la carpeta con `package.json` y `start.cjs` en el primer nivel.
3. Mantén los secretos actuales, especialmente `SHOP_CATALOG_ID` y `COMMERCE_KEY`. No generes otra clave ni restaures el catálogo inicial.
4. Prueba «Ver detalles» en una cuenta de prueba y luego publica como activo.

Esta versión incluye los cambios anteriores. El paquete no contiene usuarios, saldos ni credenciales ficticias de la demo.
