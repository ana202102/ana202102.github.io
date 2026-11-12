# 鏡面成像互動模擬

開啟 `index.html` 可進入實驗首頁，並選擇九種光學模擬。多數成像頁可拖曳紅色物體調整物距，並以右側滑桿調整物高；複式顯微鏡以右側滑桿調整物距與物高。像的位置、大小與數據會即時更新。各主題有獨立頁面：

- `plane-mirror.html`
- `concave-mirror.html`
- `convex-mirror.html`
- `reflection-law.html`
- `refraction-law.html`
- `convex-lens.html`
- `concave-lens.html`
- `microscope.html`
- `rgb-primary.html`

「複式顯微鏡」頁面由 `microscope.js` 模擬物鏡與目鏡的兩段成像，並可調整物距及物高。

「光的三原色」頁面由 `rgb-primary.js` 繪製紅、綠、藍色光的加法混色，可拖曳三個色圈改變重疊位置、調整各色光強度並查看混色結果。

頁面以 HTML Canvas 與 JavaScript 繪製，不需要安裝 Flash 或其他套件，也不需網路連線。
