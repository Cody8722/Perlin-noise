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
let currentRenderMode = 'biome';  // 'biome', 'height', 'moisture', 'temperature'

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
 * @param {string} mode - 渲染模式 ('biome', 'height', 'moisture', 'temperature')
 */
export function setRenderMode(mode) {
    if (['biome', 'height', 'moisture', 'temperature'].includes(mode)) {
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
 * 渲染地形到 Canvas
 * 根據當前渲染模式選擇不同的視覺化方式
 */
export function renderTerrain() {
    const imgData = terrainCtx.createImageData(MAP_CONFIG.width, MAP_CONFIG.height);
    const data = imgData.data;

    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            const height = mapData.height[index];
            const moisture = mapData.moisture[index];
            const temperature = mapData.temperature[index];

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

                case 'biome':
                default:
                    // 生物群系視圖（預設）
                    color = getBiomeColor(height, moisture, temperature);
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

    terrainCtx.putImageData(imgData, 0, 0);
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
