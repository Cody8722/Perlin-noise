/**
 * UI 測試機器人 (UI Test Bot)
 * 模擬使用者互動並驗證 DOM 更新
 *
 * 使用方式（在瀏覽器 Console）：
 * 1. 開啟 index.html
 * 2. 在 Console 貼上此腳本
 * 3. 執行: runUITests()
 */

// ============================================
// 測試工具函數
// ============================================

/**
 * 等待指定毫秒數
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 模擬點擊元素
 */
async function click(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    element.click();
    await sleep(50); // 等待事件處理
    return element;
}

/**
 * 模擬輸入文字
 */
async function type(selector, text) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50);
    return element;
}

/**
 * 模擬按下 Enter 鍵
 */
async function pressEnter(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    const event = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true
    });
    element.dispatchEvent(event);
    await sleep(50);
    return element;
}

/**
 * 設定滑桿值
 */
async function setSlider(selector, value) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(100); // 等待防抖渲染
    return element;
}

/**
 * 驗證元素文字內容
 */
function assertText(selector, expectedText) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    const actualText = element.textContent.trim();
    if (actualText !== expectedText.trim()) {
        throw new Error(`Text mismatch: expected "${expectedText}", got "${actualText}"`);
    }
}

/**
 * 驗證元素是否有指定 class
 */
function assertHasClass(selector, className) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    if (!element.classList.contains(className)) {
        throw new Error(`Element ${selector} does not have class "${className}"`);
    }
}

/**
 * 驗證 Canvas 已更新（透過檢查 ImageData）
 */
function assertCanvasUpdated() {
    const canvas = document.querySelector('#terrainLayer');
    if (!canvas) {
        throw new Error('Canvas not found');
    }
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 檢查是否全黑（未渲染）
    let hasColor = false;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0) {
            hasColor = true;
            break;
        }
    }

    if (!hasColor) {
        throw new Error('Canvas appears to be empty (all black)');
    }
}

// ============================================
// 測試套件
// ============================================

// 使用 window 物件避免重複宣告錯誤
if (!window.UITestBot) {
    window.UITestBot = {};
}

window.UITestBot.testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// 簡寫別名
const testResults = window.UITestBot.testResults;

async function runTest(name, testFn) {
    console.log(`\n🧪 執行測試: ${name}`);
    try {
        await testFn();
        console.log(`✅ [UI] ${name} PASSED`);
        testResults.passed++;
        testResults.tests.push({ name, status: 'PASSED' });
    } catch (error) {
        console.error(`❌ [UI] ${name} FAILED:`, error.message);
        testResults.failed++;
        testResults.tests.push({ name, status: 'FAILED', error: error.message });
    }
}

// ============================================
// 測試案例
// ============================================

/**
 * 測試 1: 種子輸入流程
 */
async function test_SeedInputFlow() {
    // 保存原始種子
    const originalSeed = window.terrainConfig?.seed;

    // 1. 在輸入欄位輸入文字種子
    await type('#inp_seed', 'UI_TEST_SEED');

    // 2. 點擊生成按鈕
    await click('#btnGenerate');
    await sleep(200); // 等待渲染

    // 3. 驗證種子已更新
    const newSeed = window.terrainConfig?.seed;
    if (!newSeed || newSeed === originalSeed) {
        throw new Error('Seed was not updated');
    }

    // 4. 驗證種子顯示已更新
    const seedDisplay = document.querySelector('#current_seed');
    if (!seedDisplay || seedDisplay.textContent !== newSeed.toString()) {
        throw new Error(`Seed display mismatch: expected ${newSeed}, got ${seedDisplay?.textContent}`);
    }

    // 5. 驗證 Canvas 已重新渲染
    assertCanvasUpdated();
}

/**
 * 測試 2: Enter 鍵生成地圖
 */
async function test_SeedInputEnterKey() {
    await type('#inp_seed', 'ENTER_KEY_TEST');
    await pressEnter('#inp_seed');
    await sleep(200);

    const seedDisplay = document.querySelector('#current_seed');
    if (!seedDisplay || !seedDisplay.textContent) {
        throw new Error('Seed display not updated after Enter key');
    }

    assertCanvasUpdated();
}

/**
 * 測試 3: 數字種子
 */
async function test_NumericSeed() {
    await type('#inp_seed', '12345');
    await click('#btnGenerate');
    await sleep(200);

    const seed = window.terrainConfig?.seed;
    if (seed !== 12345) {
        throw new Error(`Expected seed 12345, got ${seed}`);
    }

    assertText('#current_seed', '12345');
}

/**
 * 測試 4: 隨機種子按鈕
 */
async function test_RandomSeedButton() {
    const oldSeed = window.terrainConfig?.seed;

    await click('#btnRandomSeed');
    await sleep(300);

    const newSeed = window.terrainConfig?.seed;
    if (newSeed === oldSeed) {
        throw new Error('Random seed button did not generate a new seed');
    }

    // 驗證輸入欄位已清空
    const input = document.querySelector('#inp_seed');
    if (input.value !== '') {
        throw new Error('Input field was not cleared after random seed');
    }

    assertCanvasUpdated();
}

/**
 * 測試 5: 複製種子按鈕
 */
async function test_CopySeedButton() {
    // Mock clipboard API
    let copiedText = null;
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async (text) => {
        copiedText = text;
        return Promise.resolve();
    };

    try {
        await click('#btnCopySeed');
        await sleep(100);

        const currentSeed = window.terrainConfig?.seed;
        if (copiedText !== currentSeed.toString()) {
            throw new Error(`Expected to copy "${currentSeed}", but got "${copiedText}"`);
        }

        // 驗證視覺回饋（按鈕應顯示 ✓）
        const btn = document.querySelector('#btnCopySeed');
        if (btn.textContent !== '✓') {
            throw new Error('Copy button did not show checkmark feedback');
        }
    } finally {
        // 恢復原始函數
        navigator.clipboard.writeText = originalWriteText;
    }
}

/**
 * 測試 6: Scale 滑桿
 */
async function test_ScaleSlider() {
    const originalScale = window.terrainConfig?.scale;

    await setSlider('#inp_scale', '120');
    await sleep(200);

    const newScale = window.terrainConfig?.scale;
    if (newScale !== 120) {
        throw new Error(`Expected scale 120, got ${newScale}`);
    }

    assertText('#val_scale', '120');
    assertCanvasUpdated();
}

/**
 * 測試 7: Octaves 滑桿
 */
async function test_OctavesSlider() {
    await setSlider('#inp_octaves', '3');
    await sleep(200);

    const octaves = window.terrainConfig?.octaves;
    if (octaves !== 3) {
        throw new Error(`Expected octaves 3, got ${octaves}`);
    }

    assertText('#val_octaves', '3');
}

/**
 * 測試 8: 海平面滑桿
 */
async function test_SeaLevelSlider() {
    await setSlider('#inp_sea', '0.5');
    await sleep(200);

    const seaLevel = window.terrainConfig?.seaLevel;
    if (Math.abs(seaLevel - 0.5) > 0.01) {
        throw new Error(`Expected seaLevel 0.5, got ${seaLevel}`);
    }

    assertText('#val_sea', '0.5');
}

/**
 * 測試 9: 視圖模式切換
 */
async function test_ViewModeSwitching() {
    // 預設應該是 biome 模式
    assertHasClass('#btn_biome', 'active');

    // 切換到高度模式
    await click('#btn_height');
    await sleep(100);

    assertHasClass('#btn_height', 'active');

    // 驗證 biome 按鈕不再是 active
    const biomeBtn = document.querySelector('#btn_biome');
    if (biomeBtn.classList.contains('active')) {
        throw new Error('Biome button should not be active after switching');
    }

    // 切換回 biome 模式
    await click('#btn_biome');
    await sleep(100);
    assertHasClass('#btn_biome', 'active');
}

/**
 * 測試 10: 匯出按鈕
 */
async function test_ExportButton() {
    // Mock anchor click
    let downloadTriggered = false;
    let downloadHref = null;
    let downloadFilename = null;

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function(tagName) {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
            const originalClick = element.click.bind(element);
            element.click = function() {
                downloadTriggered = true;
                downloadHref = element.href;
                downloadFilename = element.download;
            };
        }
        return element;
    };

    try {
        await click('#btnExport');
        await sleep(100);

        if (!downloadTriggered) {
            throw new Error('Export button did not trigger download');
        }

        if (!downloadHref || !downloadHref.startsWith('data:image/png')) {
            throw new Error('Download href is not a PNG data URL');
        }

        if (!downloadFilename || !downloadFilename.includes('rpg-map-seed-')) {
            throw new Error('Download filename does not match expected format');
        }

        // 驗證視覺回饋
        const btn = document.querySelector('#btnExport');
        if (btn.textContent !== '✓ 已匯出！') {
            throw new Error('Export button did not show success feedback');
        }
    } finally {
        // 恢復原始函數
        document.createElement = originalCreateElement;
    }
}

/**
 * 測試 11: 雲層切換
 */
async function test_CloudsToggle() {
    const checkbox = document.querySelector('#chk_clouds');
    const originalState = checkbox.checked;

    // 切換雲層
    checkbox.checked = !originalState;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(100);

    // 恢復原始狀態
    checkbox.checked = originalState;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * 測試 12: HUD 顯示
 */
async function test_HUDDisplay() {
    const wrapper = document.querySelector('.map-wrapper');
    const hud = document.querySelector('#hud');

    if (!wrapper || !hud) {
        throw new Error('Map wrapper or HUD not found');
    }

    // 模擬 mousemove 事件
    const rect = wrapper.getBoundingClientRect();
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true
    });

    wrapper.dispatchEvent(mouseEvent);
    await sleep(100);

    // 驗證 HUD 是否顯示
    if (hud.style.opacity !== '1') {
        throw new Error('HUD did not become visible on mousemove');
    }

    // 驗證 HUD 內容
    if (!hud.innerHTML.includes('高度') && !hud.innerHTML.includes('Height')) {
        throw new Error('HUD does not contain expected data');
    }
}

// ============================================
// 主測試執行器
// ============================================

async function runUITests() {
    console.clear();
    console.log('═══════════════════════════════════════════════════════');
    console.log('🤖 UI 測試機器人啟動');
    console.log('═══════════════════════════════════════════════════════\n');

    // 檢查必要的全域物件
    if (typeof window.terrainConfig === 'undefined') {
        console.error('❌ terrainConfig 未找到！請確保在正確的頁面執行測試。');
        return;
    }

    console.log('✅ 偵測到 RPG 世界生成器環境\n');

    // 保存原始狀態
    const originalConfig = JSON.parse(JSON.stringify(window.terrainConfig));

    testResults.passed = 0;
    testResults.failed = 0;
    testResults.tests = [];

    // 執行所有測試
    await runTest('種子輸入流程', test_SeedInputFlow);
    await runTest('Enter 鍵生成', test_SeedInputEnterKey);
    await runTest('數字種子', test_NumericSeed);
    await runTest('隨機種子按鈕', test_RandomSeedButton);
    await runTest('複製種子按鈕', test_CopySeedButton);
    await runTest('Scale 滑桿', test_ScaleSlider);
    await runTest('Octaves 滑桿', test_OctavesSlider);
    await runTest('海平面滑桿', test_SeaLevelSlider);
    await runTest('視圖模式切換', test_ViewModeSwitching);
    await runTest('匯出按鈕', test_ExportButton);
    await runTest('雲層切換', test_CloudsToggle);
    await runTest('HUD 顯示', test_HUDDisplay);

    // 恢復原始狀態
    console.log('\n🔄 恢復原始設定...');
    Object.assign(window.terrainConfig, originalConfig);

    // 顯示測試結果
    console.log('\n' + '═'.repeat(60));
    console.log('📊 測試結果總結');
    console.log('═'.repeat(60));
    console.log(`✅ 通過: ${testResults.passed}`);
    console.log(`❌ 失敗: ${testResults.failed}`);
    console.log(`📝 總計: ${testResults.passed + testResults.failed}`);

    if (testResults.failed === 0) {
        console.log('\n🎉 所有 UI 測試通過！');
        console.log('✅ UI 層功能完整且穩定。');
    } else {
        console.log('\n⚠️  偵測到 UI 問題：');
        testResults.tests
            .filter(t => t.status === 'FAILED')
            .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    }

    console.log('═'.repeat(60) + '\n');

    return testResults;
}

// 匯出給瀏覽器 Console 使用
window.UITestBot.runUITests = runUITests;
window.runUITests = runUITests; // 簡寫別名

// 防止重複載入
if (window.UITestBot.loaded) {
    console.warn('⚠️  UI 測試機器人已經載入過，將使用現有版本');
} else {
    window.UITestBot.loaded = true;
    console.log('✅ UI 測試機器人已載入');
    console.log('執行測試請輸入: runUITests()');
}
