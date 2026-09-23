# Arcangel US 1.5.1 · Altavoz de Yape

Archivo completo: **arcangel-us-godaddy-v1.5.1.zip**.

Incluye las funciones de 1.5.0 (Dashboard, Pagos y Reportes) y el nuevo **Altavoz de Yape**, disponible en todas las secciones del panel del dueño.

## Cómo utilizarlo

1. Abre `/admin`, inicia sesión y pulsa **Activar altavoz** en la tarjeta **Altavoz de Yape**.
2. Comprueba el volumen con **Probar con código** o **Probar sin código**. Estas pruebas leen ejemplos ficticios; no crean pagos ni recargas.
3. Mantén el panel abierto y el equipo despierto. Consulta los nuevos avisos cada 10 segundos y los lee uno por uno. Un navegador suspendido o cerrado no puede anunciar pagos.
4. Puedes cambiar de sección sin desactivar la voz. Para detenerla, pulsa **Altavoz activado · silenciar**. Al recargar la página o volver a iniciar sesión debes activarla otra vez. Usa una sola pestaña con altavoz para evitar escuchar avisos desde varias ventanas.

Ejemplo con código: «Lucía Demo te envió un pago por 8 soles. El código de seguridad es: cero, tres, ocho».

Ejemplo sin código: «Ana Demo te envió un pago por 15 soles con 50 céntimos. Este pago no tiene código de seguridad».

El altavoz lee avisos nuevos después de activarlo; no reproduce todo el historial. Mantiene el orden de recepción en el servidor y evita repetir el mismo aviso en la sesión, incluso al actualizar su estado. Si el teléfono envía una notificación atrasada, se trata como una nueva llegada al panel. Los avisos no descifrables se anuncian sin inventar nombre, monto o código.

La voz usa las voces disponibles en el navegador y sistema. Si no se reproduce, el panel muestra el fallo: prueba Chrome o Edge con una voz en español instalada y el volumen habilitado. No requiere una suscripción ni otra APK.

## Subir a GoDaddy

1. Conserva tu aplicación existente, MySQL y sus secretos actuales, especialmente `SHOP_CATALOG_ID`, `COMMERCE_KEY`, `ADMIN_PASSWORD` y `APP_URL`.
2. Sube el **ZIP completo v1.5.1** si GoDaddy ofrece carga de ZIP. Para carga de carpeta o repositorio, descomprime y coloca su contenido en la raíz del proyecto. `package.json` queda junto a `start.cjs`; conserva las carpetas internas.
3. Pulsa **Actualizar vista previa**. Mantén Node.js 22, compilación `npm run build` e inicio `npm start`. Los registros deben mostrar **Arcangel US 1.5.1**.
4. Comprueba los botones de prueba en `/admin`. Después pulsa **Publicar como activo** y abre **https://arcangelpro.com/admin**. Si aún aparece el panel anterior, recarga con Ctrl+F5.

No hay nuevos secretos, migraciones SQL manuales ni cambios de vinculación del teléfono. El altavoz no aprueba pagos ni modifica saldos. Los datos existentes siguen en su catálogo MySQL. El paquete no contiene los datos ficticios de la demo ni una copia de tus clientes o pagos reales.

El ZIP pequeño **arcangel-us-actualizacion-yape-v1.5.1.zip** es solo para aplicar sus archivos sobre un proyecto completo existente. Para volver a cargar todo el proyecto, usa el ZIP completo.
