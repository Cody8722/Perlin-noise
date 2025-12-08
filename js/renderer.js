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
 * 渲染地形到 Canvas
 */
export function renderTerrain() {
    const imgData = terrainCtx.createImageData(MAP_CONFIG.width, MAP_CONFIG.height);
    const data = imgData.data;

    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            const height = mapData.height[index];
            const moisture = mapData.moisture[index];

            // 獲取生物群系顏色
            const color = getBiomeColor(height, moisture);

            // 簡單陰影效果（根據左側高度差）
            let shadow = 1;
            if (x > 0) {
                const leftHeight = getHeight(x - 1, y);
                if (leftHeight > height + 0.02) {
                    shadow = 0.8;  // 左側較高時加深陰影
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
