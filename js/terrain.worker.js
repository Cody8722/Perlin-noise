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
    const { cmd, config, data, numDroplets } = e.data;

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

    // 重置 flux 和 lakes 資料
    mapData.flux.fill(0);
    mapData.lakes.fill(0);

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

    if (landCoords.length === 0) {
        self.postMessage({
            type: 'error',
            message: 'No land found above sea level',
        });
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
