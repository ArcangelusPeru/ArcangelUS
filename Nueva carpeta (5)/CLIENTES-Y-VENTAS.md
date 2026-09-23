# Arcangel US 1.3.7 · Clientes, billetera y ventas

Esta actualización mantiene tu tienda, logo y colores. Añade acceso de clientes, saldo en soles, recargas verificadas por ti, compras y entrega de cuentas. El dueño sigue usando su panel protegido en `/admin`.

## 1. Qué archivo subir

Si tu proyecto actual ya funciona con MySQL (versión 1.2.0 o posterior), usa **arcangel-us-actualizacion-ventas-v1.3.7.zip**:

1. En GoDaddy, entra a **Base de datos → Exportar SQL** y guarda una copia antes de actualizar. Descarga también el respaldo del catálogo desde tu panel.
2. Descomprime el ZIP pequeño en tu equipo.
3. En tu repositorio actual de GitHub, reemplaza los archivos correspondientes y añade las carpetas nuevas. Mantén los archivos dentro de `admin`, `cuenta`, `css` y `js`; no los dejes todos juntos en la raíz. No subas el ZIP como si fuera código.
4. Conserva el resto del proyecto: imágenes, logos, banners, `js/catalog.js`, `.npmrc` y cualquier configuración de GoDaddy que ya tengas. Este ZIP pequeño contiene código y guía; por sí solo no es una tienda completa.
5. En GoDaddy pulsa **Actualizar vista previa**. Usa `npm run build` para compilar y `npm start` para iniciar, con Node.js 22. El comando `npm run dev` también está incluido.
6. Activa y prueba las funciones como se explica abajo. Después pulsa **Publicar como activo**.

Si GoDaddy te pide reemplazar la carpeta completa de la aplicación, usa **arcangel-us-godaddy-v1.3.7.zip**, que incluye las imágenes originales del proyecto. Conserva también las imágenes estáticas personalizadas que hayas añadido por fuera del panel. No uses el ZIP pequeño como una aplicación nueva.

Actualizar el código no reemplaza tu catálogo MySQL. **Conserva los valores actuales de `SHOP_CATALOG_ID`**: cambiarlos hace que se vea otro catálogo. No elijas «Usar catálogo inicial» para actualizar una tienda que ya tiene productos.

Si ya activaste clientes y ventas en una versión 1.3 anterior, conserva tus secretos existentes. Esta actualización no requiere generar otra clave ni reiniciar el catálogo.

## 2. Activar clientes y compras

Las funciones nuevas están apagadas hasta configurarlas. La tienda y las compras por WhatsApp continúan disponibles.

En **Configuración → Secretos** añade:

| Nombre | Valor |
| --- | --- |
| `COMMERCE_ENABLED` | `true` |
| `COMMERCE_KEY` | La clave aleatoria generada en el siguiente paso. |

### Crear la clave una sola vez

En tu equipo, haz doble clic en **GENERAR-CLAVE-VENTAS.cmd**. Se abrirá una ventana con una clave. Copia la línea completa como valor de `COMMERCE_KEY` y guarda otra copia privada en tu gestor de contraseñas. Si usas una terminal, puedes ejecutar `node generate-commerce-key.cjs`.

Esta clave cifra los datos de las cuentas que vendes. **No es la contraseña para entrar al panel. No la publiques en GitHub, no la compartas con clientes y no la cambies al actualizar.** Si se pierde, el respaldo SQL no basta para leer esas entregas. Si introduces otra clave por error, la aplicación se detiene con un mensaje y debes reponer la original.

Mantén `ADMIN_PASSWORD`, las variables `DB_*` de GoDaddy y `SHOP_CATALOG_ID`. Tu contraseña de administrador actual sigue siendo la misma. No crees una cuenta de cliente esperando que sea administradora: el registro público solo crea clientes.

Prueba primero en Vista previa, con su catálogo `pruebas`. Las cuentas, billeteras y pedidos también están separados del catálogo `publicado`. Configura los dos secretos en cada entorno que quieras activar. Puedes usar una clave distinta por entorno, conservando cada una. Nunca cambies una clave que ya tenga ventas o inventario guardados.

Tras guardar los secretos, reinicia **la aplicación del entorno que configuraste**. Para el dominio público es «Reiniciar aplicación publicada». Si `APP_URL` está configurado, debe coincidir con la dirección de ese entorno; para la tienda pública es `https://arcangelpro.com`.

## 3. Preparar tu panel

Entra en **https://arcangelpro.com/admin** con tu contraseña de dueño.

### Configurar recargas

En **Configurar web → WhatsApp y pagos → QR para recargar saldo**, sube tu QR real de Yape o Plin y guarda la configuración. Puedes escribir el titular que se mostrará junto a la imagen. No se incluye un QR de pago real en el paquete; lo cargas tú desde este apartado.

El cliente solo verá el QR, el campo **Monto que pagaste** y el botón **Solicitar revisión**. No debe escribir fecha, código de operación, nombre del remitente ni elegir medio de pago. Su correo de cliente y la hora de solicitud se registran automáticamente. Las recargas quedan deshabilitadas hasta que subas el QR.

### Elegir cómo se compra cada producto

En **Productos → Editar → Canales de venta**, marca los botones que quieras mostrar:

- **COMPRAR ACÁ:** compra con saldo y entrega automática de una cuenta del inventario.
- **COMPRAR POR WHATSAPP:** contacto directo para comprar por WhatsApp.

Puedes habilitar uno, ambos o ninguno. La misma selección se aplica en las tarjetas y en «Ver más». La entrega manual fue retirada. Las ventas anteriores se conservan en **Ventas → Ventas realizadas**, con edición de cuentas vendidas y devolución de saldo.

### Cargar cuentas y controlar stock

En **Ventas → Inventario de cuentas**, la tabla muestra el logo del producto, correo, perfil, PIN, URL, fecha y estado de cada cuenta. Busca por correo/usuario/perfil o filtra por producto y estado. Se consultan hasta las últimas 500 cuentas y puedes ver 25, 50 o 100 por página. El botón **Ver** de la columna Clave muestra la contraseña de esa fila. **Gestionar** permite consultar instrucciones, **Editar cuenta**, marcar ventas por WhatsApp o retirar una cuenta disponible. La edición permite cambiar correo, clave, URL, perfil, PIN, instrucciones y fechas. Guarda los cambios o pulsa **Cancelar edición**. Puedes editar cuentas disponibles, vendidas en la tienda y vendidas por WhatsApp. Si están vendidas aquí y el pedido sigue entregado, los cambios se reflejan en Mis cuentas y compras del comprador. No modifica stock, importes ni saldos. Las cuentas retiradas no se editan. Si cambia el estado o alguien guarda otros datos mientras tienes abierto el editor, vuelve a abrir la cuenta antes de corregirla.

En **Productos → Editar → Logo de la plataforma** puedes subir un logo específico; si queda vacío, se usa la imagen del producto. Los logos subidos desde el panel quedan incluidos en el respaldo del catálogo.

Para cargar cuentas, abre **Agregar cuentas al inventario**, situado arriba de **Gestionar cuentas**, y elige el producto al que se añadirán. Puedes cargar una cuenta con campos separados de usuario/correo/licencia, contraseña, URL, perfil, PIN e instrucciones. Las fechas de inicio y término son opcionales y se muestran al comprador. Si no las completas, aparecen como «Sin definir»; no se calcula un vencimiento a partir del nombre del producto. Para vender perfiles de la misma cuenta, carga una fila por perfil con su identificación correcta.

También puedes desplegar «Cargar varias cuentas a la vez», hasta 200 por carga:

```text
usuario | contraseña | instrucciones
usuario | contraseña | instrucciones | URL | perfil | PIN
```

No uses `|` dentro de los campos. Si la contraseña contiene ese carácter o espacios al comienzo/final, utiliza el formulario de una sola cuenta.

Cada unidad disponible se entrega una sola vez. El stock se marca agotado cuando queda en cero. Para una venta por WhatsApp, usa «Vendida por WhatsApp» en esa cuenta; abrir WhatsApp no descuenta stock por sí mismo. «Retirar del inventario» quita una unidad disponible. Para corregir los datos de una cuenta disponible o vendida, usa **Gestionar → Editar cuenta**. Una cuenta vendida permanece vendida después de editarla. Los datos privados se muestran solo al pulsar «Ver datos» dentro del panel.

### Revisar recargas

1. El cliente escanea tu QR, paga e introduce únicamente el importe. Pulsa **Solicitar revisión**. Solo puede tener una solicitud pendiente a la vez.
2. El panel muestra un aviso con las solicitudes pendientes. En **Ventas → Recargas**, comprueba que el dinero realmente llegó a tu aplicación de pagos y que corresponde al cliente e importe.
3. Marca «Verifiqué el ingreso y el importe» y pulsa **Aprobar**, o rechaza si no corresponde.

Solicitar revisión no aumenta el saldo. La aprobación lo acredita una sola vez, aunque se repita la petición por un fallo de conexión. Cada solicitud lleva un identificador interno; como no se solicita código de operación del pago, tú debes comprobar qué ingreso corresponde a cada cliente y evitar aprobar dos solicitudes por el mismo pago. No hay verificación automática de Yape/Plin ni subida de comprobantes.

### Activar el aviso sonoro

Al abrir tu panel, pulsa **Activar sonido** en la franja de recargas. Escucharás una señal de prueba. Después sonará al detectarse una nueva solicitud, estés en Productos, Configurar web o Ventas. El panel consulta novedades cada 10 segundos; no interrumpe formularios ni borra lo que estés editando. Pulsa **Revisar solicitudes** para ir a Recargas.

El navegador exige un clic para habilitar el audio: actívalo de nuevo si recargas la página o vuelves a iniciar sesión. El aviso incluye también reportes de cuentas: pulsa **Revisar reportes** para atenderlos. Mantén el panel abierto, el equipo despierto y la pestaña sin silenciar. Con el navegador cerrado o suspendido no puede sonar; las solicitudes sí quedan guardadas y se muestran cuando vuelvas. Una pestaña en segundo plano puede demorar el aviso si el navegador limita su actividad. No envía notificaciones del sistema ni sonidos fuera del navegador.

### Crear y administrar usuarios

En **Ventas → Clientes**:

1. Abre **Crear usuario**, escribe correo, contraseña (12 caracteres como mínimo) y repite la contraseña.
2. Pulsa **Crear usuario**. El cliente empieza con **S/ 0.00** y puede entrar desde `/cuenta` con esos datos. Nunca recibe acceso al panel del dueño.
3. Guarda el **código de recuperación** que aparece al crear el usuario. Puedes descargarlo o volver a consultarlo desde **Código de recuperación** en la fila del cliente; entrégalo de forma privada al cliente junto con la contraseña que elegiste. La tienda no envía estos datos por correo automáticamente.
4. **Suspender** cierra sus sesiones e impide iniciar sesión, recuperar acceso y usar su billetera. Conserva su saldo y compras. **Reactivar** permite iniciar sesión nuevamente.
5. **Eliminar usuario** pide escribir el correo para confirmar. Mueve al usuario a **Eliminados** y revoca su acceso. Es una eliminación recuperable: conserva saldo, pedidos e historial para que no se pierdan movimientos de la tienda. No borra definitivamente sus datos ni devuelve dinero automáticamente.
6. Para recuperarlo, selecciona **Estado del usuario → Eliminados** y pulsa **Restaurar suspendido**. Después puedes reactivarlo desde Suspendidos. Su correo permanece reservado mientras esté eliminado: no se crea una segunda cuenta con ese correo.

Los pedidos y recargas de usuarios suspendidos o eliminados siguen visibles para el dueño. Los contadores muestran el total de cada estado; la tabla muestra hasta 200 coincidencias de la búsqueda.

La actualización añade automáticamente el campo necesario en MySQL al iniciar, conservando los usuarios actuales. No hace falta importar SQL ni cambiar `COMMERCE_KEY`, `SHOP_CATALOG_ID` o la contraseña del dueño. Prueba primero en Vista previa.

### Consultar códigos de recuperación (1.3.5)

En **Ventas → Clientes**, busca el correo y pulsa **Código de recuperación**. Verás el código vigente y **Copiar código**. Confirma que la persona sea el titular antes de entregárselo por soporte. Los clientes no tienen acceso a estos controles del dueño.

Los nuevos códigos se guardan cifrados en MySQL con la misma `COMMERCE_KEY`. Al restablecer una contraseña, el código anterior deja de servir y el panel permite consultar el nuevo. Consultar o copiar el código no cambia la contraseña ni cierra sesiones.

Las cuentas anteriores no tenían una copia recuperable del código. La actualización conserva su código anterior y no cambia accesos automáticamente. Su ficha mostrará **Generar nuevo código y reemplazar el anterior**: úsalo cuando necesiten asistencia. Ese paso invalida el código anterior, conserva contraseña, sesiones, saldo e historial, y deja el nuevo código disponible para copiar. Un usuario suspendido no puede recuperar acceso hasta reactivarlo; restaura un usuario eliminado antes de consultar su código.

La columna nueva se añade automáticamente al iniciar. Conserva `COMMERCE_KEY` y `SHOP_CATALOG_ID`, y no importes un catálogo inicial para instalar esta actualización.

### Pedidos y clientes

En **Ventas → Ventas realizadas**, las compras manuales quedan «Por entregar». Completa los datos y pulsa «Entregar al cliente». En **Ventas → Clientes** puedes buscar por correo, consultar saldo y filtrar usuarios activos, suspendidos o eliminados.

«Devolver saldo» acredita el importe de una compra en la billetera de la tienda. No envía dinero por Yape/Plin. Una cuenta ya entregada no se pone otra vez en venta; un pedido manual cancelado antes de la entrega repone la unidad reservada cuando corresponde.

Los avisos de recargas se actualizan automáticamente. Usa **Actualizar ventas** para renovar el detalle de solicitudes o pedidos. La lista muestra las últimas 200 recargas/pedidos, con pendientes primero; hasta 200 clientes por búsqueda y las últimas 500 unidades de cada producto. Los registros anteriores siguen en MySQL.

### Editar cuentas vendidas y entregas manuales (1.3.6)

- **Ventas → Inventario de cuentas → Gestionar → Editar cuenta:** permite corregir datos de cuentas vendidas aquí o por WhatsApp, además de las disponibles.
- **Ventas → Ventas realizadas → Editar cuenta vendida:** sirve para cuentas ya entregadas, incluidas entregas manuales. Puedes cambiar correo, contraseña, perfil, PIN, URL, instrucciones y fechas.
- El comprador recibe los datos actualizados en **Mis cuentas y compras** al pulsar **Actualizar**. **Ver** y **Copiar datos** solicitan la contraseña vigente al servidor. La edición desde Pedidos y desde Inventario mantiene ambas copias sincronizadas para ventas de la tienda.
- Editar no genera otra venta, no cambia el importe ni saldo y no devuelve la cuenta al stock. Los pedidos con saldo devuelto no se reabren ni vuelven a exponer la entrega al cliente.
- Si otra ventana editó o vendió la cuenta después de abrir el formulario, cancela y vuelve a abrirla para trabajar con los datos actuales.

### Atender reportes de fallas (1.3.6)

1. El cliente entra a **Mis cuentas y compras**, pulsa **Reportar cuenta** y describe el error. También puede hacerlo desde **Ver detalles**. Solo puede reportar compras propias entregadas y tener un reporte abierto por cuenta.
2. Aparece un aviso en el panel del dueño. Si activaste el sonido, el mismo aviso sonoro de las recargas se usa para nuevos reportes. Pulsa **Revisar reportes** o entra a **Ventas → Reportes**.
3. Verás cliente, producto, correo de la cuenta, número de pedido y comentario. Usa **Editar cuenta del pedido** para corregir los datos. Guarda esa edición y regresa a Reportes para responder.
4. Elige **Pendiente**, **En revisión** o **Resuelto**, escribe la respuesta y pulsa **Guardar respuesta y estado**. Resolver requiere una respuesta. El cliente puede verla en **Ver reporte** o **Reportes de la cuenta**; las actualizaciones se consultan cada 15 segundos mientras tenga la página visible y sin un formulario abierto, o al pulsar **Actualizar**.
5. Los reportes resueltos quedan en el historial y en el filtro **Resueltos** del panel. Si ocurre otra falla, el cliente puede enviar un nuevo reporte. Cada registro conserva su comentario inicial y la última respuesta/estado del dueño; no es un chat con múltiples respuestas.

La tabla de reportes se crea automáticamente en MySQL al iniciar la nueva versión. Se conserva al reiniciar o actualizar la aplicación. Se muestran hasta 200 reportes con los abiertos primero, y hasta 3000 caracteres por comentario o respuesta. Los clientes no pueden leer reportes de otras personas, editar entregas ni entrar al panel.

### Tablas del panel (1.3.7)

**Recargas, Pedidos, Clientes y Reportes** usan el mismo estilo de tabla que Inventario de cuentas: encabezados fijos, filas alternadas, estado visible, acciones por fila, desplazamiento horizontal y controles para mostrar 10, 25, 50 o 100 filas por página.

- **Recargas:** busca por correo, solicitud o nota; filtra pendientes/aprobadas/rechazadas. Abre **Revisar recarga** en la fila para aprobar o rechazar. Aprobar sigue exigiendo marcar la verificación del ingreso.
- **Pedidos:** muestra logo, producto, cliente, importe, modalidad, fecha y estado. Busca por pedido, producto o correo. Desde la fila puedes entregar una cuenta manual, editar una vendida o devolver saldo.
- **Clientes:** muestra ID, correo, saldo, estado y registro. Conserva la búsqueda por correo y filtros, además de crear, suspender/reactivar, eliminar/restaurar y consultar el código de recuperación.
- **Reportes:** muestra producto, cliente, cuenta, problema, respuesta y estado. Despliega el comentario o respuesta para leerlo completo. Usa **Responder / gestionar** para responder o cambiar el estado y **Editar cuenta del pedido** para corregir la entrega.

Los filtros de Recargas, Pedidos y Reportes se aplican a los últimos 200 registros cargados, con pendientes primero. Clientes busca en el servidor y pagina hasta 200 coincidencias. Si tienes un formulario con cambios, guárdalo o cancélalo antes de cambiar filtros, página o sección. Las acciones y permisos permanecen iguales; esta versión no modifica el esquema de MySQL.

## 4. Acceso del cliente

El cliente entra desde «Iniciar sesión» o «Registrarme» en la tienda, o directamente en **https://arcangelpro.com/cuenta**.

- En el acceso verá **Iniciar sesión** y **Registrarse**, además del enlace **Regístrate aquí**. Se registra con correo, contraseña de al menos 12 caracteres y confirmación de contraseña. También puede entrar directamente en `/cuenta?registro=1`.
- Recibe un código de recuperación privado que debe guardar. Puede pedir ayuda por WhatsApp si lo pierde; no se envía correo.
- **Mi billetera:** saldo propio, solicitudes de recarga e historial de movimientos.
- **Mis cuentas y compras:** tabla con logo, correo visible, clave oculta con botón Ver, perfil, PIN, instrucciones, acceso a la plataforma, fechas, días restantes, importe y estado. Incluye filtros con cantidades, búsqueda por producto/correo/perfil/pedido y páginas de 10, 25 o 50 compras. En celular la tabla se desplaza horizontalmente. El estado «Vencida» se muestra cuando pasó la fecha de término indicada por el dueño (hora de Perú); no renueva ni cobra automáticamente. Cada cliente consulta únicamente sus propias compras. Las claves se solicitan solo al pulsar **Ver** o **Copiar datos**. Este último botón aparece junto a **Ver detalles** y dentro del detalle de las compras entregadas. Copia el aviso de uso, nombre del producto, correo, contraseña, perfil y PIN con el formato de la tienda. Los campos sin dato quedan vacíos. Si el navegador no permite copiar automáticamente, muestra el texto seleccionado para copiarlo manualmente. La contraseña permanece oculta en la tabla.
- **Mi acceso:** identificación de la cuenta e instrucciones de recuperación.

Al confirmar una compra se cobra el precio actual en soles y se descuenta el stock. Si no hay saldo o stock suficiente, la compra se rechaza sin cobrar. Si hay un fallo de conexión, el cliente debe consultar «Mis compras» y usar «Actualizar» para comprobar el resultado antes de iniciar otra compra.

Cada cliente ve solo su información. Su sesión no autoriza el panel del dueño aunque escriba `/admin`, ni permite aprobar recargas, cambiar el saldo o ver inventario privado. La contraseña del panel es independiente y no hay registro público de administradores.

Las aprobaciones de recarga y entregas pendientes se consultan cada 15 segundos mientras el cliente tenga su página visible; puede usar **Actualizar** en cualquier momento.

La recuperación usa correo + código vigente. En **Olvidé mi contraseña**, junto al campo del código, aparece el aviso de soporte y un botón de WhatsApp a **+51 929 688 960**. Prepara el mensaje «Hola, solicito mi código de recuperación porque olvidé mi contraseña y no encuentro el código. ¿Me pueden ayudar a recuperar el acceso a mi cuenta?». El cliente elige enviarlo desde WhatsApp. No hay verificación ni restablecimiento automático por correo. Al entrar desde otro navegador se cierra la sesión anterior del cliente. Las sesiones de clientes duran hasta 7 días; las de administrador caducan y se cierran al reiniciar la aplicación.

## 5. Respaldo que debes conservar

Para conservar **clientes, billeteras, movimientos, pedidos, inventario y reportes**, usa **GoDaddy → Base de datos → Exportar SQL**. Conserva también `COMMERCE_KEY` en un lugar privado separado. La base puede incluir tanto pruebas como publicado; importar un SQL reemplaza lo que indique ese archivo, así que debe planificarse una restauración completa.

El archivo `.jsonl.gz` de **Respaldos** contiene catálogo, configuración e imágenes subidas. **No contiene clientes, saldos, cuentas de venta, pedidos ni reportes.** Restaurarlo no cambia esas tablas; el stock automático se calcula de nuevo desde el inventario real. Las imágenes estáticas originales se conservan en el paquete completo.

## 6. Comprobar antes de abrir las ventas

En Vista previa crea un cliente y un producto de prueba. Registra una recarga ficticia y apruébala solo en ese entorno; confirma que aparece en su billetera. Compra una cuenta ficticia, comprueba el descuento, la entrega y el stock. Reinicia Vista previa y comprueba que los datos sigan allí. No acredites recargas ficticias en el entorno publicado.

La versión se probó localmente con MySQL/MariaDB, incluida competencia por la última cuenta, reintentos de cobro, aprobación y devolución, persistencia, aislamiento de clientes y acceso del dueño. Se revisaron en navegador registro, QR, envío solo con monto, aviso visual y señal de audio, billetera, compra automática, carga de inventario y entrega manual. El despliegue de esta versión en tu GoDaddy debe comprobarse después de subirlo.

La implementación utiliza tu alojamiento Node.js y MySQL existentes. No requiere integrar una pasarela de pagos ni un proveedor de correos para este flujo manual. Se aplican los límites de capacidad de tu plan de hosting.
