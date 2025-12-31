# 🔬 Terrain Worker 載入問題診斷計劃

## 問題背景

`terrain.worker.js` 無法在瀏覽器中載入，但：
- ✅ 檔案可透過 fetch 訪問（21.78 KB）
- ✅ Content-Type 正確（`text/javascript; charset=utf-8`）
- ✅ 語法正確（`node --check` 通過）
- ✅ 所有模組導入正常（config.js, noise.js 皆可載入）

## 已完成的測試

### Phase 1: 基礎測試
1. ✅ **test-simple.worker.js** - 簡單 Worker（無模組）
2. ✅ **test-module.worker.js** - ES6 模組（import config.js）
3. ✅ **test-noise.worker.js** - Noise 模組（import noise.js）
4. ✅ **test-terrain-structure.worker.js** - 簡化結構測試

### Phase 2: 函式隔離測試
5. ✅ **test-terrain-init-only.worker.js** - 僅 handleInit 函式
6. ✅ **test-both-functions.worker.js** - handleInit + 簡化的 handleGenerateRivers（前 8 行）

## 當前測試序列（逐步擴展）

打開 **test-binary-search.html** 將自動執行以下測試：

### 測試 1-2：已知成功的基準
- ✅ **只有 handleInit** (line 91-117)
- ✅ **handleInit + 簡化 GenerateRivers** (line 118-125)

### 測試 3：v1 - 擴展到 line 166
**包含內容：**
- handleInit
- handleGenerateRivers（包含陸地座標收集 + 全海洋處理）

**測試檔案：** `js/test-expanded-v1.worker.js`

### 測試 4：v2 - 完整 handleGenerateRivers (line 220)
**包含內容：**
- handleInit
- **完整的** handleGenerateRivers 函式（包含水滴模擬迴圈）

**測試檔案：** `js/test-expanded-v2.worker.js`

### 測試 5：v3 - 加入 simulateDroplet (line 410)
**包含內容：**
- handleInit
- handleGenerateRivers
- **simulateDroplet** 函式（Monte Carlo 水滴模擬 + 水力侵蝕）

**測試檔案：** `js/test-expanded-v3.worker.js`

### 測試 6：v4 - 加入 handleGeneratePreview (line 576)
**包含內容：**
- handleInit
- handleGenerateRivers
- simulateDroplet
- **handleGeneratePreview** 函式（快速預覽生成）

**測試檔案：** `js/test-expanded-v4.worker.js`

### 測試 7：完整檔案
**包含內容：** terrain.worker.js 的完整副本（所有 703 行）

**測試檔案：** `js/test-terrain-copy.worker.js`

## 如何執行測試

1. 在瀏覽器中打開 `test-binary-search.html`
2. 測試會自動依序執行（每個測試間隔 3.5 秒）
3. 觀察哪個測試首次失敗

## 預期結果分析

### 情境 A：v1-v6 都成功，只有完整檔案失敗
**可能原因：**
- handleGenerateBlock 函式有問題（line 577-703）
- 或是檔案長度/複雜度觸發瀏覽器限制

### 情境 B：某個中間版本失敗
**可能原因：**
- 首次失敗的版本引入的程式碼有問題
- 需要進一步細分該區段

### 情境 C：所有版本都成功
**可能原因：**
- 原始 terrain.worker.js 的快取問題
- 或是 onmessage 處理程式有問題（測試檔案沒有完整的 onmessage）

## 檔案清單

測試頁面：
- `test-binary-search.html` - 自動化測試頁面（7 個測試）
- `test-worker.html` - 手動診斷工具

測試 Worker 檔案：
- `js/test-terrain-init-only.worker.js` - 基準測試
- `js/test-both-functions.worker.js` - 基準測試
- `js/test-expanded-v1.worker.js` - 擴展到 line 166
- `js/test-expanded-v2.worker.js` - 擴展到 line 220（完整 handleGenerateRivers）
- `js/test-expanded-v3.worker.js` - 擴展到 line 410（+ simulateDroplet）
- `js/test-expanded-v4.worker.js` - 擴展到 line 576（+ handleGeneratePreview）
- `js/test-terrain-copy.worker.js` - 完整副本

## terrain.worker.js 結構

```
Line 1-38:    註解和文件說明
Line 39:      import noise from './noise.js'
Line 40-89:   onmessage 處理程式
Line 91-117:  function handleInit()              ✅ 已測試成功
Line 118-220: function handleGenerateRivers()    🔍 正在測試
Line 232-410: function simulateDroplet()         🔍 正在測試
Line 433-576: function handleGeneratePreview()   🔍 正在測試
Line 577-703: function handleGenerateBlock()     ⚠️ 尚未測試
```

## 下一步

執行 `test-binary-search.html` 並回報結果，格式如下：

```
✅ 測試 1: 只有 handleInit - 成功
✅ 測試 2: handleInit + 簡化 GenerateRivers - 成功
✅ 測試 3: v1 (line 166) - 成功
✅ 測試 4: v2 (line 220) - 成功
❌ 測試 5: v3 (line 410) - 失敗！
   錯誤訊息：[請貼上錯誤訊息]
```

這樣我們就能精確定位是哪一段程式碼導致載入失敗。
