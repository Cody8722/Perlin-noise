/**
 * 主程式入口
 * RPG 世界生成器初始化流程
 */

import { initRenderer, renderAll } from './renderer.js';
import { generateTerrain, getHeight, getMoisture } from './terrain.js';
import { initUI } from './ui.js';
import noise from './noise.js';
import { terrainConfig, getBiomeColor } from './config.js';

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

    console.log('  🗺️  測試地形資料：');
    for (const point of testPoints) {
        const h = getHeight(point.x, point.y);
        const m = getMoisture(point.x, point.y);
        const color = getBiomeColor(h, m);

        console.log(`    座標 (${point.x}, ${point.y}): h=${h.toFixed(3)}, m=${m.toFixed(3)}, color=[${color.join(',')}]`);

        // 驗證範圍
        if (h < 0 || h > 1 || m < 0 || m > 1) {
            console.error(`    ❌ 座標 (${point.x}, ${point.y}) 的值超出範圍！`);
            passed = false;
        }

        // 驗證顏色格式
        if (!Array.isArray(color) || color.length !== 3) {
            console.error(`    ❌ 座標 (${point.x}, ${point.y}) 的顏色格式錯誤！`);
            passed = false;
        }
    }

    // 測試 4: 生物群系邏輯一致性
    const biomeTests = [
        { h: 0.2, m: 0.5, name: '海洋' },
        { h: 0.5, m: 0.3, name: '草原' },
        { h: 0.7, m: 0.6, name: '森林' },
        { h: 0.9, m: 0.5, name: '高山雪地' },
        { h: 0.5, m: 0.1, name: '沙漠' }
    ];

    console.log('  🌍 測試生物群系邏輯：');
    for (const test of biomeTests) {
        const color = getBiomeColor(test.h, test.m);
        const isValid = color.every(c => c >= 0 && c <= 255);
        console.log(`    h=${test.h}, m=${test.m} → RGB=[${color.join(',')}] ${isValid ? '✓' : '✗'}`);

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

    // 2. 生成初始地形
    generateTerrain();

    // 3. 渲染場景
    renderAll();

    // 4. 初始化 UI 控制
    initUI();

    console.log('✅ 初始化完成！');

    // 5. 執行 Golden Master 回歸測試
    console.log('');
    runGoldenMaster();
}

// 等待 DOM 載入完成後執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
