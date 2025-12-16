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
 * @returns {Function} 防抖後的函數
 *
 * 使用範例：
 * const debouncedGenerate = debounce(() => generateTerrain(), 300);
 * slider.addEventListener('input', debouncedGenerate);
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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
 * 公開 API：初始化 UI 控制器
 * ========================================
 * @param {Object} renderCallback - 渲染回調函數 { renderAll }
 */
export function initUI(renderCallback) {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  🎨 Phase 19.0: UI Modernization                      ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    // 1. 禁用雲層
    disableClouds();

    // 2. 設置自動生成
    setupAutoGeneration(renderCallback);

    console.log('✅ UI 控制器初始化完成');
    console.log('   💡 現在可以直接拖動滑桿，系統會自動重新生成！');
}

// 也可以暴露到 window（方便測試）
if (typeof window !== 'undefined') {
    window.UIController = {
        debounce,
        disableClouds,
        setupAutoGeneration,
        initUI
    };
}
