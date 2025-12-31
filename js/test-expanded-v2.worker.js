// Test: handleInit + COMPLETE handleGenerateRivers (line 118-220)
import noise from './noise.js';

let workerConfig = null;
let mapData = null;

self.onmessage = function(e) {
    const { cmd } = e.data;
    try {
        switch (cmd) {
            case 'init':
                handleInit(e.data.config, e.data.data);
                break;
            case 'test':
                self.postMessage({ type: 'test-ok', message: 'Expanded v2 - complete handleGenerateRivers!' });
                break;
            default:
                throw new Error(`Unknown command: ${cmd}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};

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

    if (typeof noise !== 'undefined' && typeof noise.seed === 'function') {
        noise.seed(config.runtime.seed);
    }

    self.postMessage({
        type: 'initialized',
        message: 'Worker initialized successfully',
    });

    console.log('✅ Worker initialized');
}

// COMPLETE handleGenerateRivers function (line 118-220)
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

// Stub for simulateDroplet (referenced but not called in loading test)
function simulateDroplet(x, y, config) {
    return 0; // Stub implementation
}

// Send ready signal
self.postMessage({ type: 'ready', message: 'Expanded v2 - COMPLETE handleGenerateRivers loaded!' });
