/**
 * ========================================
 * Phase 14.5: 渲染模組（專業版）
 * ========================================
 * 負責將地形和雲層渲染到 Canvas
 * 支援多種視覺化模式和河流增強效果
 *
 * @module renderer
 */

import noise from './noise.js';
import {
    MAP_CONFIG,
    terrainConfig,
    getBiomeColor,
    RENDER_CONSTANTS
} from './config.js';
import { mapData, getHeight } from './terrain.js';

// Canvas 元素和上下文
let terrainCanvas, terrainCtx;
let cloudCanvas, cloudCtx;

// 當前渲染模式
let currentRenderMode = 'biome';  // 'biome', 'height', 'moisture', 'temperature', 'flux'

/**
 * 初始化渲染器
 */
export function initRenderer() {
    terrainCanvas = document.getElementById('terrainLayer');
    terrainCtx = terrainCanvas.getContext('2d');

    cloudCanvas = document.getElementById('cloudLayer');
    cloudCtx = cloudCanvas.getContext('2d');
}

/**
 * 設定渲染模式
 * @param {string} mode - 渲染模式 ('biome', 'height', 'moisture', 'temperature', 'flux')
 */
export function setRenderMode(mode) {
    if (['biome', 'height', 'moisture', 'temperature', 'flux'].includes(mode)) {
        currentRenderMode = mode;
    }
}

/**
 * 獲取當前渲染模式
 * @returns {string} 當前模式
 */
export function getRenderMode() {
    return currentRenderMode;
}

/**
 * 顏色生成輔助函數：灰階梯度
 * @param {number} value - 0-1 的值
 * @returns {Array<number>} RGB 陣列
 */
function grayscaleGradient(value) {
    const intensity = Math.floor(value * 255);
    return [intensity, intensity, intensity];
}

/**
 * 顏色生成輔助函數：濕度梯度（白色到藍色）
 * @param {number} value - 0-1 的值
 * @returns {Array<number>} RGB 陣列
 */
function moistureGradient(value) {
    // 白色 (乾燥) → 淺藍 → 深藍 (潮濕)
    const r = Math.floor((1 - value) * 255);
    const g = Math.floor((1 - value * 0.5) * 255);
    const b = 255;
    return [r, g, b];
}

/**
 * 顏色生成輔助函數：溫度梯度（藍色到紅色）
 * @param {number} value - 0-1 的值
 * @returns {Array<number>} RGB 陣列
 */
function temperatureGradient(value) {
    // 使用 HSL 到 RGB 的轉換
    // 藍色 (冷) → 青色 → 綠色 → 黃色 → 紅色 (熱)

    if (value < 0.25) {
        // 藍色 → 青色
        const t = value / 0.25;
        return [0, Math.floor(t * 255), 255];
    } else if (value < 0.5) {
        // 青色 → 綠色
        const t = (value - 0.25) / 0.25;
        return [0, 255, Math.floor((1 - t) * 255)];
    } else if (value < 0.75) {
        // 綠色 → 黃色
        const t = (value - 0.5) / 0.25;
        return [Math.floor(t * 255), 255, 0];
    } else {
        // 黃色 → 紅色
        const t = (value - 0.75) / 0.25;
        return [255, Math.floor((1 - t) * 255), 0];
    }
}

/**
 * 顏色生成輔助函數：水流累積量梯度（白色到深藍色）
 * Phase 8: 河流視覺化
 * 使用指數縮放強調小河流，創造更清晰的視覺對比
 *
 * @param {number} value - 0-1 的正規化 flux 值
 * @returns {Array<number>} RGB 陣列 [r, g, b]
 */
function fluxGradient(value) {
    // 白色 (無水流) → 淺藍 → 深藍 (河流)
    // 使用指數縮放來強調小河流（提升可見性）
    const intensity = Math.pow(value, RENDER_CONSTANTS.FLUX_GRADIENT_EXPONENT);

    const r = Math.floor((1 - intensity) * RENDER_CONSTANTS.RGB_MAX);
    const g = Math.floor((1 - intensity * RENDER_CONSTANTS.FLUX_INTENSITY_FACTOR) * RENDER_CONSTANTS.RGB_MAX);
    const b = Math.floor(RENDER_CONSTANTS.FLUX_BLUE_BASE + intensity * RENDER_CONSTANTS.FLUX_BLUE_RANGE);

    return [r, g, b];
}

/**
 * 渲染地形到 Canvas
 * 根據當前渲染模式選擇不同的視覺化方式
 */
export function renderTerrain() {
    const imgData = terrainCtx.createImageData(MAP_CONFIG.width, MAP_CONFIG.height);
    const data = imgData.data;

    // Phase 8: 計算最大 flux 值用於正規化
    let maxFlux = 1;
    if (currentRenderMode === 'flux' || currentRenderMode === 'biome') {
        maxFlux = Math.max(1, ...mapData.flux);  // 防止除以 0
    }

    // Phase 9.9: 定義河流寬度閾值（基於 flux 百分位數）
    const MEDIUM_RIVER_THRESHOLD = maxFlux * RENDER_CONSTANTS.MEDIUM_RIVER_THRESHOLD;
    const LARGE_RIVER_THRESHOLD = maxFlux * RENDER_CONSTANTS.LARGE_RIVER_THRESHOLD;

    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            const height = mapData.height[index];
            const moisture = mapData.moisture[index];
            const temperature = mapData.temperature[index];
            const flux = mapData.flux[index];

            let color;

            // 根據渲染模式選擇顏色生成方式
            switch (currentRenderMode) {
                case 'height':
                    // 高度熱力圖：黑色(低) → 白色(高)
                    color = grayscaleGradient(height);
                    break;

                case 'moisture':
                    // 濕度熱力圖：白色(乾) → 藍色(濕)
                    color = moistureGradient(moisture);
                    break;

                case 'temperature':
                    // 溫度熱力圖：藍色(冷) → 紅色(熱)
                    color = temperatureGradient(temperature);
                    break;

                case 'flux':
                    // Phase 8: 水流累積量熱力圖
                    const normalizedFlux = flux / maxFlux;
                    color = fluxGradient(normalizedFlux);
                    break;

                case 'biome':
                default:
                    // 生物群系視圖（預設）
                    color = getBiomeColor(height, moisture, temperature);

                    // Phase 18.95: 湖泊渲染（優先於河流）
                    if (mapData.lakes[index] === 1 && height > terrainConfig.seaLevel) {
                        const biomeColor = color;  // 保存原始生物群系顏色
                        // 湖泊使用深沉靜水藍，區別於流動河流
                        color = blendColors(
                            RENDER_CONSTANTS.LAKE_COLOR,
                            biomeColor,
                            RENDER_CONSTANTS.LAKE_ALPHA
                        );
                    }
                    // Phase 18.9: 自然河流（alpha 混合）
                    else if (flux >= terrainConfig.riverThreshold && height > terrainConfig.seaLevel) {
                        const biomeColor = color;  // 保存原始生物群系顏色
                        let riverColor;
                        let riverAlpha;

                        if (flux >= LARGE_RIVER_THRESHOLD) {
                            // 大河流：深藍（90% 不透明）
                            riverColor = RENDER_CONSTANTS.RIVER_COLOR_LARGE;
                            riverAlpha = RENDER_CONSTANTS.RIVER_ALPHA_LARGE;
                        } else if (flux >= MEDIUM_RIVER_THRESHOLD) {
                            // 中型河流：中藍（75% 不透明）
                            riverColor = RENDER_CONSTANTS.RIVER_COLOR_MEDIUM;
                            riverAlpha = RENDER_CONSTANTS.RIVER_ALPHA_MEDIUM;
                        } else {
                            // 小河流：淺藍（60% 不透明）
                            riverColor = RENDER_CONSTANTS.RIVER_COLOR_SMALL;
                            riverAlpha = RENDER_CONSTANTS.RIVER_ALPHA_SMALL;
                        }

                        // Alpha 混合：河流顏色與生物群系顏色融合
                        color = blendColors(riverColor, biomeColor, riverAlpha);
                    }
                    break;
            }

            // 陰影效果（僅在生物群系模式下應用）
            // 模擬左側光源，創造立體感
            let shadow = 1;
            if (currentRenderMode === 'biome' && x > 0) {
                const leftHeight = getHeight(x - 1, y);
                if (leftHeight > height + RENDER_CONSTANTS.SHADOW_HEIGHT_THRESHOLD) {
                    shadow = RENDER_CONSTANTS.SHADOW_INTENSITY;
                }
            }

            // 設定像素顏色
            const pixelIndex = index * 4;
            data[pixelIndex] = color[0] * shadow;      // R
            data[pixelIndex + 1] = color[1] * shadow;  // G
            data[pixelIndex + 2] = color[2] * shadow;  // B
            data[pixelIndex + 3] = 255;                 // A
        }
    }

    // Phase 9.9: 後處理 - 加寬主要河流（僅 biome 模式）
    if (currentRenderMode === 'biome') {
        expandRivers(data, maxFlux, MEDIUM_RIVER_THRESHOLD, LARGE_RIVER_THRESHOLD);
    }

    terrainCtx.putImageData(imgData, 0, 0);
}

/**
 * Phase 18.9: Alpha 混合函數
 * 混合兩個 RGB 顏色，使用標準 alpha 合成公式
 *
 * 公式：result = foreground * alpha + background * (1 - alpha)
 *
 * @param {Array<number>} foreground - 前景色 [r, g, b]
 * @param {Array<number>} background - 背景色 [r, g, b]
 * @param {number} alpha - 透明度 (0-1，0=完全透明，1=完全不透明)
 * @returns {Array<number>} 混合後的顏色 [r, g, b]
 */
function blendColors(foreground, background, alpha) {
    return [
        Math.round(foreground[0] * alpha + background[0] * (1 - alpha)),
        Math.round(foreground[1] * alpha + background[1] * (1 - alpha)),
        Math.round(foreground[2] * alpha + background[2] * (1 - alpha))
    ];
}

/**
 * Phase 9.99: 河流寬度擴展（後處理）- 「螢光筆」風格
 * 根據 flux 值加寬河流，使用完全不透明的實心顏色
 *
 * @param {Uint8ClampedArray} data - ImageData.data 陣列
 * @param {number} maxFlux - 最大 flux 值
 * @param {number} mediumThreshold - 中型河流閾值
 * @param {number} largeThreshold - 大型河流閾值
 */
function expandRivers(data, maxFlux, mediumThreshold, largeThreshold) {
    // 創建河流標記地圖（避免重複處理）
    const riverMarkers = new Uint8Array(MAP_CONFIG.width * MAP_CONFIG.height);

    // Phase 9.99: 檢測超大河流（前 50%）
    const VERY_LARGE_RIVER_THRESHOLD = maxFlux * 0.50;

    // 第一遍：標記所有河流像素
    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            const flux = mapData.flux[index];
            const height = mapData.height[index];

            if (flux >= terrainConfig.riverThreshold && height > terrainConfig.seaLevel) {
                if (flux >= VERY_LARGE_RIVER_THRESHOLD) {
                    riverMarkers[index] = 4;  // 超大河流：5×5 方塊
                } else if (flux >= largeThreshold) {
                    riverMarkers[index] = 3;  // 大河流：4×4 方塊
                } else if (flux >= mediumThreshold) {
                    riverMarkers[index] = 2;  // 中型河流：十字形
                } else {
                    riverMarkers[index] = 1;  // 小河流：單像素
                }
            }
        }
    }

    // 第二遍：擴展河流寬度
    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            const riverSize = riverMarkers[index];

            if (riverSize === 0) continue;  // 非河流像素

            // 獲取當前像素顏色（河流顏色）
            const pixelIndex = index * 4;
            const riverR = data[pixelIndex];
            const riverG = data[pixelIndex + 1];
            const riverB = data[pixelIndex + 2];

            // 定義擴展模式
            let expandPattern = [];

            if (riverSize === 4) {
                // 超大河流：5×5 方塊（距離 2）
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        expandPattern.push({ dx, dy });
                    }
                }
            } else if (riverSize === 3) {
                // 大河流：4×4 方塊（距離 1.5，近似）
                expandPattern = [
                    { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
                    { dx: -1, dy:  0 },                    { dx: 1, dy:  0 },
                    { dx: -1, dy:  1 }, { dx: 0, dy:  1 }, { dx: 1, dy:  1 },
                    // 增加對角線第二圈
                    { dx: -2, dy: 0 }, { dx: 2, dy: 0 },
                    { dx: 0, dy: -2 }, { dx: 0, dy: 2 }
                ];
            } else if (riverSize === 2) {
                // 中型河流：十字形（4 方向）
                expandPattern = [
                    { dx: 0, dy: -1 },
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                    { dx: 0, dy: 1 }
                ];
            }
            // riverSize === 1 時不擴展

            // Phase 18.9: 應用擴展模式（使用 alpha 混合 + 邊緣抗鋸齒）
            for (const { dx, dy } of expandPattern) {
                const nx = x + dx;
                const ny = y + dy;

                // 邊界檢查
                if (nx >= 0 && nx < MAP_CONFIG.width && ny >= 0 && ny < MAP_CONFIG.height) {
                    const neighborIndex = ny * MAP_CONFIG.width + nx;

                    // 只在非河流像素或更小河流上繪製
                    if (riverMarkers[neighborIndex] < riverSize) {
                        const neighborPixelIndex = neighborIndex * 4;

                        // 獲取現有背景顏色
                        const bgR = data[neighborPixelIndex];
                        const bgG = data[neighborPixelIndex + 1];
                        const bgB = data[neighborPixelIndex + 2];

                        // Phase 18.9: 計算邊緣距離（曼哈頓距離）
                        const distance = Math.abs(dx) + Math.abs(dy);
                        const maxDistance = riverSize === 4 ? 4 : (riverSize === 3 ? 3 : 2);

                        // 邊緣像素使用較低 alpha（抗鋸齒效果）
                        let alpha;
                        if (distance >= maxDistance - 1) {
                            // 邊緣：35% 不透明
                            alpha = RENDER_CONSTANTS.RIVER_ALPHA_EDGE;
                        } else {
                            // 中心：根據河流大小使用不同 alpha
                            if (riverSize === 4) {
                                alpha = RENDER_CONSTANTS.RIVER_ALPHA_LARGE;
                            } else if (riverSize === 3) {
                                alpha = RENDER_CONSTANTS.RIVER_ALPHA_LARGE;
                            } else {
                                alpha = RENDER_CONSTANTS.RIVER_ALPHA_MEDIUM;
                            }
                        }

                        // Alpha 混合
                        const blended = blendColors([riverR, riverG, riverB], [bgR, bgG, bgB], alpha);
                        data[neighborPixelIndex] = blended[0];
                        data[neighborPixelIndex + 1] = blended[1];
                        data[neighborPixelIndex + 2] = blended[2];
                        // Alpha 通道保持 255（完全不透明的混合結果）
                    }
                }
            }
        }
    }
}

/**
 * 渲染雲層到 Canvas
 * 生成動態雲層效果，寬度為地圖2倍以支援無縫滾動
 *
 * @throws {Error} 如果 Canvas 上下文未初始化
 */
export function renderClouds() {
    if (!cloudCtx) {
        console.error('❌ renderClouds(): Canvas 上下文未初始化');
        return;
    }

    // 使用不同的種子生成獨立的雲層模式
    noise.init(terrainConfig.seed + RENDER_CONSTANTS.CLOUD_SEED_OFFSET);

    const width = MAP_CONFIG.width * RENDER_CONSTANTS.CLOUD_WIDTH_MULTIPLIER;  // 雙倍寬度（無縫滾動）
    const height = MAP_CONFIG.height;

    const imgData = cloudCtx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // 使用 FBM 生成雲層噪聲
            const cloudValue = noise.fbm(x, y, RENDER_CONSTANTS.CLOUD_OCTAVES, RENDER_CONSTANTS.CLOUD_SCALE, 0);

            const index = (y * width + x) * 4;

            // 白色雲層
            data[index] = RENDER_CONSTANTS.RGB_MAX;
            data[index + 1] = RENDER_CONSTANTS.RGB_MAX;
            data[index + 2] = RENDER_CONSTANTS.RGB_MAX;

            // 根據噪聲值設定透明度（閾值過濾）
            data[index + 3] = cloudValue > RENDER_CONSTANTS.CLOUD_THRESHOLD ?
                             (cloudValue - RENDER_CONSTANTS.CLOUD_THRESHOLD) * RENDER_CONSTANTS.CLOUD_ALPHA_MULTIPLIER : 0;
        }
    }

    cloudCtx.putImageData(imgData, 0, 0);
}

/**
 * 切換雲層顯示
 * @param {boolean} show - 是否顯示雲層
 */
export function toggleClouds(show) {
    cloudCanvas.style.display = show ? 'block' : 'none';
}

/**
 * 渲染完整場景（地形 + 雲層）
 */
export function renderAll() {
    renderTerrain();
    renderClouds();
}
