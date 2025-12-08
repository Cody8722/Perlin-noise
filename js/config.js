/**
 * 全域配置管理
 * 管理地圖尺寸、生成參數、顏色配置等
 */

// 地圖尺寸配置 (3:2 比例)
export const MAP_CONFIG = {
    width: 300,
    height: 200
};

// 地形生成參數
export const terrainConfig = {
    seed: Math.floor(Math.random() * 5000),
    scale: 60,
    octaves: 5,
    seaLevel: 0.35,
    moistureOffset: 0
};

// 生物群系顏色配置
export const BIOME_COLORS = {
    DEEP: [68, 68, 122],        // 深海 #44447a
    OCEAN: [48, 80, 160],        // 海洋 #3050a0
    SAND: [233, 221, 199],       // 沙灘 #e9ddc7
    GRASS: [100, 160, 60],       // 草原 #64a03c
    FOREST: [30, 90, 40],        // 森林 #1e5a28
    RAINFOREST: [10, 50, 20],    // 熱帶雨林
    DESERT: [212, 188, 139],     // 沙漠 #d4bc8b
    ROCK: [110, 110, 110],       // 岩石 #6e6e6e
    SNOW: [250, 250, 250],       // 雪地 #fff
    SWAMP: [94, 114, 85]         // 沼澤 #5e7255
};

/**
 * 根據高度和濕度獲取生物群系顏色
 * @param {number} h - 高度值 (0-1)
 * @param {number} m - 濕度值 (0-1)
 * @returns {Array<number>} RGB 顏色陣列 [r, g, b]
 */
export function getBiomeColor(h, m) {
    // 深海
    if (h < terrainConfig.seaLevel - 0.15) {
        return BIOME_COLORS.DEEP;
    }

    // 海洋
    if (h < terrainConfig.seaLevel) {
        return BIOME_COLORS.OCEAN;
    }

    const moisture = m + terrainConfig.moistureOffset;

    // 沙灘
    if (h < terrainConfig.seaLevel + 0.03) {
        return BIOME_COLORS.SAND;
    }

    // 高山地區
    if (h > 0.8) {
        return moisture < 0.1 ? BIOME_COLORS.ROCK : BIOME_COLORS.SNOW;
    }

    // 中高地區
    if (h > 0.6) {
        if (moisture < 0.2) return BIOME_COLORS.DESERT;
        if (moisture < 0.5) return BIOME_COLORS.GRASS;
        return BIOME_COLORS.FOREST;
    }

    // 低地區
    if (moisture < 0.15) return BIOME_COLORS.DESERT;
    if (moisture < 0.4) return BIOME_COLORS.GRASS;
    if (moisture < 0.7) return BIOME_COLORS.FOREST;
    return BIOME_COLORS.RAINFOREST;
}

/**
 * 根據高度和濕度獲取生物群系名稱
 * @param {number} h - 高度值 (0-1)
 * @param {number} m - 濕度值 (0-1)
 * @returns {string} 生物群系名稱（含 emoji）
 */
export function getBiomeName(h, m) {
    if (h < terrainConfig.seaLevel) {
        return "🌊 海洋";
    }

    const moisture = m + terrainConfig.moistureOffset;

    if (h > 0.8) {
        return "🏔️ 高山雪地";
    }

    if (moisture < 0.15) return "🏜️ 沙漠";
    if (moisture < 0.4) return "🌿 草原";
    if (moisture < 0.7) return "🌲 森林";
    return "🐍 熱帶雨林";
}

/**
 * 更新配置參數
 * @param {string} key - 參數名稱
 * @param {any} value - 參數值
 */
export function updateConfig(key, value) {
    if (key in terrainConfig) {
        terrainConfig[key] = value;
    }
}

/**
 * 生成新的隨機種子
 */
export function generateNewSeed() {
    terrainConfig.seed = Math.floor(Math.random() * 10000);
}
