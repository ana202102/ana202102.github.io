(() => {
  const canvas = document.querySelector('.rgb-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const channels = {
    red: { input: document.querySelector('#red-range'), output: document.querySelector('#red-value') },
    green: { input: document.querySelector('#green-range'), output: document.querySelector('#green-value') },
    blue: { input: document.querySelector('#blue-range'), output: document.querySelector('#blue-value') }
  };
  const sources = [
    { name: 'red', label: '紅光 R', color: [255, 0, 0], x: -76, y: -48 },
    { name: 'green', label: '綠光 G', color: [0, 255, 0], x: 76, y: -48 },
    { name: 'blue', label: '藍光 B', color: [0, 0, 255], x: 0, y: 80 }
  ];
  const presets = {
    red: [255, 0, 0], green: [0, 255, 0], blue: [0, 0, 255],
    yellow: [255, 255, 0], cyan: [0, 255, 255], magenta: [255, 0, 255],
    white: [255, 255, 255], off: [0, 0, 0]
  };
  const names = [
    { name: '白光', test: ([r,g,b]) => r > 0 && g > 0 && b > 0 && r === g && g === b },
    { name: '黃光', test: ([r,g,b]) => r > 0 && g > 0 && b === 0 && r === g },
    { name: '青光', test: ([r,g,b]) => r === 0 && g > 0 && b > 0 && g === b },
    { name: '洋紅光', test: ([r,g,b]) => r > 0 && g === 0 && b > 0 && r === b },
    { name: '紅光', test: ([r,g,b]) => r > 0 && g === 0 && b === 0 },
    { name: '綠光', test: ([r,g,b]) => r === 0 && g > 0 && b === 0 },
    { name: '藍光', test: ([r,g,b]) => r === 0 && g === 0 && b > 0 },
    { name: '無光', test: ([r,g,b]) => r === 0 && g === 0 && b === 0 }
  ];
  const value = () => [channels.red, channels.green, channels.blue].map(channel => +channel.input.value);
  const hex = rgb => `#${rgb.map(n => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  let dragged = null;

  function geometry(box = canvas.getBoundingClientRect()) {
    const scale = Math.min(box.width / 640, box.height / 460) || 1;
    return { box, scale, cx: box.width / 2, cy: box.height / 2, radius: Math.min(119 * scale, box.height * .31, box.width * .22) };
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect(), g = geometry(rect);
    return { x: (event.clientX - rect.left - g.cx) / g.scale, y: (event.clientY - rect.top - g.cy) / g.scale, ...g };
  }

  function hitSource(point) {
    for (let i = sources.length - 1; i >= 0; i--) {
      if (Math.hypot(point.x - sources[i].x, point.y - sources[i].y) <= point.radius / point.scale) return i;
    }
    return null;
  }

  function draw() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = window.devicePixelRatio || 1, g = geometry(box), rgb = value();
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    ctx.fillStyle = '#050a11';
    ctx.fillRect(0, 0, box.width, box.height);

    ctx.globalCompositeOperation = 'lighter';
    sources.forEach((source, index) => {
      const alpha = rgb[index] / 255;
      if (!alpha) return;
      ctx.beginPath();
      ctx.arc(g.cx + source.x * g.scale, g.cy + source.y * g.scale, g.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${source.color.join(',')},${alpha})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    ctx.font = `600 ${Math.max(12, 15 * g.scale)}px "Noto Sans TC",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    sources.forEach((source, index) => {
      const x = g.cx + source.x * g.scale, y = g.cy + source.y * g.scale;
      ctx.beginPath();
      ctx.arc(x, y, g.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.42)';
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(source.label, x, y - g.radius - 13 * g.scale);
    });
    ctx.shadowBlur = 0;

    channels.red.output.textContent = rgb[0];
    channels.green.output.textContent = rgb[1];
    channels.blue.output.textContent = rgb[2];
    const color = `rgb(${rgb.join(', ')})`;
    document.querySelector('#rgb-swatch').style.backgroundColor = color;
    document.querySelector('#rgb-name').textContent = names.find(item => item.test(rgb))?.name || '混合色光';
    document.querySelector('#rgb-code').textContent = `RGB ${rgb.join(', ')} · ${hex(rgb)}`;
  }

  canvas.addEventListener('pointerdown', event => {
    const point = pointerPosition(event);
    dragged = hitSource(point);
    if (dragged !== null) {
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
      event.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', event => {
    const point = pointerPosition(event);
    if (dragged !== null) {
      const source = sources[dragged], halfW = point.box.width / 2 / point.scale, halfH = point.box.height / 2 / point.scale, radius = point.radius / point.scale;
      source.x = Math.max(-halfW + radius, Math.min(halfW - radius, point.x));
      source.y = Math.max(-halfH + radius + 28, Math.min(halfH - radius, point.y));
      draw();
    } else {
      canvas.style.cursor = hitSource(point) === null ? 'default' : 'grab';
    }
  });
  const stopDrag = () => { dragged = null; canvas.style.cursor = 'default'; };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);

  Object.values(channels).forEach(channel => channel.input.addEventListener('input', draw));
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    const rgb = presets[button.dataset.preset];
    [channels.red, channels.green, channels.blue].forEach((channel, index) => { channel.input.value = rgb[index]; });
    draw();
  }));
  document.querySelector('#rgb-reset').addEventListener('click', () => {
    [channels.red, channels.green, channels.blue].forEach(channel => { channel.input.value = 255; });
    sources[0].x = -76; sources[0].y = -48;
    sources[1].x = 76; sources[1].y = -48;
    sources[2].x = 0; sources[2].y = 80;
    draw();
  });
  window.addEventListener('resize', draw);
  draw();
})();
