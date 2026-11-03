(() => {
  const canvas = document.querySelector('.rgb-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const channels = {
    red: { input: document.querySelector('#red-range'), output: document.querySelector('#red-value') },
    green: { input: document.querySelector('#green-range'), output: document.querySelector('#green-value') },
    blue: { input: document.querySelector('#blue-range'), output: document.querySelector('#blue-value') }
  };
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

  function draw() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    ctx.fillStyle = '#050a11';
    ctx.fillRect(0, 0, box.width, box.height);

    const sx = box.width / 640, sy = box.height / 460, scale = Math.min(sx, sy);
    const cx = box.width / 2, cy = box.height / 2;
    const radius = Math.min(119 * scale, box.height * .31, box.width * .22);
    const rgb = value();
    const sources = [
      { x: cx - 76 * scale, y: cy - 48 * scale, color: [255, 0, 0], intensity: rgb[0], label: '紅光 R' },
      { x: cx + 76 * scale, y: cy - 48 * scale, color: [0, 255, 0], intensity: rgb[1], label: '綠光 G' },
      { x: cx, y: cy + 80 * scale, color: [0, 0, 255], intensity: rgb[2], label: '藍光 B' }
    ];

    ctx.globalCompositeOperation = 'lighter';
    for (const source of sources) {
      const alpha = source.intensity / 255;
      if (!alpha) continue;
      ctx.beginPath();
      ctx.arc(source.x, source.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${source.color.join(',')},${alpha})`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `600 ${Math.max(12, 15 * scale)}px "Noto Sans TC",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(sources[0].label, cx - 143 * scale, cy - 136 * scale);
    ctx.fillText(sources[1].label, cx + 143 * scale, cy - 136 * scale);
    ctx.fillText(sources[2].label, cx, cy + 190 * scale);
    ctx.shadowBlur = 0;

    channels.red.output.textContent = rgb[0];
    channels.green.output.textContent = rgb[1];
    channels.blue.output.textContent = rgb[2];
    const color = `rgb(${rgb.join(', ')})`;
    document.querySelector('#rgb-swatch').style.backgroundColor = color;
    document.querySelector('#rgb-name').textContent = names.find(item => item.test(rgb))?.name || '混合色光';
    document.querySelector('#rgb-code').textContent = `RGB ${rgb.join(', ')} · ${hex(rgb)}`;
  }

  Object.values(channels).forEach(channel => channel.input.addEventListener('input', draw));
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    const rgb = presets[button.dataset.preset];
    [channels.red, channels.green, channels.blue].forEach((channel, index) => { channel.input.value = rgb[index]; });
    draw();
  }));
  document.querySelector('#rgb-reset').addEventListener('click', () => {
    [channels.red, channels.green, channels.blue].forEach(channel => { channel.input.value = 255; });
    draw();
  });
  window.addEventListener('resize', draw);
  draw();
})();
