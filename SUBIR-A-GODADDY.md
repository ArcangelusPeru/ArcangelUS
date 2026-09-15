# Subir Arcangel US a GoDaddy Node.js Hosting

## Actualizar tu aplicación actual

1. Utiliza **arcangel-us-godaddy.zip**, la versión preparada para GoDaddy. El ZIP anterior era para uso local y superaba el límite del alojamiento.
2. En la aplicación **ArcangelUSperu**, pulsa **Update Preview** o **Upload New Code** y selecciona el ZIP corregido. Si GoDaddy solicita una carpeta, descomprímelo y selecciona la carpeta que contiene directamente `package.json`, `server.mjs` e `index.html`.
3. Deja el entorno en **Node.js 22**. El alojamiento ejecutará `npm install`, `npm run build` y `npm start`; el proyecto incluye esos comandos y no necesita dependencias externas.
4. En **Manage Secrets**, añade **ADMIN_PASSWORD**. Elige tú una contraseña de al menos **12 caracteres**; esa será la contraseña del panel. No compartas tu contraseña por chat ni la escribas en archivos públicos.
5. Reinicia con **Restart Preview App** después de guardar el secreto.
6. Abre la URL de vista previa desde tu sesión iniciada de GoDaddy. Para entrar al panel, añade **/admin** a esa misma URL e introduce la contraseña elegida.

Ejemplo: si la tienda abre en `https://tu-app.preview.c37.airoapp.ai/`, el panel está en `https://tu-app.preview.c37.airoapp.ai/admin`.

La tienda puede abrir antes de configurar la contraseña, pero el panel permanecerá bloqueado. Al publicar en otro entorno, configura también `ADMIN_PASSWORD` allí. La sesión de administración dura hasta 12 horas y termina al reiniciar el servidor.

## Variables del alojamiento

| Variable | Configuración |
| --- | --- |
| `PORT` | GoDaddy la proporciona automáticamente. No añadas un puerto fijo. |
| `ADMIN_PASSWORD` | Contraseña del panel, entre 12 y 1024 caracteres. Obligatoria para administrar por Internet. |
| `DATA_DIR` | Opcional. Por defecto se usa `/public/assets/arcangel-us`, dentro de la carpeta que GoDaddy indica para archivos persistentes. |
| `APP_URL` | Opcional. Déjala vacía para usar la vista previa y el dominio público. Si la defines, debe ser el origen exacto del entorno, por ejemplo `https://mitienda.com`, sin `/admin`. |

## Guardado

En GoDaddy, los cambios se guardan en `DATA_DIR/catalog.json`, las imágenes nuevas en `DATA_DIR/uploads` y las copias anteriores en `DATA_DIR/.backups`.

En el primer arranque se importa el catálogo incluido en el ZIP. En los siguientes arranques se conserva el catálogo guardado, aunque subas una nueva versión del código. No reemplaces ni borres esa carpeta al actualizar la aplicación. Para respaldarla, utiliza el administrador de archivos del alojamiento.

Las rutas del catálogo privado y las copias no se publican mediante el servidor. Las imágenes de productos sí son públicas para que puedan mostrarse en la tienda. El control de stock sigue siendo manual después de cada venta por WhatsApp.

## Si la vista previa no abre

- **This preview is private / Share link required:** necesitas abrirla desde tu sesión de GoDaddy o utilizar su enlace para compartir. Ese mensaje lo muestra GoDaddy antes de llegar a la tienda.
- **Healthy:** significa que GoDaddy informa un estado saludable del despliegue; no es un mensaje de error.
- **Configura ADMIN_PASSWORD:** añade ese secreto en el entorno actual y reinicia la aplicación.
- **Origen no permitido:** si configuraste `APP_URL`, comprueba que coincida con la URL actual o déjala vacía mientras usas la vista previa.
- Para otros errores, abre **Runtime Logs**. El servidor debe informar que escucha en `0.0.0.0` y en el puerto asignado por GoDaddy.

## Cambios de esta versión

- `package.json` y scripts de inicio y validación en la raíz del ZIP.
- Puerto definido por el alojamiento y escucha en `0.0.0.0`.
- Acceso con contraseña al panel, sesiones y cierre de sesión.
- Guardado independiente de los archivos de código que se sustituyen al desplegar.
- Imágenes codificadas en WebP sin pérdida, conservando los píxeles y la transparencia, para cumplir el límite de tamaño del ZIP. Las rutas antiguas PNG siguen funcionando mediante el servidor.
- Se conserva el catálogo, las categorías, el logo y el diseño.

Referencia: [Requisitos oficiales de GoDaddy Node.js Hosting](https://www.godaddy.com/es/help/upload-my-ai-generated-app-to-godaddy-nodejs-hosting-42987).

El paquete se ha probado localmente simulando el alojamiento. Debes comprobar la vista previa de tu cuenta después de subirlo; esta entrega no publica ni cambia tu dominio.
