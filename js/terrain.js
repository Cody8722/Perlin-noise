/**
 * ========================================
 * Phase 14.5: 地形生成模組（專業版）
 * ========================================
 * 實作完整的地形生成系統，包括：
 * - 高度圖生成（Perlin FBM）
 * - 濕度場生成
 * - 溫度場生成（緯度 + 海拔）
 * - 河流水文系統（Monte Carlo 模擬）
 * - 生態系統回饋（尼羅河效應）
 *
 * @module terrain
 */

import noise from './noise.js';
import {
    MAP_CONFIG,
    terrainConfig,
    TERRAIN_GEN_CONSTANTS,
    RIVER_GEN_CONSTANTS,
    GAUSSIAN_KERNEL_3X3
} from './config.js';

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
 *
 * 算法流程：
 * 1. 初始化噪聲生成器（設定種子）
 * 2. 對每個像素生成高度（FBM）
 * 3. 對每個像素生成濕度（獨立的 FBM）
 * 4. 對每個像素生成溫度（緯度 + 噪聲 + 海拔）
 * 5. 保存不可變的濕度備份（Phase 11：防止累積突變）
 *
 * @throws {Error} 如果噪聲生成器初始化失敗
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
                0  // 高度層無偏移
            );
            mapData.height[index] = height;

            // 生成濕度值（使用較少的八度數，較大的縮放）
            const moisture = noise.fbm(
                x,
                y,
                TERRAIN_GEN_CONSTANTS.MOISTURE_OCTAVES,  // 較少細節（3 層）
                terrainConfig.scale * TERRAIN_GEN_CONSTANTS.MOISTURE_SCALE_MULTIPLIER,
                TERRAIN_GEN_CONSTANTS.MOISTURE_SEED_OFFSET  // 獨立種子空間
            );

            // Phase 11: 保存原始濕度到不可變備份（防止河流累積修改）
            mapData.baseMoisture[index] = moisture;
            mapData.moisture[index] = moisture;

            // 生成溫度值（緯度 + 噪聲 + 海拔影響）
            mapData.temperature[index] = generateTemperatureAt(x, y, height);
        }
    }
}

/**
 * 生成特定座標的溫度值
 * 溫度受三個因素影響：
 * 1. 緯度（赤道熱，極地冷）- 基於物理的溫度梯度
 * 2. Perlin 噪聲（自然變化）- 創造氣候帶的不規則性
 * 3. 海拔高度（高度遞減率）- 模擬對流層溫度遞減（~6.5°C/km）
 *
 * 物理基礎：
 * - 緯度效應：太陽輻射角度差異（赤道直射，極地斜射）
 * - 海拔效應：對流層溫度遞減率（Environmental Lapse Rate）
 * - 噪聲擾動：海洋/陸地分佈、洋流、山脈等局部效應
 *
 * @param {number} x - X 座標（0 到 MAP_CONFIG.width-1）
 * @param {number} y - Y 座標（0 到 MAP_CONFIG.height-1）
 * @param {number} elevation - 海拔高度 (0-1，0=海溝，1=高山）
 * @returns {number} 溫度值（0-1，0=極冷，1=極熱）
 */
function generateTemperatureAt(x, y, elevation) {
    // 1. 計算緯度因子（0 = 北極，0.5 = 赤道，1 = 南極）
    const latitude = y / MAP_CONFIG.height;

    // 使用絕對值創建對稱的溫度帶（赤道最熱）
    // Math.abs(latitude - 0.5) 在赤道處為 0，兩極處為 0.5
    const latitudeFactor = 1 - Math.abs(latitude - 0.5) * TERRAIN_GEN_CONSTANTS.TEMPERATURE_LATITUDE_FACTOR;  // 0-1，赤道=1，極地=0

    // 2. 添加 Perlin 噪聲變化（使氣候帶不完全規則）
    const temperatureNoise = noise.fbm(
        x,
        y,
        TERRAIN_GEN_CONSTANTS.TEMPERATURE_OCTAVES,  // 較少細節（平滑氣候區）
        terrainConfig.scale * TERRAIN_GEN_CONSTANTS.TEMPERATURE_SCALE_MULTIPLIER,  // 大尺度氣候
        TERRAIN_GEN_CONSTANTS.TEMPERATURE_SEED_OFFSET  // 獨立種子空間
    );

    // 3. 高度遞減率（海拔越高越冷）
    // 模擬對流層溫度遞減：海平面以上每 0.1 單位降溫 0.15
    const elevationPenalty = Math.max(0, (elevation - terrainConfig.seaLevel)) * TERRAIN_GEN_CONSTANTS.ELEVATION_TEMPERATURE_PENALTY;

    // 4. 組合所有因素（加權混合）
    // 基礎溫度：70% 來自緯度（主導因素），30% 來自噪聲（局部擾動）
    let temperature = latitudeFactor * TERRAIN_GEN_CONSTANTS.TEMPERATURE_LATITUDE_WEIGHT +
                      temperatureNoise * TERRAIN_GEN_CONSTANTS.TEMPERATURE_NOISE_WEIGHT;

    // 應用海拔影響（減法，高山降溫）
    temperature = Math.max(0, temperature - elevationPenalty);

    // 應用使用者偏移（模擬冰河期或全球暖化）
    temperature += terrainConfig.temperatureOffset || 0;

    // 限制在 [0, 1] 範圍
    return Math.max(TERRAIN_GEN_CONSTANTS.VALUE_MIN, Math.min(TERRAIN_GEN_CONSTANTS.VALUE_MAX, temperature));
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
 * 生成河流網絡（Monte Carlo 水滴模擬）
 * 使用物理模擬：每個水滴從隨機陸地位置出發，沿著最陡的坡度向下流動
 *
 * 算法原理：
 * 1. 隨機選擇陸地起點
 * 2. 貪婪下坡算法（選擇 8 方向中最低的鄰居）
 * 3. 累積 flux（每個像素的訪問次數）
 * 4. 終止條件：到達海洋、局部窪地、或最大迭代次數
 *
 * Phase 12: 確保完全確定性（使用種子化 RNG）
 *
 * @param {number} [numDroplets=10000] - 水滴數量（建議範圍：1000-200000）
 * @throws {RangeError} 如果 numDroplets < 0
 */
export function generateRivers(numDroplets = RIVER_GEN_CONSTANTS.DEFAULT_DROPLET_COUNT) {
    // 參數驗證
    if (numDroplets < 0) {
        throw new RangeError(`generateRivers(): numDroplets 必須 >= 0，收到：${numDroplets}`);
    }
    if (numDroplets === 0) {
        console.warn('⚠️  numDroplets = 0，跳過河流生成');
        return;
    }

    console.log(`🌊 開始生成河流網絡（${numDroplets.toLocaleString()} 個水滴）...`);
    const startTime = performance.now();

    // Phase 12: 🔒 重置 RNG 到當前種子（確保確定性）
    noise.init(terrainConfig.seed);
    console.log(`   🎲 RNG 已重置到種子: ${terrainConfig.seed}`);

    // 重置 flux 資料（清除舊河流）
    mapData.flux.fill(0);

    // 生成所有陸地座標列表（快取，避免重複遍歷）
    const landCoords = [];
    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const height = getHeight(x, y);
            if (height > terrainConfig.seaLevel) {
                landCoords.push({ x, y });
            }
        }
    }

    // 防禦性檢查：地圖是否有陸地
    if (landCoords.length === 0) {
        console.warn('⚠️  地圖中沒有陸地（全海洋），無法生成河流');
        return;
    }

    // 模擬每個水滴
    let successfulDroplets = 0;
    for (let i = 0; i < numDroplets; i++) {
        // Phase 12: 使用種子化 RNG（確定性）而非 Math.random()
        const randomIndex = Math.floor(noise.random() * landCoords.length);
        const startPos = landCoords[randomIndex];

        // 模擬水滴路徑
        const pathLength = simulateDroplet(startPos.x, startPos.y);

        if (pathLength > 0) {
            successfulDroplets++;
        }
    }

    // 性能統計
    const endTime = performance.now();
    const duration = endTime - startTime;
    const dropletsPerSecond = (numDroplets / duration * 1000).toFixed(0);

    console.log(`✅ 河流生成完成！`);
    console.log(`   - 成功水滴: ${successfulDroplets.toLocaleString()} / ${numDroplets.toLocaleString()} (${(successfulDroplets/numDroplets*100).toFixed(1)}%)`);
    console.log(`   - 執行時間: ${duration.toFixed(2)} ms`);
    console.log(`   - 平均速度: ${dropletsPerSecond.toLocaleString()} 水滴/秒`);
    console.log(`   - 效能等級: ${duration < 400 ? '✅ 優秀' : duration < 1000 ? '⚠️ 可接受' : '❌ 需要優化'}`);
}

/**
 * 模擬單個水滴的流動路徑（貪婪下坡算法）
 * 水滴從起點開始，每步選擇 8 方向中最低的鄰居移動
 *
 * 終止條件：
 * 1. 到達海洋（height <= seaLevel）
 * 2. 進入已訪問過的位置（檢測循環）
 * 3. 到達局部窪地（無更低的鄰居）
 * 4. 達到最大迭代次數（防止無限迴圈）
 *
 * @param {number} startX - 起始 X 座標
 * @param {number} startY - 起始 Y 座標
 * @returns {number} 路徑長度（訪問的格子數，0 表示立即終止）
 */
function simulateDroplet(startX, startY) {
    let x = startX;
    let y = startY;
    let pathLength = 0;

    // 訪問紀錄（防止循環）- 使用 Set 提供 O(1) 查找
    const visited = new Set();
    const makeKey = (x, y) => `${x},${y}`;

    while (pathLength < RIVER_GEN_CONSTANTS.MAX_DROPLET_ITERATIONS) {
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

        // 閾值過濾：忽略小支流（減少噪聲）
        if (flux >= fluxThreshold) {
            // 計算濕度獎勵（線性增長，有上限）
            const bonus = Math.min(RIVER_GEN_CONSTANTS.MAX_MOISTURE_BONUS,
                                  flux * strength * RIVER_GEN_CONSTANTS.FLUX_TO_MOISTURE_COEFF);

            // 主像素獲得 100% 獎勵
            moistureBonus[i] += bonus;
        }
    }

    // Step 2: 空間平滑 - 3×3 高斯模糊（創造平滑過渡）
    const smoothed = new Float32Array(moistureBonus.length);

    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            let weightedSum = 0;

            // 遍歷 3×3 鄰居，應用高斯核
            let kernelIndex = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    // 邊界檢查
                    if (nx >= 0 && nx < MAP_CONFIG.width && ny >= 0 && ny < MAP_CONFIG.height) {
                        const neighborIndex = ny * MAP_CONFIG.width + nx;
                        weightedSum += moistureBonus[neighborIndex] * GAUSSIAN_KERNEL_3X3[kernelIndex];
                    }

                    kernelIndex++;
                }
            }

            smoothed[index] = weightedSum;
        }
    }

    // Step 3: 應用平滑後的濕度增量到實際 moisture 陣列
    for (let i = 0; i < mapData.moisture.length; i++) {
        if (smoothed[i] > RIVER_GEN_CONSTANTS.MOISTURE_INCREMENT_EPSILON) {  // 忽略微小增量
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
                const mainBonus = Math.min(RIVER_GEN_CONSTANTS.MAX_MOISTURE_BONUS,
                                          flux * strength * RIVER_GEN_CONSTANTS.FLUX_TO_MOISTURE_COEFF);
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
                                const spreadBonus = mainBonus * falloff * RIVER_GEN_CONSTANTS.SPREAD_BONUS_DECAY;
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

    // 簡化版 3×3 平滑（4 方向鄰居加權平均）
    for (let y = 0; y < MAP_CONFIG.height; y++) {
        for (let x = 0; x < MAP_CONFIG.width; x++) {
            const index = y * MAP_CONFIG.width + x;
            let sum = moistureBonus[index] * RIVER_GEN_CONSTANTS.SMOOTH_CENTER_WEIGHT;  // 中心權重
            let count = RIVER_GEN_CONSTANTS.SMOOTH_CENTER_WEIGHT;

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
                    sum += moistureBonus[neighborIndex] * RIVER_GEN_CONSTANTS.SMOOTH_NEIGHBOR_WEIGHT;  // 鄰居權重
                    count += RIVER_GEN_CONSTANTS.SMOOTH_NEIGHBOR_WEIGHT;
                }
            }

            smoothed[index] = sum / count;
        }
    }

    // 應用濕度增量到實際 moisture 陣列
    for (let i = 0; i < mapData.moisture.length; i++) {
        if (smoothed[i] > RIVER_GEN_CONSTANTS.MOISTURE_INCREMENT_EPSILON) {
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
