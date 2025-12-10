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
    baseMoisture: new Float32Array(MAP_CONFIG.width * MAP_CONFIG.height),  // Phase 11: 不可變的原始濕度（防止累積突變）
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

            // Phase 11: 保存原始濕度到不可變備份
            mapData.baseMoisture[index] = moisture;
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

    // Phase 12: 🔒 重置 RNG 到當前種子（確保確定性）
    noise.init(terrainConfig.seed);
    console.log(`   🎲 RNG 已重置到種子: ${terrainConfig.seed}`);

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
        // Phase 12: 使用種子化 RNG（確定性）而非 Math.random()
        const startPos = landCoords[Math.floor(noise.random() * landCoords.length)];

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

/**
 * ========================================
 * PHASE 9: 生態系統回饋迴圈（尼羅河效應）
 * ========================================
 * 河流改變周圍濕度，創造綠洲和河岸森林
 */

/**
 * 應用水文系統對濕度的影響（Phase 9.5: 修復碎片化）
 * 河流會增加周圍土地的濕度，改變生物群系
 *
 * 改進：
 * 1. 閾值過濾：忽略不重要的小支流（flux < fluxThreshold）
 * 2. 空間平滑：濕度擴散到周圍像素，創造平滑過渡
 *
 * @param {number} strength - 灌溉強度（0.0-5.0，建議 1.0）
 * @param {number} fluxThreshold - Flux 閾值（預設 3，低於此值的支流不影響濕度）
 */
export function applyHydrologyToMoisture(strength = 1.0, fluxThreshold = 3) {
    console.log(`💧 應用水文回饋到濕度層（強度: ${strength.toFixed(2)}, 閾值: ${fluxThreshold}）...`);
    const startTime = performance.now();

    // Phase 11: 🔒 CRITICAL - 從不可變備份重置濕度（防止累積突變）
    mapData.moisture.set(mapData.baseMoisture);
    console.log(`   🔄 濕度已從原始狀態重置`);

    let affectedPixels = 0;

    // Phase 9.5: 創建臨時濕度增量地圖（防止覆蓋）
    const moistureBonus = new Float32Array(mapData.moisture.length);

    // Step 1: 計算每個河流像素的濕度貢獻（閾值過濾）
    for (let i = 0; i < mapData.flux.length; i++) {
        const flux = mapData.flux[i];

        // 閾值過濾：忽略小支流
        if (flux >= fluxThreshold) {
            // 計算濕度獎勵
            const bonus = Math.min(0.5, flux * strength * 0.005);

            // 主像素獲得 100% 獎勵
            moistureBonus[i] += bonus;
        }
    }

    // Step 2: 空間平滑 - 3x3 鄰居平均（高斯模糊簡化版）
    const smoothed = new Float32Array(moistureBonus.length);

    // 高斯核權重（3x3，歸一化）
    const kernel = [
        0.077, 0.123, 0.077,   // 上排
        0.123, 0.200, 0.123,   // 中排（中心權重最高）
        0.077, 0.123, 0.077    // 下排
    ];

    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            let weightedSum = 0;

            // 遍歷 3x3 鄰居
            let kernelIndex = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    // 邊界檢查
                    if (nx >= 0 && nx < MAP_CONFIG.width && ny >= 0 && ny < MAP_CONFIG.height) {
                        const neighborIndex = ny * MAP_CONFIG.width + nx;
                        weightedSum += moistureBonus[neighborIndex] * kernel[kernelIndex];
                    }

                    kernelIndex++;
                }
            }

            smoothed[index] = weightedSum;
        }
    }

    // Step 3: 應用平滑後的濕度增量到實際 moisture 陣列
    for (let i = 0; i < mapData.moisture.length; i++) {
        if (smoothed[i] > 0.001) {  // 忽略微小增量
            const oldMoisture = mapData.moisture[i];
            mapData.moisture[i] = Math.min(1.0, oldMoisture + smoothed[i]);

            if (mapData.moisture[i] > oldMoisture) {
                affectedPixels++;
            }
        }
    }

    const endTime = performance.now();
    console.log(`✅ 水文回饋應用完成（平滑版）！`);
    console.log(`   - 影響像素: ${affectedPixels}`);
    console.log(`   - 執行時間: ${(endTime - startTime).toFixed(2)} ms`);
}

/**
 * 應用水文系統對濕度的影響（進階版：包含擴散效果 + 平滑）
 * Phase 9.5: 修復碎片化，創造更寬且平滑的河岸綠帶
 *
 * @param {number} strength - 灌溉強度（0.0-5.0）
 * @param {number} spreadRadius - 擴散半徑（1 = 4 方向，2 = 8 方向加強）
 * @param {number} fluxThreshold - Flux 閾值（預設 3）
 */
export function applyHydrologyToMoistureAdvanced(strength = 1.0, spreadRadius = 1, fluxThreshold = 3) {
    console.log(`💧 應用水文回饋到濕度層（強度: ${strength.toFixed(2)}, 擴散: ${spreadRadius}, 閾值: ${fluxThreshold}）...`);
    const startTime = performance.now();

    // Phase 11: 🔒 CRITICAL - 從不可變備份重置濕度（防止累積突變）
    mapData.moisture.set(mapData.baseMoisture);
    console.log(`   🔄 濕度已從原始狀態重置（進階模式）`);

    let affectedPixels = 0;

    // 創建臨時陣列儲存濕度增量（避免覆蓋原始值）
    const moistureBonus = new Float32Array(mapData.moisture.length);

    // Phase 9.5: 河流影響 + 擴散 + 閾值過濾
    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            const flux = mapData.flux[index];

            // 閾值過濾：忽略小支流
            if (flux >= fluxThreshold) {
                // 主河道濕度獎勵
                const mainBonus = Math.min(0.5, flux * strength * 0.005);
                moistureBonus[index] += mainBonus;

                // 擴散到鄰居（距離衰減）
                const maxSpread = spreadRadius + 1;  // 擴散範圍

                for (let dy = -maxSpread; dy <= maxSpread; dy++) {
                    for (let dx = -maxSpread; dx <= maxSpread; dx++) {
                        if (dx === 0 && dy === 0) continue;  // 跳過中心點

                        const nx = x + dx;
                        const ny = y + dy;

                        // 邊界檢查
                        if (nx >= 0 && nx < MAP_CONFIG.width && ny >= 0 && ny < MAP_CONFIG.height) {
                            const neighborIndex = ny * MAP_CONFIG.width + nx;
                            const height = mapData.height[neighborIndex];

                            // 僅影響陸地
                            if (height > terrainConfig.seaLevel) {
                                // 距離衰減：越遠影響越弱
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                const falloff = Math.max(0, 1 - distance / (maxSpread + 1));

                                // 鄰居獲得衰減後的濕度獎勵
                                const spreadBonus = mainBonus * falloff * 0.5;
                                moistureBonus[neighborIndex] += spreadBonus;
                            }
                        }
                    }
                }
            }
        }
    }

    // Phase 9.5: 再次平滑（防止階梯效應）
    const smoothed = new Float32Array(moistureBonus.length);

    // 簡化版 3x3 平滑
    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            let sum = moistureBonus[index] * 0.4;  // 中心權重 40%
            let count = 0.4;

            // 4 方向鄰居
            const neighbors = [
                { dx: 0, dy: -1 }, { dx: -1, dy: 0 },
                { dx: 1, dy: 0 },  { dx: 0, dy: 1 }
            ];

            for (const { dx, dy } of neighbors) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < MAP_CONFIG.width && ny >= 0 && ny < MAP_CONFIG.height) {
                    const neighborIndex = ny * MAP_CONFIG.width + nx;
                    sum += moistureBonus[neighborIndex] * 0.15;  // 鄰居權重 15% 各
                    count += 0.15;
                }
            }

            smoothed[index] = sum / count;
        }
    }

    // 應用濕度增量到實際 moisture 陣列
    for (let i = 0; i < mapData.moisture.length; i++) {
        if (smoothed[i] > 0.001) {
            const oldMoisture = mapData.moisture[i];
            mapData.moisture[i] = Math.min(1.0, oldMoisture + smoothed[i]);

            if (mapData.moisture[i] > oldMoisture) {
                affectedPixels++;
            }
        }
    }

    const endTime = performance.now();
    console.log(`✅ 水文回饋應用完成（進階平滑版）！`);
    console.log(`   - 影響像素: ${affectedPixels}`);
    console.log(`   - 執行時間: ${(endTime - startTime).toFixed(2)} ms`);
}
