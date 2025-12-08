/**
 * UI 控制模組
 * 處理使用者互動、滑桿控制、按鈕事件等
 */

import { MAP_CONFIG, terrainConfig, updateConfig, generateNewSeed, getBiomeName } from './config.js';
import { generateTerrain, getTerrainData } from './terrain.js';
import { renderTerrain, toggleClouds, setRenderMode, getRenderMode } from './renderer.js';

// 防抖計時器
let debounceTimer;

/**
 * 防抖渲染
 * 避免頻繁更新時過度渲染
 */
function debouncedRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        generateTerrain();
        renderTerrain();
    }, 50);
}

/**
 * 綁定滑桿控制
 * @param {string} inputId - 輸入元素 ID
 * @param {string} valueId - 顯示值元素 ID
 * @param {string} configKey - 配置鍵名
 * @param {boolean} isFloat - 是否為浮點數
 */
function bindSlider(inputId, valueId, configKey, isFloat = false) {
    const input = document.getElementById(inputId);
    const valueDisplay = document.getElementById(valueId);

    input.addEventListener('input', () => {
        const value = isFloat ? parseFloat(input.value) : parseInt(input.value);
        updateConfig(configKey, value);
        valueDisplay.textContent = value;
        debouncedRender();
    });
}

/**
 * 初始化 UI 控制
 */
export function initUI() {
    // 綁定生成按鈕
    const generateBtn = document.getElementById('btnGenerate');
    generateBtn.addEventListener('click', () => {
        generateNewSeed();
        generateTerrain();
        renderTerrain();
    });

    // 綁定滑桿
    bindSlider('inp_scale', 'val_scale', 'scale', false);
    bindSlider('inp_octaves', 'val_octaves', 'octaves', false);
    bindSlider('inp_sea', 'val_sea', 'seaLevel', true);
    bindSlider('inp_moist', 'val_moist', 'moistureOffset', true);
    bindSlider('inp_temp', 'val_temp', 'temperatureOffset', true);  // 新增：溫度偏移

    // 綁定雲層切換
    const cloudCheckbox = document.getElementById('chk_clouds');
    cloudCheckbox.addEventListener('change', () => {
        toggleClouds(cloudCheckbox.checked);
    });

    // 綁定視圖模式切換按鈕
    initViewModeButtons();

    // 初始化地圖懸停事件
    initMapHover();
}

/**
 * 初始化視圖模式切換按鈕
 */
function initViewModeButtons() {
    const modes = ['biome', 'height', 'moisture', 'temperature'];

    modes.forEach(mode => {
        const button = document.getElementById(`btn_${mode}`);
        if (button) {
            button.addEventListener('click', () => {
                // 設定渲染模式
                setRenderMode(mode);

                // 更新按鈕樣式（active 狀態）
                modes.forEach(m => {
                    const btn = document.getElementById(`btn_${m}`);
                    if (btn) {
                        if (m === mode) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    }
                });

                // 根據模式顯示/隱藏圖例
                const legend = document.querySelector('.legend-group');
                if (legend) {
                    legend.style.display = mode === 'biome' ? 'block' : 'none';
                }

                // 重新渲染
                renderTerrain();
            });
        }
    });
}

/**
 * 初始化地圖懸停互動
 * 顯示游標所在位置的生物群系資訊
 */
function initMapHover() {
    const wrapper = document.querySelector('.map-wrapper');
    const hud = document.getElementById('hud');

    wrapper.addEventListener('mousemove', (e) => {
        const rect = wrapper.getBoundingClientRect();

        // 計算相對位置（考慮 CSS 縮放）
        const relX = (e.clientX - rect.left) / rect.width;
        const relY = (e.clientY - rect.top) / rect.height;

        // 轉換為地圖座標
        const x = Math.floor(relX * MAP_CONFIG.width);
        const y = Math.floor(relY * MAP_CONFIG.height);

        // 檢查座標是否有效
        if (x >= 0 && x < MAP_CONFIG.width && y >= 0 && y < MAP_CONFIG.height) {
            const index = y * MAP_CONFIG.width + x;
            const { height, moisture, temperature } = getTerrainData(index);

            // 顯示生物群系名稱（包含溫度資訊）
            hud.style.opacity = '1';
            hud.textContent = `${getBiomeName(height, moisture, temperature)} (T:${(temperature * 100).toFixed(0)}%)`;
        }
    });

    wrapper.addEventListener('mouseleave', () => {
        hud.style.opacity = '0';
    });
}

/**
 * 導出生成新世界的函數供外部調用
 */
export function generateNewWorld() {
    generateNewSeed();
    generateTerrain();
    renderTerrain();
}
