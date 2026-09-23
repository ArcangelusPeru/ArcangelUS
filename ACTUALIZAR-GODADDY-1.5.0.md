# Actualizar Arcangel US a 1.5.0

Usa **arcangel-us-godaddy-v1.5.0.zip** para subir el proyecto completo a tu aplicación existente de GoDaddy.

## Qué incluye

En el menú del dueño aparece **Notificaciones Yape**, con tres apartados:

- **Dashboard:** cantidad de avisos e importe notificado total, hoy, semana, mes y año; gráfico de 14 días y últimos pagos.
- **Pagos (Yapeos):** tabla con remitente, monto, código, mensaje, fecha, hora y estado. Búsqueda por nombre/código/mensaje/referencia y filtros de monto, estado y fechas; paginación y exportación CSV compatible con Excel.
- **Reportes:** resumen de importes, promedio, máximo y mínimo; gráficos por mes, día y estado, con los mismos filtros.

También presenta el nombre y monto de notificaciones sin código cuando el texto recibido tiene el formato reconocido de Yape. Se muestran como **Sin código · revisar**. Consultar estos datos no aprueba recargas ni cambia saldos. Los importes representan avisos recibidos; los posibles duplicados y montos no reconocidos quedan fuera de las sumas.

Las fechas usan la hora de Perú. Los filtros y totales consultan el historial completo de ese catálogo. Cada CSV admite hasta 10 000 registros; para cantidades mayores, exporta por intervalos de fechas. Usa **Actualizar datos** para consultar nuevos avisos.

## Cómo subirlo

1. En tu aplicación **ArcangelUSperu**, conserva la base MySQL y los secretos actuales de cada entorno, especialmente `SHOP_CATALOG_ID`, `COMMERCE_KEY`, `ADMIN_PASSWORD` y `APP_URL`. Esta actualización no necesita nuevos secretos ni importar SQL.
2. Si GoDaddy permite cargar un ZIP del proyecto, selecciona el ZIP completo. Si usas carga de carpeta o el repositorio conectado, descomprímelo y reemplaza el contenido del proyecto con los archivos del ZIP. `package.json` y `start.cjs` deben quedar en la raíz, conservando las carpetas internas.
3. Pulsa **Actualizar vista previa**. Mantén Node.js 22, compilación `npm run build` e inicio `npm start`. Comprueba que los registros muestren **Arcangel US 1.5.0**.
4. Entra al `/admin` de vista previa y comprueba el menú **Notificaciones Yape**. Puede estar vacío si ese catálogo de pruebas no recibió notificaciones.
5. Pulsa **Publicar como activo** y entra a **https://arcangelpro.com/admin**. Abre **Notificaciones Yape**. Si aparece la interfaz anterior, recarga con Ctrl+F5.

Los registros existentes se leen de MySQL; no se reemplazan con datos de demostración. No inicialices de nuevo el catálogo. El ZIP no contiene los clientes, saldos ni pagos de producción; para respaldarlos utiliza **Exportar SQL** en GoDaddy.

## Aplicación Android

Esta actualización del panel no requiere instalar otra APK. Conserva la versión 0.1.5 si ya la tienes instalada para captar avisos con y sin código. No necesitas volver a vincular el celular si sigue conectado a la tienda publicada.

El archivo pequeño **arcangel-us-actualizacion-yape-v1.5.0.zip** sirve únicamente para reemplazar código dentro de un proyecto completo existente. Para una carga completa o desde cero, utiliza el ZIP grande indicado al inicio.
