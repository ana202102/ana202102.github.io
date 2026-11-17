(() => {
  const canvas = document.getElementById('pinhole-canvas');
  const ctx = canvas.getContext('2d');
  const preview = document.getElementById('pinhole-preview');
  const pctx = preview.getContext('2d');
  const controls = {
    objectDistance: document.getElementById('ph-do'),
    imageDistance: document.getElementById('ph-di'),
    objectHeight: document.getElementById('ph-height'),
    aperture: document.getElementById('ph-hole'),
    doValue: document.getElementById('ph-do-value'),
    diValue: document.getElementById('ph-di-value'),
    heightValue: document.getElementById('ph-height-value'),
    holeValue: document.getElementById('ph-hole-value'),
    magnification: document.getElementById('ph-mag'),
    imageHeight: document.getElementById('ph-image-height'),
    quality: document.getElementById('ph-quality'),
    animate: document.getElementById('ph-animate'),
    reset: document.getElementById('ph-reset')
  };
  const state = {do: 20, di: 16, h: 5, hole: 1.2, running: false, phase: 0, drag: null};
  let view = {width: 0, height: 0, scale: 1, axis: 0, holeX: 0, objX: 0, screenX: 0, topY: 0};
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const palette = () => ({ink: css('--ink'), muted: css('--muted'), grid: css('--line'), bg: css('--panel'), coral: css('--coral'), blue: css('--blue'), gold: css('--gold'), cyan: css('--cyan'), soft: css('--soft')});

  function sizeCanvas(target, context) {
    const rect = target.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return {width: rect.width, height: rect.height};
  }
  function line(x1,y1,x2,y2,color,width=1,dash=[]) {
    ctx.beginPath(); ctx.setLineDash(dash); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
    ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke(); ctx.setLineDash([]);
  }
  function arrow(x1,y1,x2,y2,color,width=3) {
    line(x1,y1,x2,y2,color,width);
    const a=Math.atan2(y2-y1,x2-x1), size=10;
    ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-size*Math.cos(a-.46),y2-size*Math.sin(a-.46));ctx.lineTo(x2-size*Math.cos(a+.46),y2-size*Math.sin(a+.46));ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function label(text,x,y,color,align='center') { ctx.fillStyle=color;ctx.font='600 12px "Noto Sans TC", sans-serif';ctx.textAlign=align;ctx.fillText(text,x,y); }

  function drawPreview(p) {
    const size=sizeCanvas(preview,pctx), w=size.width,h=size.height;
    pctx.clearRect(0,0,w,h);pctx.fillStyle=p.bg;pctx.fillRect(0,0,w,h);
    const midX=w/2,midY=h/2;
    pctx.strokeStyle=p.grid;pctx.lineWidth=1;pctx.setLineDash([4,4]);pctx.beginPath();pctx.moveTo(12,midY);pctx.lineTo(w-12,midY);pctx.stroke();pctx.setLineDash([]);
    const mag=state.di/state.do, scale=Math.min((h*.58)/Math.max(state.h*mag,.3),w*.12);
    const imageH=state.h*mag*scale;
    pctx.fillStyle=p.blue;pctx.strokeStyle=p.blue;pctx.lineWidth=3;
    pctx.shadowColor=p.blue;pctx.shadowBlur=clamp((state.hole-1.3)*3,0,14);
    pctx.beginPath();pctx.moveTo(midX,midY);pctx.lineTo(midX,midY+imageH);pctx.stroke();
    pctx.beginPath();pctx.moveTo(midX,midY+imageH);pctx.lineTo(midX-7,midY+imageH-11);pctx.lineTo(midX+7,midY+imageH-11);pctx.closePath();pctx.fill();
    pctx.save();pctx.translate(midX,midY+imageH+15);pctx.scale(-1,-1);pctx.textAlign='center';pctx.font=`bold ${clamp(imageH*.72,18,68)}px sans-serif`;pctx.fillStyle=p.blue;pctx.fillText(document.getElementById('ph-letter').value||'F',0,0);pctx.restore();pctx.shadowBlur=0;
    label2('屏幕上的倒立像',midX, h-10,p.muted);
  }
  function label2(text,x,y,color){pctx.fillStyle=color;pctx.font='11px "Noto Sans TC", sans-serif';pctx.textAlign='center';pctx.fillText(text,x,y)}

  function render() {
    const s=sizeCanvas(canvas,ctx), w=s.width,h=s.height,p=palette();
    ctx.clearRect(0,0,w,h);ctx.fillStyle=p.bg;ctx.fillRect(0,0,w,h);
    const margin=Math.min(48,w*.09), usable=w-margin*2, cy=h*.57;
    const scale=usable/(state.do+state.di+4), xHole=margin+state.do*scale, xObj=xHole-state.do*scale, xScreen=xHole+state.di*scale;
    const physicalHeight=Math.min(h*.29,state.h*scale*.48), imageHeight=physicalHeight*state.di/state.do;
    const objTop=cy-physicalHeight, imgTip=cy+imageHeight, holeR=clamp(state.hole*1.5,3,11);
    view={width:w,height:h,scale,axis:cy,holeX:xHole,objX:xObj,screenX:xScreen,topY:objTop};
    for(let x=margin;x<=w-margin;x+=Math.max(35,scale*5)){line(x,24,x,h-35,p.grid,1)}
    for(let y=cy-120;y<h-30;y+=40)line(margin,y,w-margin,y,p.grid,1);
    line(margin,cy,w-margin,cy,p.muted,1.6);
    label('主光軸',w-margin-4,cy-9,p.muted,'right');
    // object and its handle
    arrow(xObj,cy,xObj,objTop,p.coral,4);
    ctx.save();ctx.translate(xObj,cy-physicalHeight*.53);ctx.scale(1,-1);ctx.fillStyle=p.coral;ctx.font=`bold ${clamp(physicalHeight*.8,18,54)}px sans-serif`;ctx.textAlign='center';ctx.fillText(document.getElementById('ph-letter').value||'F',0,0);ctx.restore();
    label('物體',xObj,cy+24,p.coral);label(`${state.do.toFixed(1)} cm`,xObj,cy+42,p.coral);
    // opaque barrier with pinhole
    ctx.fillStyle=p.cyan;ctx.globalAlpha=.85;ctx.fillRect(xHole-5,cy-76,10,76-holeR);ctx.fillRect(xHole-5,cy+holeR,10,76-holeR);ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(xHole,cy,holeR+3,0,Math.PI*2);ctx.fillStyle=p.bg;ctx.fill();ctx.beginPath();ctx.arc(xHole,cy,holeR,0,Math.PI*2);ctx.fillStyle=p.gold;ctx.fill();
    label('針孔',xHole,cy-87,p.cyan);
    // screen
    line(xScreen,cy-86,xScreen,cy+86,p.blue,5);
    label('屏幕',xScreen,cy-98,p.blue);label(`${state.di.toFixed(1)} cm`,xScreen,cy+105,p.blue);
    // rays from top and bottom object to aperture and then screen, crossing to form inverted image
    const rays=[[objTop,cy+imageHeight],[cy+physicalHeight,cy-imageHeight]];
    for(const [startY,endY] of rays){
      line(xObj,startY,xHole,cy,p.gold,2.2);
      line(xHole,cy,xScreen,endY,p.gold,2.2,[6,4]);
      if(state.running){
        const total=Math.hypot(xHole-xObj,cy-startY)+Math.hypot(xScreen-xHole,endY-cy), d=(state.phase%1)*total, first=Math.hypot(xHole-xObj,cy-startY);
        let px,py;if(d<first){const t=d/first;px=xObj+(xHole-xObj)*t;py=startY+(cy-startY)*t}else{const t=(d-first)/(total-first);px=xHole+(xScreen-xHole)*t;py=cy+(endY-cy)*t}
        ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fillStyle=p.gold;ctx.shadowColor=p.gold;ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;
      }
    }
    // screen image arrow points down
    line(xScreen,cy,xScreen,imgTip,p.blue,3);ctx.beginPath();ctx.moveTo(xScreen,imgTip);ctx.lineTo(xScreen-8,imgTip-12);ctx.lineTo(xScreen+8,imgTip-12);ctx.closePath();ctx.fillStyle=p.blue;ctx.fill();
    // draggable targets
    ctx.beginPath();ctx.arc(xObj,objTop,12,0,Math.PI*2);ctx.fillStyle=p.coral;ctx.globalAlpha=.12;ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(xScreen,cy,12,0,Math.PI*2);ctx.fillStyle=p.blue;ctx.globalAlpha=.12;ctx.fill();ctx.globalAlpha=1;
    label('拖曳物體或屏幕調整距離',w/2,h-14,p.muted);
    drawPreview(p);
    updateValues(physicalHeight, imageHeight);
  }
  function updateValues(physicalHeight,imageHeight) {
    const mag=state.di/state.do;
    controls.objectDistance.value=state.do;controls.imageDistance.value=state.di;controls.objectHeight.value=state.h;controls.aperture.value=state.hole;
    controls.doValue.textContent=`${state.do.toFixed(1)} cm`;controls.diValue.textContent=`${state.di.toFixed(1)} cm`;
    controls.heightValue.textContent=`${state.h.toFixed(1)} cm`;controls.holeValue.textContent=`${state.hole.toFixed(1)} mm`;
    controls.magnification.textContent=`${mag.toFixed(2)} 倍`;
    controls.imageHeight.textContent=`${(state.h*mag).toFixed(2)} cm`;
    controls.quality.textContent=state.hole<=1.5?'較清晰、較暗':state.hole<=3.5?'亮度與清晰度適中':'較明亮、較模糊';
  }
  function setFromPointer(event) {
    const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left;
    const {scale,holeX}=view;
    if(state.drag==='object')state.do=clamp((holeX-x)/scale,8,35);
    if(state.drag==='screen')state.di=clamp((x-holeX)/scale,8,35);
    state.do=Math.round(state.do*2)/2;state.di=Math.round(state.di*2)/2;render();
  }
  canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,px=x*(view.width/r.width),py=y*(view.height/r.height);if(Math.abs(px-view.objX)<26&&Math.abs(py-view.axis)<100)state.drag='object';else if(Math.abs(px-view.screenX)<25)state.drag='screen';if(state.drag){canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing'}});
  canvas.addEventListener('pointermove',e=>{if(state.drag)setFromPointer(e);else{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*(view.width/r.width);canvas.style.cursor=Math.abs(x-view.objX)<24||Math.abs(x-view.screenX)<24?'grab':'default'}});
  canvas.addEventListener('pointerup',()=>{state.drag=null;canvas.style.cursor='default'});canvas.addEventListener('pointercancel',()=>state.drag=null);
  for(const [input,key] of [[controls.objectDistance,'do'],[controls.imageDistance,'di'],[controls.objectHeight,'h'],[controls.aperture,'hole']])input.addEventListener('input',()=>{state[key]=Number(input.value);render()});
  document.getElementById('ph-letter').addEventListener('input',render);
  controls.animate.addEventListener('click',()=>{state.running=!state.running;controls.animate.textContent=state.running?'暫停光線動畫':'播放光線動畫';controls.animate.setAttribute('aria-pressed',String(state.running))});
  controls.reset.addEventListener('click',()=>{Object.assign(state,{do:20,di:16,h:5,hole:1.2,running:false,phase:0});controls.animate.textContent='播放光線動畫';controls.animate.setAttribute('aria-pressed','false');document.getElementById('ph-letter').value='F';render()});
  function frame(){if(state.running){state.phase+=.004;render()}requestAnimationFrame(frame)}
  window.addEventListener('resize',render);window.addEventListener('themechange',render);
  render();requestAnimationFrame(frame);
})();
