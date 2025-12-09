# UI 測試指南

## 🤖 UI 測試機器人 (UI Test Bot)

自動化端對端 (E2E) UI 測試工具，模擬真實使用者互動並驗證 DOM 更新。

---

## 🚀 快速開始

### 方法 1：瀏覽器 Console（推薦）

1. 在瀏覽器中開啟 `index.html`
2. 打開瀏覽器開發者工具 (F12)
3. 在 Console 中執行以下腳本：

```javascript
// 方法 A：動態載入腳本（推薦）
(function() {
    // 檢查是否已載入
    if (window.UITestBot?.loaded) {
        console.log('✅ 測試機器人已載入，直接執行測試');
        runUITests();
        return;
    }

    // 載入測試腳本
    const script = document.createElement('script');
    script.src = 'js/ui-test-bot.js';
    script.onload = () => {
        console.log('✅ 腳本載入完成，開始執行測試...');
        setTimeout(() => runUITests(), 500);
    };
    script.onerror = () => {
        console.error('❌ 無法載入測試腳本，請確認路徑正確');
    };
    document.body.appendChild(script);
})();
```

或

```javascript
// 方法 B：簡化版（適合重複執行）
if (!window.UITestBot?.loaded) {
    const s = document.createElement('script');
    s.src = 'js/ui-test-bot.js';
    s.onload = () => setTimeout(runUITests, 500);
    document.body.append(s);
} else {
    runUITests();
}
```

### 方法 2：修改 HTML（開發模式）

在 `index.html` 的 `</body>` 前加入：

```html
<!-- 僅用於測試環境 -->
<script src="js/ui-test-bot.js"></script>
<script>
    // 自動執行測試（可選）
    // window.addEventListener('load', () => setTimeout(runUITests, 2000));
</script>
```

---

## 📊 測試覆蓋範圍

| 測試案例 | 功能 | 驗證項目 |
|---------|------|---------|
| 1️⃣ 種子輸入流程 | 文字種子 → 生成 | ✓ 種子更新<br>✓ 顯示更新<br>✓ Canvas 渲染 |
| 2️⃣ Enter 鍵生成 | 鍵盤快捷鍵 | ✓ Enter 觸發生成 |
| 3️⃣ 數字種子 | 純數字輸入 | ✓ 數字解析正確 |
| 4️⃣ 隨機種子按鈕 | 🎲 按鈕 | ✓ 生成隨機種子<br>✓ 清空輸入欄位<br>✓ 視覺回饋 |
| 5️⃣ 複製種子按鈕 | 📋 按鈕 | ✓ Clipboard API<br>✓ 視覺回饋 |
| 6️⃣ Scale 滑桿 | 縮放控制 | ✓ Config 更新<br>✓ 顯示更新<br>✓ 地圖重繪 |
| 7️⃣ Octaves 滑桿 | 細節控制 | ✓ Config 更新<br>✓ 顯示更新 |
| 8️⃣ 海平面滑桿 | 環境設定 | ✓ Config 更新<br>✓ 顯示更新 |
| 9️⃣ 視圖模式切換 | 4 種視圖 | ✓ Active 狀態<br>✓ 互斥邏輯 |
| 🔟 匯出按鈕 | PNG 下載 | ✓ Data URL 生成<br>✓ 檔名格式<br>✓ 視覺回饋 |
| 1️⃣1️⃣ 雲層切換 | Checkbox | ✓ 狀態切換 |
| 1️⃣2️⃣ HUD 顯示 | 懸停資訊 | ✓ 滑鼠事件<br>✓ 資料顯示 |

---

## 🎯 測試輸出範例

```
═══════════════════════════════════════════════════════
🤖 UI 測試機器人啟動
═══════════════════════════════════════════════════════

✅ 偵測到 RPG 世界生成器環境

🧪 執行測試: 種子輸入流程
✅ [UI] 種子輸入流程 PASSED

🧪 執行測試: Enter 鍵生成
✅ [UI] Enter 鍵生成 PASSED

🧪 執行測試: 數字種子
✅ [UI] 數字種子 PASSED

... (更多測試)

🔄 恢復原始設定...

════════════════════════════════════════════════════════
📊 測試結果總結
════════════════════════════════════════════════════════
✅ 通過: 12
❌ 失敗: 0
📝 總計: 12

🎉 所有 UI 測試通過！
✅ UI 層功能完整且穩定。
════════════════════════════════════════════════════════
```

---

## 🛠️ 測試工具 API

### 基礎操作

```javascript
// 點擊元素
await click('#btnGenerate');

// 輸入文字
await type('#inp_seed', 'MyWorld');

// 按 Enter
await pressEnter('#inp_seed');

// 設定滑桿
await setSlider('#inp_scale', '100');

// 等待
await sleep(500);
```

### 驗證函數

```javascript
// 驗證文字內容
assertText('#current_seed', '12345');

// 驗證 CSS Class
assertHasClass('#btn_biome', 'active');

// 驗證 Canvas 已渲染
assertCanvasUpdated();
```

---

## 🔧 自訂測試

新增自訂測試到 `ui-test-bot.js`：

```javascript
async function test_MyCustomFeature() {
    // 你的測試邏輯
    await type('#inp_seed', 'CustomTest');
    await click('#btnGenerate');
    await sleep(200);

    // 驗證
    const seed = window.terrainConfig?.seed;
    if (!seed) {
        throw new Error('Seed not set');
    }
}

// 在 runUITests() 中加入
await runTest('自訂功能測試', test_MyCustomFeature);
```

---

## ⚠️ 注意事項

1. **非破壞性測試**：測試結束後會恢復原始設定
2. **需要實際 DOM**：必須在瀏覽器環境執行（不支援 Node.js）
3. **執行順序**：測試按順序執行，確保穩定性
4. **Mock API**：某些測試會暫時 Mock Clipboard 或 DOM API

---

## 🐛 除錯模式

如果測試失敗，可以單獨執行特定測試：

```javascript
// 僅執行種子輸入測試
runTest('種子輸入流程', test_SeedInputFlow);

// 查看詳細錯誤
console.log(testResults);
```

---

## 📈 CI/CD 整合（未來）

可透過 Puppeteer 或 Playwright 整合到 CI 流程：

```javascript
// example: puppeteer-test.js
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:8000/index.html');

    // 注入測試腳本
    await page.addScriptTag({ path: 'js/ui-test-bot.js' });

    // 執行測試
    const results = await page.evaluate(() => runUITests());

    console.log(results);
    await browser.close();

    process.exit(results.failed > 0 ? 1 : 0);
})();
```

---

## 🎓 最佳實踐

1. ✅ **執行頻率**：每次修改 UI 後執行
2. ✅ **版本控制**：測試腳本應納入 Git
3. ✅ **文件更新**：新增功能時同步更新測試
4. ✅ **錯誤回報**：失敗時提供清晰的錯誤訊息

---

## 📞 支援

如果發現測試案例中的問題：
1. 檢查 Console 錯誤訊息
2. 確認 DOM 元素 ID 是否正確
3. 驗證 `window.terrainConfig` 是否可存取

---

**建立日期：** 2025-12-09
**版本：** 1.0.0
**維護者：** RPG World Generator Team
