(() => {
  const canvas = document.querySelector('canvas');
  const controls = document.querySelector('#controls');
  if (!canvas || !controls) return;

  const ctx = canvas.getContext('2d');
  const defaults = { distance: 5.2, height: 1.2 };
  const state = { ...defaults, rays: true, animate: false };
  const eyeX = -7.5;
  const objectiveX = 9;
  const objectiveFocal = 3;
  const eyepieceFocal = 30;
  const units = 12;
  const specs = {
    distance: [4.5, 6, 5.2, 0.1, '物距 uₒ'],
    height: [0.5, 2.2, 1.2, 0.1, '物高 h']
  };

  function slider(key) {
    const spec = specs[key];
    return '<label class="control"><span class="control-head"><span>' + spec[4] + '</span><strong id="' + key + '-value"></strong></span>' +
      '<input type="range" min="' + spec[0] + '" max="' + spec[1] + '" value="' + state[key] + '" step="' + spec[3] + '" data-key="' + key + '">' +
      '<span class="range-scale"><span>' + spec[0] + '</span><span>' + spec[1] + '</span></span></label>';
  }

  controls.innerHTML = '<h2>調整物體參數</h2>' + slider('distance') + slider('height') +
    '<div class="formula"><b>固定焦距：</b>物鏡 fₒ ＝ 3.0 cm；目鏡 fₑ ＝ 30 cm<br><b>物鏡：</b>1／fₒ ＝ 1／uₒ ＋ 1／vₒ<br><b>目鏡：</b>1／fₑ ＝ 1／uₑ ＋ 1／vₑ<br>目鏡的 vₑ 為負值時，表示最後形成虛像。</div>' +
    '<label class="toggle"><input type="checkbox" id="rays" checked> 顯示成像光線與虛像延長線</label>' +
    '<div class="button-row"><button class="button" id="reset">重設</button><button class="button primary" id="animate">▶ 光線動畫</button></div>' +
    '<div class="readouts" id="readouts"></div>';

  controls.querySelectorAll('input[type=range]').forEach(input => input.addEventListener('input', () => {
    state[input.dataset.key] = Number(input.value);
    draw();
  }));
  document.querySelector('#rays').addEventListener('change', event => {
    state.rays = event.target.checked;
    draw();
  });
  document.querySelector('#reset').addEventListener('click', () => {
    for (const key of Object.keys(defaults)) {
      state[key] = defaults[key];
      controls.querySelector('[data-key="' + key + '"]').value = defaults[key];
    }
    state.rays = true;
    state.animate = false;
    document.querySelector('#rays').checked = true;
    document.querySelector('#animate').textContent = '▶ 光線動畫';
    draw();
  });
  document.querySelector('#animate').addEventListener('click', event => {
    state.animate = !state.animate;
    event.currentTarget.textContent = state.animate ? 'Ⅱ 暫停動畫' : '▶ 光線動畫';
    draw();
  });

  const palette = () => document.documentElement.dataset.theme === 'dark'
    ? { ink: '#e4edf4', muted: '#a0b2c1', blue: '#72b5fa', cyan: '#64d5dc', coral: '#ff8e7d', gold: '#ffd071', grid: '#2a3945', axis: '#7f93a2', lens: '#5395a477', intermediate: '#be9aff', dashed: '#9aabba' }
    : { ink: '#19314a', muted: '#6d8194', blue: '#2878c8', cyan: '#33b6c4', coral: '#ef725f', gold: '#e8ad43', grid: '#eaf0f4', axis: '#9aabb7', lens: '#d8f1f099', intermediate: '#8e68cb', dashed: '#8295a3' };
  let colors = palette();
  let phase = 0;

  function line(a, b, color, width, dash) {
    ctx.beginPath();
    ctx.setLineDash(dash || []);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function label(text, x, y, color, align, scale) {
    ctx.fillStyle = color || colors.muted;
    ctx.font = '600 ' + (12 / scale) + 'px "Noto Sans TC", sans-serif';
    ctx.textAlign = align || 'center';
    ctx.fillText(text, x, y);
  }
  function dot(x, y, color, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius || 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function arrow(x, tipY, color, text, scale) {
    const direction = Math.sign(tipY) || 1;
    const baseY = tipY - direction * 9;
    line([x, 0], [x, tipY], color, 3);
    ctx.beginPath();
    ctx.moveTo(x, tipY);
    ctx.lineTo(x - 6, baseY);
    ctx.lineTo(x + 6, baseY);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    label(text, x, tipY + direction * 17, color, 'center', scale);
  }
  function vectorHead(a, b, t, color) {
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / length;
    const uy = (b[1] - a[1]) / length;
    const px = -uy;
    const py = ux;
    ctx.beginPath();
    ctx.moveTo(x + ux * 6, y + uy * 6);
    ctx.lineTo(x - ux * 5 + px * 4, y - uy * 5 + py * 4);
    ctx.lineTo(x - ux * 5 - px * 4, y - uy * 5 - py * 4);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function lens(x, title, scale, width, height) {
    const lensHeight = height || 105;
    ctx.beginPath();
    ctx.moveTo(x, -lensHeight);
    ctx.quadraticCurveTo(x - width, 0, x, lensHeight);
    ctx.quadraticCurveTo(x + width, 0, x, -lensHeight);
    ctx.closePath();
    ctx.fillStyle = colors.lens;
    ctx.fill();
    ctx.strokeStyle = colors.cyan;
    ctx.lineWidth = 3;
    ctx.stroke();
    label(title, x, 116, colors.cyan, 'center', scale);
  }
  function imageArrow(x, height, color, text, scale) {
    arrow(x, height, color, text, scale);
  }
  function animateDot(points, color) {
    if (!state.animate || points.length < 2) return;
    const lengths = [];
    const total = points.slice(1).reduce((sum, point, index) => {
      const a = points[index];
      const length = Math.hypot(point[0] - a[0], point[1] - a[1]);
      lengths.push(length);
      return sum + length;
    }, 0);
    let remaining = phase * total;
    for (let i = 0; i < lengths.length; i++) {
      const length = lengths[i];
      if (remaining <= length || i === lengths.length - 1) {
        const a = points[i];
        const b = points[i + 1];
        const t = length ? Math.min(1, remaining / length) : 0;
        dot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, color, 4);
        return;
      }
      remaining -= length;
    }
  }
  function updateReadouts(values, scale) {
    document.querySelector('#readouts').innerHTML = values.map(item => '<div class="metric"><span>' + item[0] + '</span><strong>' + item[1] + '</strong></div>').join('');
    for (const key of Object.keys(specs)) {
      const output = document.querySelector('#' + key + '-value');
      output.textContent = state[key].toFixed(1) + ' cm';
    }
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const box = canvas.getBoundingClientRect();
    if (!box.width) return;
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    const scale = Math.min((box.width - 28) / 460, (box.height - 58) / 300, 1.12) || 1;
    const cx = box.width / 2;
    const cy = box.height * 0.54;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    for (let x = -210; x <= 210; x += 42) line([x, -132], [x, 132], colors.grid, 1);
    for (let y = -126; y <= 126; y += 42) line([-215, y], [215, y], colors.grid, 1);
    line([-218, 0], [218, 0], colors.axis, 1.4);
    label('主光軸', 208, 17, colors.muted, 'right', scale);

    const eye = eyeX * units;
    const objective = objectiveX * units;
    const fObject = objectiveFocal * units;
    const objectDistance = state.distance;
    const objectHeight = state.height * units;
    const objectX = objective + objectDistance * units;
    const objectTop = -objectHeight;
    const imageDistance = objectDistance * objectiveFocal / (objectDistance - objectiveFocal);
    const intermediateX = objective - imageDistance * units;
    const intermediateHeight = objectHeight * imageDistance / objectDistance;
    const eyepieceObjectDistance = (intermediateX - eye) / units;
    const eyepieceImageDistance = -eyepieceFocal * eyepieceObjectDistance / (eyepieceFocal - eyepieceObjectDistance);
    const eyepieceMagnification = -eyepieceImageDistance / eyepieceObjectDistance;
    const finalX = eye - eyepieceImageDistance * units;
    const finalHeight = intermediateHeight * eyepieceMagnification;
    const totalMagnification = imageDistance / objectDistance * eyepieceMagnification;

    lens(eye, '目鏡', scale, 11, 136);
    lens(objective, '物鏡', scale, 8, 110);
    dot(objective - fObject, 0, colors.gold, 4);
    label('Fₒ', objective - fObject, 18, colors.gold, 'center', scale);
    label('fₒ ＝ 3 cm', objective - fObject, 35, colors.muted, 'center', scale);
    arrow(objectX, objectTop, colors.coral, '物體', scale);
    imageArrow(intermediateX, intermediateHeight, colors.intermediate, '中間像', scale);
    imageArrow(finalX, finalHeight, colors.blue, '最終虛像', scale);

    const animationPath = [];
    if (state.rays) {
      const objectiveFocusX = objective - fObject;
      const rayAStart = [objectX, objectTop];
      const rayAAtObjective = [objective, objectTop];
      const rayAAtImage = [intermediateX, intermediateHeight];
      const rayASlope = (0 - objectTop) / (objectiveFocusX - objective);
      const rayAAtEye = [eye, intermediateHeight + rayASlope * (eye - intermediateX)];
      const rayBAtObjective = [objective, 0];
      const rayBSlope = -intermediateHeight / (objective - intermediateX);
      const rayBAtEye = [eye, intermediateHeight + rayBSlope * (eye - intermediateX)];
      const virtualImage = [finalX, finalHeight];
      const endX = -214;
      const rayASlopeAfterEye = (rayAAtEye[1] - finalHeight) / (eye - finalX);
      const rayBSlopeAfterEye = (rayBAtEye[1] - finalHeight) / (eye - finalX);
      const rayAEnd = [endX, rayAAtEye[1] + rayASlopeAfterEye * (endX - eye)];
      const rayBEnd = [endX, rayBAtEye[1] + rayBSlopeAfterEye * (endX - eye)];

      line(rayAStart, rayAAtObjective, colors.gold, 1.8);
      line(rayAAtObjective, rayAAtImage, colors.gold, 1.8);
      line(rayAAtImage, rayAAtEye, colors.gold, 1.8);
      line(rayAAtEye, rayAEnd, colors.gold, 1.8);
      line(rayAAtEye, virtualImage, colors.gold, 1.4, [5, 5]);
      vectorHead(rayAAtImage, rayAAtEye, 0.42, colors.gold);
      vectorHead(rayAAtEye, rayAEnd, 0.45, colors.gold);

      line(rayAStart, rayBAtObjective, colors.coral, 1.7);
      line(rayBAtObjective, rayAAtImage, colors.coral, 1.7);
      line(rayAAtImage, rayBAtEye, colors.coral, 1.7);
      line(rayBAtEye, rayBEnd, colors.coral, 1.7);
      line(rayBAtEye, virtualImage, colors.coral, 1.4, [5, 5]);
      vectorHead(rayAAtImage, rayBAtEye, 0.45, colors.coral);
      vectorHead(rayBAtEye, rayBEnd, 0.45, colors.coral);

      dot(objective, objectTop, colors.gold, 3);
      dot(objective, 0, colors.coral, 3);
      dot(intermediateX, intermediateHeight, colors.intermediate, 4);
      dot(eye, rayAAtEye[1], colors.gold, 3);
      dot(eye, rayBAtEye[1], colors.coral, 3);
      animationPath.push(rayAStart, rayAAtObjective, rayAAtImage, rayAAtEye, rayAEnd);
    }
    animateDot(animationPath, colors.gold);

    label('物鏡焦距 3 cm', objective, 138, colors.muted, 'center', scale);
    label('目鏡焦距 30 cm', eye, 138, colors.muted, 'center', scale);
    ctx.restore();

    updateReadouts([
      ['物距 uₒ', objectDistance.toFixed(1) + ' cm'],
      ['物高 h', state.height.toFixed(1) + ' cm'],
      ['中間像距 vₒ', imageDistance.toFixed(1) + ' cm'],
      ['中間像高 h₁', (intermediateHeight / units).toFixed(1) + ' cm'],
      ['最終像高 h′', (finalHeight / units).toFixed(1) + ' cm'],
      ['總放大率 |m|', totalMagnification.toFixed(2) + ' ×（倒立）']
    ], scale);
  }

  function frame() {
    if (state.animate) {
      phase = (phase + 0.008) % 1;
      draw();
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', draw);
  window.addEventListener('themechange', () => { colors = palette(); draw(); });
  draw();
  requestAnimationFrame(frame);
})();

