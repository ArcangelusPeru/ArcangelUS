# Actualización Arcangel US v1.9.6

Esta actualización corrige el importe mostrado en **Ventas realizadas**.

- Cada renovación aprobada queda asociada a su compra original.
- El panel muestra el **Importe total**, sumando la compra y las renovaciones.
- La tabla indica cuánto corresponde a renovaciones.
- Se incluye una migración compatible para bases de datos existentes.
- Las renovaciones antiguas se vinculan solo cuando existe una única compra compatible; los casos ambiguos quedan sin asignar para evitar errores.
- Se actualiza la caché de los recursos a `v1.9.6`.

Validación local:

- Comprobación de sintaxis completa aprobada.
- Prueba de reemplazo y renovación aprobada.
- La demo mostró una compra de S/ 8.00 con una renovación de S/ 8.00 como importe total de S/ 16.00.

En GoDaddy: actualiza la vista previa, espera el estado **Saludable** y publica como activo.
