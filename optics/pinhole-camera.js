/**
         * 3D 針孔成像光學模擬實驗室 (Three.js + OrbitControls + Dynamic CanvasTexture)
         * 座標系設計：
         * - 針孔擋板位於原點 Z = 0
         * - 發光物體位於 Z > 0 區域 (Z = +do)
         * - 成像屏幕位於 Z < 0 區域 (Z = -di)
         * - 光學主軸高度位於 Y = 3.2
         */
        (function () {
            // --- 1. 模擬狀態 (Simulation State) ---
            const state = {
                char: 'F',
                do: 20.0,           // 物距 (cm) -> 對應 Z = +20.0
                di: 16.0,           // 像距 (cm) -> 對應 Z = -16.0
                objectHeight: 3.4,
                holeSize: 1.2,      // 針孔直徑 (mm)
                showRays: true,     // 顯示 3D 光線
                showCones: true,    // 顯示光錐模糊束
                dragging: null,     // 'object' | 'screen' | null
                hovered: null       // 'object' | 'screen' | null
            };

            const AXIS_Y = 3.2;     // 光學主軸高度
            const OBJ_SIZE = 3.4;   // 3D 發光字母高度
            const SCREEN_SIZE = 8.4;// 3D 成像屏幕邊長

            // --- 2. DOM 元素參照 ---
            const container = document.getElementById('three-container');
            const insetCanvas = document.getElementById('insetPreviewCanvas');
            const insetCtx = insetCanvas.getContext('2d');

            const sliderDo = document.getElementById('slider-do');
            const sliderDi = document.getElementById('slider-di');
            const sliderHeight = document.getElementById('slider-height');
            const sliderHole = document.getElementById('slider-hole');
            const labelDo = document.getElementById('label-do');
            const labelDi = document.getElementById('label-di');
            const labelHeight = document.getElementById('label-height');
            const labelHole = document.getElementById('label-hole');
            const toggleRays = document.getElementById('toggle-rays');
            const toggleCones = document.getElementById('toggle-cones');
            const customLetterInput = document.getElementById('custom-letter');
            const letterBtns = document.querySelectorAll('.letter-btn');
            const btnReset = document.getElementById('btn-reset');

            const valDo = document.getElementById('val-do');
            const valDi = document.getElementById('val-di');
            const valMag = document.getElementById('val-mag');
            const valSizeDesc = document.getElementById('val-size-desc');
            const valNature = document.getElementById('val-nature');
            const valClarity = document.getElementById('val-clarity');
            const hudDo = document.getElementById('hud-do');
            const hudDi = document.getElementById('hud-di');

            const camBtn3D = document.getElementById('cam-3d');
            const camBtnSide = document.getElementById('cam-side');
            const camBtnScreen = document.getElementById('cam-screen');

            // --- 3. Three.js 場景初始化 ---
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x060a14);
            scene.fog = new THREE.FogExp2(0x060a14, 0.0085);

            const camera = new THREE.PerspectiveCamera(
                42,
                container.clientWidth / container.clientHeight,
                0.1,
                300
            );
            camera.position.set(28, 17, 26);

            const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);

            // OrbitControls
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.target.set(0, AXIS_Y - 0.5, 2);
            controls.enableDamping = true;
            controls.dampingFactor = 0.06;
            controls.minDistance = 8;
            controls.maxDistance = 85;
            controls.maxPolarAngle = Math.PI * 0.49;
            controls.update();

            // 燈光配置
            const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.65);
            scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
            dirLight.position.set(18, 32, 22);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 1024;
            dirLight.shadow.mapSize.height = 1024;
            scene.add(dirLight);

            const backFillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
            backFillLight.position.set(-20, 15, -25);
            scene.add(backFillLight);

            // 發光物體局部點光源
            const objectPointLight = new THREE.PointLight(0xfbbf24, 1.4, 22);
            scene.add(objectPointLight);

            // --- 4. 建立實驗室地板與光學滑軌 (Optical Bench) ---
            const gridHelper = new THREE.GridHelper(110, 55, 0x1e293b, 0x0f172a);
            gridHelper.position.y = -0.02;
            scene.add(gridHelper);

            // 光學長滑軌底座 (Z: -38 ~ +38)
            const railLength = 76;
            const railGeo = new THREE.BoxGeometry(2.6, 0.45, railLength);
            const railMat = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                metalness: 0.65,
                roughness: 0.35
            });
            const opticalRail = new THREE.Mesh(railGeo, railMat);
            opticalRail.position.set(0, 0.225, 0);
            opticalRail.receiveShadow = true;
            scene.add(opticalRail);

            // 滑軌中央金屬導槽
            const grooveGeo = new THREE.BoxGeometry(0.6, 0.48, railLength - 0.5);
            const grooveMat = new THREE.MeshStandardMaterial({
                color: 0x475569,
                metalness: 0.8,
                roughness: 0.2
            });
            const railGroove = new THREE.Mesh(grooveGeo, grooveMat);
            railGroove.position.set(0, 0.24, 0);
            scene.add(railGroove);

            // 滑軌刻度標記 (每 5 cm 一條)
            for (let z = -35; z <= 35; z += 5) {
                const isMajor = z % 10 === 0;
                const tickGeo = new THREE.BoxGeometry(isMajor ? 2.66 : 2.62, 0.04, isMajor ? 0.16 : 0.08);
                const tickMat = new THREE.MeshBasicMaterial({
                    color: z === 0 ? 0x38bdf8 : (isMajor ? 0x94a3b8 : 0x475569)
                });
                const tick = new THREE.Mesh(tickGeo, tickMat);
                tick.position.set(0, 0.46, z);
                scene.add(tick);
            }

            // 主光軸虛線 (Optical Axis)
            const axisPoints = [new THREE.Vector3(0, AXIS_Y, -37), new THREE.Vector3(0, AXIS_Y, 37)];
            const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPoints);
            const axisMat = new THREE.LineDashedMaterial({
                color: 0x64748b,
                dashSize: 0.7,
                gapSize: 0.5,
                transparent: true,
                opacity: 0.55
            });
            const opticalAxisLine = new THREE.Line(axisGeo, axisMat);
            opticalAxisLine.computeLineDistances();
            scene.add(opticalAxisLine);

            // --- 5. 建立針孔擋板 (Z = 0, 具真實圓孔開口) ---
            const barrierGroup = new THREE.Group();
            scene.add(barrierGroup);

            // 擋板底座
            const barrierStand = new THREE.Mesh(
                new THREE.BoxGeometry(3.2, 0.6, 1.4),
                new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.45, roughness: 0.45 })
            );
            barrierStand.position.set(0, 0.55, 0);
            barrierGroup.add(barrierStand);

            let barrierPlateMesh = null;
            let pinholeRingMesh = null;

            function rebuildPinholeBarrier() {
                if (barrierPlateMesh) {
                    barrierGroup.remove(barrierPlateMesh);
                    barrierPlateMesh.geometry.dispose();
                }
                if (pinholeRingMesh) {
                    barrierGroup.remove(pinholeRingMesh);
                    pinholeRingMesh.geometry.dispose();
                }

                const plateW = 9.0;
                const plateH = 7.6;
                // 將 mm 映射到 3D 視覺孔徑半徑，確保小孔可見、大孔明顯
                const visualHoleRadius = Math.max(0.14, state.holeSize * 0.22);

                const plateShape = new THREE.Shape();
                plateShape.moveTo(-plateW / 2, -plateH / 2);
                plateShape.lineTo(plateW / 2, -plateH / 2);
                plateShape.lineTo(plateW / 2, plateH / 2);
                plateShape.lineTo(-plateW / 2, plateH / 2);
                plateShape.closePath();

                // 中央針孔圓形挖空
                const holePath = new THREE.Path();
                holePath.absarc(0, 0, visualHoleRadius, 0, Math.PI * 2, true);
                plateShape.holes.push(holePath);

                const extrudeSettings = {
                    depth: 0.22,
                    bevelEnabled: true,
                    bevelThickness: 0.03,
                    bevelSize: 0.03,
                    bevelSegments: 2,
                    curveSegments: 32
                };

                const plateGeo = new THREE.ExtrudeGeometry(plateShape, extrudeSettings);
                plateGeo.translate(0, 0, -0.11);
                const plateMat = new THREE.MeshStandardMaterial({
                    color: 0x71717a,
                    metalness: 0.25,
                    roughness: 0.55,
                    side: THREE.DoubleSide
                });

                barrierPlateMesh = new THREE.Mesh(plateGeo, plateMat);
                barrierPlateMesh.position.set(0, AXIS_Y, 0);
                barrierPlateMesh.castShadow = true;
                barrierPlateMesh.receiveShadow = true;
                barrierGroup.add(barrierPlateMesh);

                // 針孔內圈金屬高亮環
                const ringGeo = new THREE.RingGeometry(visualHoleRadius, visualHoleRadius + 0.07, 32);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0x38bdf8,
                    side: THREE.DoubleSide
                });
                pinholeRingMesh = new THREE.Mesh(ringGeo, ringMat);
                pinholeRingMesh.position.set(0, AXIS_Y, 0.145);
                barrierGroup.add(pinholeRingMesh);
            }

            // --- 6. 建立 3D 發光物體 (可沿 +Z 軸拖曳) ---
            const objectGroup = new THREE.Group();
            objectGroup.position.set(0, 0, state.do);
            scene.add(objectGroup);

            // 滑塊底座
            const objSliderMat = new THREE.MeshStandardMaterial({
                color: 0xd97706,
                emissive: 0x78350f,
                emissiveIntensity: 0.35,
                metalness: 0.4,
                roughness: 0.3
            });
            const objSliderMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.72, 2.4), objSliderMat);
            objSliderMesh.position.set(0, 0.58, 0);
            objSliderMesh.castShadow = true;
            objectGroup.add(objSliderMesh);

            // 滑軌兩側發光拖曳把手 (視覺提示可左右前後滑動)
            const objHandleMat = new THREE.MeshStandardMaterial({
                color: 0xfbbf24,
                emissive: 0xf59e0b,
                emissiveIntensity: 0.55,
                roughness: 0.25
            });
            const objHandleLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 2.65), objHandleMat);
            objHandleLeft.position.set(-1.95, 0.58, 0);
            objectGroup.add(objHandleLeft);

            const objHandleRight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 2.65), objHandleMat);
            objHandleRight.position.set(1.95, 0.58, 0);
            objectGroup.add(objHandleRight);

            // 垂直支撐桿
            const objRodMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.16, 0.2, AXIS_Y - OBJ_SIZE / 2 - 0.5, 16),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.25 })
            );
            objRodMesh.position.set(0, (AXIS_Y - OBJ_SIZE / 2 + 0.5) / 2, 0);
            objectGroup.add(objRodMesh);

            // 加大透明隱形碰撞盒 (使用 transparent: true, opacity: 0 確保 Raycaster 100% 命中)
            const objHitbox = new THREE.Mesh(
                new THREE.BoxGeometry(5.6, 7.2, 4.4),
                new THREE.MeshBasicMaterial({
                    color: 0xfbbf24,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false
                })
            );
            objHitbox.position.set(0, 3.2, 0);
            objHitbox.userData.dragType = 'object';
            objectGroup.add(objHitbox);

            // 動態生成 3D 發光字母與四個頂點色標 (左上紅、右上黃、左下藍、右下綠)
            let letterMesh = null;
            const vertexMarkers = [];

            // 定義常見不對稱字母的 3D 擠出多邊形輪廓 (X 軸朝右為正、Y 軸朝上為正)
            function createLetterShape(char) {
                const s = new THREE.Shape();
                const w = 1.05; // 半寬
                const h = 1.65; // 半高
                const t = 0.46; // 筆畫厚度

                switch (char) {
                    case 'F':
                        s.moveTo(-w, -h);
                        s.lineTo(-w + t, -h);
                        s.lineTo(-w + t, 0.05);
                        s.lineTo(w * 0.65, 0.05);
                        s.lineTo(w * 0.65, 0.05 + t * 0.9);
                        s.lineTo(-w + t, 0.05 + t * 0.9);
                        s.lineTo(-w + t, h - t);
                        s.lineTo(w, h - t);
                        s.lineTo(w, h);
                        s.lineTo(-w, h);
                        s.closePath();
                        return s;

                    case 'P':
                        s.moveTo(-w, -h);
                        s.lineTo(-w + t, -h);
                        s.lineTo(-w + t, -0.05);
                        s.lineTo(w * 0.6, -0.05);
                        s.quadraticCurveTo(w * 1.15, -0.05, w * 1.15, h * 0.48);
                        s.quadraticCurveTo(w * 1.15, h, w * 0.6, h);
                        s.lineTo(-w, h);
                        s.closePath();
                        const holeP = new THREE.Path();
                        holeP.moveTo(-w + t, 0.35);
                        holeP.lineTo(w * 0.45, 0.35);
                        holeP.quadraticCurveTo(w * 0.72, 0.35, w * 0.72, h * 0.48);
                        holeP.quadraticCurveTo(w * 0.72, h - 0.38, w * 0.45, h - 0.38);
                        holeP.lineTo(-w + t, h - 0.38);
                        holeP.closePath();
                        s.holes.push(holeP);
                        return s;

                    case 'R':
                        s.moveTo(-w, -h);
                        s.lineTo(-w + t, -h);
                        s.lineTo(-w + t, -0.05);
                        s.lineTo(0.05, -0.05);
                        s.lineTo(w * 0.65, -h);
                        s.lineTo(w * 1.15, -h);
                        s.lineTo(0.5, 0.02);
                        s.quadraticCurveTo(w * 1.1, 0.18, w * 1.1, h * 0.55);
                        s.quadraticCurveTo(w * 1.1, h, w * 0.55, h);
                        s.lineTo(-w, h);
                        s.closePath();
                        const holeR = new THREE.Path();
                        holeR.moveTo(-w + t, 0.35);
                        holeR.lineTo(w * 0.42, 0.35);
                        holeR.quadraticCurveTo(w * 0.68, 0.35, w * 0.68, h * 0.52);
                        holeR.quadraticCurveTo(w * 0.68, h - 0.36, w * 0.42, h - 0.36);
                        holeR.lineTo(-w + t, h - 0.36);
                        holeR.closePath();
                        s.holes.push(holeR);
                        return s;

                    case 'K':
                        s.moveTo(-w, -h);
                        s.lineTo(-w + t, -h);
                        s.lineTo(-w + t, -0.15);
                        s.lineTo(w * 0.65, -h);
                        s.lineTo(w * 1.15, -h);
                        s.lineTo(0.05, 0.05);
                        s.lineTo(w * 1.1, h);
                        s.lineTo(w * 0.58, h);
                        s.lineTo(-w + t, 0.25);
                        s.lineTo(-w + t, h);
                        s.lineTo(-w, h);
                        s.closePath();
                        return s;

                    default:
                        return null;
                }
            }

            function rebuild3DLetter() {
                if (letterMesh) {
                    objectGroup.remove(letterMesh);
                    if (letterMesh.geometry) letterMesh.geometry.dispose();
                    if (letterMesh.material) {
                        if (letterMesh.material.map) letterMesh.material.map.dispose();
                        letterMesh.material.dispose();
                    }
                }

                const shape = createLetterShape(state.char);

                if (shape) {
                    // 使用真正 3D 擠出幾何體 (ExtrudeGeometry)
                    const geo = new THREE.ExtrudeGeometry(shape, {
                        depth: 0.42,
                        bevelEnabled: true,
                        bevelThickness: 0.05,
                        bevelSize: 0.04,
                        bevelSegments: 2
                    });
                    geo.translate(0, 0, -0.21);

                    const mat = new THREE.MeshStandardMaterial({
                        color: 0xfef08a,
                        emissive: 0xf59e0b,
                        emissiveIntensity: 0.85,
                        roughness: 0.25,
                        metalness: 0.1
                    });
                    letterMesh = new THREE.Mesh(geo, mat);
                    letterMesh.position.set(0, AXIS_Y, 0);
                    objectGroup.add(letterMesh);
                } else {
                    // 對於 G 或任意自訂字元，建立帶發光高解析紋理的 3D 燈箱字牌
                    const c = document.createElement('canvas');
                    c.width = 256;
                    c.height = 256;
                    const ctx = c.getContext('2d');
                    ctx.clearRect(0, 0, 256, 256);

                    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
                    ctx.lineWidth = 8;
                    ctx.strokeRect(16, 16, 224, 224);

                    ctx.font = 'bold 185px Inter, "Noto Sans TC", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#f59e0b';
                    ctx.shadowBlur = 22;
                    ctx.fillStyle = '#fef08a';
                    ctx.fillText(state.char, 128, 134);

                    const tex = new THREE.CanvasTexture(c);
                    const geo = new THREE.BoxGeometry(2.4, OBJ_SIZE, 0.36);
                    const mat = new THREE.MeshStandardMaterial({
                        map: tex,
                        emissiveMap: tex,
                        emissive: 0xfbbf24,
                        emissiveIntensity: 0.95,
                        transparent: true,
                        roughness: 0.2
                    });
                    letterMesh = new THREE.Mesh(geo, mat);
                    letterMesh.position.set(0, AXIS_Y, 0);
                    objectGroup.add(letterMesh);
                }
            }

            // 建立物體四個角點發光標記球 (讓使用者在 3D 中明確追踪上下左右翻轉)
            const cornerConfigs = [
                { name: 'topLeft',     x: -1.05, baseY: 1.65, y: AXIS_Y + 1.65, color: 0xf43f5e }, // 左上：紅
                { name: 'topRight',    x:  1.05, baseY: 1.65, y: AXIS_Y + 1.65, color: 0xfbbf24 }, // 右上：黃
                { name: 'bottomLeft',  x: -1.05, baseY: -1.65, y: AXIS_Y - 1.65, color: 0x38bdf8 }, // 左下：藍
                { name: 'bottomRight', x:  1.05, baseY: -1.65, y: AXIS_Y - 1.65, color: 0x34d399 }  // 右下：綠
            ];

            cornerConfigs.forEach((cfg) => {
                const dot = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 16, 16),
                    new THREE.MeshBasicMaterial({ color: cfg.color })
                );
                dot.position.set(cfg.x, cfg.y, 0);
                objectGroup.add(dot);
                vertexMarkers.push({ ...cfg, mesh: dot });
            });

            // --- 7. 建立 3D 成像屏幕 (可沿 -Z 軸拖曳) ---
            const screenGroup = new THREE.Group();
            screenGroup.position.set(0, 0, -state.di);
            scene.add(screenGroup);

            // 屏幕底座滑塊
            const scrSliderMat = new THREE.MeshStandardMaterial({
                color: 0x0284c7,
                emissive: 0x0c4a6e,
                emissiveIntensity: 0.35,
                metalness: 0.4,
                roughness: 0.3
            });
            const scrSliderMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.72, 2.4), scrSliderMat);
            scrSliderMesh.position.set(0, 0.58, 0);
            scrSliderMesh.castShadow = true;
            screenGroup.add(scrSliderMesh);

            // 屏幕滑軌兩側發光拖曳把手
            const scrHandleMat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0284c7,
                emissiveIntensity: 0.55,
                roughness: 0.25
            });
            const scrHandleLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 2.65), scrHandleMat);
            scrHandleLeft.position.set(-2.05, 0.58, 0);
            screenGroup.add(scrHandleLeft);

            const scrHandleRight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 2.65), scrHandleMat);
            scrHandleRight.position.set(2.05, 0.58, 0);
            screenGroup.add(scrHandleRight);

            // 屏幕金屬外框
            const frameThickness = 0.24;
            const frameMat = new THREE.MeshStandardMaterial({
                color: 0x334155,
                metalness: 0.6,
                roughness: 0.35
            });

            const topBar = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_SIZE + frameThickness * 2, frameThickness, 0.32), frameMat);
            topBar.position.set(0, AXIS_Y + SCREEN_SIZE / 2 + frameThickness / 2, 0);
            screenGroup.add(topBar);

            const botBar = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_SIZE + frameThickness * 2, frameThickness, 0.32), frameMat);
            botBar.position.set(0, AXIS_Y - SCREEN_SIZE / 2 - frameThickness / 2, 0);
            screenGroup.add(botBar);

            const leftBar = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, SCREEN_SIZE, 0.32), frameMat);
            leftBar.position.set(-SCREEN_SIZE / 2 - frameThickness / 2, AXIS_Y, 0);
            screenGroup.add(leftBar);

            const rightBar = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, SCREEN_SIZE, 0.32), frameMat);
            rightBar.position.set(SCREEN_SIZE / 2 + frameThickness / 2, AXIS_Y, 0);
            screenGroup.add(rightBar);

            // 屏幕支撐雙柱
            const legLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, AXIS_Y - SCREEN_SIZE / 2, 12), frameMat);
            legLeft.position.set(-1.3, (AXIS_Y - SCREEN_SIZE / 2 + 0.5) / 2, 0);
            screenGroup.add(legLeft);

            const legRight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, AXIS_Y - SCREEN_SIZE / 2, 12), frameMat);
            legRight.position.set(1.3, (AXIS_Y - SCREEN_SIZE / 2 + 0.5) / 2, 0);
            screenGroup.add(legRight);

            // 動態高解析投影畫布 (CanvasTexture -> 貼在 3D 毛玻璃屏幕上)
            const projCanvas = document.createElement('canvas');
            projCanvas.width = 512;
            projCanvas.height = 512;
            const projCtx = projCanvas.getContext('2d');
            const projTexture = new THREE.CanvasTexture(projCanvas);
            projTexture.minFilter = THREE.LinearFilter;
            projTexture.magFilter = THREE.LinearFilter;

            const screenGlassMat = new THREE.MeshBasicMaterial({
                map: projTexture,
                transparent: true,
                opacity: 0.94,
                side: THREE.DoubleSide
            });
            const screenGlassMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_SIZE, SCREEN_SIZE), screenGlassMat);
            screenGlassMesh.position.set(0, AXIS_Y, 0);
            screenGroup.add(screenGlassMesh);

            // 加大屏幕拖曳隱形碰撞盒 (使用 transparent: true, opacity: 0 確保 Raycaster 穩定命中)
            const scrHitbox = new THREE.Mesh(
                new THREE.BoxGeometry(SCREEN_SIZE + 2.0, SCREEN_SIZE + 2.2, 4.0),
                new THREE.MeshBasicMaterial({
                    color: 0x38bdf8,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false
                })
            );
            scrHitbox.position.set(0, AXIS_Y, 0);
            scrHitbox.userData.dragType = 'screen';
            screenGroup.add(scrHitbox);

            // --- 8. 建立 3D 光線與模糊光錐系統 ---
            const raysGroup = new THREE.Group();
            scene.add(raysGroup);

            const rayObjects = [];
            cornerConfigs.forEach((cfg) => {
                // 中心主光線 (Line)
                const lineGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, AXIS_Y, 0),
                    new THREE.Vector3(0, AXIS_Y, 0),
                    new THREE.Vector3(0, AXIS_Y, 0)
                ]);
                const lineMat = new THREE.LineBasicMaterial({
                    color: cfg.color,
                    transparent: true,
                    opacity: 0.92
                });
                const line = new THREE.Line(lineGeo, lineMat);
                raysGroup.add(line);

                // 從針孔發散至屏幕的光錐 (Blur Cone)
                const coneGeo = new THREE.CylinderGeometry(0.05, 0.3, 1, 20, 1, true);
                // 將圓柱旋轉使其沿 Z 軸延伸，原點對齊針孔端
                coneGeo.translate(0, -0.5, 0);
                coneGeo.rotateX(Math.PI / 2);

                const coneMat = new THREE.MeshBasicMaterial({
                    color: cfg.color,
                    transparent: true,
                    opacity: 0.16,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                });
                const cone = new THREE.Mesh(coneGeo, coneMat);
                raysGroup.add(cone);

                // 屏幕上的光斑落點球
                const hitSpot = new THREE.Mesh(
                    new THREE.SphereGeometry(0.13, 12, 12),
                    new THREE.MeshBasicMaterial({ color: cfg.color })
                );
                raysGroup.add(hitSpot);

                rayObjects.push({ cfg, line, cone, hitSpot });
            });

            function update3DRays() {
                raysGroup.visible = state.showRays;
                if (!state.showRays) return;

                const mag = state.di / state.do;
                const holeRadius = Math.max(0.08, state.holeSize * 0.18);
                // 針孔孔徑在屏幕上形成的模糊光斑半徑 (Circle of Confusion)
                const spotRadius = holeRadius * (1 + mag);

                rayObjects.forEach(({ cfg, line, cone, hitSpot }) => {
                    // 物體頂點世界座標 (Z = +do)
                    const startPos = new THREE.Vector3(cfg.x, cfg.y, state.do);
                    // 針孔中心 (0, AXIS_Y, 0)
                    const pinholePos = new THREE.Vector3(0, AXIS_Y, 0);

                    // 穿過針孔直線延伸至屏幕 (Z = -di): X_img = -X_obj * mag, dY_img = -dY_obj * mag
                    const dx = cfg.x;
                    const dy = cfg.y - AXIS_Y;
                    const endPos = new THREE.Vector3(
                        -dx * mag,
                        AXIS_Y - dy * mag,
                        -state.di
                    );

                    // 更新主光線折線頂點
                    const positions = line.geometry.attributes.position.array;
                    positions[0] = startPos.x; positions[1] = startPos.y; positions[2] = startPos.z;
                    positions[3] = pinholePos.x; positions[4] = pinholePos.y; positions[5] = pinholePos.z;
                    positions[6] = endPos.x; positions[7] = endPos.y; positions[8] = endPos.z;
                    line.geometry.attributes.position.needsUpdate = true;

                    // 更新落點標記
                    hitSpot.position.copy(endPos);
                    const spotScale = Math.max(0.7, Math.min(2.6, spotRadius * 2.2));
                    hitSpot.scale.set(spotScale, spotScale, 0.4);

                    // 更新光錐 (從針孔到屏幕落點)
                    cone.visible = state.showCones;
                    if (state.showCones) {
                        const dist = pinholePos.distanceTo(endPos);
                        cone.position.copy(pinholePos);
                        cone.lookAt(endPos);

                        // 重新設定圓錐頂端(針孔處)半徑與底端(屏幕處)半徑
                        cone.geometry.dispose();
                        const newConeGeo = new THREE.CylinderGeometry(holeRadius, spotRadius, dist, 20, 1, true);
                        newConeGeo.translate(0, -dist / 2, 0);
                        newConeGeo.rotateX(Math.PI / 2);
                        cone.geometry = newConeGeo;
                    }
                });
            }

            // --- 9. 繪製屏幕投影紋理 (同時驅動 3D 屏幕與右上角 2D 觀察窗) ---
            function renderProjectedTexture() {
                const size = projCanvas.width; // 512
                const ctx = projCtx;
                const cx = size / 2;
                const cy = size / 2;

                // 1) 繪製半透明毛玻璃底色與十字準心
                ctx.clearRect(0, 0, size, size);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
                ctx.fillRect(0, 0, size, size);

                // 毛玻璃微細網格
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
                ctx.lineWidth = 1;
                for (let i = 64; i < size; i += 64) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i, size);
                    ctx.moveTo(0, i);
                    ctx.lineTo(size, i);
                    ctx.stroke();
                }

                // 中心十字軸
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
                ctx.setLineDash([8, 6]);
                ctx.beginPath();
                ctx.moveTo(0, cy);
                ctx.lineTo(size, cy);
                ctx.moveTo(cx, 0);
                ctx.lineTo(cx, size);
                ctx.stroke();
                ctx.setLineDash([]);

                // 2) 物理計算：放大率、照度亮度、模糊半徑
                const mag = state.di / state.do;
                // 物體高度 3.4 cm 對應屏幕總高 8.4 cm
                const baseFontPx = (state.objectHeight / SCREEN_SIZE) * size;
                const imgFontPx = baseFontPx * mag;

                // 照度與 (holeSize / di)^2 成正比
                const brightnessRatio = (state.holeSize * state.holeSize) / Math.pow(state.di / 14, 2);
                const alpha = Math.max(0.28, Math.min(1.0, 0.32 + brightnessRatio * 0.42));

                // 模糊半徑與針孔孔徑及放大率成正比
                const blurPx = Math.max(0, (state.holeSize - 0.65) * 4.5 * (0.55 + 0.45 * mag));

                ctx.save();
                ctx.translate(cx, cy);

                /**
                 * 座標系翻轉關鍵說明：
                 * Three.js PlaneGeometry 在 Z = -di 處，其本地 +X 指向世界 +X（左側觀察者視角之右），+Y 指向世界 +Y（上方）。
                 * 由於針孔在原點 (0,0,0)：
                 * - 物體頂部 (+Y) 投射到屏幕下方 (-Y)
                 * - 物體右側 (+X) 投射到屏幕左側 (-X)
                 * 因此在 Canvas 2D 座標系中，執行 scale(-1, -1) 即完美呈現「上下顛倒且左右相反」！
                 */
                ctx.scale(-1, -1);

                if ('filter' in ctx) {
                    ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
                }

                // 繪製投影字母
                ctx.font = `bold ${imgFontPx.toFixed(1)}px Inter, "Noto Sans TC", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = `rgba(251, 191, 36, ${alpha * 0.9})`;
                ctx.shadowBlur = 16 + blurPx * 1.5;
                ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
                ctx.fillText(state.char, 0, 4);

                // 繪製四個頂點對應光斑，讓使用者一眼驗證上下左右翻轉
                const halfW = (1.05 / SCREEN_SIZE) * size * mag;
                const halfH = (state.objectHeight / 2 / SCREEN_SIZE) * size * mag;
                const dotR = Math.max(5, 7 * Math.min(1.4, mag) + blurPx * 0.25);

                const dots = [
                    { x: -halfW, y: -halfH, color: `rgba(244, 63, 94, ${alpha})` },  // 原左上(紅) -> 翻轉後變右下
                    { x:  halfW, y: -halfH, color: `rgba(251, 191, 36, ${alpha})` }, // 原右上(黃) -> 翻轉後變左下
                    { x: -halfW, y:  halfH, color: `rgba(56, 189, 248, ${alpha})` }, // 原左下(藍) -> 翻轉後變右上
                    { x:  halfW, y:  halfH, color: `rgba(52, 211, 153, ${alpha})` }  // 原右下(綠) -> 翻轉後變左上
                ];

                dots.forEach((d) => {
                    ctx.fillStyle = d.color;
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, dotR, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.restore();

                // 3) 屏幕頂部與底部參考文字 (不翻轉)
                ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
                ctx.font = '600 18px "Noto Sans TC", sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('屏幕上方 (藍/綠點端)', 16, 28);
                ctx.fillText('屏幕下方 (紅/黃點端)', 16, size - 16);

                // 通知 Three.js 更新紋理
                projTexture.needsUpdate = true;

                // 4) 同步繪製右上角 2D 預覽窗 (從屏幕後方往前看的視角)
                syncInset2DPreview();
            }

            function syncInset2DPreview() {
                const dpr = window.devicePixelRatio || 1;
                const rect = insetCanvas.getBoundingClientRect();
                if (insetCanvas.width !== Math.round(rect.width * dpr)) {
                    insetCanvas.width = Math.round(rect.width * dpr);
                    insetCanvas.height = Math.round(rect.height * dpr);
                }
                const w = insetCanvas.width;
                const h = insetCanvas.height;

                insetCtx.clearRect(0, 0, w, h);
                // 從屏幕後方(-Z)朝針孔(+Z)看去時，左右方向與從 +Z 朝 -Z 看正好鏡像
                // 我們在屏幕後方觀察毛玻璃透射光，直接繪製投影畫面即可讓使用者清楚看見「倒立且左右相反」的字形！
                insetCtx.drawImage(projCanvas, 0, 0, w, h);
            }

            // --- 10. UI 與物理數據同步 ---
            function updateAll() {
                // 更新 3D 物件位置
                objectGroup.position.z = state.do;
                screenGroup.position.z = -state.di;
                const objectScale = state.objectHeight / OBJ_SIZE;
                if (letterMesh) letterMesh.scale.y = objectScale;
                cornerConfigs.forEach((cfg) => { cfg.y = AXIS_Y + cfg.baseY * objectScale; });
                vertexMarkers.forEach((marker) => { marker.mesh.position.y = AXIS_Y + marker.baseY * objectScale; });
                objHitbox.scale.y = objectScale;
                objectPointLight.position.set(0, AXIS_Y, state.do - 1.2);

                // 更新懸停與拖曳高亮回饋
                const objActive = state.dragging === 'object' || state.hovered === 'object';
                objSliderMat.color.setHex(objActive ? 0xfbbf24 : 0xd97706);
                objSliderMat.emissiveIntensity = objActive ? 0.85 : 0.35;
                objHandleMat.emissiveIntensity = objActive ? 1.1 : 0.45;
                objHandleLeft.scale.setScalar(objActive ? 1.12 : 1.0);
                objHandleRight.scale.setScalar(objActive ? 1.12 : 1.0);

                const scrActive = state.dragging === 'screen' || state.hovered === 'screen';
                scrSliderMat.color.setHex(scrActive ? 0x38bdf8 : 0x0284c7);
                scrSliderMat.emissiveIntensity = scrActive ? 0.85 : 0.35;
                scrHandleMat.emissiveIntensity = scrActive ? 1.1 : 0.45;
                scrHandleLeft.scale.setScalar(scrActive ? 1.12 : 1.0);
                scrHandleRight.scale.setScalar(scrActive ? 1.12 : 1.0);

                // 更新光線與投影紋理
                update3DRays();
                renderProjectedTexture();

                // 更新滑桿與數值標籤
                const mag = state.di / state.do;
                sliderDo.value = state.do;
                sliderDi.value = state.di;
                sliderHeight.value = state.objectHeight;
                sliderHole.value = state.holeSize;

                labelDo.textContent = `${state.do.toFixed(1)} cm`;
                labelDi.textContent = `${state.di.toFixed(1)} cm`;
                labelHeight.textContent = `${state.objectHeight.toFixed(1)} cm`;
                labelHole.textContent = `${state.holeSize.toFixed(1)} mm`;

                valDo.textContent = state.do.toFixed(1);
                valDi.textContent = state.di.toFixed(1);
                valMag.textContent = mag.toFixed(2);
                hudDo.textContent = state.do.toFixed(1);
                hudDi.textContent = state.di.toFixed(1);

                let sizeLabel = '';
                if (Math.abs(mag - 1.0) < 0.03) {
                    sizeLabel = '等大';
                    valSizeDesc.textContent = '等大像 (hi = ho)';
                    valSizeDesc.className = 'pinhole-status equal';
                } else if (mag > 1.0) {
                    sizeLabel = '放大';
                    valSizeDesc.textContent = '放大像 (hi > ho)';
                    valSizeDesc.className = 'pinhole-status larger';
                } else {
                    sizeLabel = '縮小';
                    valSizeDesc.textContent = '縮小像 (hi < ho)';
                    valSizeDesc.className = 'pinhole-status smaller';
                }

                valNature.textContent = `倒立${sizeLabel}實像`;

                if (state.holeSize <= 1.6) {
                    valClarity.textContent = '上下顛倒、左右相反（針孔小・清晰）';
                    valClarity.className = 'pinhole-status clear';
                } else if (state.holeSize <= 3.5) {
                    valClarity.textContent = '上下顛倒、左右相反（孔徑中・微模糊）';
                    valClarity.className = 'pinhole-status medium';
                } else {
                    valClarity.textContent = '上下顛倒、左右相反（孔徑大・光斑重疊）';
                    valClarity.className = 'pinhole-status blur';
                }
            }

            // --- 11. 3D Raycasting 滑鼠與觸控直接拖曳邏輯 ---
            const raycaster = new THREE.Raycaster();
            const pointerNDC = new THREE.Vector2();
            const dragPlane = new THREE.Plane();
            const planeIntersectPoint = new THREE.Vector3();
            let dragGrabOffsetZ = 0;

            function updatePointerNDC(clientX, clientY) {
                const rect = renderer.domElement.getBoundingClientRect();
                pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            }

            // 根據當前相機視角動態建立最穩定的 Z 軸投影平面（垂直於相機水平視線，避免任何角度平行失效）
            function configureDragPlane(anchorY) {
                const camDir = new THREE.Vector3();
                camera.getWorldDirection(camDir);
                // 投影平面包含 Z 軸 (0, 0, 1)，且法向量朝向相機，保證永遠不會與視線平行
                const planeNormal = new THREE.Vector3(camDir.x, camDir.y, 0);
                if (planeNormal.lengthSq() < 1e-4) {
                    planeNormal.set(0, 1, 0);
                } else {
                    planeNormal.normalize();
                }
                dragPlane.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, anchorY, 0));
            }

            function getDraggableHit() {
                raycaster.setFromCamera(pointerNDC, camera);
                const hits = raycaster.intersectObjects([objHitbox, scrHitbox], true);
                if (hits.length > 0) {
                    return hits[0].object.userData.dragType;
                }
                return null;
            }

            function onPointerDown(e) {
                if (e.button !== undefined && e.button !== 0) return; // 僅限左鍵或觸控
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                updatePointerNDC(clientX, clientY);

                const hitType = getDraggableHit();
                if (hitType) {
                    if (e.cancelable) e.preventDefault();
                    state.dragging = hitType;
                    controls.enabled = false; // 拖曳滑軌物件時鎖定相機旋轉
                    renderer.domElement.style.cursor = 'grabbing';

                    configureDragPlane(AXIS_Y);
                    raycaster.setFromCamera(pointerNDC, camera);
                    if (raycaster.ray.intersectPlane(dragPlane, planeIntersectPoint)) {
                        const currentZ = hitType === 'object' ? state.do : -state.di;
                        dragGrabOffsetZ = currentZ - planeIntersectPoint.z;
                    } else {
                        dragGrabOffsetZ = 0;
                    }
                    updateAll();
                }
            }

            function onPointerMove(e) {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                updatePointerNDC(clientX, clientY);

                if (state.dragging) {
                    if (e.cancelable) e.preventDefault();
                    configureDragPlane(AXIS_Y);
                    raycaster.setFromCamera(pointerNDC, camera);

                    if (raycaster.ray.intersectPlane(dragPlane, planeIntersectPoint)) {
                        const targetZ = planeIntersectPoint.z + dragGrabOffsetZ;

                        if (state.dragging === 'object') {
                            state.do = Math.max(8, Math.min(35, Math.round(targetZ * 2) / 2));
                        } else if (state.dragging === 'screen') {
                            state.di = Math.max(8, Math.min(35, Math.round(-targetZ * 2) / 2));
                        }
                        updateAll();
                    }
                } else {
                    const hitType = getDraggableHit();
                    if (hitType !== state.hovered) {
                        state.hovered = hitType;
                        renderer.domElement.style.cursor = hitType ? 'grab' : 'default';
                        updateAll();
                    }
                }
            }

            function onPointerUp() {
                if (state.dragging) {
                    state.dragging = null;
                    controls.enabled = true;
                    renderer.domElement.style.cursor = state.hovered ? 'grab' : 'default';
                    updateAll();
                }
            }

            renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: false });
            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);

            // --- 12. 相機預設視角平滑切換 ---
            let camAnim = null;

            function animateCameraTo(pos, target, activeBtn) {
                camAnim = {
                    startPos: camera.position.clone(),
                    endPos: new THREE.Vector3(...pos),
                    startTarget: controls.target.clone(),
                    endTarget: new THREE.Vector3(...target),
                    progress: 0
                };

                document.querySelectorAll('.cam-preset-btn').forEach((btn) => {
                    btn.className = 'cam-preset-btn';
                });
                if (activeBtn) {
                    activeBtn.className = 'cam-preset-btn active';
                }
            }

            camBtn3D.addEventListener('click', () => {
                animateCameraTo([28, 17, 26], [0, AXIS_Y - 0.5, 2], camBtn3D);
            });

            camBtnSide.addEventListener('click', () => {
                animateCameraTo([42, AXIS_Y + 1.5, 0], [0, AXIS_Y, 0], camBtnSide);
            });

            camBtnScreen.addEventListener('click', () => {
                // 從屏幕後方 (-Z) 向前望向屏幕與針孔，直接觀察倒立左右相反實像
                animateCameraTo([0, AXIS_Y + 1.2, -state.di - 16], [0, AXIS_Y, 0], camBtnScreen);
            });

            // --- 13. 控制面板與滑桿事件綁定 ---
            sliderDo.addEventListener('input', (e) => {
                state.do = parseFloat(e.target.value);
                updateAll();
            });

            sliderDi.addEventListener('input', (e) => {
                state.di = parseFloat(e.target.value);
                updateAll();
            });

            sliderHeight.addEventListener('input', (e) => {
                state.objectHeight = parseFloat(e.target.value);
                updateAll();
            });

            sliderHole.addEventListener('input', (e) => {
                state.holeSize = parseFloat(e.target.value);
                rebuildPinholeBarrier();
                updateAll();
            });

            toggleRays.addEventListener('change', (e) => {
                state.showRays = e.target.checked;
                updateAll();
            });

            toggleCones.addEventListener('change', (e) => {
                state.showCones = e.target.checked;
                updateAll();
            });

            function setActiveLetter(char) {
                const cleanChar = (char || 'F').trim().charAt(0).toUpperCase() || 'F';
                state.char = cleanChar;

                letterBtns.forEach((btn) => {
                    if (btn.dataset.char === cleanChar) {
                        btn.className = 'letter-btn active';
                    } else {
                        btn.className = 'letter-btn';
                    }
                });

                rebuild3DLetter();
                updateAll();
            }

            letterBtns.forEach((btn) => {
                btn.addEventListener('click', () => {
                    customLetterInput.value = '';
                    setActiveLetter(btn.dataset.char);
                });
            });

            customLetterInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                if (val.length > 0) {
                    setActiveLetter(val);
                }
            });

            btnReset.addEventListener('click', () => {
                state.char = 'F';
                state.do = 20.0;
                state.di = 16.0;
                state.objectHeight = 3.4;
                state.holeSize = 1.2;
                state.showRays = true;
                state.showCones = true;
                toggleRays.checked = true;
                toggleCones.checked = true;
                customLetterInput.value = '';

                rebuildPinholeBarrier();
                setActiveLetter('F');
                animateCameraTo([28, 17, 26], [0, AXIS_Y - 0.5, 2], camBtn3D);
            });

            // 視窗大小自適應
            window.addEventListener('resize', () => {
                const w = container.clientWidth;
                const h = container.clientHeight;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                syncInset2DPreview();
            });

            // --- 14. 主動畫迴圈 (Animation Loop) ---
            function animate() {
                requestAnimationFrame(animate);

                if (camAnim) {
                    camAnim.progress += 0.055;
                    const t = Math.min(1, camAnim.progress);
                    const ease = 1 - Math.pow(1 - t, 3); // Cubic ease-out
                    camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
                    controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
                    if (t >= 1) camAnim = null;
                }

                controls.update();
                renderer.render(scene, camera);
            }

            rebuildPinholeBarrier();
            rebuild3DLetter();
            updateAll();
            animate();
        })();

