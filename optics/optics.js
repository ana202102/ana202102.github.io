(() => {
  const canvas=document.querySelector('canvas'); if(!canvas)return;
  const ctx=canvas.getContext('2d'), mode=document.body.dataset.mode||'plane';
  const state={distance:mode==='concave'?140:mode==='convex'?160:mode==='convex-lens'||mode==='concave-lens'?140:120,height:72,focal:mode==='concave'?75:mode==='convex'?78:mode==='convex-lens'?70:mode==='concave-lens'?80:0,angle:40,medium1:1,medium2:1.49,rays:true,animate:false};
  const controls=document.querySelector('#controls');
  const config={plane:{title:'平面鏡成像',distance:[50,210,120,1,'物距'],height:[30,100,72,2,'物高']},concave:{title:'凹面鏡成像',distance:[45,210,140,1,'物距'],height:[30,100,72,2,'物高'],focal:[40,115,75,1,'焦距']},convex:{title:'凸面鏡成像',distance:[50,210,160,1,'物距'],height:[30,100,72,2,'物高'],focal:[40,115,78,1,'焦距']},'convex-lens':{title:'凸透鏡成像',distance:[45,210,140,1,'物距'],height:[30,100,72,2,'物高'],focal:[40,115,70,1,'焦距']},'concave-lens':{title:'凹透鏡成像',distance:[45,210,140,1,'物距'],height:[30,100,72,2,'物高'],focal:[40,115,80,1,'焦距']},reflection:{angle:[0,80,40,1,'入射角']},refraction:{angle:[0,80,40,1,'入射角']}}[mode];
  const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function slider(key,spec){return `<label class="control"><span class="control-head"><span>${spec[4]}</span><strong id="${key}-value"></strong></span><input type="range" min="${spec[0]}" max="${spec[1]}" value="${state[key]}" step="${spec[3]}" data-key="${key}"><span class="range-scale"><span>${spec[0]}</span><span>${spec[1]}</span></span></label>`}
  const opticsControls=mode==='reflection'||mode==='refraction'?`${slider('angle',config.angle)}${mode==='refraction'?'<label class="control select-control"><span class="control-head"><span>入射介質 n₁</span></span><select id="medium1"><option value="1">空氣（1.00）</option><option value="1.33">水（1.33）</option><option value="1.5">玻璃（1.50）</option></select></label><label class="control select-control"><span class="control-head"><span>折射介質 n₂</span></span><select id="medium2"><option value="1">空氣（1.00）</option><option value="1.33">水（1.33）</option><option value="1.49" selected>壓克力（1.49）</option><option value="1.5">玻璃（1.50）</option></select></label>':''}`:`${slider('distance',config.distance)}${slider('height',config.height)}${config.focal?slider('focal',config.focal):''}`;
  controls.innerHTML=`<h2>${mode==='reflection'||mode==='refraction'?'調整光線':'調整參數'}</h2>${opticsControls}${mode==='concave'||mode==='convex-lens'?'<div class="control"><span class="control-head"><span>快速觀察成像</span></span><div class="case-buttons"><button class="button" data-case="reduced">倒立縮小</button><button class="button" data-case="enlarged">倒立放大</button><button class="button" data-case="virtual">正立虛像</button></div></div>':''}<label class="toggle"><input type="checkbox" id="rays" checked> 顯示光線與輔助線</label><div class="button-row"><button class="button" id="reset">重設</button><button class="button primary" id="animate">▶ 光線動畫</button></div><div class="readouts" id="readouts"></div><div class="formula" id="formula"></div>`;
  controls.querySelectorAll('input[type=range]').forEach(el=>el.addEventListener('input',()=>{state[el.dataset.key]=+el.value;draw()}));
  for(const id of ['medium1','medium2']){const select=document.querySelector(`#${id}`);if(select)select.addEventListener('change',()=>{state[id]=+select.value;draw()})}
  controls.querySelectorAll('[data-case]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.case==='reduced'){state.focal=60;state.distance=150}else if(button.dataset.case==='enlarged'){state.focal=60;state.distance=90}else{state.focal=115;state.distance=45}controls.querySelector('[data-key="distance"]').value=state.distance;controls.querySelector('[data-key="focal"]').value=state.focal;draw()}));
  document.querySelector('#rays').addEventListener('change',e=>{state.rays=e.target.checked;draw()});
  document.querySelector('#reset').addEventListener('click',()=>{controls.querySelectorAll('input[type=range]').forEach(el=>{state[el.dataset.key]=+el.defaultValue;el.value=el.defaultValue});state.medium1=1;state.medium2=1.49;const m1=document.querySelector('#medium1'),m2=document.querySelector('#medium2');if(m1)m1.value='1';if(m2)m2.value='1.49';state.rays=true;state.animate=false;document.querySelector('#rays').checked=true;document.querySelector('#animate').textContent='▶ 光線動畫';draw()});
  document.querySelector('#animate').addEventListener('click',e=>{state.animate=!state.animate;e.currentTarget.textContent=state.animate?'Ⅱ 暫停動畫':'▶ 光線動畫';draw()});
  let dragging=false;
  function canvasPoint(event){const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,law=mode==='reflection'||mode==='refraction',s=law?Math.min((w-80)/430,(h-80)/410):Math.min((w-100)/430,(h-95)/250);return{x:(event.clientX-rect.left-w*.5)/(s||1),y:(event.clientY-rect.top-h*(law ? .52 : .57))/(s||1),s:s||1,w,h}}
  function objectGeometry(){const rect=canvas.getBoundingClientRect(),s=Math.min((rect.width-100)/430,(rect.height-95)/250)||1,axisX=mode==='plane'||mode==='convex-lens'||mode==='concave-lens'?0:110;return{ox:axisX-state.distance*1.1,tipY:-state.height*.95,s}}
  canvas.addEventListener('pointerdown',event=>{const p=canvasPoint(event);if(mode==='reflection'||mode==='refraction'){const a=state.angle*Math.PI/180,x=-Math.sin(a)*180,y=-Math.cos(a)*180;if(Math.hypot(p.x-x,p.y-y)<25)dragging='angle'}else{const o=objectGeometry();if(Math.abs(p.x-o.ox)<16&&p.y>-Math.abs(o.tipY)-20&&p.y<18)dragging='object'}if(dragging){canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';event.preventDefault()}});
  canvas.addEventListener('pointermove',event=>{const p=canvasPoint(event);if(dragging==='angle'){if(p.y<0){state.angle=Math.round(Math.max(0,Math.min(80,Math.atan2(Math.abs(p.x),-p.y)*180/Math.PI)));controls.querySelector('[data-key="angle"]').value=state.angle;draw()}}else if(dragging==='object'){const o=objectGeometry(),mirrorX=mode==='plane'||mode==='convex-lens'||mode==='concave-lens'?0:110,min=config.distance[0],max=config.distance[1];state.distance=Math.round(Math.min(max,Math.max(min,(mirrorX-p.x)/1.1)));const slider=controls.querySelector('[data-key="distance"]');slider.value=state.distance;draw()}else if(mode==='reflection'||mode==='refraction'){const a=state.angle*Math.PI/180,x=-Math.sin(a)*180,y=-Math.cos(a)*180;canvas.style.cursor=Math.hypot(p.x-x,p.y-y)<25?'grab':'default'}else{const o=objectGeometry();canvas.style.cursor=Math.abs(p.x-o.ox)<16&&p.y>-Math.abs(o.tipY)-20&&p.y<18?'grab':'default'}});
  canvas.addEventListener('pointerup',()=>{dragging=false;canvas.style.cursor='default'});canvas.addEventListener('pointercancel',()=>{dragging=false;canvas.style.cursor='default'});
  let phase=0;function frame(){if(state.animate){phase=(phase+.035)%1;draw()}requestAnimationFrame(frame)}requestAnimationFrame(frame);
  const makePalette=()=>document.documentElement.dataset.theme==='dark'?{ink:'#e4edf4',muted:'#a0b2c1',blue:'#72b5fa',cyan:'#64d5dc',coral:'#ff8e7d',gold:'#ffd071',grid:'#2a3945',axis:'#7f93a2',hatch:'#39727a',goldSoft:'#ffd071',coralSoft:'#ff8e7d',secondary:'#9aabba',protractor:'#526674',tickMajor:'#b1c1cc',tick:'#718492',topBg:'#17232d',bottomBg:'#1b2d37',glass:'#6bb7ca99',lens:'#5395a477'}:{ink:'#19314a',muted:'#91a2ae',blue:'#2878c8',cyan:'#33b6c4',coral:'#ef725f',gold:'#e8ad43',grid:'#eaf0f4',axis:'#9aabb7',hatch:'#8bcbd0',goldSoft:'#efb949',coralSoft:'#ef725f',secondary:'#8295a3',protractor:'#b7c8d3',tickMajor:'#6e8494',tick:'#a8b8c4',topBg:'#f7fafc',bottomBg:'#f1f6f8',glass:'#cce7ef99',lens:'#d8f1f099'};
  let colors=makePalette();
  function line(x1,y1,x2,y2,color,width=2,dash=[]){ctx.beginPath();ctx.setLineDash(dash);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([])}
  function arrow(x,y,tipY,color,label){line(x,y,x,tipY,color,3);const d=tipY<y?1:-1;ctx.beginPath();ctx.moveTo(x,tipY);ctx.lineTo(x-6,tipY+d*12);ctx.lineTo(x+6,tipY+d*12);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.fillStyle=color;ctx.font='600 12px "Noto Sans TC",sans-serif';ctx.textAlign='center';ctx.fillText(label,x,tipY+(tipY<y?-12:20))}
  function label(text,x,y,color=colors.muted,align='center'){ctx.fillStyle=color;ctx.font='12px "Noto Sans TC",sans-serif';ctx.textAlign=align;ctx.fillText(text,x,y)}
  function dot(x,y,color,r=4){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
  function rayHead(x,y,direction,color){ctx.beginPath();ctx.moveTo(x+direction*5,y);ctx.lineTo(x-direction*3,y-3);ctx.lineTo(x-direction*3,y+3);ctx.closePath();ctx.fillStyle=color;ctx.fill()}
  function vectorHead(x,y,dx,dy,color){const length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length,px=-uy,py=ux;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-ux*10+px*4,y-uy*10+py*4);ctx.lineTo(x-ux*10-px*4,y-uy*10-py*4);ctx.closePath();ctx.fillStyle=color;ctx.fill()}
  function lawArc(radius,start,end,color,anticlockwise){ctx.beginPath();ctx.arc(0,0,radius,start,end,anticlockwise);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke()}
  function drawProtractor(){const radius=154,upperOnly=mode==='reflection';ctx.beginPath();if(upperOnly)ctx.arc(0,0,radius,Math.PI,Math.PI*2);else ctx.arc(0,0,radius,0,Math.PI*2);ctx.strokeStyle=colors.protractor;ctx.lineWidth=1;ctx.stroke();for(let deg=0;deg<360;deg+=2){if(upperOnly&&deg>180)continue;const rad=deg*Math.PI/180-Math.PI/2,major=deg%30===0,medium=deg%10===0,inner=radius-(major?13:medium?8:4);line(Math.sin(rad)*inner,-Math.cos(rad)*inner,Math.sin(rad)*radius,-Math.cos(rad)*radius,major?colors.tickMajor:colors.tick,major?1.3:.7)}for(let deg=0;deg<360;deg+=30){if(upperOnly&&deg>180)continue;const rad=deg*Math.PI/180-Math.PI/2,val=deg<=90?deg:deg<=180?180-deg:deg<=270?deg-180:360-deg;label(String(val),Math.sin(rad)*(radius-24),-Math.cos(rad)*(radius-24)+4,colors.ink)}}
  function drawLaw(){const angle=state.angle*Math.PI/180,rayLen=183,radius=154;
    ctx.fillStyle=colors.topBg;ctx.fillRect(-230,-210,460,210);ctx.fillStyle=mode==='reflection'?colors.topBg:colors.bottomBg;ctx.fillRect(-230,0,460,210);
    if(mode==='refraction'){ctx.beginPath();ctx.arc(0,0,132,0,Math.PI);ctx.closePath();ctx.fillStyle=colors.glass;ctx.fill();ctx.strokeStyle=colors.protractor;ctx.lineWidth=1.5;ctx.stroke()}
    drawProtractor();line(-205,0,205,0,colors.axis,1.5);line(0,-185,0,mode==='reflection'?0:185,colors.cyan,1.6,[5,5]);label('法線',10,-174,colors.cyan,'left');
    const sx=-Math.sin(angle)*rayLen,sy=-Math.cos(angle)*rayLen;
    if(mode==='reflection'){
      const rx=Math.sin(angle)*rayLen,ry=-Math.cos(angle)*rayLen;
      line(sx,sy,0,0,colors.gold,3);vectorHead(-Math.sin(angle)*24,-Math.cos(angle)*24,Math.sin(angle),Math.cos(angle),colors.gold);
      line(0,0,rx,ry,colors.coral,3);vectorHead(rx*.75,ry*.75,Math.sin(angle),-Math.cos(angle),colors.coral);
      lawArc(39,-Math.PI/2,-Math.PI/2-angle,colors.gold,true);lawArc(39,-Math.PI/2,-Math.PI/2+angle,colors.coral,false);
      const lx=Math.sin(angle/2)*58,ly=-Math.cos(angle/2)*58;label(`θᵢ ${state.angle}°`,-lx,ly,colors.gold);label(`θᵣ ${state.angle}°`,lx,ly,colors.coral);
      dot(0,0,colors.ink,4);label('反射面',0,19,colors.muted);
      if(state.animate){const t=phase;dot(sx*(1-t),sy*(1-t),colors.gold,4)}
      update([["入射角 θᵢ",`${state.angle}°`],["反射角 θᵣ",`${state.angle}°`],["角度關係",'θᵢ ＝ θᵣ'],["光路",'入射線與反射線']],'<b>反射定律：</b> 入射角等於反射角。<br>角度皆以法線為基準，鏡面上的入射線與反射線位於法線兩側。');
    }else{
      const n1=state.medium1,n2=state.medium2,sin2=n1*Math.sin(angle)/n2,tir=sin2>1,angle2=tir?null:Math.asin(Math.min(1,sin2)),r2=angle2??0;
      const mediumNames={'1':'空氣','1.33':'水','1.49':'壓克力','1.5':'玻璃'};
      line(sx,sy,0,0,colors.gold,3);vectorHead(sx*.25,sy*.25,Math.sin(angle),Math.cos(angle),colors.gold);
      label(`${mediumNames[String(n1)]||'介質'} n₁=${n1.toFixed(2)}`,-95,-168,colors.muted,'left');label(`${mediumNames[String(n2)]||'介質'} n₂=${n2.toFixed(2)}`,-95,177,colors.muted,'left');
      if(!tir){const tx=Math.sin(r2)*rayLen,ty=Math.cos(r2)*rayLen;line(0,0,tx,ty,colors.blue,3);vectorHead(tx*.65,ty*.65,Math.sin(r2),Math.cos(r2),colors.blue);lawArc(39,Math.PI/2,Math.PI/2-r2,colors.blue,true);label(`θ₂ ${fmt(r2*180/Math.PI)}°`,Math.sin(r2/2)*60,Math.cos(r2/2)*60+5,colors.blue)}else{const rx=Math.sin(angle)*rayLen,ry=-Math.cos(angle)*rayLen;line(0,0,rx,ry,colors.coral,2.5);label('全反射',75,-25,colors.coral)}
      lawArc(39,-Math.PI/2,-Math.PI/2-angle,colors.gold,true);label(`θ₁ ${state.angle}°`,-Math.sin(angle/2)*60,-Math.cos(angle/2)*60,colors.gold);dot(0,0,colors.ink,4);
      if(state.animate){const t=phase;dot(sx*(1-t),sy*(1-t),colors.gold,4)}
      const critical=n1>n2?Math.asin(n2/n1)*180/Math.PI:null;
      update([["入射角 θ₁",`${state.angle}°`],["折射角 θ₂",tir?'—':`${fmt(r2*180/Math.PI)}°`],["折射率 n₁ → n₂",`${n1.toFixed(2)} → ${n2.toFixed(2)}`],["光路狀態",tir?`全反射（臨界角 ${fmt(critical)}°）`:'折射']],`<b>折射定律：</b> n₁ sin θ₁ ＝ n₂ sin θ₂<br>${tir?'入射角大於臨界角，光線在介面發生全反射。':'角度由法線量起；選擇不同介質可比較折射方向。'}`);
    }
    label('入射光由左上方射向介面',0,-197,colors.muted);
  }
  function draw(){const dpr=window.devicePixelRatio||1,box=canvas.getBoundingClientRect();if(!box.width)return;canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box.width,box.height);
    const lawMode=mode==='reflection'||mode==='refraction',w=box.width,h=box.height,cx=w*.5,cy=h*(lawMode ? .52 : .57),scale=lawMode?Math.min((w-80)/430,(h-80)/410):Math.min((w-100)/430,(h-95)/250),s=scale||1;ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);
    if(lawMode){drawLaw();ctx.restore();return}
    for(let x=-210;x<=210;x+=42)line(x,-140,x,140,colors.grid,1);for(let y=-126;y<=126;y+=42)line(-215,y,215,y,colors.grid,1);
    line(-220,0,220,0,'#9aabb7',1.2);label('主光軸',195,17,colors.muted,'right');
    const u=state.distance*1.1,ho=state.height*.95, f=state.focal*1.1;
    let mirrorX=mode==='plane'||mode==='convex-lens'||mode==='concave-lens'?0:110;
    if(mode==='plane'){
      line(mirrorX,-130,mirrorX,130,colors.cyan,4);for(let y=-120;y<=120;y+=16)line(mirrorX,y,mirrorX-9,y+10,colors.hatch,1.2);
      const ox=mirrorX-u,ix=mirrorX+u;arrow(ox,0,-ho,colors.coral,'物');arrow(ix,0,-ho,colors.blue,'像');
      if(state.rays){for(const q of [.34,.67,1]){const rayY=-ho*q;line(ox,rayY,mirrorX,rayY,colors.gold,1.6);rayHead(mirrorX-4,rayY,1,colors.gold);rayHead(ox+u*.4,rayY,-1,colors.gold);line(mirrorX,rayY,ix,rayY,colors.goldSoft,1.4,[5,5]);dot(mirrorX,rayY,colors.gold,3)}}
      label('平面鏡',mirrorX,151,colors.cyan);label(`物距 ${state.distance}`,ox,22,colors.coral);label(`像距 ${state.distance}`,ix,22,colors.blue);
      update([["物距 u",`${state.distance} cm`],["像距 v",`${state.distance} cm`],["像高 h′",`${state.height} cm`],["放大率 m",'＋1.00']],'<b>平面鏡：</b> v ＝ u，像與物等大、正立，且為虛像。');
    } else if(mode==='convex-lens'||mode==='concave-lens'){
      const vertex=0,converging=mode==='convex-lens',fSigned=(converging?1:-1)*f;
      ctx.beginPath();if(converging){ctx.moveTo(vertex,-120);ctx.quadraticCurveTo(vertex-20,0,vertex,120);ctx.quadraticCurveTo(vertex+20,0,vertex,-120)}else{ctx.moveTo(vertex-15,-120);ctx.quadraticCurveTo(vertex+1,0,vertex-15,120);ctx.lineTo(vertex+15,120);ctx.quadraticCurveTo(vertex-1,0,vertex+15,-120)}ctx.closePath();ctx.fillStyle=colors.lens;ctx.fill();ctx.strokeStyle=colors.cyan;ctx.lineWidth=3;ctx.stroke();
      const F1=vertex-f,F2=vertex+f;dot(F1,0,colors.gold,4);dot(F2,0,colors.gold,4);label('F',F1,18,colors.gold);label('F′',F2,18,colors.gold);label(converging?'凸透鏡':'凹透鏡',vertex,151,colors.cyan);
      const ox=vertex-u;let v,m;if(converging){v=u*f/(u-f);m=-v/u}else{v=-u*f/(u+f);m=-v/u}
      const iy=-ho*m,ix=vertex+v,visibleImage=Number.isFinite(v)&&Math.abs(v)<1200,virtual=v<0;
      arrow(ox,0,-ho,colors.coral,'物');if(visibleImage)arrow(ix,0,iy,colors.blue,'像');
      if(state.rays){const top=-ho,outSlope=ho/fSigned,endX=vertex+135;
        line(ox,top,vertex,top,colors.gold,1.6);rayHead(vertex+4,top,1,colors.gold);
        if(converging&&!virtual){if(visibleImage)line(vertex,top,ix,iy,colors.gold,1.5);else line(vertex,top,endX,top+outSlope*(endX-vertex),colors.gold,1.5)}else{line(vertex,top,endX,top+outSlope*(endX-vertex),colors.gold,1.5);if(visibleImage)line(vertex,top,ix,iy,colors.goldSoft,1.4,[5,5])}
        line(ox,top,vertex,0,colors.coral,1.4);
        if(visibleImage&&!virtual)line(vertex,0,ix,iy,colors.coral,1.5);else{const centerSlope=ho/u;line(vertex,0,endX,centerSlope*(endX-vertex),colors.coral,1.4);if(visibleImage)line(vertex,0,ix,iy,colors.coralSoft,1.4,[5,5])}
        dot(vertex,top,colors.gold,3);dot(vertex,0,colors.coral,3);
      }
      label(`物距 ${state.distance}`,ox,22,colors.coral);if(visibleImage)label(`像距 ${fmt(Math.abs(v)/1.1)} cm`,ix,22,colors.blue);else label('像距超出圖示範圍',converging?-170:165,22,colors.blue);
      let status;if(!converging)status='正立・縮小・虛像';else if(Math.abs(u-f)<.6)status='焦點上・像在無限遠';else if(u<f)status='正立・放大・虛像';else if(Math.abs(u-2*f)<.6)status='倒立・等大・實像';else if(u<2*f)status='倒立・放大・實像';else status='倒立・縮小・實像';
      update([["物距 u",`${state.distance} cm`],["像距 v",`${fmt(Math.abs(v)/1.1)} cm${virtual?'（虛）':''}`],["物高 h",`${state.height} cm`],["像高 h′",`${fmt(state.height*Math.abs(m))} cm`],["放大率 m",`${fmt(Math.abs(m))} ${m<0?'×（倒立）':'×'}`],["成像狀態",status]],`<b>薄透鏡公式：</b> 1／f ＝ 1／u ＋ 1／v<br><b>放大率：</b> m ＝ −v／u ＝ h′／h<br>焦距 f ＝ ${converging?'':'−'}${state.focal} cm`);
    } else {
      const vertex=mirrorX;const edge=mode==='concave'?vertex+28:vertex-28,control=mode==='concave'?vertex-28:vertex+28;ctx.beginPath();ctx.moveTo(edge,-120);ctx.quadraticCurveTo(control,0,edge,120);ctx.strokeStyle=colors.cyan;ctx.lineWidth=5;ctx.stroke();
      for(let yy=-110;yy<=110;yy+=17){const xx=vertex+(mode==='concave'?-1:1)*(29*(1-(yy/120)**2));line(xx,yy,xx+(mode==='concave'?-9:9),yy+9,colors.hatch,1.2)}
      const F=mode==='concave'?vertex-f:vertex+f,C=mode==='concave'?vertex-2*f:vertex+2*f;
      dot(F,0,colors.gold,4);dot(C,0,colors.secondary,3);label('F',F,18,colors.gold);label('C',C,18,colors.secondary);label(mode==='concave'?'凹面鏡':'凸面鏡',vertex,151,colors.cyan);
      const ox=vertex-u;let v,m;
      if(mode==='concave'){v=(u*f)/(u-f);m=-v/u}else{v=-(u*f)/(u+f);m=-v/u}
      const iy=-ho*m,ix=vertex-v,visibleImage=Number.isFinite(v)&&Math.abs(v)<1200;
      arrow(ox,0,-ho,colors.coral,'物');if(visibleImage)arrow(ix,0,iy,colors.blue,'像');
      if(state.rays&&mode==='concave'){
        const top=-ho;
        // Principal ray 1: parallel to the axis, then through F (or its virtual extension).
        line(ox,top,vertex,top,colors.gold,1.6);rayHead(vertex-4,top,1,colors.gold);
        if(v>0){if(visibleImage)line(vertex,top,ix,iy,colors.gold,1.5);else line(vertex,top,F,0,colors.gold,1.5)}else{line(vertex,top,F,0,colors.gold,1.5);if(visibleImage)line(vertex,top,ix,iy,colors.goldSoft,1.4,[5,5])}
        // Principal ray 2: through the vertex; its reflected path and backward extension meet at the image.
        line(ox,top,vertex,0,colors.coral,1.4);
        if(visibleImage&&v>0)line(vertex,0,ix,iy,colors.coral,1.5);else{const endX=vertex-125,slope=Number.isFinite(v)?iy/(ix-vertex):0;line(vertex,0,endX,slope*(endX-vertex),colors.coral,1.4);if(visibleImage)line(vertex,0,ix,iy,colors.coralSoft,1.4,[5,5])}
        dot(vertex,top,colors.gold,3);dot(vertex,0,colors.coral,3);
      }else if(state.rays){const top=-ho;const rimX=vertex;const focusRayY=top*(1-(rimX-ox)/(F-ox));
        line(ox,top,vertex,top,colors.gold,1.6);if(mode==='convex')line(vertex,top,vertex-135,top+(vertex-135-vertex)*(iy-top)/(ix-vertex),colors.gold,1.5);else line(vertex,top,ix,iy,colors.gold,1.5);
        line(ox,top,F,0,colors.coral,1.4);line(F,0,vertex,top,colors.coral,1.4);
        if(mode==='concave'){line(vertex,top,ix,iy,colors.coral,1.4)}else{line(vertex,top,vertex-125,top+(vertex-125-vertex)*(iy-top)/(ix-vertex),colors.coral,1.4);line(vertex,top,ix,iy,colors.coral,1.4,[5,5]);line(vertex,top,F,0,colors.coral,1.4,[5,5])}
        if(mode==='concave'&&u<f){line(ox,top,vertex,top,colors.gold,1.5);line(vertex,top,ix,iy,colors.gold,1.3);line(vertex,top,ix,iy,colors.coral,1.2,[5,5])}
        dot(vertex,top,colors.gold,3);
      }
      label(`物距 ${state.distance}`,ox,22,colors.coral);if(visibleImage)label(`像距 ${fmt(Math.abs(v)/1.1)} cm`,ix,22,colors.blue);else label('像距超出圖示範圍',mirrorX+120,22,colors.blue);
      const virtual=mode==='convex'||(mode==='concave'&&u<f);let status;
      if(mode==='concave'){if(Math.abs(u-f)<.6)status='焦點上・像在無限遠';else if(u<f)status='正立・放大・虛像';else if(Math.abs(u-2*f)<.6)status='倒立・等大・實像';else if(u<2*f)status='倒立・放大・實像';else status='倒立・縮小・實像'}else status=virtual?'正立・虛像':'倒立・實像';
      update([["物距 u",`${state.distance} cm`],["像距 v",`${fmt(Math.abs(v)/1.1)} cm${virtual?'（虛）':''}`],["放大率 m",`${fmt(Math.abs(m))} ${m<0?'×（倒立）':'×'}`],["成像狀態",status]],`<b>鏡面公式：</b> 1／f ＝ 1／u ＋ 1／v<br><b>放大率：</b> m ＝ −v／u ＝ h′／h<br>焦距 f ＝ ${state.focal} cm`);
    }
    if(state.animate)dot((mirrorX-u)+(mirrorX-(mirrorX-u))*phase,-ho*.8,colors.gold,4);
    ctx.restore();
  }
  function fmt(n){return Number.isFinite(n)?(Math.abs(n)>=100?n.toFixed(0):n.toFixed(1)):'∞'}
  function update(rows,formula){rows.forEach((r,i)=>{const el=document.querySelector(`#readouts .metric:nth-child(${i+1}) strong`);if(el)el.textContent=r[1]});document.querySelector('#readouts').innerHTML=rows.map(r=>`<div class="metric"><span>${htmlEscape(r[0])}</span><strong>${htmlEscape(r[1])}</strong></div>`).join('');document.querySelector('#formula').innerHTML=formula;for(const key of Object.keys(config)){const value=document.querySelector(`#${key}-value`);if(value)value.textContent=`${state[key]}${key==='angle'?'°':' cm'}`}}
  window.addEventListener('resize',draw);window.addEventListener('themechange',()=>{colors=makePalette();draw()});draw();
})();
