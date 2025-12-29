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

// Test signal
self.postMessage({ type: 'half-ready', message: 'First half loaded\!' });
