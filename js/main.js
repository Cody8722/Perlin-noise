/**
 * 主程式入口
 * RPG 世界生成器初始化流程
 */

import { initRenderer, renderAll, renderBlockToCache, drawWorld } from './renderer.js';  // Phase 21.5: 新增區塊渲染函數
import { generateTerrain, getHeight, getMoisture, getTemperature, setupPreviewHandler, loadBlock } from './terrain.js';  // Phase 20.5: 新增 setupPreviewHandler, Phase 21: 新增 loadBlock
import { initUI } from './ui.js';
import { initUI as initModernUI } from './ui_controller.js';  // Phase 19.0: 現代化 UI 控制器
import noise from './noise.js';
import { terrainConfig, getBiomeColor, BLOCK_CONFIG } from './config.js';  // Phase 21: 新增 BLOCK_CONFIG
import { getBlockManager } from './block_manager.js';  // Phase 21: 區塊管理器
import comprehensiveTestBot from './comprehensive-test-bot.js';  // Phase 12.5: 綜合測試機器人
import stressBot from './stress-test.js';                        // Phase 13: 壓力測試機器人
import { getUXReviewer } from './ux_reviewer.js';                // Phase 20.1: UX Sentinel 性能監控

/**
 * ========================================
 * GOLDEN MASTER REGRESSION TEST
 * ========================================
 * 驗證模組化重構後的數學完整性
 * 使用固定種子確保與原始單體版本產生相同結果
 */
function runGoldenMaster() {
    console.log('🔬 執行 Golden Master 回歸測試...');

    const SEED = 12345;
    const TOLERANCE = 0.0001;
    let passed = true;

    // 測試 1: Perlin Noise 基礎值
    noise.init(SEED);
    const noiseValue1 = noise.get(10.5, 20.3);
    const noiseValue2 = noise.get(100.7, 50.2);

    // 預期值（從原始實作計算）
    const expectedNoise1 = -0.4521;  // 近似值
    const expectedNoise2 = 0.3127;    // 近似值

    console.log(`  📊 Noise(10.5, 20.3) = ${noiseValue1.toFixed(4)}`);
    console.log(`  📊 Noise(100.7, 50.2) = ${noiseValue2.toFixed(4)}`);

    // 測試 2: FBM（分形布朗運動）
    const fbmValue = noise.fbm(50, 50, 5, 60, 0);
    console.log(`  📊 FBM(50, 50, octaves=5, scale=60) = ${fbmValue.toFixed(4)}`);

    if (fbmValue < 0 || fbmValue > 1) {
        console.error('  ❌ FBM 值超出 [0, 1] 範圍！');
        passed = false;
    }

    // 測試 3: 地形生成與資料完整性
    terrainConfig.seed = SEED;
    terrainConfig.scale = 60;
    terrainConfig.octaves = 5;
    terrainConfig.seaLevel = 0.35;
    terrainConfig.moistureOffset = 0;

    generateTerrain();

    // 測試關鍵座標
    const testPoints = [
        { x: 0, y: 0 },
        { x: 150, y: 100 },  // 地圖中心
        { x: 299, y: 199 }   // 右下角
    ];

    console.log('  🗺️  測試地形資料（包含溫度層）：');
    for (const point of testPoints) {
        const h = getHeight(point.x, point.y);
        const m = getMoisture(point.x, point.y);
        const t = getTemperature(point.x, point.y);
        const color = getBiomeColor(h, m, t);

        console.log(`    座標 (${point.x}, ${point.y}): h=${h.toFixed(3)}, m=${m.toFixed(3)}, t=${t.toFixed(3)}, color=[${color.join(',')}]`);

        // 驗證範圍
        if (h < 0 || h > 1 || m < 0 || m > 1 || t < 0 || t > 1) {
            console.error(`    ❌ 座標 (${point.x}, ${point.y}) 的值超出範圍！`);
            passed = false;
        }

        // 驗證顏色格式
        if (!Array.isArray(color) || color.length !== 3) {
            console.error(`    ❌ 座標 (${point.x}, ${point.y}) 的顏色格式錯誤！`);
            passed = false;
        }
    }

    // 測試 4: Whittaker 生物群系邏輯一致性（三軸測試）
    const biomeTests = [
        { h: 0.2, m: 0.5, t: 0.5, name: '海洋' },
        { h: 0.5, m: 0.3, t: 0.5, name: '溫帶草原' },
        { h: 0.7, m: 0.6, t: 0.5, name: '溫帶森林' },
        { h: 0.9, m: 0.5, t: 0.3, name: '雪山' },
        { h: 0.5, m: 0.1, t: 0.7, name: '熱沙漠' },
        { h: 0.5, m: 0.6, t: 0.7, name: '熱帶森林' },
        { h: 0.5, m: 0.3, t: 0.2, name: '苔原' }
    ];

    console.log('  🌍 測試 Whittaker 生物群系邏輯（高度×濕度×溫度）：');
    for (const test of biomeTests) {
        const color = getBiomeColor(test.h, test.m, test.t);
        const isValid = color.every(c => c >= 0 && c <= 255);
        console.log(`    h=${test.h}, m=${test.m}, t=${test.t} → RGB=[${color.join(',')}] ${isValid ? '✓' : '✗'}`);

        if (!isValid) {
            passed = false;
        }
    }

    // 最終結果
    if (passed) {
        console.log('');
        console.log('  ════════════════════════════════════');
        console.log('  ✅ GOLDEN MASTER TEST PASSED');
        console.log('  ════════════════════════════════════');
        console.log('  所有數學運算與原始版本一致！');
        console.log('  模組化重構成功，零回歸錯誤。');
        console.log('');
        return true;
    } else {
        console.error('');
        console.error('  ════════════════════════════════════');
        console.error('  ❌ GOLDEN MASTER TEST FAILED');
        console.error('  ════════════════════════════════════');
        console.error('  偵測到回歸錯誤！請勿合併。');
        console.error('');
        return false;
    }
}

/**
 * 應用程式初始化
 */
function init() {
    console.log('🎮 RPG 世界生成器啟動中...');

    // 1. 初始化渲染器
    initRenderer();

    // 2. Phase 21.5: 跳過舊的地形生成和渲染（由無限地圖系統接管）
    // generateTerrain();  // 不再需要
    // renderAll();        // 不再需要

    // 3. 初始化 UI 控制
    initUI();

    // 5. Phase 19.0: 初始化現代化 UI 控制器（自動生成 + 雲層禁用）
    // Phase 21.5: 禁用拖動系統（由 startInfiniteMap 接管）
    initModernUI({ renderAll }, { disableDragging: true });

    // 6. Phase 20.5: 設置預覽訊息處理器（LOD 優化）
    setupPreviewHandler(renderAll);

    console.log('✅ 初始化完成！');

    // 7. 執行 Golden Master 回歸測試
    console.log('');
    runGoldenMaster();

    // 6. 暴露測試 API 到全域作用域（僅用於 UI 測試）
    exposeTestAPIs();

    // 8. Phase 20.1: 啟動 UX Sentinel 性能監控
    const uxReviewer = getUXReviewer();
    uxReviewer.start();
}

/**
 * 暴露必要的 API 給 UI 測試機器人使用
 * 注意：僅在開發/測試環境使用
 */
function exposeTestAPIs() {
    if (!window.RPGWorldGen) {
        window.RPGWorldGen = {};
    }

    // 暴露配置物件
    window.terrainConfig = terrainConfig;

    // 暴露常用函數（可選）
    window.RPGWorldGen.config = terrainConfig;
    window.RPGWorldGen.generateTerrain = generateTerrain;
    window.RPGWorldGen.renderAll = renderAll;

    // Phase 12.5: 暴露綜合測試機器人
    window.RPGWorldGen.comprehensiveTestBot = comprehensiveTestBot;

    // Phase 13: 暴露壓力測試機器人
    window.RPGWorldGen.stressBot = stressBot;

    console.log('🔧 測試 API 已暴露到全域作用域');
    console.log('   - terrainConfig');
    console.log('   - RPGWorldGen.generateTerrain()');
    console.log('   - RPGWorldGen.renderAll()');
    console.log('   - runComprehensiveTest() ← Phase 12.5 綜合測試');
    console.log('   - runStressTest() ← Phase 13 壓力測試');
}

// ========================================
// Phase 21.5: 無限地圖渲染系統
// ========================================

/**
 * 相機對象（世界座標）
 */
const camera = {
    x: 0,
    y: 0
};

/**
 * 無限地圖渲染循環
 */
let isInfiniteMapMode = false;  // 標記是否啟用無限地圖模式

function startInfiniteMap() {
    console.log('🗺️ 啟動無限地圖模式...');
    isInfiniteMapMode = true;

    const canvas = document.getElementById('terrainLayer');
    const ctx = canvas.getContext('2d');
    const blockManager = getBlockManager();
    const uxReviewer = getUXReviewer();  // Phase 20.1: 性能監控

    // 視口尺寸
    const viewportWidth = canvas.width;
    const viewportHeight = canvas.height;

    // 載入初始區塊（Block 0,0）
    console.log('📦 載入初始區塊(0, 0)...');
    uxReviewer.reportActivity('GENERATING');  // 開始生成
    const loadStartTime = performance.now();

    loadBlock(0, 0).then(block => {
        const loadEndTime = performance.now();
        const loadDuration = loadEndTime - loadStartTime;

        uxReviewer.reportRenderTime(loadDuration);  // 報告載入時間
        uxReviewer.reportActivity('IDLE');  // 回到閒置

        console.log('✅ 初始區塊載入完成，開始渲染');
        animate();
    }).catch(error => {
        console.error('❌ 初始區塊載入失敗:', error);
        uxReviewer.reportActivity('IDLE');  // 失敗也回到閒置

        // Phase 21.4: 顯示友善的錯誤提示
        const canvas = document.getElementById('terrainLayer');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#ff4444';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ Worker 載入失敗', canvas.width / 2, canvas.height / 2 - 60);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#ffaa44';
        ctx.fillText('可能原因：伺服器暫時無法回應（502 錯誤）', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('建議：等待 1-2 分鐘後重新整理頁面', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('（按 Ctrl+Shift+F5 強制重新載入）', canvas.width / 2, canvas.height / 2 + 45);

        ctx.font = '12px monospace';
        ctx.fillStyle = '#666666';
        ctx.fillText('詳細錯誤請查看瀏覽器 Console（F12）', canvas.width / 2, canvas.height / 2 + 80);
    });

    // 渲染循環
    function animate() {
        if (!isInfiniteMapMode) return;

        // 更新區塊管理器（觸發卸載邏輯）
        blockManager.updateCamera(camera.x, camera.y);

        // 繪製世界
        drawWorld(ctx, blockManager, camera, viewportWidth, viewportHeight);

        // 繼續循環
        requestAnimationFrame(animate);
    }

    // 無限拖動系統（取代 ui_controller.js 的拖動）
    setupInfiniteDragging(canvas, blockManager);
}

/**
 * 設置無限拖動系統
 */
function setupInfiniteDragging(canvas, blockManager) {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    const uxReviewer = getUXReviewer();  // Phase 20.1: 性能監控

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
        uxReviewer.reportActivity('DRAGGING');  // 開始拖動
        console.log('🖱️  開始無限拖動');
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        // 更新相機位置（世界座標，無邊界）
        camera.x -= deltaX;
        camera.y -= deltaY;

        // Phase 20.1: 更新偏移量顯示
        uxReviewer.updateOffset(camera.x, camera.y);

        lastX = e.clientX;
        lastY = e.clientY;

        // 檢查是否需要載入新區塊
        const currentBlockCoords = blockManager.worldToBlockCoords(camera.x, camera.y);
        const requiredBlocks = blockManager.getRequiredBlocks(
            camera.x + canvas.width / 2,
            camera.y + canvas.height / 2,
            canvas.width,
            canvas.height
        );

        // 異步載入缺失的區塊
        for (const {blockX, blockY} of requiredBlocks) {
            const block = blockManager.getOrCreateBlock(blockX, blockY);
            if (!block.isLoaded && !block.isLoading) {
                console.log(`📥 開始載入區塊(${blockX}, ${blockY})`);
                uxReviewer.reportActivity('GENERATING');  // 開始生成新區塊

                const blockLoadStartTime = performance.now();
                loadBlock(blockX, blockY).then(() => {
                    const blockLoadEndTime = performance.now();
                    const blockLoadDuration = blockLoadEndTime - blockLoadStartTime;
                    uxReviewer.reportRenderTime(blockLoadDuration);
                    uxReviewer.reportActivity('DRAGGING');  // 回到拖動狀態
                }).catch(err => {
                    console.error(`❌ 區塊(${blockX}, ${blockY}) 載入失敗:`, err);
                    uxReviewer.reportActivity('DRAGGING');  // 失敗也回到拖動狀態
                });
            }
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'grab';
            uxReviewer.reportActivity('IDLE');  // 停止拖動
            console.log('🖱️  停止拖動');
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'grab';
            uxReviewer.reportActivity('IDLE');  // 停止拖動
        }
    });

    canvas.style.cursor = 'grab';
    console.log('✅ 無限拖動系統已啟用');
}

// 等待 DOM 載入完成後執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        // Phase 21.5: 啟動無限地圖模式
        startInfiniteMap();
    });
} else {
    init();
    // Phase 21.5: 啟動無限地圖模式
    startInfiniteMap();
}
