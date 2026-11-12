(() => {
  const canvas = document.querySelector('canvas');
  const controls = document.querySelector('#controls');
  if (!canvas || !controls) return;

  const ctx = canvas.getContext('2d');
  const defaults = { distance: 5.2, height: 1.2, objectiveFocal: 3, eyepieceFocal: 30 };
  const state = { ...defaults, rays: true, animate: false };
  const eyeX = -7.5;
  const objectiveX = 9;
  const units = 12;
  const distanceMax = 10;
  const specs = {
    distance: [0, distanceMax, defaults.distance, 0.01, '物距 uₒ'],
    height: [0.5, 2.2, defaults.height, 0.1, '物高 h'],
    objectiveFocal: [1.5, 4.5, defaults.objectiveFocal, 0.1, '物鏡焦距 fₒ'],
    eyepieceFocal: [8, 40, defaults.eyepieceFocal, 0.5, '目鏡焦距 fₑ']
  };

  function minObjectDistance() {
    const separation = objectiveX - eyeX;
    const imageInsideEyepiece = state.objectiveFocal * separation / (separation - state.objectiveFocal);
    return Math.ceil(Math.max(4.2, imageInsideEyepiece + 0.1) * 10) / 10;
  }
  function slider(key) {
    const spec = specs[key];
    const min = key === 'distance' ? minObjectDistance() : spec[0];
    return '<label class="control"><span class="control-head"><span>' + spec[4] + '</span><strong id="' + key + '-value"></strong></span>' +
      '<input type="range" min="' + min + '" max="' + spec[1] + '" value="' + state[key] + '" step="' + spec[3] + '" data-key="' + key + '">' +
      '<span class="range-scale"><span data-min-label="' + key + '">' + min + '</span><span>' + spec[1] + '</span></span></label>';
  }

  controls.innerHTML = '<h2>調整物體與焦距</h2>' + slider('distance') + slider('height') + slider('objectiveFocal') + slider('eyepieceFocal') +
    '<div class="formula" id="formula"><b>薄透鏡公式：</b>1／f ＝ 1／u ＋ 1／v<br>物鏡與目鏡各自成像，焦距可分別調整。</div>' +
    '<label class="toggle"><input type="checkbox" id="rays" checked> 顯示成像光線與虛像延長線</label>' +
    '<div class="button-row"><button class="button" id="reset">重設</button><button class="button primary" id="animate">▶ 光線動畫</button></div>' +
    '<div class="readouts" id="readouts"></div>';

  function updateDistanceBounds() {
    const input = controls.querySelector('[data-key="distance"]');
    const min = minObjectDistance();
    input.min = String(min);
    controls.querySelector('[data-min-label="distance"]').textContent = min.toFixed(1);
    if (state.distance < min) state.distance = min;
    input.value = state.distance;
  }

  controls.querySelectorAll('input[type=range]').forEach(input => input.addEventListener('input', () => {
    state[input.dataset.key] = Number(input.value);
    if (input.dataset.key === 'objectiveFocal') updateDistanceBounds();
    draw();
  }));
  document.querySelector('#rays').addEventListener('change', event => {
    state.rays = event.target.checked;
    draw();
  });
  document.querySelector('#reset').addEventListener('click', () => {
    Object.assign(state, defaults, { rays: true, animate: false });
    updateDistanceBounds();
    controls.querySelectorAll('input[type=range]').forEach(input => { input.value = state[input.dataset.key]; });
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
  let dragging = false;

  function sceneScale(width, height) {
    return Math.min((width - 28) / 460, (height - 58) / 300, 1.12) || 1;
  }
  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = sceneScale(rect.width, rect.height);
    return { x: (event.clientX - rect.left - rect.width / 2) / scale, y: (event.clientY - rect.top - rect.height * 0.54) / scale };
  }
  function objectHit(point) {
    const x = objectiveX * units + state.distance * units;
    const top = -state.height * units;
    return Math.abs(point.x - x) < 15 && point.y > top - 14 && point.y < 16;
  }
  canvas.addEventListener('pointerdown', event => {
    if (!objectHit(canvasPoint(event))) return;
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', event => {
    const point = canvasPoint(event);
    if (dragging) {
      const min = minObjectDistance();
      const distance = (point.x - objectiveX * units) / units;
      state.distance = Math.round(Math.max(min, Math.min(distanceMax, distance)) * 100) / 100;
      controls.querySelector('[data-key="distance"]').value = state.distance;
      draw();
    } else {
      canvas.style.cursor = objectHit(point) ? 'grab' : 'default';
    }
  });
  function stopDragging() { dragging = false; canvas.style.cursor = 'default'; }
  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('lostpointercapture', stopDragging);

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
  function updateReadouts(values) {
    document.querySelector('#readouts').innerHTML = values.map(item => '<div class="metric"><span>' + item[0] + '</span><strong>' + item[1] + '</strong></div>').join('');
    for (const key of Object.keys(specs)) {
      const output = document.querySelector('#' + key + '-value');
      output.textContent = state[key].toFixed(key === 'distance' ? 2 : 1) + ' cm';
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
    const scale = sceneScale(box.width, box.height);
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
    const objectiveFocal = state.objectiveFocal;
    const eyepieceFocal = state.eyepieceFocal;
    const fObject = objectiveFocal * units;
    const objectDistance = state.distance;
    const objectHeight = state.height * units;
    const objectX = objective + objectDistance * units;
    const objectTop = -objectHeight;
    const imageDistance = objectDistance * objectiveFocal / (objectDistance - objectiveFocal);
    const intermediateX = objective - imageDistance * units;
    const intermediateHeight = objectHeight * imageDistance / objectDistance;
    const eyepieceObjectDistance = (intermediateX - eye) / units;
    const focusDifference = eyepieceFocal - eyepieceObjectDistance;
    const atEyepieceFocus = Math.abs(focusDifference) < 0.05;
    const eyepieceImageDistance = atEyepieceFocus ? Infinity : -eyepieceFocal * eyepieceObjectDistance / focusDifference;
    const eyepieceMagnification = atEyepieceFocus ? Infinity : -eyepieceImageDistance / eyepieceObjectDistance;
    const finalX = atEyepieceFocus ? NaN : eye - eyepieceImageDistance * units;
    const finalHeight = atEyepieceFocus ? Infinity : intermediateHeight * eyepieceMagnification;
    const totalMagnification = atEyepieceFocus ? Infinity : -imageDistance / objectDistance * eyepieceMagnification;
    const virtualImage = atEyepieceFocus || eyepieceImageDistance < 0;
    const imageMagnification = Math.abs(totalMagnification);
    const sizeStatus = imageMagnification > 1.05 ? '放大' : imageMagnification < 0.95 ? '縮小' : '等大';
    const status = atEyepieceFocus ? '目鏡出射光平行，像在無限遠' : (totalMagnification < 0 ? '倒立' : '正立') + '・' + sizeStatus + '・' + (virtualImage ? '虛像' : '實像');

    lens(eye, '目鏡', scale, 11, 136);
    lens(objective, '物鏡', scale, 8, 110);
    dot(objective - fObject, 0, colors.gold, 4);
    label('Fₒ', objective - fObject, 18, colors.gold, 'center', scale);
    label('fₒ ' + objectiveFocal.toFixed(1) + ' cm', objective - fObject, 35, colors.muted, 'center', scale);
    const eyepieceFocusX = eye + eyepieceFocal * units;
    if (eyepieceFocusX < 215) {
      dot(eyepieceFocusX, 0, colors.gold, 4);
      label('Fₑ', eyepieceFocusX, 18, colors.gold, 'center', scale);
    }
    arrow(objectX, objectTop, colors.coral, '物體', scale);
    imageArrow(intermediateX, intermediateHeight, colors.intermediate, '中間像', scale);
    const finalVisible = !atEyepieceFocus && Number.isFinite(finalX) && Number.isFinite(finalHeight) && Math.abs(finalX) < 205 && Math.abs(finalHeight) < 120;
    if (finalVisible) imageArrow(finalX, finalHeight, colors.blue, virtualImage ? '最終虛像' : '最終實像', scale);
    else label(atEyepieceFocus ? '像在無限遠' : '最終像超出圖示範圍', eye, -116, colors.blue, 'center', scale);

    const animationPath = [];
    const secondaryAnimationPath = [];
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
      const endX = -214;
      const slopeAfterEye = y => atEyepieceFocus ? intermediateHeight / (eyepieceObjectDistance * units) : (y - finalHeight) / (eye - finalX);
      const rayAEnd = [endX, rayAAtEye[1] + slopeAfterEye(rayAAtEye[1]) * (endX - eye)];
      const rayBEnd = [endX, rayBAtEye[1] + slopeAfterEye(rayBAtEye[1]) * (endX - eye)];

      line(rayAStart, rayAAtObjective, colors.gold, 1.8);
      line(rayAAtObjective, rayAAtImage, colors.gold, 1.8);
      line(rayAAtImage, rayAAtEye, colors.gold, 1.8);
      line(rayAAtEye, rayAEnd, colors.gold, 1.8);
      if (virtualImage && !atEyepieceFocus) line(rayAAtEye, [finalX, finalHeight], colors.gold, 1.4, [5, 5]);
      vectorHead(rayAAtImage, rayAAtEye, 0.42, colors.gold);
      vectorHead(rayAAtEye, rayAEnd, 0.45, colors.gold);

      line(rayAStart, rayBAtObjective, colors.coral, 1.7);
      line(rayBAtObjective, rayAAtImage, colors.coral, 1.7);
      line(rayAAtImage, rayBAtEye, colors.coral, 1.7);
      line(rayBAtEye, rayBEnd, colors.coral, 1.7);
      if (virtualImage && !atEyepieceFocus) line(rayBAtEye, [finalX, finalHeight], colors.coral, 1.4, [5, 5]);
      vectorHead(rayAAtImage, rayBAtEye, 0.45, colors.coral);
      vectorHead(rayBAtEye, rayBEnd, 0.45, colors.coral);

      dot(objective, objectTop, colors.gold, 3);
      dot(objective, 0, colors.coral, 3);
      dot(intermediateX, intermediateHeight, colors.intermediate, 4);
      dot(eye, rayAAtEye[1], colors.gold, 3);
      dot(eye, rayBAtEye[1], colors.coral, 3);
      animationPath.push(rayAStart, rayAAtObjective, rayAAtImage, rayAAtEye, rayAEnd);
      secondaryAnimationPath.push(rayAStart, rayBAtObjective, rayAAtImage, rayBAtEye, rayBEnd);
    }
    animateDot(animationPath, colors.gold);
    animateDot(secondaryAnimationPath, colors.coral);

    label('物鏡焦距 ' + objectiveFocal.toFixed(1) + ' cm', objective, 138, colors.muted, 'center', scale);
    label('目鏡焦距 ' + eyepieceFocal.toFixed(1) + ' cm', eye, 138, colors.muted, 'center', scale);
    ctx.restore();

    const signedEyepieceImage = atEyepieceFocus ? '∞' : (eyepieceImageDistance > 0 ? '+' : '−') + Math.abs(eyepieceImageDistance).toFixed(1) + ' cm';
    const imageHeightText = atEyepieceFocus ? '∞' : Math.abs(finalHeight / units).toFixed(1) + ' cm';
    const totalMagnificationText = atEyepieceFocus ? '∞' : Math.abs(totalMagnification).toFixed(2) + ' ×';
    updateReadouts([
      ['物距 uₒ', objectDistance.toFixed(2) + ' cm'],
      ['物高 h', state.height.toFixed(1) + ' cm'],
      ['物鏡焦距 fₒ', objectiveFocal.toFixed(1) + ' cm'],
      ['目鏡焦距 fₑ', eyepieceFocal.toFixed(1) + ' cm'],
      ['中間像距 vₒ', imageDistance.toFixed(1) + ' cm'],
      ['中間像高 h₁', (intermediateHeight / units).toFixed(1) + ' cm'],
      ['目鏡像距 vₑ', signedEyepieceImage + (virtualImage && !atEyepieceFocus ? '（虛）' : atEyepieceFocus ? '（無限遠）' : '（實）')],
      ['最終像高 |h′|', imageHeightText]
    ]);
    const magnificationSign = atEyepieceFocus ? '' : totalMagnification < 0 ? '−' : '＋';
    document.querySelector('#formula').innerHTML = '<b>成像狀態：</b>' + status + '<br><b>總放大率 m：</b>' + magnificationSign + totalMagnificationText + '<br><b>薄透鏡公式：</b>1／fₒ ＝ 1／uₒ ＋ 1／vₒ；1／fₑ ＝ 1／uₑ ＋ 1／vₑ';
  }

  function frame() {
    if (state.animate) {
      phase = (phase + 0.004) % 1;
      draw();
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', draw);
  window.addEventListener('themechange', () => { colors = palette(); draw(); });
  draw();
  requestAnimationFrame(frame);
})();
