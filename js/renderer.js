/**
 * 渲染模組
 * 負責將地形和雲層渲染到 Canvas
 */

import noise from './noise.js';
import { MAP_CONFIG, terrainConfig, getBiomeColor } from './config.js';
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
 * @param {number} value - 0-1 的正規化 flux 值
 * @returns {Array<number>} RGB 陣列
 */
function fluxGradient(value) {
    // 白色 (無水流) → 淺藍 → 深藍 (河流)
    // 使用對數縮放來強調河流
    const intensity = Math.pow(value, 0.3);  // 使用指數壓縮讓小河流更明顯

    const r = Math.floor((1 - intensity) * 255);
    const g = Math.floor((1 - intensity * 0.6) * 255);
    const b = Math.floor(200 + intensity * 55);  // 保持偏藍色調

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

    // Phase 9.9: 定義河流寬度閾值
    const MEDIUM_RIVER_THRESHOLD = maxFlux * 0.15;  // 前 15% 為中型河流
    const LARGE_RIVER_THRESHOLD = maxFlux * 0.30;   // 前 30% 為大型河流

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

                    // Phase 9.99: 「文明」風格河流（100% 不透明、極亮）
                    if (flux >= terrainConfig.riverThreshold && height > terrainConfig.seaLevel) {
                        // 街機風格顏色方案：完全不透明，高飽和度
                        if (flux >= LARGE_RIVER_THRESHOLD) {
                            // 大河流：白藍色調（反射效果）
                            color = [224, 255, 255];  // #E0FFFF - 極亮
                        } else if (flux >= MEDIUM_RIVER_THRESHOLD) {
                            // 中型河流：深天空藍
                            color = [0, 191, 255];    // #00BFFF - 亮藍
                        } else {
                            // 小河流：亮青色
                            color = [0, 255, 255];    // #00FFFF - 純青
                        }
                        // 完全替換，無混合！
                    }
                    break;
            }

            // 陰影效果（僅在生物群系模式下應用）
            let shadow = 1;
            if (currentRenderMode === 'biome' && x > 0) {
                const leftHeight = getHeight(x - 1, y);
                if (leftHeight > height + 0.02) {
                    shadow = 0.8;
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

            // 應用擴展模式（Phase 9.99: 完全覆蓋，無混合）
            for (const { dx, dy } of expandPattern) {
                const nx = x + dx;
                const ny = y + dy;

                // 邊界檢查
                if (nx >= 0 && nx < MAP_CONFIG.width && ny >= 0 && ny < MAP_CONFIG.height) {
                    const neighborIndex = ny * MAP_CONFIG.width + nx;

                    // 只在非河流像素或更小河流上繪製
                    if (riverMarkers[neighborIndex] < riverSize) {
                        const neighborPixelIndex = neighborIndex * 4;

                        // Phase 9.99: 完全覆蓋（100% 不透明）
                        data[neighborPixelIndex] = riverR;
                        data[neighborPixelIndex + 1] = riverG;
                        data[neighborPixelIndex + 2] = riverB;
                        // Alpha 保持 255（已設定）
                    }
                }
            }
        }
    }
}

/**
 * 渲染雲層到 Canvas
 */
export function renderClouds() {
    noise.init(terrainConfig.seed + 999);  // 使用不同的種子

    const width = MAP_CONFIG.width * 2;  // 雲層寬度為地圖的兩倍（用於無縫滾動）
    const height = MAP_CONFIG.height;

    const imgData = cloudCtx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // 使用 FBM 生成雲層
            const cloudValue = noise.fbm(x, y, 3, 100, 0);

            const index = (y * width + x) * 4;

            // 白色雲層
            data[index] = 255;
            data[index + 1] = 255;
            data[index + 2] = 255;

            // 根據噪聲值設定透明度
            data[index + 3] = cloudValue > 0.6 ? (cloudValue - 0.6) * 400 : 0;
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
