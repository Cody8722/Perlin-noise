/**
 * ========================================
 * Phase 21: Block Manager - 區塊化無限地圖系統
 * ========================================
 * 基於區塊（Chunk）的無限地圖架構
 * 類似 Minecraft 的區塊管理系統
 *
 * 核心概念：
 * - 區塊大小：3000×2000 像素（10倍原始地圖）
 * - 區塊座標：(blockX, blockY)
 * - 緩存管理：自動載入/卸載區塊
 * - 視口剔除：僅渲染可見區塊
 *
 * @module block_manager
 */

import { terrainConfig } from './config.js';

// ========================================
// 區塊配置常量
// ========================================
export const BLOCK_CONFIG = {
    WIDTH: 3000,   // 區塊寬度（像素）
    HEIGHT: 2000,  // 區塊高度（像素）
    MAX_CACHED: 9, // 最大緩存區塊數量（3×3 區域）
    UNLOAD_DISTANCE: 2  // 卸載距離（區塊數）
};

/**
 * 區塊數據結構
 */
class BlockData {
    constructor(blockX, blockY) {
        this.blockX = blockX;
        this.blockY = blockY;
        this.width = BLOCK_CONFIG.WIDTH;
        this.height = BLOCK_CONFIG.HEIGHT;

        // 地形數據（由 Worker 生成）
        this.height_data = null;
        this.moisture_data = null;
        this.temperature_data = null;

        // 河流數據（由 Worker 生成）
        this.flux = null;
        this.lakes = null;

        // 狀態管理
        this.isLoading = false;
        this.isLoaded = false;
        this.lastAccessTime = Date.now();
    }

    /**
     * 獲取區塊的世界座標範圍
     */
    getWorldBounds() {
        return {
            minX: this.blockX * BLOCK_CONFIG.WIDTH,
            minY: this.blockY * BLOCK_CONFIG.HEIGHT,
            maxX: (this.blockX + 1) * BLOCK_CONFIG.WIDTH,
            maxY: (this.blockY + 1) * BLOCK_CONFIG.HEIGHT
        };
    }

    /**
     * 更新訪問時間（用於 LRU 緩存）
     */
    touch() {
        this.lastAccessTime = Date.now();
    }
}

/**
 * ========================================
 * BlockManager: 區塊管理器
 * ========================================
 * 負責區塊的載入、卸載、緩存管理
 */
export class BlockManager {
    constructor() {
        // 區塊緩存：Map<"x,y", BlockData>
        this.blocks = new Map();

        // 當前相機所在的區塊
        this.currentBlockX = 0;
        this.currentBlockY = 0;

        console.log('🧱 BlockManager 已初始化');
        console.log(`   📏 區塊大小: ${BLOCK_CONFIG.WIDTH}×${BLOCK_CONFIG.HEIGHT} 像素`);
        console.log(`   💾 最大緩存: ${BLOCK_CONFIG.MAX_CACHED} 區塊`);
    }

    /**
     * 世界座標 → 區塊座標
     */
    worldToBlockCoords(worldX, worldY) {
        return {
            blockX: Math.floor(worldX / BLOCK_CONFIG.WIDTH),
            blockY: Math.floor(worldY / BLOCK_CONFIG.HEIGHT)
        };
    }

    /**
     * 區塊座標 → 世界座標（區塊左上角）
     */
    blockToWorldCoords(blockX, blockY) {
        return {
            worldX: blockX * BLOCK_CONFIG.WIDTH,
            worldY: blockY * BLOCK_CONFIG.HEIGHT
        };
    }

    /**
     * 生成區塊 key
     */
    getBlockKey(blockX, blockY) {
        return `${blockX},${blockY}`;
    }

    /**
     * 獲取區塊（如果不存在則創建）
     */
    getOrCreateBlock(blockX, blockY) {
        const key = this.getBlockKey(blockX, blockY);
        let block = this.blocks.get(key);

        if (!block) {
            block = new BlockData(blockX, blockY);
            this.blocks.set(key, block);
            console.log(`🧱 創建新區塊: (${blockX}, ${blockY})`);
        }

        block.touch();
        return block;
    }

    /**
     * 檢查區塊是否已載入
     */
    isBlockLoaded(blockX, blockY) {
        const key = this.getBlockKey(blockX, blockY);
        const block = this.blocks.get(key);
        return block && block.isLoaded;
    }

    /**
     * 計算當前視口需要的區塊列表
     * @param {number} viewportX - 視口中心 X（世界座標）
     * @param {number} viewportY - 視口中心 Y（世界座標）
     * @param {number} viewportWidth - 視口寬度（像素）
     * @param {number} viewportHeight - 視口高度（像素）
     * @returns {Array<{blockX, blockY}>} 需要的區塊座標列表
     */
    getRequiredBlocks(viewportX, viewportY, viewportWidth, viewportHeight) {
        // 計算視口的四個角落
        const minX = viewportX - viewportWidth / 2;
        const minY = viewportY - viewportHeight / 2;
        const maxX = viewportX + viewportWidth / 2;
        const maxY = viewportY + viewportHeight / 2;

        // 轉換為區塊座標
        const minBlock = this.worldToBlockCoords(minX, minY);
        const maxBlock = this.worldToBlockCoords(maxX, maxY);

        const requiredBlocks = [];

        // 遍歷視口覆蓋的所有區塊
        for (let bx = minBlock.blockX; bx <= maxBlock.blockX; bx++) {
            for (let by = minBlock.blockY; by <= maxBlock.blockY; by++) {
                requiredBlocks.push({ blockX: bx, blockY: by });
            }
        }

        return requiredBlocks;
    }

    /**
     * 更新當前相機位置（觸發區塊載入/卸載）
     */
    updateCamera(worldX, worldY) {
        const { blockX, blockY } = this.worldToBlockCoords(worldX, worldY);

        // 相機移動到新區塊
        if (blockX !== this.currentBlockX || blockY !== this.currentBlockY) {
            console.log(`📷 相機移動到區塊: (${blockX}, ${blockY})`);
            this.currentBlockX = blockX;
            this.currentBlockY = blockY;

            // 卸載遠離的區塊
            this.unloadFarBlocks();
        }
    }

    /**
     * 卸載遠離當前相機的區塊（LRU 策略）
     */
    unloadFarBlocks() {
        const maxDistance = BLOCK_CONFIG.UNLOAD_DISTANCE;
        const blocksToUnload = [];

        for (const [key, block] of this.blocks.entries()) {
            const dx = Math.abs(block.blockX - this.currentBlockX);
            const dy = Math.abs(block.blockY - this.currentBlockY);
            const distance = Math.max(dx, dy);  // Chebyshev 距離

            // 距離過遠，標記為卸載
            if (distance > maxDistance) {
                blocksToUnload.push(key);
            }
        }

        // 執行卸載
        for (const key of blocksToUnload) {
            const block = this.blocks.get(key);
            console.log(`🗑️  卸載區塊: (${block.blockX}, ${block.blockY})`);
            this.blocks.delete(key);
        }

        // 如果緩存仍然超過限制，使用 LRU 策略卸載最舊的
        if (this.blocks.size > BLOCK_CONFIG.MAX_CACHED) {
            this.evictOldestBlocks();
        }
    }

    /**
     * LRU 策略：卸載最舊的區塊
     */
    evictOldestBlocks() {
        const blocksArray = Array.from(this.blocks.values());
        blocksArray.sort((a, b) => a.lastAccessTime - b.lastAccessTime);

        const numToEvict = this.blocks.size - BLOCK_CONFIG.MAX_CACHED;

        for (let i = 0; i < numToEvict; i++) {
            const block = blocksArray[i];
            const key = this.getBlockKey(block.blockX, block.blockY);
            console.log(`⏰ LRU 卸載區塊: (${block.blockX}, ${block.blockY})`);
            this.blocks.delete(key);
        }
    }

    /**
     * 獲取所有已載入的區塊
     */
    getAllLoadedBlocks() {
        return Array.from(this.blocks.values()).filter(block => block.isLoaded);
    }

    /**
     * 清空所有區塊緩存
     */
    clear() {
        console.log('🧹 清空所有區塊緩存');
        this.blocks.clear();
        this.currentBlockX = 0;
        this.currentBlockY = 0;
    }

    /**
     * 獲取緩存統計信息
     */
    getStats() {
        const loaded = Array.from(this.blocks.values()).filter(b => b.isLoaded).length;
        const loading = Array.from(this.blocks.values()).filter(b => b.isLoading).length;

        return {
            total: this.blocks.size,
            loaded: loaded,
            loading: loading,
            currentBlock: `(${this.currentBlockX}, ${this.currentBlockY})`
        };
    }
}

// 全域單例
let blockManagerInstance = null;

/**
 * 獲取 BlockManager 單例
 */
export function getBlockManager() {
    if (!blockManagerInstance) {
        blockManagerInstance = new BlockManager();
    }
    return blockManagerInstance;
}
