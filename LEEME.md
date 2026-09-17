# Arcangel US · Tienda y panel de administración

**Para GoDaddy:** utiliza `arcangel-us-godaddy-v1.2.0.zip` y sigue `SUBIR-A-GODADDY.md`. Incluye guardado en MySQL de productos e imágenes, respaldos descargables y catálogos separados para pruebas y publicado. Requiere configurar la base antes de desplegar.

## Abrir la tienda y el panel

1. Descomprime la carpeta completa si estás usando el ZIP.
2. Haz doble clic en `INICIAR-TIENDA.cmd` y deja esa ventana abierta.
3. Abre la tienda: http://127.0.0.1:4173/
4. Abre el panel: http://127.0.0.1:4173/admin

Requiere Node.js 20 o superior, ya instalado en este equipo. No necesita instalar paquetes. Para detener el servidor, cierra su ventana. Para volver a abrirlo, ejecuta de nuevo `INICIAR-TIENDA.cmd`.

## Productos

- Usa **Agregar producto** para crear una ficha y **Editar** para cambiar una existente.
- Puedes editar nombre, marca, imagen, categoría, tipo, duración, subtítulo, descripción, precio, precio anterior, características y condiciones.
- Sube imágenes PNG, JPG, WebP o GIF de hasta 12 MB, o pega un enlace de imagen.
- Selecciona **Disponible** o **Agotado**. Puedes indicar unidades; con **0** se marca agotado automáticamente y se desactiva la compra.
- El stock es manual: actualiza las unidades después de cada venta por WhatsApp. Deja el campo vacío si solo quieres controlar disponible/agotado.
- Desmarca **Mostrar producto en la tienda** para ocultarlo sin borrarlo.
- Activa **Incluir en Promos y Ofertas** para mostrarlo en ese filtro.
- Cambia las posiciones para ordenar productos: los números menores aparecen primero.
- También puedes duplicar productos o eliminarlos desde su editor.
- Pulsa **Guardar cambios** o **Crear producto** para aplicar lo editado.

## Categorías y configuración de la web

En **Categorías** puedes crear categorías, editar sus nombres, imágenes y posiciones. Para eliminar una categoría, primero mueve sus productos a otra. Los filtros Todos y Promos también tienen su imagen y nombre editables.

En **Configurar web** puedes cambiar:

- Nombre de la tienda y logos de portada, cabecera y pie.
- Frases de portada, mensajes de confianza y número de clientes.
- WhatsApp de ventas, mensajes y texto del botón de compra.
- Texto y contacto del pie de página.
- Colores de las olas del fondo y descripción para buscadores.

Pulsa **Guardar configuración** al terminar. El número de ventas inicial es **+51 929 688 960**. La marca inicial es **Arcangel US**, con el logo transparente y las olas rojas y turquesas.

## Guardado y copias

Los cambios se guardan en este equipo y se conservan después de cerrar el navegador o reiniciar el servidor. La tienda abierta actualiza el catálogo al volver a su pestaña y cada cinco segundos mientras esté visible.

- `js/catalog.js`: productos, categorías y configuración guardados.
- `uploads/`: imágenes subidas desde el panel.
- `.backups/`: copias del catálogo anterior a cada guardado.

Para trasladar o respaldar todo, copia la carpeta completa. Para recuperar una copia de `.backups/`, detén el servidor primero. Los archivos `.json` contienen el estado anterior: su contenido debe envolverse en `const CATALOG = ...;` al reemplazar `js/catalog.js`; las copias `.js` ya incluyen esa declaración.

Si abres varios paneles a la vez, se detectan los cambios de otra pestaña para evitar sobrescribirlos. En ese caso, vuelve a cargar el panel antes de continuar.

## Alcance

En este equipo, abre `INICIAR-TIENDA.cmd` para ver y editar la tienda. Para usarla en Internet, el proyecto también admite GoDaddy Node.js Hosting; sigue `SUBIR-A-GODADDY.md`. El panel remoto requiere una contraseña configurada en el alojamiento. Los archivos codificados como WebP en el paquete para GoDaddy se sirven desde Node.js, conservando las rutas de imágenes anteriores.

El diseño y los 53 productos iniciales proceden de la copia de la web pública https://cuentas.codeghy.com/ del 15 de septiembre de 2026. El catálogo es independiente y no se sincroniza con la tienda original. Las compras se coordinan mediante enlaces de WhatsApp.

