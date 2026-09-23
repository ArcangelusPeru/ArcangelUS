# Yape automático · piloto 1.4.1

La app privada **Arcangel · Yape** se instala en el Android del dueño, donde llegan los pagos. Los clientes usan **Mi cuenta → Mi billetera → PAGOS EN AUTOMÁTICO SOLO PARA YAPE**. No necesitan instalar una app.

## Qué está listo y qué falta comprobar

El servidor, la billetera, el panel y la APK están preparados. Se verificaron pagos simulados, permisos, firmas, reintentos, concurrencia y persistencia en MySQL. La APK está compilada y firmada, pero todavía no se ha instalado ni probado con una notificación real en tu teléfono. **Mantén el método desactivado hasta completar la prueba indicada abajo.**

Esta es una integración privada basada en notificaciones; no es una API oficial ni una confirmación bancaria consultada directamente a Yape. El primer nombre y el código de tres dígitos no identifican por sí solos una transacción de forma única. Se comparan además monto y ventana de tiempo, se limitan los intentos y los casos ambiguos requieren revisión del dueño. Nunca prometas aprobación garantizada ni instantánea.

## 1. Actualizar GoDaddy

1. Descarga un respaldo del catálogo desde tu panel y exporta también la base MySQL desde **GoDaddy → Base de datos → Exportar SQL**. El respaldo de catálogo no contiene billeteras, pagos ni clientes.
2. Descomprime **arcangel-us-actualizacion-yape-v1.4.1.zip**. Actualiza el código de tu repositorio/proyecto con **todo su contenido**, conservando la misma estructura de carpetas. No subas la APK a GoDaddy.
3. Mantén los secretos existentes: `DB_*`, `COMMERCE_ENABLED=true`, `COMMERCE_KEY`, `ADMIN_PASSWORD` y el `SHOP_CATALOG_ID` de producción. **No cambies COMMERCE_KEY ni el identificador del catálogo.**
4. Configura `APP_URL=https://arcangelpro.com` en el entorno publicado. Es necesario para generar una vinculación HTTPS. Genera el código desde **https://arcangelpro.com/admin**. La vista previa privada de GoDaddy requiere iniciar sesión; Android no comparte la sesión de tu navegador y puede quedar bloqueado antes de llegar a la tienda. No uses ese entorno para vincular el teléfono receptor.
5. Publica la actualización usando el mismo flujo de GoDaddy que ya utiliza la tienda. El arranque crea las tablas nuevas; no importes un SQL vacío ni inicialices nuevamente el catálogo.
6. Verifica la tienda y entra a `/admin → Ventas → Yape automático`. El método empieza desactivado y se conserva así hasta que tú lo actives.

El ZIP no incluye catálogo, imágenes, datos de clientes, tokens, credenciales de prueba ni una app de demostración. Conserva las imágenes y demás archivos ya presentes en tu proyecto; este ZIP es una actualización, no una instalación vacía. Los cambios de Mercado Pago que estaban en preparación permanecen apagados mientras no se configure `MP_ENABLED`; no los actives con esta guía.

## 2. Instalar y vincular el Android

1. Copia **Arcangel-Yape-piloto-v0.1.1.apk** a tu Android (Android 8 o posterior) e instálala. Si tienes la versión anterior, actualiza sobre ella, sin desinstalar ni borrar datos, para conservar la vinculación y los pagos pendientes. Es una app privada del proyecto, no está publicada en Google Play.
2. En **Configurar web**, confirma que el QR configurado corresponde a tu Yape y que el titular es correcto. Este QR también es el que utiliza la revisión manual existente.
3. En **Ventas → Yape automático → Vincular mi celular Android**, introduce el número real que recibe los pagos, de 9 dígitos, y genera el código de vinculación.
4. Pégalo en la app y pulsa **Vincular mi tienda**. El código permite enviar notificaciones de pago: consérvalo privado y no lo compartas con clientes. Se guarda cifrado en Android y en el servidor. Nunca introduzcas tu contraseña de Yape.
5. Pulsa **Abrir permiso de notificaciones** y autoriza personalmente el acceso para Arcangel. Android concede un permiso amplio; el código de la app filtra exclusivamente notificaciones de pagos entrantes del paquete oficial de Yape Perú. No usa Accesibilidad ni lee SMS, contactos, capturas o notificaciones de otras apps.
6. Si Android muestra una restricción para apps instaladas fuera de Play, revisa la información de seguridad del sistema. No se concede ni se intenta saltar ningún permiso automáticamente.
7. Abre Yape y deja activadas sus notificaciones de pagos. Mantén hora automática, conexión y batería. Si tu fabricante limita procesos en segundo plano, verifica sus ajustes de batería para esta app.

Solo un catálogo de la misma base de datos puede vincular un número receptor. Usa **producción** para dinero real. No conectes el mismo teléfono a otra base de datos independiente: esa segunda base no comparte la protección contra duplicados. Si reinstalas o rotas la vinculación, utiliza el mismo número real. La nueva vinculación desactiva automáticamente el método.

## 3. Prueba real antes de activar

### Si el número quedó vinculado a vista previa

1. Actualiza el proyecto con el ZIP 1.4.1 y pulsa **Actualizar vista previa**. Conserva los secretos de cada entorno: especialmente `SHOP_CATALOG_ID` y `COMMERCE_KEY`.
2. Entra al **panel de vista previa → Ventas → Yape automático**. Abre **Liberar número de este catálogo**, escribe el número receptor, revisa la casilla y pulsa **Liberar número**. Hazlo en el catálogo donde creaste la primera vinculación, no en el publicado donde aparece el error.
3. Si hay solicitudes pendientes, vencidas o por revisar, el servidor impide liberar el número hasta que las atiendas. Comprueba en Yape los ingresos reales; no rechaces pagos solo para desbloquear el botón. Revisa también la cola de la app: si tiene notificaciones pendientes, no borres ni reinstales la app para sortear el bloqueo.
4. Publica la versión actualizada. En **Secretos → Publicar**, `APP_URL` debe ser `https://arcangelpro.com`. Guarda y reinicia la aplicación publicada si cambiaste ese valor.
5. Abre **https://arcangelpro.com/admin → Ventas → Yape automático** y genera un código nuevo para el mismo número. Pégalo en la APK y comprueba la conexión.

Liberar el número elimina únicamente su vinculación en ese catálogo. No borra clientes, saldos, movimientos ni notificaciones recibidas; tampoco los mueve entre catálogos. La protección compartida contra pagos duplicados permanece. El código anterior deja de funcionar y el método nuevo permanece desactivado hasta verificar la conexión y un pago reconocido.

### Comprobación en el celular

1. Con la app vinculada pero el método aún desactivado, recibe un pago pequeño y comprueba el ingreso directamente en los movimientos de Yape.
2. Debe aparecer en **Notificaciones recibidas** con el primer nombre y el importe exactos. El estado del celular debe indicar **conectado**. El formato probado es: `Willy Col* te envió un pago por S/15. El cód. de seguridad es: 812`.
3. Marca la casilla de comprobación y activa el método en el panel. La activación exige conexión reciente y al menos un pago reconocido desde la última vinculación.
4. Con un usuario de prueba de la tienda, inicia una nueva recarga y después realiza otro pago pequeño. El pago anterior no sirve para esta solicitud.
5. Introduce el primer nombre del pagador tal como aparece en Yape y el código de seguridad del comprobante de pago. No es el código para iniciar sesión, solicitar crédito ni recuperar Yape.
6. Comprueba el saldo, el movimiento y el estado acreditado en el panel. Actualiza la página para verificar que no se duplique. Reinicia la web y comprueba que ambos se conservan.
7. Desconecta temporalmente internet en el teléfono y verifica que la tienda deje de ofrecer validación automática tras aproximadamente tres minutos. Reconecta y pulsa Sincronizar. Comprueba también con la pantalla bloqueada y después de reiniciar el Android.

## Cómo funciona para clientes

- Primero se inicia una solicitud con el monto, entre **S/ 1 y S/ 100**. Este límite inicial limita la exposición durante el piloto; el historial no tiene un tope artificial de registros.
- Se muestra el QR y hay **15 minutos** para pagar y validar.
- La tienda compara nombre, importe y código con una notificación firmada enviada por el teléfono. No confía en capturas ni en lo que el cliente declara como evidencia de pago.
- Cada solicitud permite 3 intentos. Hay además un límite compartido por nombre e importe para frenar intentos desde distintas cuentas.
- Un pago utilizado no se vuelve a acreditar. Si la app repite una notificación con otra identidad, se retiene como posible duplicado. Dos pagos con el mismo primer nombre, importe y código en el mismo día pueden requerir soporte.
- Si no llega la notificación, falla el formato o hay ambigüedad, el cliente debe contactar soporte **sin volver a pagar**. Plin continúa por revisión manual.

## Panel e historial

**Ventas → Yape automático** muestra conexión, activación, pagos recibidos, solicitudes y conciliación manual. Para resolver una solicitud, verifica los movimientos reales en Yape, selecciona la referencia de una notificación disponible por el mismo importe y acredita desde esta sección. No apruebes además otra solicitud manual por el mismo pago.

Las solicitudes que necesitan revisión generan avisos en el panel; el sonido requiere pulsar **Activar sonido** y mantener el panel abierto. El historial usa páginas de 100 registros y puede exportarse por página como CSV compatible con Excel. MySQL es la fuente de verdad; editar un CSV no cambia saldos.

Los textos originales y las claves del teléfono se guardan cifrados con `COMMERCE_KEY`; el historial mantiene los campos mínimos para conciliación. Protege y respalda esa clave y la base MySQL. Los registros no se borran automáticamente, pero el espacio disponible depende del plan de GoDaddy: **no es almacenamiento ilimitado**.

## Fallos y límites del piloto

- Al pulsar **Vincular mi tienda**, el campo se vacía después de guardar el código por privacidad. Eso no confirma conexión. La versión 0.1.1 muestra la tienda configurada y el estado junto al botón. **Conectado a la tienda. Falta activar el acceso a notificaciones** indica que el servidor respondió pero todavía falta el permiso; **Conectado. Escuchando pagos de Yape** confirma ambos pasos.
- Si la tienda configurada es una dirección de vista previa, genera la vinculación en la tienda publicada. Si el panel indica que el número ya está vinculado a otro catálogo, sigue los pasos de **Liberar número** de esta guía. Conserva `SHOP_CATALOG_ID` y `COMMERCE_KEY`.
- La app reintenta al recuperar conexión y conserva la cola local cifrada. Puedes consultar **Ver notificaciones no enviadas**; las demasiado antiguas se retienen para revisión.
- Los pagos anteriores a una solicitud no se acreditan automáticamente. Un teléfono con la hora incorrecta puede impedir la validación. No reenvíes notificaciones editadas.
- Un cambio de formato de Yape requiere actualizar el reconocimiento. No hay extracción de datos desde la pantalla ni simulación de notificaciones en producción.
- Las restricciones de Android pueden suspender el lector. El estado de conexión evita iniciar pagos cuando no se ha recibido señal reciente, pero no garantiza que llegue cada notificación.
- No hay conciliación automática de devoluciones, reversos o movimientos que Yape no notifique. El dueño debe conciliar periódicamente con sus movimientos reales.
- La seguridad depende de que tu teléfono, la clave privada y el panel no estén comprometidos. La firma autentica tu app receptora; no es una firma bancaria de Yape.

## Material técnico

Servidor: `yape-store.mjs`, rutas `/api/yape/device` y `/api/shop/yape/*`; controles del dueño bajo `/api/admin/commerce/yape/*`. App: código fuente en el ZIP independiente `arcangel-yape-android-fuentes-v0.1.1.zip`. No contiene claves de firma ni credenciales.

La clave de firma de la APK se conserva localmente en `work/yape-signing-private` en este proyecto. Necesitarás esa misma clave para instalar futuras actualizaciones sobre la app; no la subas al repositorio público ni a GoDaddy.

Fuentes oficiales consultadas:

- https://www.yape.com.pe/preguntas-frecuentes/yape-negocios/como-puedo-verificar-que-he-recibido-un-pago-por-yape
- https://developer.android.com/reference/android/service/notification/NotificationListenerService
- https://play.google.com/store/apps/details?id=com.bcp.innovacxion.yapeapp
