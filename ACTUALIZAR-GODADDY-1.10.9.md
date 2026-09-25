# Arcangel US · 1.10.9

- Ventas realizadas desglosa compra, renovaciones aprobadas y reemplazo por caída (S/0). El reemplazo no modifica dinero ni crea movimientos de renovación.
- Los reemplazos conservan el inicio y vencimiento de la cuenta comprada, incluyendo el plazo renovado.
- Devolver saldo se sustituye por Calcular devolución. Se muestran total pagado, días usados y pendientes, descuento por uso y saldo que se devolverá a la billetera.
- Cada período nuevo de compra o renovación conserva el precio y las fechas pagadas; los días sin servicio entre vencimiento y renovación no se cobran otra vez. Para ventas anteriores sin ese registro se usan el importe pagado y las fechas de servicio guardadas.
- Las cuentas sin días restantes tienen devolución cero. Si faltan fechas suficientes, el panel solicita revisarlas antes de devolver saldo.
- El servidor recalcula el importe al confirmar, rechaza cálculos desactualizados y evita abonos duplicados.

Publica la carpeta completa de la aplicación, incluido refunds.mjs, y reinicia el servidor. La migración de billing_periods es automática y conserva los registros existentes.
