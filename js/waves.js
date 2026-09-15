// waves.js - Fondo animado con ondas usando la paleta del proyecto
(() => {
  const canvas = document.getElementById('bgWave');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = window.innerWidth;
  let height = window.innerHeight;
  let animationId;
  let isResizing = false;

  // Olas rojas con la onda turquesa original.
  const colors = {
    accent: 'rgba(239, 44, 44, 0.35)',
    accentDim: 'rgba(239, 44, 44, 0.22)',
    teal: 'rgba(45, 212, 191, 0.18)',        // --teal-dim
    accent2: 'rgba(248, 113, 113, 0.25)',
  };

  // Configuración de las ondas (más amplias y rápidas)
  const waves = [
    {
      y: height * 0.25,
      length: 0.01,
      amplitude: 150,
      frequency: 0.008,
      color: colors.accent,
      speed: 0.25,
      phase: 0
    },
    {
      y: height * 0.45,
      length: 0.012,
      amplitude: 180,
      frequency: 0.01,
      color: colors.accentDim,
      speed: -0.18,
      phase: Math.PI / 2
    },
    {
      y: height * 0.65,
      length: 0.008,
      amplitude: 120,
      frequency: 0.006,
      color: colors.teal,
      speed: 0.3,
      phase: Math.PI
    },
    {
      y: height * 0.55,
      length: 0.015,
      amplitude: 160,
      frequency: 0.009,
      color: colors.accent2,
      speed: -0.22,
      phase: Math.PI * 1.5
    }
  ];

  function updateColors(settings) {
    const rgba = (hex, alpha) => {
      if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return null;
      return `rgba(${parseInt(hex.slice(1,3),16)}, ${parseInt(hex.slice(3,5),16)}, ${parseInt(hex.slice(5,7),16)}, ${alpha})`;
    };
    const next = [rgba(settings.wave_primary,.35),rgba(settings.wave_primary,.22),rgba(settings.wave_teal,.18),rgba(settings.wave_secondary,.25)];
    waves.forEach((wave,i) => { if (next[i]) wave.color = next[i]; });
  }
  if (typeof CATALOG !== 'undefined' && CATALOG.settings) updateColors(CATALOG.settings);
  window.addEventListener('shop-settings', event => updateColors(event.detail));

  function resize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    // Solo hacer resize si el cambio de ANCHO es significativo (ignorar cambios de altura por barra de navegación)
    if (Math.abs(newWidth - width) < 100) {
      return;
    }

    isResizing = true;
    const oldHeight = height;
    width = newWidth;
    height = newHeight;
    canvas.width = width;
    canvas.height = height;

    // Actualizar posiciones Y de las ondas proporcionalmente
    if (oldHeight > 0) {
      waves.forEach(wave => {
        const ratio = wave.y / oldHeight;
        wave.y = height * ratio;
      });
    } else {
      waves[0].y = height * 0.3;
      waves[1].y = height * 0.5;
      waves[2].y = height * 0.7;
      waves[3].y = height * 0.6;
    }

    setTimeout(() => { isResizing = false; }, 100);
  }

  function drawWave(wave, time) {
    ctx.beginPath();
    ctx.moveTo(0, wave.y);

    for (let x = 0; x <= width; x += 2) {
      const angle = (x * wave.length) + (time * wave.speed) + wave.phase;
      const y = wave.y + Math.sin(angle) * wave.amplitude;
      ctx.lineTo(x, y);
    }

    // Completar la forma para crear el gradiente
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    // Crear gradiente vertical más pronunciado
    const gradient = ctx.createLinearGradient(0, wave.y - wave.amplitude * 1.5, 0, wave.y + wave.amplitude * 3);
    gradient.addColorStop(0, wave.color);
    gradient.addColorStop(0.4, wave.color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate() {
    // Si estamos en resize, pausar la animación brevemente
    if (isResizing) {
      animationId = requestAnimationFrame(animate);
      return;
    }

    const time = Date.now() * 0.001;

    ctx.clearRect(0, 0, width, height);

    // Dibujar todas las ondas
    waves.forEach(wave => drawWave(wave, time));

    animationId = requestAnimationFrame(animate);
  }

  // Inicializar
  function init() {
    canvas.width = width;
    canvas.height = height;
    waves[0].y = height * 0.25;
    waves[1].y = height * 0.45;
    waves[2].y = height * 0.65;
    waves[3].y = height * 0.55;
  }

  init();
  animate();

  // Ajustar al cambiar tamaño de ventana (debounce más largo para evitar reinicios)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 300);
  });

  // Limpiar al salir
  window.addEventListener('beforeunload', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
})();
