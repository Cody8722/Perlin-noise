/**
 * ========================================
 * Phase 19.0: UI Modernization & Cleanup
 * ========================================
 * 智能 UI 控制器 - 自動生成與雲層管理
 *
 * 功能：
 * 1. Debounce 防抖 - 避免滑桿拖動時頻繁觸發
 * 2. 自動生成 - 滑桿改變時自動重新生成地形/河流
 * 3. 禁用雲層 - 移除無關的雲層 UI
 *
 * @module ui_controller
 */

import { generateTerrain, generateRivers } from './terrain.js';
import { terrainConfig } from './config.js';

/**
 * ========================================
 * Utility: Debounce 防抖函數
 * ========================================
 * 延遲執行函數，避免頻繁觸發
 *
 * @param {Function} func - 要防抖的函數
 * @param {number} wait - 等待時間（毫秒）
 * @returns {Function} 防抖後的函數（含 .cancel() 方法）
 *
 * 使用範例：
 * const debouncedGenerate = debounce(() => generateTerrain(), 300);
 * slider.addEventListener('input', debouncedGenerate);
 * debouncedGenerate.cancel();  // 取消待執行的函數
 */
export function debounce(func, wait) {
    let timeout;

    function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            timeout = null;
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    }

    // Phase 20.5: 添加 cancel 方法（用於中斷 debounce）
    executedFunction.cancel = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };

    return executedFunction;
}

/**
 * ========================================
 * 禁用雲層系統
 * ========================================
 * 雲層與物理系統無關，且會分散注意力
 */
export function disableClouds() {
    console.log('🌫️ 禁用雲層系統...');

    // 1. 隱藏雲層 Canvas
    const cloudLayer = document.getElementById('cloudLayer');
    if (cloudLayer) {
        cloudLayer.style.display = 'none';
        console.log('   ✅ 雲層 Canvas 已隱藏');
    }

    // 2. 隱藏雲層複選框
    const cloudCheckbox = document.getElementById('chk_clouds');
    if (cloudCheckbox) {
        const cloudControl = cloudCheckbox.closest('.control-group');
        if (cloudControl) {
            cloudControl.style.display = 'none';
            console.log('   ✅ 雲層控制項已隱藏');
        }
    }

    console.log('✅ 雲層系統已禁用');
}

/**
 * ========================================
 * 設置自動生成系統
 * ========================================
 * 監聽所有滑桿，根據參數類型觸發不同的生成策略
 *
 * @param {Object} renderCallback - 渲染回調函數 { renderAll }
 */
export function setupAutoGeneration(renderCallback) {
    console.log('🔧 設置自動生成系統...');

    // 防抖時間（毫秒）- 滑桿停止拖動後等待時間
    const DEBOUNCE_DELAY = 800;  // 0.8 秒

    // 地形參數 - 需要完整重新生成地形
    const terrainParams = [
        { id: 'inp_scale', config: 'scale', type: 'int' },
        { id: 'inp_octaves', config: 'octaves', type: 'int' },
        { id: 'inp_sea', config: 'seaLevel', type: 'float' },
        { id: 'inp_moist', config: 'moistureOffset', type: 'float' },
        { id: 'inp_temp', config: 'temperatureOffset', type: 'float' }
    ];

    // 河流參數 - 只需重新生成河流
    const riverParams = [
        { id: 'inp_river_density', config: 'riverDensity', type: 'int' },
        { id: 'inp_river_threshold', config: 'riverThreshold', type: 'int' },
        { id: 'inp_irrigation', config: 'irrigationStrength', type: 'float' }
    ];

    /**
     * 完整地形生成（地形 + 河流）
     */
    const fullGeneration = debounce(async () => {
        console.log('🌍 自動生成：完整地形（地形 + 河流）');
        showGeneratingIndicator('生成地形中...');

        try {
            // 1. 生成地形
            generateTerrain();

            // 2. 生成河流（使用默認密度）
            const riverDensity = terrainConfig.riverDensity || 10000;
            await generateRivers(riverDensity);

            // 3. 渲染
            if (renderCallback && renderCallback.renderAll) {
                renderCallback.renderAll();
            }

            hideGeneratingIndicator();
            console.log('✅ 自動生成完成（完整地形）');
        } catch (error) {
            hideGeneratingIndicator();
            console.error('❌ 自動生成失敗:', error);
        }
    }, DEBOUNCE_DELAY);

    /**
     * 僅河流生成
     */
    const riverGeneration = debounce(async () => {
        console.log('🌊 自動生成：僅河流');
        showGeneratingIndicator('生成河流中...');

        try {
            const riverDensity = terrainConfig.riverDensity || 10000;
            await generateRivers(riverDensity);

            if (renderCallback && renderCallback.renderAll) {
                renderCallback.renderAll();
            }

            hideGeneratingIndicator();
            console.log('✅ 自動生成完成（僅河流）');
        } catch (error) {
            hideGeneratingIndicator();
            console.error('❌ 自動生成失敗:', error);
        }
    }, DEBOUNCE_DELAY);

    /**
     * 綁定地形參數（觸發完整生成）
     */
    terrainParams.forEach(param => {
        const input = document.getElementById(param.id);
        if (input) {
            input.addEventListener('input', (e) => {
                const value = param.type === 'int'
                    ? parseInt(e.target.value)
                    : parseFloat(e.target.value);

                // 更新配置
                terrainConfig[param.config] = value;

                // 觸發完整生成（防抖）
                fullGeneration();
            });
            console.log(`   ✅ 已綁定地形參數: ${param.id}`);
        }
    });

    /**
     * 綁定河流參數（僅觸發河流生成）
     */
    riverParams.forEach(param => {
        const input = document.getElementById(param.id);
        if (input) {
            input.addEventListener('input', (e) => {
                const value = param.type === 'int'
                    ? parseInt(e.target.value)
                    : parseFloat(e.target.value);

                // 更新配置
                terrainConfig[param.config] = value;

                // 僅觸發河流生成（防抖）
                riverGeneration();
            });
            console.log(`   ✅ 已綁定河流參數: ${param.id}`);
        }
    });

    console.log('✅ 自動生成系統已啟用');
    console.log(`   ⏱️  防抖延遲: ${DEBOUNCE_DELAY}ms`);
    console.log('   💡 滑桿停止拖動後將自動重新生成');
}

/**
 * ========================================
 * 視覺反饋：顯示生成指示器
 * ========================================
 */
function showGeneratingIndicator(message = '計算中...') {
    // 尋找或創建指示器
    let indicator = document.getElementById('auto-gen-indicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'auto-gen-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-size: 14px;
            font-weight: 500;
            z-index: 9999;
            animation: fadeIn 0.3s ease;
        `;
        document.body.appendChild(indicator);
    }

    indicator.textContent = `⚙️ ${message}`;
    indicator.style.display = 'block';
}

/**
 * 隱藏生成指示器
 */
function hideGeneratingIndicator() {
    const indicator = document.getElementById('auto-gen-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * ========================================
 * Phase 20.5: 絲滑無限地圖拖動系統（LOD 優化）
 * ========================================
 * 滑鼠拖動 Canvas 以平移無限世界
 *
 * 關鍵優化：
 * - **拖動時：** 快速預覽（Worker 生成低解析度地形，跳過河流）
 * - **停止時：** 完整渲染（全解析度 + 河流模擬）
 * - **節流：** 使用 requestAnimationFrame 限制更新頻率到螢幕刷新率
 *
 * @param {Object} renderCallback - 渲染回調函數 { renderAll, renderPreview }
 */
export function setupMapDragging(renderCallback) {
    console.log('🗺️  設置絲滑無限地圖拖動系統 (LOD)...');

    const canvas = document.getElementById('terrainLayer');
    if (!canvas) {
        console.warn('   ⚠️  找不到 terrainLayer Canvas，拖動功能未啟用');
        return;
    }

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let rafId = null;  // requestAnimationFrame ID
    let pendingUpdate = false;  // 是否有待處理的更新

    // LOD 配置
    const PREVIEW_RESOLUTION = 0.5;  // 拖動時使用 50% 解析度（4倍速）
    const DRAG_DEBOUNCE_DELAY = 500;  // 停止拖動後 0.5 秒生成完整版

    /**
     * 快速預覽生成（拖動時呼叫）
     * 使用 Worker 生成低解析度地形（無河流）
     */
    async function generatePreview() {
        console.log('⚡ generatePreview() 被呼叫');
        try {
            const { terrainConfig, MAP_CONFIG } = await import('./config.js');
            const { getTerrainWorker } = await import('./terrain.js');

            const worker = await getTerrainWorker();
            console.log('⚡ Worker 已取得，準備發送預覽命令');

            // 準備預覽配置
            const previewConfig = {
                width: MAP_CONFIG.width,
                height: MAP_CONFIG.height,
                offsetX: terrainConfig.offsetX,
                offsetY: terrainConfig.offsetY,
                resolution: PREVIEW_RESOLUTION,
                seed: terrainConfig.seed,
                scale: terrainConfig.scale,
                octaves: terrainConfig.octaves,
                seaLevel: terrainConfig.seaLevel,
                moistureOffset: terrainConfig.moistureOffset,
                temperatureOffset: terrainConfig.temperatureOffset
            };

            // 發送預覽生成命令到 Worker
            worker.postMessage({
                cmd: 'generatePreview',
                previewConfig: previewConfig
            });
            console.log('⚡ 預覽命令已發送到 Worker');

        } catch (error) {
            console.error('❌ 預覽生成失敗:', error);
        }
    }

    /**
     * 拖動結束後的防抖生成（完整地形 + 河流）
     */
    const debouncedFullGeneration = debounce(async () => {
        console.log('🌍 拖動完成：生成完整地形與河流...');
        showGeneratingIndicator('生成高品質地圖...');

        try {
            const { generateTerrain, generateRivers } = await import('./terrain.js');
            const { terrainConfig } = await import('./config.js');

            // 1. 生成完整地形（全解析度）
            terrainConfig.resolution = 1.0;
            generateTerrain();

            // 2. 生成河流（慢，但詳細）
            const riverDensity = terrainConfig.riverDensity || 10000;
            await generateRivers(riverDensity);

            // 3. 渲染完整版本
            if (renderCallback && renderCallback.renderAll) {
                renderCallback.renderAll();
            }

            hideGeneratingIndicator();
            console.log('✅ 完整地圖生成完成');
        } catch (error) {
            hideGeneratingIndicator();
            console.error('❌ 完整生成失敗:', error);
        }
    }, DRAG_DEBOUNCE_DELAY);

    /**
     * 節流更新函數（使用 requestAnimationFrame）
     * 限制更新頻率到螢幕刷新率（通常 60fps）
     */
    function schedulePreviewUpdate() {
        if (pendingUpdate) return;  // 已有待處理的更新，跳過

        pendingUpdate = true;
        rafId = requestAnimationFrame(async () => {
            try {
                await generatePreview();
            } catch (error) {
                console.error('❌ RAF 預覽更新失敗:', error);
            } finally {
                // 確保 pendingUpdate 總是被重置（即使發生錯誤）
                pendingUpdate = false;
            }
        });
    }

    // 滑鼠按下 - 開始拖動
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = 'grabbing';

        // Phase 20.5 Fix: 取消待執行的完整生成（避免與預覽模式衝突）
        debouncedFullGeneration.cancel();
        console.log('🖱️  開始拖動（預覽模式）- 已取消待執行的完整生成');
    });

    // 滑鼠移動 - 更新偏移並觸發預覽
    canvas.addEventListener('mousemove', async (e) => {
        if (!isDragging) return;

        // 計算滑鼠移動距離（像素）
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        // 更新上次位置
        lastX = e.clientX;
        lastY = e.clientY;

        // 動態導入 terrainConfig
        const { terrainConfig } = await import('./config.js');

        // 更新世界座標偏移
        terrainConfig.offsetX -= deltaX;
        terrainConfig.offsetY -= deltaY;

        // 使用 requestAnimationFrame 節流預覽生成
        schedulePreviewUpdate();
    });

    // 滑鼠放開 - 停止拖動並觸發完整生成
    canvas.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'grab';

            // 取消待處理的預覽更新
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            console.log('🖱️  停止拖動（生成完整版本）');

            // 觸發完整生成（防抖）
            debouncedFullGeneration();
        }
    });

    // 滑鼠離開 Canvas - 停止拖動
    canvas.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'grab';

            // 取消待處理的預覽更新
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            console.log('🖱️  拖動中斷（生成完整版本）');

            // 同樣觸發完整生成
            debouncedFullGeneration();
        }
    });

    // 設定預設游標為 'grab'
    canvas.style.cursor = 'grab';

    console.log('✅ 絲滑無限地圖拖動已啟用（LOD 優化）');
    console.log('   🖱️  拖動時：50% 解析度預覽（快速）');
    console.log('   🎨  停止時：100% 解析度 + 河流（詳細）');
}

/**
 * ========================================
 * 公開 API：初始化 UI 控制器
 * ========================================
 * @param {Object} renderCallback - 渲染回調函數 { renderAll }
 */
export function initUI(renderCallback) {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  🎨 Phase 19.0 + 20: UI Modernization + Infinite Map ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    // 1. 禁用雲層
    disableClouds();

    // 2. 設置自動生成
    setupAutoGeneration(renderCallback);

    // 3. Phase 20: 設置無限地圖拖動
    setupMapDragging(renderCallback);

    console.log('✅ UI 控制器初始化完成');
    console.log('   💡 現在可以直接拖動滑桿，系統會自動重新生成！');
    console.log('   🗺️  拖動地圖探索無限世界！');
}

// 也可以暴露到 window（方便測試）
if (typeof window !== 'undefined') {
    window.UIController = {
        debounce,
        disableClouds,
        setupAutoGeneration,
        setupMapDragging,  // Phase 20
        initUI
    };
}
