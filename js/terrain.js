/**
 * 地形生成模組
 * 負責生成地形高度圖和濕度圖
 */

import noise from './noise.js';
import { MAP_CONFIG, terrainConfig } from './config.js';

// 地圖資料儲存
export const mapData = {
    height: new Float32Array(MAP_CONFIG.width * MAP_CONFIG.height),
    moisture: new Float32Array(MAP_CONFIG.width * MAP_CONFIG.height),
    temperature: new Float32Array(MAP_CONFIG.width * MAP_CONFIG.height),
    flux: new Float32Array(MAP_CONFIG.width * MAP_CONFIG.height)  // 水流累積量
};

/**
 * 生成地形資料
 * 使用 Perlin 噪聲生成高度圖、濕度圖和溫度圖
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

            // 生成溫度值
            mapData.temperature[index] = generateTemperatureAt(x, y, height);
        }
    }
}

/**
 * 生成特定座標的溫度值
 * 溫度受三個因素影響：
 * 1. 緯度（赤道熱，極地冷）
 * 2. Perlin 噪聲（自然變化）
 * 3. 海拔高度（高度遞減率，每升高 1000m 降溫約 6.5°C）
 *
 * @param {number} x - X 座標
 * @param {number} y - Y 座標
 * @param {number} elevation - 海拔高度 (0-1)
 * @returns {number} 溫度值 (0-1，0=極冷，1=極熱)
 */
function generateTemperatureAt(x, y, elevation) {
    // 1. 計算緯度因子（0 = 北極，0.5 = 赤道，1 = 南極）
    const latitude = y / MAP_CONFIG.height;

    // 使用絕對值創建對稱的溫度帶（赤道最熱）
    // Math.abs(latitude - 0.5) 在赤道處為 0，兩極處為 0.5
    const latitudeFactor = 1 - Math.abs(latitude - 0.5) * 2;  // 0-1，赤道=1，極地=0

    // 2. 添加 Perlin 噪聲變化（使氣候帶不完全規則）
    const temperatureNoise = noise.fbm(
        x,
        y,
        3,  // 較少的細節
        terrainConfig.scale * 2,  // 較大的氣候區域
        10000  // 獨特的種子偏移
    );

    // 3. 高度遞減率（海拔越高越冷）
    // 假設海平面以上每 0.1 單位高度降溫 0.15
    const elevationPenalty = Math.max(0, (elevation - terrainConfig.seaLevel)) * 1.5;

    // 4. 組合所有因素
    // 基礎溫度（70%來自緯度，30%來自噪聲）
    let temperature = latitudeFactor * 0.7 + temperatureNoise * 0.3;

    // 應用海拔影響
    temperature = Math.max(0, temperature - elevationPenalty);

    // 應用使用者偏移（模擬冰河期或全球暖化）
    temperature += terrainConfig.temperatureOffset || 0;

    // 限制在 0-1 範圍
    return Math.max(0, Math.min(1, temperature));
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
 * 獲取指定座標的溫度值
 * @param {number} x - X 座標
 * @param {number} y - Y 座標
 * @returns {number} 溫度值 (0-1)
 */
export function getTemperature(x, y) {
    if (x < 0 || x >= MAP_CONFIG.width || y < 0 || y >= MAP_CONFIG.height) {
        return 0.5;  // 預設中等溫度
    }
    return mapData.temperature[y * MAP_CONFIG.width + x];
}

/**
 * 獲取指定座標的水流累積量 (flux)
 * @param {number} x - X 座標
 * @param {number} y - Y 座標
 * @returns {number} 水流累積量
 */
export function getFlux(x, y) {
    if (x < 0 || x >= MAP_CONFIG.width || y < 0 || y >= MAP_CONFIG.height) {
        return 0;
    }
    return mapData.flux[y * MAP_CONFIG.width + x];
}

/**
 * 獲取指定索引的地形資料
 * @param {number} index - 陣列索引
 * @returns {{height: number, moisture: number, temperature: number, flux: number}} 地形資料
 */
export function getTerrainData(index) {
    // 邊界檢查：防止訪問無效索引
    const maxIndex = MAP_CONFIG.width * MAP_CONFIG.height;
    if (index < 0 || index >= maxIndex) {
        console.warn(`getTerrainData: 索引 ${index} 超出範圍 [0, ${maxIndex})`);
        return {
            height: 0,
            moisture: 0,
            temperature: 0.5,
            flux: 0
        };
    }

    return {
        height: mapData.height[index] || 0,
        moisture: mapData.moisture[index] || 0,
        temperature: mapData.temperature[index] || 0.5,
        flux: mapData.flux[index] || 0
    };
}

/**
 * ========================================
 * PHASE 8: 水文系統 (Hydrology System)
 * ========================================
 * 使用 Monte Carlo 滴水模擬生成河流網絡
 */

/**
 * 生成河流網絡
 * 使用物理模擬：每個水滴從隨機陸地位置出發，沿著最陡的坡度向下流動
 *
 * @param {number} numDroplets - 水滴數量（建議範圍：1000-50000）
 */
export function generateRivers(numDroplets = 10000) {
    console.log(`🌊 開始生成河流網絡（${numDroplets} 個水滴）...`);
    const startTime = performance.now();

    // 重置 flux 資料
    mapData.flux.fill(0);

    // 生成所有陸地座標列表（快取）
    const landCoords = [];
    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const height = getHeight(x, y);
            if (height > terrainConfig.seaLevel) {
                landCoords.push({ x, y });
            }
        }
    }

    if (landCoords.length === 0) {
        console.warn('⚠️  地圖中沒有陸地，無法生成河流');
        return;
    }

    // 模擬每個水滴
    let successfulDroplets = 0;
    for (let i = 0; i < numDroplets; i++) {
        // 隨機選擇陸地起點
        const startPos = landCoords[Math.floor(Math.random() * landCoords.length)];

        // 模擬水滴路徑
        const pathLength = simulateDroplet(startPos.x, startPos.y);

        if (pathLength > 0) {
            successfulDroplets++;
        }
    }

    const endTime = performance.now();
    console.log(`✅ 河流生成完成！`);
    console.log(`   - 成功水滴: ${successfulDroplets} / ${numDroplets}`);
    console.log(`   - 執行時間: ${(endTime - startTime).toFixed(2)} ms`);
    console.log(`   - 平均速度: ${(numDroplets / (endTime - startTime) * 1000).toFixed(0)} 水滴/秒`);
}

/**
 * 模擬單個水滴的流動路徑
 *
 * @param {number} startX - 起始 X 座標
 * @param {number} startY - 起始 Y 座標
 * @returns {number} 路徑長度（訪問的格子數）
 */
function simulateDroplet(startX, startY) {
    let x = startX;
    let y = startY;
    let pathLength = 0;
    const maxIterations = 1000;  // 防止無限迴圈

    // 訪問紀錄（防止循環）
    const visited = new Set();
    const makeKey = (x, y) => `${x},${y}`;

    while (pathLength < maxIterations) {
        const currentHeight = getHeight(x, y);

        // 終止條件 1：到達海洋
        if (currentHeight <= terrainConfig.seaLevel) {
            break;
        }

        // 記錄當前位置的 flux
        const index = y * MAP_CONFIG.width + x;
        mapData.flux[index] += 1;
        pathLength++;

        // 終止條件 2：已訪問過（檢測循環）
        const key = makeKey(x, y);
        if (visited.has(key)) {
            break;
        }
        visited.add(key);

        // 尋找最低的鄰居（8 方向）
        let lowestHeight = currentHeight;
        let nextX = x;
        let nextY = y;

        const neighbors = [
            { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy:  0 },                    { dx: 1, dy:  0 },
            { dx: -1, dy:  1 }, { dx: 0, dy:  1 }, { dx: 1, dy:  1 }
        ];

        for (const { dx, dy } of neighbors) {
            const nx = x + dx;
            const ny = y + dy;

            // 邊界檢查
            if (nx < 0 || nx >= MAP_CONFIG.width || ny < 0 || ny >= MAP_CONFIG.height) {
                continue;
            }

            const neighborHeight = getHeight(nx, ny);

            // 尋找最低點（嚴格小於）
            if (neighborHeight < lowestHeight) {
                lowestHeight = neighborHeight;
                nextX = nx;
                nextY = ny;
            }
        }

        // 終止條件 3：局部最小值（無法下降）
        if (nextX === x && nextY === y) {
            // 當前位置是局部窪地，水滴在此停止
            break;
        }

        // 移動到下一個位置
        x = nextX;
        y = nextY;
    }

    return pathLength;
}
