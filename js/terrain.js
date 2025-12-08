/**
 * 地形生成模組
 * 負責生成地形高度圖和濕度圖
 */

import noise from './noise.js';
import { MAP_CONFIG, terrainConfig } from './config.js';

// 地圖資料儲存
export const mapData = {
    height: new Float32Array(MAP_CONFIG.width * MAP_CONFIG.height),
    moisture: new Float32Array(MAP_CONFIG.width * MAP_CONFIG.height)
};

/**
 * 生成地形資料
 * 使用 Perlin 噪聲生成高度圖和濕度圖
 */
export function generateTerrain() {
    // 設定噪聲種子
    noise.init(terrainConfig.seed);

    // 遍歷每個像素
    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;

            // 生成高度值（使用 FBM）
            const height = noise.fbm(
                x,
                y,
                terrainConfig.octaves,
                terrainConfig.scale,
                0  // 無種子偏移
            );
            mapData.height[index] = height;

            // 生成濕度值（使用較少的八度數，較大的縮放）
            const moisture = noise.fbm(
                x,
                y,
                3,  // 濕度使用較少的細節
                terrainConfig.scale * 1.5,
                5000  // 使用不同的種子偏移
            );
            mapData.moisture[index] = moisture;
        }
    }
}

/**
 * 獲取指定座標的高度值
 * @param {number} x - X 座標
 * @param {number} y - Y 座標
 * @returns {number} 高度值 (0-1)
 */
export function getHeight(x, y) {
    if (x < 0 || x >= MAP_CONFIG.width || y < 0 || y >= MAP_CONFIG.height) {
        return 0;
    }
    return mapData.height[y * MAP_CONFIG.width + x];
}

/**
 * 獲取指定座標的濕度值
 * @param {number} x - X 座標
 * @param {number} y - Y 座標
 * @returns {number} 濕度值 (0-1)
 */
export function getMoisture(x, y) {
    if (x < 0 || x >= MAP_CONFIG.width || y < 0 || y >= MAP_CONFIG.height) {
        return 0;
    }
    return mapData.moisture[y * MAP_CONFIG.width + x];
}

/**
 * 獲取指定索引的地形資料
 * @param {number} index - 陣列索引
 * @returns {{height: number, moisture: number}} 地形資料
 */
export function getTerrainData(index) {
    return {
        height: mapData.height[index],
        moisture: mapData.moisture[index]
    };
}
