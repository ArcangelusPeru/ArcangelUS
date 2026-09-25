# Actualización 1.11.0 — Cupones

- Panel administrativo: sección Cupones para crear descuentos porcentuales y regalos de saldo, generar códigos y desactivarlos.
- Cada cupón tiene cantidad máxima de canjes y vencimiento con hora de Perú. Cada cliente puede canjearlo una vez.
- Los descuentos aplican a todos los productos comprables con saldo, excluyendo compras por WhatsApp. Se calculan sobre el precio del rol del cliente.
- El cliente introduce el código antes de confirmar su compra. Los regalos se canjean desde su billetera.
- El servidor valida vencimiento, disponibilidad, usuario y límites dentro de transacciones. El importe realmente pagado queda registrado para calcular devoluciones.
- Las tablas de cupones se crean automáticamente al arrancar con la base de datos configurada. No se requieren secretos adicionales.

Publicación: actualizar el proyecto completo conservando los secretos y la base de datos de producción. No subir archivos de work ni datos de la demo.

Tutoriales: el administrador puede publicar títulos y videos MP4/WebM de hasta 300 MB. Los clientes autenticados los ven encima de Mi cuenta. Los archivos se guardan en MySQL en fragmentos; el alojamiento puede imponer límites adicionales de carga y memoria. Los respaldos de catálogo no incluyen los tutoriales: conservar también un respaldo de la base de datos.

Confirmar compra: diseño de dos columnas con imagen, cupón, total y botón rojo. Imagen con altura de 152 px.

Validación: compilación/sintaxis completa, pruebas de concurrencia del último canje, repetición de compra sin doble canje, regalo de saldo, descuentos de 50% y 100%, cupones vencidos y desactivados. Verificación visual en demo: NETFLIX20 cambia S/30 a S/24.
