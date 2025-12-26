/**
 * ========================================
 * Phase 18.99: Terrain Worker (Operation Bedrock)
 * ========================================
 * Web Worker 用於離線計算河流生成（避免主執行緒阻塞）
 *
 * 設計原則：
 * 1. 顯式狀態傳遞（不依賴全域 config.js）
 * 2. 錯誤邊界（try-catch 包裹所有計算）
 * 3. 進度回報（定期向主執行緒報告進度）
 *
 * ========================================
 * Phase 18.99 Part 3: Critical Safety Fixes (Code Audit - Option B Step 1)
 * ========================================
 * 基於深度代碼審查報告，實施以下關鍵修復：
 *
 * Fix C4 - 無窮迴圈防護（CRITICAL）:
 *   - 添加 visited Set：防止水滴重複訪問相同位置
 *   - 添加 closedSet：防止溢出邏輯在兩個窪地間振盪
 *   - 使用索引作為 key（y * width + x）提升效能
 *
 * Fix L2 - 湖泊標記邏輯修正（LOGIC）:
 *   - 溢出成功時「不」標記湖泊（水仍在流動）
 *   - 只在真正停止時標記湖泊（窪地太深無法溢出）
 *   - 確保視覺正確性（溢出點不顯示為湖泊）
 *
 * Fix D1 - 資料完整性防護（DATA INTEGRITY）:
 *   - 添加 Number.isFinite() 檢查於所有高度修改
 *   - 檢測並處理 NaN/Infinity（記錄警告並中止水滴）
 *   - 防止 NaN 傳播到整個地圖
 *
 * Fix O1 - 效能優化（PERFORMANCE）:
 *   - 使用 Transferable Objects 於 postMessage
 *   - 零複製轉移 Float32Array/Uint8Array（~300KB → <1ms）
 *   - 大幅減少主執行緒與 Worker 間通訊開銷
 */

// 導入 Perlin Noise 模組（ES6 Module Worker 使用 import）
import noise from './noise.js';

// Worker 本地狀態
let workerConfig = null;
let mapData = null;

/**
 * 主訊息處理器
 */
self.onmessage = function(e) {
    const { cmd, config, data, numDroplets, previewConfig, blockConfig } = e.data;

    try {
        switch (cmd) {
            case 'init':
                // 初始化 Worker（接收配置與地圖資料）
                handleInit(config, data);
                break;

            case 'generateRivers':
                // 執行河流生成
                handleGenerateRivers(numDroplets);
                break;

            case 'generatePreview':
                // Phase 20.5: 快速預覽模式（僅生成地形，跳過河流）
                handleGeneratePreview(previewConfig);
                break;

            case 'generateBlock':
                // Phase 21: 區塊生成模式（生成指定區塊的完整地形）
                handleGenerateBlock(blockConfig);
                break;

            default:
                throw new Error(`Unknown command: ${cmd}`);
        }
    } catch (error) {
        // 錯誤邊界：捕獲所有錯誤並回報主執行緒
        self.postMessage({
            type: 'error',
            message: error.message,
            stack: error.stack,
        });
    }
};

/**
 * 處理初始化命令
 * @param {Object} config - 配置物件（WORLD_CONFIG, RENDER_CONFIG, etc.）
 * @param {Object} data - 地圖資料（height, moisture, temperature arrays）
 */
function handleInit(config, data) {
    workerConfig = config;
    mapData = {
        height: new Float32Array(data.height),
        moisture: new Float32Array(data.moisture),
        temperature: new Float32Array(data.temperature),
        flux: new Float32Array(data.flux),
        lakes: new Uint8Array(data.lakes),
        width: config.world.map.width,
        height: config.world.map.height,
    };

    // 初始化 Perlin Noise（使用傳入的 seed）
    if (typeof noise !== 'undefined' && typeof noise.seed === 'function') {
        noise.seed(config.runtime.seed);
    }

    self.postMessage({
        type: 'initialized',
        message: 'Worker initialized successfully',
    });
}

/**
 * 處理河流生成命令
 * @param {number} numDroplets - 水滴數量
 */
function handleGenerateRivers(numDroplets) {
    if (!workerConfig || !mapData) {
        throw new Error('Worker not initialized. Call "init" first.');
    }

    const config = workerConfig;
    const { width, height } = mapData;

    // Phase 20.5: 重新創建 flux 和 lakes 陣列
    // （避免 Transferable Objects 傳輸後的 detached buffer 問題）
    const totalPixels = width * height;
    mapData.flux = new Float32Array(totalPixels);
    mapData.lakes = new Uint8Array(totalPixels);

    // 收集所有陸地座標（高於海平面）
    const landCoords = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            if (mapData.height[index] > config.runtime.seaLevel) {
                landCoords.push({ x, y });
            }
        }
    }

    // Phase 20.5: 優雅處理全海洋區域（無限地圖可能拖動到純海洋區域）
    if (landCoords.length === 0) {
        console.log('   🌊 此區域為純海洋，跳過河流生成');

        // 直接回傳空的 flux 和 lakes（已經在上面 fill(0) 了）
        const transferData = {
            type: 'complete',
            data: {
                flux: mapData.flux,
                lakes: mapData.lakes,
            },
            stats: {
                totalDroplets: numDroplets,
                successfulDroplets: 0,
                elapsedTime: 0,
            },
        };

        self.postMessage(transferData, [
            mapData.flux.buffer,
            mapData.lakes.buffer,
        ]);
        return;
    }

    // 分塊處理水滴模擬
    let successfulDroplets = 0;
    const chunkSize = config.world.progress.CHUNK_SIZE;
    const startTime = Date.now();

    for (let chunkStart = 0; chunkStart < numDroplets; chunkStart += chunkSize) {
        const chunkEnd = Math.min(chunkStart + chunkSize, numDroplets);

        // 處理當前塊
        for (let i = chunkStart; i < chunkEnd; i++) {
            const randomIndex = Math.floor(noise.random() * landCoords.length);
            const startPos = landCoords[randomIndex];
            const pathLength = simulateDroplet(startPos.x, startPos.y, config);
            if (pathLength > 0) {
                successfulDroplets++;
            }
        }

        // 回報進度
        const progress = chunkEnd / numDroplets;
        self.postMessage({
            type: 'progress',
            progress: progress,
            completed: chunkEnd,
            total: numDroplets,
        });
    }

    const elapsedTime = Date.now() - startTime;

    // Fix O1: Performance - 使用 Transferable Objects（零複製轉移）
    // 準備要轉移的資料
    const transferData = {
        type: 'complete',
        data: {
            flux: mapData.flux,
            lakes: mapData.lakes,
        },
        stats: {
            totalDroplets: numDroplets,
            successfulDroplets: successfulDroplets,
            elapsedTime: elapsedTime,
        },
    };

    // 使用 Transferable Objects 語法（零複製，轉移所有權）
    // 注意：轉移後 Worker 內的 mapData.flux 和 mapData.lakes 將變為空陣列
    // 這沒問題，因為下次生成會重新創建
    self.postMessage(transferData, [
        mapData.flux.buffer,
        mapData.lakes.buffer,
    ]);
}

/**
 * 模擬單個水滴的流動路徑（Monte Carlo 方法）
 * Phase 18: 加入水力侵蝕機制（Hydraulic Erosion）
 * Phase 18.99 Part 3: Critical Safety Fixes (Audit Report - Option B)
 *
 * @param {number} startX - 起始 X 座標
 * @param {number} startY - 起始 Y 座標
 * @param {Object} config - 配置物件
 * @returns {number} 路徑長度（步數），0 表示失敗
 */
function simulateDroplet(startX, startY, config) {
    const { width, height } = mapData;
    const riverConst = config.world.river;
    const lakeConst = config.world.lake;
    const seaLevel = config.runtime.seaLevel;

    let x = startX;
    let y = startY;
    let waterVolume = riverConst.INITIAL_WATER_VOLUME;
    let pathLength = 0;

    // Fix C4: 防止無窮迴圈 - 訪問記錄
    const visited = new Set();
    const makeKey = (x, y) => y * width + x;  // 使用索引作為 key（效能優化）

    // Fix C4: 防止溢出振盪 - 已嘗試溢出的位置
    const closedSet = new Set();

    for (let iter = 0; iter < riverConst.MAX_DROPLET_ITERATIONS; iter++) {
        const currentIndex = y * width + x;

        // Fix C4: 循環檢測（Critical）
        const key = makeKey(x, y);
        if (visited.has(key)) {
            // 檢測到循環，停止模擬
            break;
        }
        visited.add(key);

        const currentHeight = mapData.height[currentIndex];

        // Fix D1: Data Integrity - 檢查 NaN/Infinity
        if (!Number.isFinite(currentHeight)) {
            console.warn(`Worker: NaN/Infinity detected at (${x}, ${y}), aborting droplet`);
            break;
        }

        // Phase 18: 蒸發（Evaporation）- 水滴逐步損失水量
        waterVolume -= riverConst.EVAPORATION_RATE;
        if (waterVolume < riverConst.MIN_WATER_VOLUME) {
            break;  // 水滴乾涸，停止模擬
        }

        // 檢查是否到達海洋
        if (currentHeight <= seaLevel) {
            break;  // 到達海洋，水滴消失
        }

        // Phase 8: 累積水流量（Flux）
        mapData.flux[currentIndex] += 1;

        // 尋找最陡峭的下坡方向
        let nextX = x;
        let nextY = y;
        let minHeight = currentHeight;

        // 檢查 8 個鄰居方向
        const neighbors = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0],          [1,  0],
            [-1,  1], [0,  1], [1,  1]
        ];

        for (const [dx, dy] of neighbors) {
            const nx = x + dx;
            const ny = y + dy;

            // 邊界檢查
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

            const neighborIndex = ny * width + nx;
            const neighborHeight = mapData.height[neighborIndex];

            if (neighborHeight < minHeight) {
                minHeight = neighborHeight;
                nextX = nx;
                nextY = ny;
            }
        }

        // Phase 18.99 Part 2: 水力連續性（Hydraulic Continuity - Fill and Spill）
        if (nextX === x && nextY === y) {
            // 局部窪地（Local Minima）：無更低的鄰居

            // Fix C4: 防止溢出振盪
            if (closedSet.has(key)) {
                // 此位置已嘗試溢出但失敗，避免無限循環
                // 標記為湖泊並停止
                if (currentHeight > seaLevel + lakeConst.MIN_LAKE_DEPTH) {
                    mapData.lakes[currentIndex] = 1;
                }
                break;
            }
            closedSet.add(key);

            // Phase 1: 沉積（Deposition）- 填充坑洞
            const depositionAmount = riverConst.DEPOSITION_RATE * waterVolume;
            const newHeight = mapData.height[currentIndex] + depositionAmount;

            // Fix D1: Data Integrity - 驗證計算結果
            if (!Number.isFinite(newHeight)) {
                console.warn(`Worker: Invalid height after deposition at (${x}, ${y}), skipping`);
                break;
            }

            mapData.height[currentIndex] = newHeight;
            const updatedHeight = newHeight;

            // Phase 2: 溢出檢查（Overflow Check）
            // 填充後重新尋找最低鄰居（即使原本是上坡）
            let overflowX = x;
            let overflowY = y;
            let lowestNeighborHeight = updatedHeight;

            for (const [dx, dy] of neighbors) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                const neighborIndex = ny * width + nx;
                const neighborHeight = mapData.height[neighborIndex];

                // 尋找最低的鄰居（包含原本上坡的）
                if (neighborHeight < lowestNeighborHeight) {
                    lowestNeighborHeight = neighborHeight;
                    overflowX = nx;
                    overflowY = ny;
                }
            }

            // Phase 3: 溢出決策（Overflow Decision）
            // Phase 18.99 Final: 加入容錯值（Tolerance）- 避免因浮點數精度卡住
            const OVERFLOW_TOLERANCE = 0.001;  // 容許 0.1% 的高度差

            if (updatedHeight >= lowestNeighborHeight - OVERFLOW_TOLERANCE && (overflowX !== x || overflowY !== y)) {
                // Fix L2: 溢出成功 - 不標記湖泊（水仍在流動）
                // 繼續流動，連接河流網絡（Flux Continuity）
                nextX = overflowX;
                nextY = overflowY;
                // 不 break，繼續主迴圈以建立河流連接
            } else {
                // Fix L2: 真正的窪地 - 標記為湖泊並停止
                // 窪地仍太深，水滴停止（但坑洞已變淺，下一個水滴會繼續填充）
                if (updatedHeight > seaLevel + lakeConst.MIN_LAKE_DEPTH) {
                    mapData.lakes[currentIndex] = 1;
                }
                break;
            }
        }

        // 計算坡度（Slope）
        const slope = currentHeight - minHeight;

        // Phase 18: 侵蝕（Erosion）- 只在坡度足夠時發生
        if (slope > riverConst.MIN_SLOPE_FOR_EROSION) {
            const erosionAmount = riverConst.EROSION_RATE * waterVolume * slope;
            const newHeight = mapData.height[currentIndex] - erosionAmount;

            // Fix D1: Data Integrity - 驗證侵蝕結果
            if (Number.isFinite(newHeight) && newHeight >= seaLevel) {
                mapData.height[currentIndex] = newHeight;
            } else if (!Number.isFinite(newHeight)) {
                console.warn(`Worker: Invalid height after erosion at (${x}, ${y}), reverting`);
                // 保持原高度，不侵蝕
            } else {
                // 不侵蝕到海平面以下
                mapData.height[currentIndex] = seaLevel;
            }
        }

        // 移動到下一個位置
        x = nextX;
        y = nextY;
        pathLength++;
    }

    return pathLength;
}

/**
 * ========================================
 * Phase 20.5: 快速預覽生成（LOD 優化）
 * ========================================
 * 處理快速預覽命令（拖動時使用）
 * - 僅生成地形（Height, Moisture, Temperature）
 * - 跳過河流模擬（Hydraulic Erosion）
 * - 支援降解析度（resolution < 1.0）
 * - 支援世界座標偏移（offsetX/offsetY）
 *
 * @param {Object} previewConfig - 預覽配置
 *   - width: 地圖寬度
 *   - height: 地圖高度
 *   - offsetX: 世界座標 X 偏移
 *   - offsetY: 世界座標 Y 偏移
 *   - resolution: 解析度 (1.0 = 全解析度, 0.5 = 半解析度)
 *   - seed: 噪聲種子
 *   - scale: 噪聲縮放
 *   - octaves: 噪聲八度數
 *   - seaLevel: 海平面高度
 */
function handleGeneratePreview(previewConfig) {
    console.log('⚡ Worker: handleGeneratePreview 被呼叫');

    const {
        width,
        height,
        offsetX = 0,
        offsetY = 0,
        resolution = 1.0,
        seed,
        scale,
        octaves,
        seaLevel,
        moistureOffset = 0,
        temperatureOffset = 0
    } = previewConfig;

    // 計算實際渲染尺寸（支援降解析度）
    const renderWidth = Math.floor(width * resolution);
    const renderHeight = Math.floor(height * resolution);
    const totalPixels = renderWidth * renderHeight;

    console.log(`⚡ Worker: 開始生成預覽 (${renderWidth}x${renderHeight}, offset: ${offsetX},${offsetY})`);

    // 初始化 Perlin Noise
    if (typeof noise !== 'undefined' && typeof noise.seed === 'function') {
        noise.seed(seed);
    } else if (typeof noise !== 'undefined' && typeof noise.init === 'function') {
        noise.init(seed);
    }

    // 創建輸出陣列
    const heightData = new Float32Array(totalPixels);
    const moistureData = new Float32Array(totalPixels);
    const temperatureData = new Float32Array(totalPixels);

    // 常數（來自 terrain.js 的 TERRAIN_GEN_CONSTANTS）
    const MOISTURE_OCTAVES = 3;
    const MOISTURE_SCALE_MULTIPLIER = 2.5;
    const MOISTURE_SEED_OFFSET = 1000;
    const TEMPERATURE_OCTAVES = 2;
    const TEMPERATURE_SCALE_MULTIPLIER = 3.0;
    const TEMPERATURE_SEED_OFFSET = 2000;
    const TEMPERATURE_LATITUDE_FACTOR = 2.0;
    const TEMPERATURE_ELEVATION_FACTOR = 0.5;
    const LATITUDE_PERIOD = 10000;

    // 生成地形資料
    for (let y = 0; y < renderHeight; y++) {
        for (let x = 0; x < renderWidth; x++) {
            const index = y * renderWidth + x;

            // 轉換到世界座標（考慮解析度縮放）
            const worldX = (x / resolution) + offsetX;
            const worldY = (y / resolution) + offsetY;

            // 1. 生成高度（Height - FBM）
            const height = noise.fbm(
                worldX,
                worldY,
                octaves,
                scale,
                0  // 高度層無偏移
            );
            heightData[index] = height;

            // 2. 生成濕度（Moisture - FBM）
            const moisture = noise.fbm(
                worldX,
                worldY,
                MOISTURE_OCTAVES,
                scale * MOISTURE_SCALE_MULTIPLIER,
                MOISTURE_SEED_OFFSET
            ) + moistureOffset;
            moistureData[index] = moisture;

            // 3. 生成溫度（Temperature - 緯度 + 噪聲 + 海拔）
            // 緯度循環（無限氣候帶）
            const normalizedY = (worldY % LATITUDE_PERIOD + LATITUDE_PERIOD) % LATITUDE_PERIOD;
            const latitude = normalizedY / LATITUDE_PERIOD;
            const latitudeFactor = 1 - Math.abs(latitude - 0.5) * TEMPERATURE_LATITUDE_FACTOR;

            // 溫度噪聲
            const temperatureNoise = noise.fbm(
                worldX,
                worldY,
                TEMPERATURE_OCTAVES,
                scale * TEMPERATURE_SCALE_MULTIPLIER,
                TEMPERATURE_SEED_OFFSET
            );

            // 海拔影響（高海拔更冷）
            const elevationFactor = height > seaLevel
                ? Math.max(0, 1 - (height - seaLevel) * TEMPERATURE_ELEVATION_FACTOR)
                : 1.0;

            // 組合溫度（歸一化到 0-1）
            const temperature = (latitudeFactor * 0.6 + temperatureNoise * 0.4) * elevationFactor + temperatureOffset;
            temperatureData[index] = Math.max(0, Math.min(1, temperature));
        }
    }

    // 回傳預覽資料（使用 Transferable Objects 零複製）
    const response = {
        type: 'preview',
        data: {
            height: heightData,
            moisture: moistureData,
            temperature: temperatureData,
            width: renderWidth,
            height: renderHeight,
            resolution: resolution
        }
    };

    console.log(`⚡ Worker: 預覽生成完成，準備回傳 (${renderWidth}x${renderHeight})`);

    self.postMessage(response, [
        heightData.buffer,
        moistureData.buffer,
        temperatureData.buffer
    ]);

    console.log('⚡ Worker: 預覽資料已發送');
}

/**
 * ========================================
 * Phase 21: 處理區塊生成命令
 * ========================================
 * 生成指定區塊的完整地形數據（3000×2000 像素）
 *
 * @param {Object} blockConfig - 區塊配置
 * @param {number} blockConfig.blockX - 區塊 X 座標
 * @param {number} blockConfig.blockY - 區塊 Y 座標
 * @param {number} blockConfig.blockWidth - 區塊寬度（像素）
 * @param {number} blockConfig.blockHeight - 區塊高度（像素）
 * @param {number} blockConfig.seed - 隨機種子
 * @param {number} blockConfig.scale - Perlin Noise 縮放
 * @param {number} blockConfig.octaves - Perlin Noise 層數
 * @param {number} blockConfig.seaLevel - 海平面高度
 * @param {number} blockConfig.moistureOffset - 濕度偏移
 * @param {number} blockConfig.temperatureOffset - 溫度偏移
 */
function handleGenerateBlock(blockConfig) {
    console.log(`🧱 Worker: handleGenerateBlock 被呼叫 - 區塊(${blockConfig.blockX}, ${blockConfig.blockY})`);

    // 計算區塊的世界座標偏移
    const offsetX = blockConfig.blockX * blockConfig.blockWidth;
    const offsetY = blockConfig.blockY * blockConfig.blockHeight;

    // 構建 previewConfig（複用 handleGeneratePreview 邏輯）
    const previewConfig = {
        width: blockConfig.blockWidth,
        height: blockConfig.blockHeight,
        offsetX: offsetX,
        offsetY: offsetY,
        resolution: 1.0,  // 區塊始終使用全解析度
        seed: blockConfig.seed,
        scale: blockConfig.scale,
        octaves: blockConfig.octaves,
        seaLevel: blockConfig.seaLevel,
        moistureOffset: blockConfig.moistureOffset || 0,
        temperatureOffset: blockConfig.temperatureOffset || 0
    };

    console.log(`🧱 Worker: 開始生成區塊 (${blockConfig.blockWidth}×${blockConfig.blockHeight}), 世界座標偏移: (${offsetX}, ${offsetY})`);

    // 複用 handleGeneratePreview 的邏輯生成地形
    // 注意：這裡我們直接內聯生成邏輯，因為需要返回不同的類型標記
    const totalPixels = blockConfig.blockWidth * blockConfig.blockHeight;

    // 初始化 Perlin Noise
    if (typeof noise !== 'undefined' && typeof noise.seed === 'function') {
        noise.seed(blockConfig.seed);
    } else if (typeof noise !== 'undefined' && typeof noise.init === 'function') {
        noise.init(blockConfig.seed);
    }

    // 創建輸出陣列
    const heightData = new Float32Array(totalPixels);
    const moistureData = new Float32Array(totalPixels);
    const temperatureData = new Float32Array(totalPixels);

    // 常數
    const MOISTURE_OCTAVES = 3;
    const MOISTURE_SCALE_MULTIPLIER = 2.5;
    const MOISTURE_SEED_OFFSET = 1000;
    const TEMPERATURE_OCTAVES = 2;
    const TEMPERATURE_SCALE_MULTIPLIER = 3.0;
    const TEMPERATURE_SEED_OFFSET = 2000;
    const TEMPERATURE_LATITUDE_FACTOR = 2.0;
    const TEMPERATURE_ELEVATION_FACTOR = 0.5;
    const LATITUDE_PERIOD = 10000;

    // 生成地形資料
    for (let y = 0; y < blockConfig.blockHeight; y++) {
        for (let x = 0; x < blockConfig.blockWidth; x++) {
            const index = y * blockConfig.blockWidth + x;
            const worldX = x + offsetX;
            const worldY = y + offsetY;

            // 1. 生成高度
            const height = noise.fbm(worldX, worldY, blockConfig.octaves, blockConfig.scale, 0);
            heightData[index] = height;

            // 2. 生成濕度
            const moisture = noise.fbm(
                worldX,
                worldY,
                MOISTURE_OCTAVES,
                blockConfig.scale * MOISTURE_SCALE_MULTIPLIER,
                MOISTURE_SEED_OFFSET
            ) + (blockConfig.moistureOffset || 0);
            moistureData[index] = moisture;

            // 3. 生成溫度
            const normalizedY = (worldY % LATITUDE_PERIOD + LATITUDE_PERIOD) % LATITUDE_PERIOD;
            const latitude = normalizedY / LATITUDE_PERIOD;
            const latitudeFactor = 1 - Math.abs(latitude - 0.5) * TEMPERATURE_LATITUDE_FACTOR;

            const temperatureNoise = noise.fbm(
                worldX,
                worldY,
                TEMPERATURE_OCTAVES,
                blockConfig.scale * TEMPERATURE_SCALE_MULTIPLIER,
                TEMPERATURE_SEED_OFFSET
            );

            const elevationFactor = height > blockConfig.seaLevel
                ? Math.max(0, 1 - (height - blockConfig.seaLevel) * TEMPERATURE_ELEVATION_FACTOR)
                : 1.0;

            const temperature = (latitudeFactor * 0.6 + temperatureNoise * 0.4) * elevationFactor + (blockConfig.temperatureOffset || 0);
            temperatureData[index] = Math.max(0, Math.min(1, temperature));
        }
    }

    // Phase 21.2: 生成河流數據（臨時：空數據，後續優化為真實河流模擬）
    const totalPixels = blockConfig.blockWidth * blockConfig.blockHeight;
    const fluxData = new Float32Array(totalPixels);  // 全零 = 無河流
    const lakesData = new Uint8Array(totalPixels);   // 全零 = 無湖泊

    // 回傳區塊資料（type: 'block' 用於區分預覽）
    const response = {
        type: 'block',
        data: {
            blockX: blockConfig.blockX,
            blockY: blockConfig.blockY,
            height: heightData,
            moisture: moistureData,
            temperature: temperatureData,
            flux: fluxData,        // Phase 21.2: 新增河流數據
            lakes: lakesData,      // Phase 21.2: 新增湖泊數據
            width: blockConfig.blockWidth,
            height: blockConfig.blockHeight
        }
    };

    console.log(`🧱 Worker: 區塊生成完成，回傳中... (${blockConfig.blockWidth}×${blockConfig.blockHeight})`);

    self.postMessage(response, [
        heightData.buffer,
        moistureData.buffer,
        temperatureData.buffer,
        fluxData.buffer,      // Phase 21.2: 傳輸河流數據
        lakesData.buffer      // Phase 21.2: 傳輸湖泊數據
    ]);

    console.log('✅ Worker: 區塊資料已發送 (包含 flux + lakes)');
}
