const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingMessage = document.getElementById('loading_message');

// 遊戲狀態與參數
let sport = { count: 0 };
let runFlag = 0; // 0:模式選擇, 1:任務一, 3:倒數, 4:任務二, 5:結算
let gameMode = '';
let firstGWinT = 10;   
let secondGWinT = 10;  
let limitTime = 60;    
let status = false; 
let startTime = 0;     
let gameStartTime = 0; 
let win = false;
let soundPlayed = false;
let showHelp = false;  

// 音效
const coinSound = new Audio('coin.mp3');
const winSound = new Audio('win.wav');
const loseSound = new Audio('lose.wav');

// 取得格式化時間字串 (YYYY-MM-DD_HH:mm:ss)
function getFormattedTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}_${hh}:${min}:${ss}`;
}

function calcAngle(p1, p2, p3) {
    let radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

function onResults(results) {
    // 收到第一筆姿勢辨識結果，代表模型已完成初始化。
    loadingMessage.classList.add('hidden');

    canvasElement.width = videoElement.videoWidth || 1280;
    canvasElement.height = videoElement.videoHeight || 720;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;
        const lAngle = calcAngle(landmarks[23], landmarks[25], landmarks[27]);
        const rAngle = calcAngle(landmarks[24], landmarks[26], landmarks[28]);
        const avgAngle = (lAngle + rAngle) / 2;
        
        if (runFlag === 1 || runFlag === 4) {
            if (gameMode === 'h') {
                let timeLeft = limitTime - Math.floor((Date.now() - gameStartTime) / 1000);
                if (timeLeft <= 0 && runFlag !== 5) {
                    win = false; runFlag = 5; startTime = Date.now();
                }
            }
            if (status) {
                if (avgAngle > 160) { 
                    status = false;
                    if (runFlag === 1) {
                        sport.count++;
                        coinSound.play();
                        if (sport.count >= firstGWinT) {
                            winSound.play();
                            if (gameMode === 'e') { win = true; runFlag = 5; startTime = Date.now(); }
                            else { runFlag = 3; startTime = Date.now(); }
                        }
                    }
                }
            } else {
                const bodyH = Math.abs(landmarks[11].y - landmarks[23].y);
                const legH = Math.abs(landmarks[23].y - landmarks[27].y);
                if (avgAngle < 120 && (legH / bodyH) < 1.2) { 
                    status = true;
                    startTime = Date.now();
                }
            }
        }
        drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
        drawMirrorText(`左膝: ${Math.floor(lAngle)}°`, canvasElement.width - 20, 360, "white", "rgba(255,0,0,0.7)", 30, "right");
        drawMirrorText(`右膝: ${Math.floor(rAngle)}°`, canvasElement.width - 20, 400, "white", "rgba(255,0,0,0.7)", 30, "right");
    }

    processGameState();
    if (showHelp) drawHelpPanel(); 
    canvasCtx.restore();
}

function processGameState() {
    if (runFlag === 0) {
        const menuX = 5; 
        const menuW = 250;
        const menuTextBoundary = menuX + menuW - 15; 
        drawRect(menuX, 120, menuW, 350, "rgba(0,0,0,0.7)");
        drawMirrorText("1 簡單 (5次)", menuTextBoundary, 160, "lime", null, 28, "right");
        drawMirrorText("2 普通 (10+10s)", menuTextBoundary, 205, "white", null, 28, "right");
        drawMirrorText("3 困難 (自訂)", menuTextBoundary, 250, "white", null, 28, "right");
        drawMirrorText("H 操作說明", menuTextBoundary, 310, "#00BFFF", null, 25, "right");
        drawMirrorText("P 截圖分享", menuTextBoundary, 350, "#FFD700", null, 25, "right");
        drawMirrorText("ESC 重置遊戲", menuTextBoundary, 390, "#FFD700", null, 25, "right");
        
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            const centerTextX = canvasElement.width / 2 + 215;
            drawRect(canvasElement.width / 2 - 225, 30, 450, 60, "red");
            drawMirrorText("請按數字鍵選擇難度", centerTextX, 75, "white", null, 35, "right");
        }
    } else if (runFlag === 1) {
        drawRect(140, 20, 350, 50, "red");
        drawMirrorText(`任務一:深蹲 ${firstGWinT} 次`, 480, 60, "white", null, 35, "right");
        drawRect(510, 20, 180, 50, "white");
        drawMirrorText(`得分: ${sport.count}`, 680, 60, "red", null, 35, "right");
    } else if (runFlag === 3) {
        drawRect(canvasElement.width / 2 - 240, 30, 480, 60, "orange");
        drawMirrorText(`任務一完成！準備進入任務二`, canvasElement.width / 2 + 230, 75, "white", null, 28, "right");
        if (3 - Math.floor((Date.now() - startTime) / 1000) <= 0) { runFlag = 4; startTime = Date.now(); status = false; }
    } else if (runFlag === 4) {
        drawRect(140, 20, 350, 50, "red");
        drawMirrorText(`任務二:蹲下撐住 ${secondGWinT} 秒`, 480, 60, "white", null, 28, "right");
        if (status) {
            let timer = secondGWinT - Math.floor((Date.now() - startTime) / 1000);
            drawRect(510, 20, 180, 50, "white");
            drawMirrorText(`計時: ${Math.max(0, timer)}`, 680, 60, "red", null, 35, "right");
            if (timer <= 0) { win = true; runFlag = 5; startTime = Date.now(); winSound.play(); }
        }
    } else if (runFlag === 5) {
        const centerX = canvasElement.width / 2;
        drawMirrorText(win ? "挑戰成功！" : "挑戰失敗", centerX + 250, 360, win ? "lime" : "red", "rgba(0,0,0,0.8)", 100, "right");
        drawMirrorText("按 P 截圖 / ESC 返回選單", centerX + 180, 450, "white", "black", 30, "right");
        if (!soundPlayed) { if (!win) loseSound.play(); soundPlayed = true; }
    }
}

function drawHelpPanel() {
    const w = 600; const h = 450;
    const centerX = canvasElement.width / 2;
    const centerY = canvasElement.height / 2;
    const panelRightBoundary = centerX + (w / 2) - 30; 
    drawRect(centerX - w/2, centerY - h/2, w, h, "rgba(0,0,0,0.95)");
    drawMirrorText("--- 遊戲操作說明 ---", panelRightBoundary, centerY - 170, "#00BFFF", null, 35, "right");
    drawMirrorText("難度 1：完成 5 次深蹲即可。", panelRightBoundary, centerY - 100, "white", null, 25, "right");
    drawMirrorText("難度 2：10 次深蹲 + 10 秒支撐。", panelRightBoundary, centerY - 50, "white", null, 25, "right");
    drawMirrorText("難度 3：自訂挑戰與總限時機制。", panelRightBoundary, centerY, "white", null, 25, "right");
    drawMirrorText("[P 鍵] 截圖分享 (自動修正左右反轉)", panelRightBoundary, centerY + 70, "yellow", null, 25, "right");
    drawMirrorText("[ESC] 重置遊戲並返回主選單", panelRightBoundary, centerY + 120, "yellow", null, 25, "right");
    drawMirrorText("[H 鍵] 關閉此說明畫面", panelRightBoundary, centerY + 170, "#00BFFF", null, 25, "right");
	drawMirrorText("Created by 復興國中 阿楠老師 2026", panelRightBoundary, centerY + 210, "#00BFFF", null, 25, "right");
	
    
    
}

function resetGame() {
    runFlag = 0; sport.count = 0; win = false; status = false; soundPlayed = false; showHelp = false;
}

function drawMirrorText(text, x, y, color, bgColor, size = 30, align = "left") {
    canvasCtx.save();
    canvasCtx.font = `bold ${size}px Microsoft JhengHei`;
    let textWidth = canvasCtx.measureText(text).width;
    let drawX = (align === "right") ? x - textWidth : x;
    canvasCtx.translate(drawX, y);
    canvasCtx.scale(-1, 1); 
    if (bgColor) {
        canvasCtx.fillStyle = bgColor;
        canvasCtx.fillRect(-textWidth - 10, -size, textWidth + 20, size + 15);
    }
    canvasCtx.fillStyle = color;
    canvasCtx.fillText(text, -textWidth, 0);
    canvasCtx.restore();
}

function drawRect(x, y, w, h, color) {
    canvasCtx.fillStyle = color;
    canvasCtx.fillRect(x, y, w, h);
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'escape') { resetGame(); return; }
    if (key === 'h') { showHelp = !showHelp; return; }

    if (runFlag === 0) {
        if (key === '1') { gameMode = 'e'; firstGWinT = 5; runFlag = 1; sport.count = 0; }
        if (key === '2') { gameMode = 's'; firstGWinT = 10; secondGWinT = 10; runFlag = 1; sport.count = 0; }
        if (key === '3') {
            let res = prompt("自訂：深蹲次數,支撐秒數,限時總秒數", "15,15,60");
            if (res) {
                let p = res.split(',');
                firstGWinT = parseInt(p[0]) || 15; 
                secondGWinT = parseInt(p[1]) || 15; 
                limitTime = parseInt(p[2]) || 60;
                gameMode = 'h'; runFlag = 1; sport.count = 0; gameStartTime = Date.now();
            }
        }
    }
    if (key === 'p') {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = canvasElement.width; finalCanvas.height = canvasElement.height;
        const finalCtx = finalCanvas.getContext('2d');
        
        // 1. 修正左右反轉
        finalCtx.translate(finalCanvas.width, 0); finalCtx.scale(-1, 1);
        finalCtx.drawImage(canvasElement, 0, 0);
        
        // 2. 還原座標系統，準備在正向畫面上繪製時間
        finalCtx.setTransform(1, 0, 0, 1, 0, 0);
        
        // 3. 繪製時間記號於左上方
        const timeStr = getFormattedTime();
        finalCtx.font = "bold 40px Arial";
        const textWidth = finalCtx.measureText(timeStr).width;
        
        // 繪製黑色半透明底，確保清晰
        finalCtx.fillStyle = "rgba(0,0,0,0.6)";
        finalCtx.fillRect(10, 10, textWidth + 20, 50);
        
        // 繪製黃色文字
        finalCtx.fillStyle = "#FFD700"; // Gold
        finalCtx.textBaseline = "top";
        finalCtx.fillText(timeStr, 20, 15);
        
        // 4. 下載
        const link = document.createElement('a');
        link.download = `squat_${timeStr}.jpg`;
        link.href = finalCanvas.toDataURL('image/jpeg'); link.click();
    }
});

// 手機直接點擊畫布上的主選單圖形即可操作，不需要另外尋找按鈕。
function getCanvasPoint(event) {
    const rect = canvasElement.getBoundingClientRect();
    const scale = Math.min(rect.width / canvasElement.width, rect.height / canvasElement.height);
    const renderedWidth = canvasElement.width * scale;
    const renderedHeight = canvasElement.height * scale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;
    const displayedX = (event.clientX - rect.left - offsetX) / scale;
    const displayedY = (event.clientY - rect.top - offsetY) / scale;

    // 畫布以 scaleX(-1) 鏡射，因此要還原觸控點的畫布座標。
    return { x: canvasElement.width - displayedX, y: displayedY };
}

canvasElement.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

    const point = getCanvasPoint(event);
    if (point.x < 0 || point.x > 280) return;

    let key = '';
    if (point.y >= 130 && point.y < 180) key = '1';
    else if (point.y >= 180 && point.y < 225) key = '2';
    else if (point.y >= 225 && point.y < 275) key = '3';
    else if (point.y >= 285 && point.y < 330) key = 'h';
    else if (point.y >= 330 && point.y < 375) key = 'p';
    else if (point.y >= 375 && point.y < 420) key = 'escape';

    if (key) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        event.preventDefault();
    }
});

// 手機沒有實體鍵盤，將觸控按鈕轉換成與鍵盤相同的操作。
document.querySelectorAll('#mobile_controls button').forEach((button) => {
    button.addEventListener('click', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: button.dataset.key }));
    });
});

const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
pose.onResults(onResults);

// 明確指定使用前鏡頭，並使用 getUserMedia 提升手機瀏覽器相容性。
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: { ideal: 'user' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        videoElement.srcObject = stream;
        await videoElement.play();

        const processFrame = async () => {
            await pose.send({ image: videoElement });
            requestAnimationFrame(processFrame);
        };
        processFrame();
    } catch (error) {
        loadingMessage.textContent = '無法啟用攝影機，請允許權限並使用 HTTPS';
        console.error('Camera initialization failed:', error);
    }
}

startCamera();
