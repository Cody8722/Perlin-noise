/**
 * UI 控制模組
 * 處理使用者互動、滑桿控制、按鈕事件等
 */

import { MAP_CONFIG, terrainConfig, updateConfig, generateNewSeed, setSeed, getBiomeName } from './config.js';
import { generateTerrain, getTerrainData, generateRivers, applyHydrologyToMoisture, applyHydrologyToMoistureAdvanced } from './terrain.js';
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
 * 更新種子顯示
 */
function updateSeedDisplay() {
    const seedDisplay = document.getElementById('current_seed');
    if (seedDisplay) {
        seedDisplay.textContent = terrainConfig.seed;
    }
}

/**
 * 根據輸入生成世界
 */
function generateFromInput() {
    const seedInput = document.getElementById('inp_seed');
    const inputValue = seedInput.value.trim();

    if (inputValue === '') {
        // 空輸入：生成隨機種子
        generateNewSeed();
    } else {
        // 使用輸入的種子（數字或文字）
        setSeed(inputValue);
    }

    // 生成並渲染
    generateTerrain();
    renderTerrain();

    // 更新顯示
    updateSeedDisplay();

    // 清空輸入欄位（可選）
    // seedInput.value = '';
}

/**
 * 初始化 UI 控制
 */
export function initUI() {
    // 初始化種子顯示
    updateSeedDisplay();

    // 綁定種子輸入與生成按鈕
    const seedInput = document.getElementById('inp_seed');
    const generateBtn = document.getElementById('btnGenerate');

    generateBtn.addEventListener('click', generateFromInput);

    // 支援 Enter 鍵生成
    seedInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateFromInput();
        }
    });

    // 綁定複製種子按鈕
    const copySeedBtn = document.getElementById('btnCopySeed');
    copySeedBtn.addEventListener('click', () => {
        const seed = terrainConfig.seed;
        navigator.clipboard.writeText(seed.toString()).then(() => {
            // 視覺回饋
            copySeedBtn.textContent = '✓';
            setTimeout(() => {
                copySeedBtn.textContent = '📋';
            }, 1000);
        }).catch(err => {
            console.error('無法複製種子:', err);
        });
    });

    // 綁定隨機種子按鈕
    const randomSeedBtn = document.getElementById('btnRandomSeed');
    randomSeedBtn.addEventListener('click', () => {
        // 清空輸入欄位
        seedInput.value = '';
        // 生成隨機種子
        generateNewSeed();
        generateTerrain();
        renderTerrain();
        updateSeedDisplay();

        // 視覺回饋
        randomSeedBtn.textContent = '✨';
        setTimeout(() => {
            randomSeedBtn.textContent = '🎲';
        }, 500);
    });

    // 綁定滑桿
    bindSlider('inp_scale', 'val_scale', 'scale', false);
    bindSlider('inp_octaves', 'val_octaves', 'octaves', false);
    bindSlider('inp_sea', 'val_sea', 'seaLevel', true);
    bindSlider('inp_moist', 'val_moist', 'moistureOffset', true);
    bindSlider('inp_temp', 'val_temp', 'temperatureOffset', true);  // 溫度偏移

    // Phase 8: 綁定河流控制滑桿
    bindSlider('inp_river_density', 'val_river_density', 'riverDensity', false);

    // 河流顯示閾值（更新後僅重繪，不重新生成）
    const riverThresholdInput = document.getElementById('inp_river_threshold');
    const riverThresholdDisplay = document.getElementById('val_river_threshold');
    riverThresholdInput.addEventListener('input', () => {
        const value = parseInt(riverThresholdInput.value);
        updateConfig('riverThreshold', value);
        riverThresholdDisplay.textContent = value;
        // 僅重繪，不重新生成河流
        renderTerrain();
    });

    // Phase 9: 綁定灌溉強度滑桿
    const irrigationInput = document.getElementById('inp_irrigation');
    const irrigationDisplay = document.getElementById('val_irrigation');
    irrigationInput.addEventListener('input', () => {
        const value = parseFloat(irrigationInput.value);
        updateConfig('irrigationStrength', value);
        irrigationDisplay.textContent = value.toFixed(1);
    });

    // Phase 9: 綁定進階灌溉模式 checkbox
    const advancedIrrigationCheckbox = document.getElementById('chk_advanced_irrigation');
    advancedIrrigationCheckbox.addEventListener('change', () => {
        updateConfig('useAdvancedIrrigation', advancedIrrigationCheckbox.checked);
    });

    // 綁定生成河流按鈕（Phase 9: 加入生態回饋）
    const generateRiversBtn = document.getElementById('btnGenerateRivers');
    generateRiversBtn.addEventListener('click', () => {
        // Step 1: 生成河流網絡
        generateRivers(terrainConfig.riverDensity);

        // Step 2: Phase 9 - 應用水文回饋到濕度層
        if (terrainConfig.irrigationStrength > 0) {
            if (terrainConfig.useAdvancedIrrigation) {
                applyHydrologyToMoistureAdvanced(terrainConfig.irrigationStrength, 1);
            } else {
                applyHydrologyToMoisture(terrainConfig.irrigationStrength);
            }
        }

        // Step 3: 重繪地形（生物群系會根據新的濕度改變）
        renderTerrain();

        // 視覺回饋
        const originalText = generateRiversBtn.textContent;
        generateRiversBtn.textContent = '✅ 河流 + 生態已生成！';
        setTimeout(() => {
            generateRiversBtn.textContent = originalText;
        }, 1500);
    });

    // 綁定雲層切換
    const cloudCheckbox = document.getElementById('chk_clouds');
    cloudCheckbox.addEventListener('change', () => {
        toggleClouds(cloudCheckbox.checked);
    });

    // 綁定視圖模式切換按鈕
    initViewModeButtons();

    // 初始化地圖懸停事件
    initMapHover();

    // 綁定匯出按鈕
    initExportButton();
}

/**
 * 初始化匯出按鈕
 */
function initExportButton() {
    const exportBtn = document.getElementById('btnExport');

    exportBtn.addEventListener('click', () => {
        // 獲取地形 canvas（不包含雲層）
        const canvas = document.getElementById('terrainLayer');

        if (!canvas) {
            console.error('找不到地形 canvas');
            return;
        }

        try {
            // 將 canvas 轉換為 PNG 資料 URL
            const dataURL = canvas.toDataURL('image/png');

            // 生成檔名（包含種子和時間戳記）
            const seed = terrainConfig.seed;
            const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const filename = `rpg-map-seed-${seed}-${timestamp}.png`;

            // 建立下載連結並觸發下載
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataURL;
            link.click();

            // 視覺回饋
            const originalText = exportBtn.textContent;
            exportBtn.textContent = '✓ 已匯出！';
            exportBtn.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';

            setTimeout(() => {
                exportBtn.textContent = originalText;
                exportBtn.style.background = '';
            }, 2000);

        } catch (error) {
            console.error('匯出失敗:', error);
            exportBtn.textContent = '❌ 匯出失敗';
            setTimeout(() => {
                exportBtn.textContent = '📷 匯出地圖 (PNG)';
            }, 2000);
        }
    });
}

/**
 * 初始化視圖模式切換按鈕
 */
function initViewModeButtons() {
    const modes = ['biome', 'height', 'moisture', 'temperature', 'flux'];  // Phase 8: 新增 flux

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
 * 顯示游標所在位置的生物群系資訊和詳細數據
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
            const { height, moisture, temperature, flux } = getTerrainData(index);

            // 顯示詳細資訊（多行格式）
            const biomeName = getBiomeName(height, moisture, temperature);
            const renderMode = getRenderMode();

            // 根據當前視圖模式調整顯示格式
            if (renderMode === 'biome') {
                // 生物群系模式：顯示完整資訊（包含河流）
                const fluxInfo = flux >= terrainConfig.riverThreshold ? ` | 水流: ${flux.toFixed(0)}` : '';
                hud.innerHTML = `
                    <div><strong>${biomeName}</strong></div>
                    <div>高度: ${height.toFixed(2)} | 濕度: ${moisture.toFixed(2)}</div>
                    <div>溫度: ${temperature.toFixed(2)}${fluxInfo}</div>
                `;
            } else if (renderMode === 'flux') {
                // Phase 8: 水流模式
                hud.innerHTML = `
                    <div><strong>水流累積: ${flux.toFixed(0)}</strong></div>
                    <div style="font-size:0.85em; opacity:0.7;">H:${height.toFixed(2)} M:${moisture.toFixed(2)} T:${temperature.toFixed(2)}</div>
                `;
            } else {
                // 其他熱力圖模式：強調當前視圖的數據
                const modeLabels = {
                    height: '高度',
                    moisture: '濕度',
                    temperature: '溫度'
                };
                const values = { height, moisture, temperature };
                const currentValue = values[renderMode];

                hud.innerHTML = `
                    <div><strong>${modeLabels[renderMode]}: ${currentValue.toFixed(3)}</strong></div>
                    <div style="font-size:0.85em; opacity:0.7;">H:${height.toFixed(2)} M:${moisture.toFixed(2)} T:${temperature.toFixed(2)}</div>
                `;
            }

            hud.style.opacity = '1';
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
