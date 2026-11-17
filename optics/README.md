# 鏡面成像互動模擬

開啟 `index.html` 可進入實驗首頁，並選擇十種光學模擬。多數成像頁可拖曳紅色物體調整物距，並以右側滑桿調整物高；複式顯微鏡可拖曳物體調整物距，並以右側滑桿調整物高及兩鏡焦距。像的位置、大小與數據會即時更新。各主題有獨立頁面：

完整功能與操作方式請參閱 [作品說明書](作品說明書.md)。

- `plane-mirror.html`
- `concave-mirror.html`
- `convex-mirror.html`
- `reflection-law.html`
- `refraction-law.html`
- `convex-lens.html`
- `concave-lens.html`
- `pinhole-camera.html`
- `microscope.html`
- `rgb-primary.html`

「針孔成像」頁面以 Three.js 建立可旋轉的 3D 光學滑軌、物體、針孔板與屏幕，並繪製穿孔光線及投影影像，光點可沿光路移動。可調物距、像距、物高與孔徑，也可拖曳 3D 物體和屏幕。Three.js 由 CDN 載入，因此需連線使用此頁。

「複式顯微鏡」頁面由 `microscope.js` 模擬物鏡與目鏡的兩段成像，可拖曳物體調整物距，並調整物高及物鏡、目鏡焦距。

「光的三原色」頁面由 `rgb-primary.js` 繪製紅、綠、藍色光的加法混色，可拖曳三個色圈改變重疊位置、調整各色光強度並查看混色結果。

頁面以 HTML Canvas 與 JavaScript 繪製，不需要安裝 Flash 或其他套件，也不需網路連線。






