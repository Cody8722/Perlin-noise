// Test: handleInit + handleGenerateRivers expanded to line 166
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
                self.postMessage({ type: 'test-ok', message: 'Expanded v1 functions defined!' });
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

// Expanded handleGenerateRivers - up to line 166
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

    console.log('handleGenerateRivers expanded v1 called - stopped at line 166');
}

// Send ready signal
self.postMessage({ type: 'ready', message: 'Expanded v1 (to line 166) loaded!' });
