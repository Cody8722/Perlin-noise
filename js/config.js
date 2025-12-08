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
    moistureOffset: 0,
    temperatureOffset: 0  // 新增：溫度偏移（-0.5 到 0.5，模擬冰河期/暖化）
};

// 生物群系顏色配置（Whittaker 分類系統擴展）
export const BIOME_COLORS = {
    // 水域
    DEEP: [68, 68, 122],           // 深海 #44447a
    OCEAN: [48, 80, 160],          // 海洋 #3050a0
    SHALLOW: [82, 130, 190],       // 淺海

    // 海岸
    SAND: [233, 221, 199],         // 沙灘 #e9ddc7

    // 極地/高山
    ICE: [240, 248, 255],          // 冰原（極冷）
    TUNDRA: [170, 180, 170],       // 苔原（冷、乾燥）
    SNOW: [250, 250, 250],         // 雪地（冷、潮濕）
    ROCK: [110, 110, 110],         // 岩石（高山）

    // 寒帶
    TAIGA: [60, 80, 60],           // 針葉林（冷、潮濕）
    COLD_DESERT: [180, 180, 160],  // 寒漠（冷、乾燥）

    // 溫帶
    TEMPERATE_FOREST: [50, 120, 60],      // 溫帶森林
    TEMPERATE_RAINFOREST: [30, 100, 50],  // 溫帶雨林
    GRASSLAND: [120, 160, 80],            // 溫帶草原
    SHRUBLAND: [150, 140, 100],           // 灌木叢

    // 熱帶/亞熱帶
    TROPICAL_RAINFOREST: [10, 50, 20],    // 熱帶雨林
    TROPICAL_FOREST: [30, 90, 40],        // 熱帶森林
    SAVANNA: [160, 150, 80],              // 莽原/稀樹草原
    HOT_DESERT: [212, 188, 139],          // 熱沙漠

    // 特殊
    SWAMP: [94, 114, 85],          // 沼澤
    MANGROVE: [80, 100, 70]        // 紅樹林
};

/**
 * 根據高度、濕度和溫度獲取生物群系顏色
 * 實作 Whittaker 生物群系分類系統
 *
 * @param {number} h - 高度值 (0-1)
 * @param {number} m - 濕度值 (0-1)
 * @param {number} t - 溫度值 (0-1, 0=極冷, 1=極熱)
 * @returns {Array<number>} RGB 顏色陣列 [r, g, b]
 */
export function getBiomeColor(h, m, t = 0.5) {
    // 應用使用者偏移
    const moisture = m + terrainConfig.moistureOffset;
    const temperature = t; // 溫度偏移已在 terrain.js 中應用

    // ========== 水域 ==========
    if (h < terrainConfig.seaLevel - 0.15) {
        return BIOME_COLORS.DEEP;  // 深海
    }
    if (h < terrainConfig.seaLevel - 0.05) {
        return BIOME_COLORS.OCEAN;  // 海洋
    }
    if (h < terrainConfig.seaLevel) {
        return BIOME_COLORS.SHALLOW;  // 淺海
    }

    // ========== 海岸線 ==========
    if (h < terrainConfig.seaLevel + 0.03) {
        return BIOME_COLORS.SAND;  // 沙灘
    }

    // ========== 高山地區（海拔優先）==========
    if (h > 0.85) {
        if (temperature < 0.2) return BIOME_COLORS.ICE;   // 極冷高山 → 冰原
        if (temperature < 0.4) return BIOME_COLORS.SNOW;  // 冷高山 → 雪地
        return BIOME_COLORS.ROCK;  // 溫暖高山 → 岩石
    }

    // ========== Whittaker 生物群系分類（基於溫度和濕度）==========

    // 極冷地區 (temperature < 0.2)
    if (temperature < 0.2) {
        if (moisture < 0.3) return BIOME_COLORS.TUNDRA;      // 乾燥 → 苔原
        if (moisture < 0.6) return BIOME_COLORS.TAIGA;       // 中等 → 針葉林
        return BIOME_COLORS.SNOW;                             // 潮濕 → 雪地森林
    }

    // 寒帶地區 (temperature < 0.4)
    if (temperature < 0.4) {
        if (moisture < 0.2) return BIOME_COLORS.COLD_DESERT;         // 極乾 → 寒漠
        if (moisture < 0.4) return BIOME_COLORS.GRASSLAND;           // 乾燥 → 草原
        if (moisture < 0.7) return BIOME_COLORS.TAIGA;               // 中等 → 針葉林
        return BIOME_COLORS.TEMPERATE_RAINFOREST;                     // 潮濕 → 溫帶雨林
    }

    // 溫帶地區 (temperature < 0.6)
    if (temperature < 0.6) {
        if (moisture < 0.2) return BIOME_COLORS.SHRUBLAND;           // 極乾 → 灌木叢
        if (moisture < 0.4) return BIOME_COLORS.GRASSLAND;           // 乾燥 → 溫帶草原
        if (moisture < 0.7) return BIOME_COLORS.TEMPERATE_FOREST;    // 中等 → 溫帶森林
        return BIOME_COLORS.TEMPERATE_RAINFOREST;                     // 潮濕 → 溫帶雨林
    }

    // 亞熱帶/熱帶地區 (temperature >= 0.6)
    if (moisture < 0.15) return BIOME_COLORS.HOT_DESERT;             // 極乾 → 熱沙漠
    if (moisture < 0.3) return BIOME_COLORS.SAVANNA;                 // 乾燥 → 莽原
    if (moisture < 0.5) return BIOME_COLORS.TROPICAL_FOREST;         // 中等 → 熱帶森林
    if (moisture < 0.8) return BIOME_COLORS.TROPICAL_RAINFOREST;     // 潮濕 → 熱帶雨林

    // 極度潮濕的熱帶低地
    if (h < terrainConfig.seaLevel + 0.1) {
        return BIOME_COLORS.MANGROVE;  // 紅樹林/沼澤
    }
    return BIOME_COLORS.SWAMP;  // 內陸沼澤
}

/**
 * 根據高度、濕度和溫度獲取生物群系名稱
 * @param {number} h - 高度值 (0-1)
 * @param {number} m - 濕度值 (0-1)
 * @param {number} t - 溫度值 (0-1)
 * @returns {string} 生物群系名稱（含 emoji）
 */
export function getBiomeName(h, m, t = 0.5) {
    const moisture = m + terrainConfig.moistureOffset;
    const temperature = t;

    // 水域
    if (h < terrainConfig.seaLevel - 0.15) return "🌊 深海";
    if (h < terrainConfig.seaLevel) return "🌊 海洋";
    if (h < terrainConfig.seaLevel + 0.03) return "🏖️ 沙灘";

    // 高山
    if (h > 0.85) {
        if (temperature < 0.2) return "❄️ 冰原";
        if (temperature < 0.4) return "🏔️ 雪山";
        return "⛰️ 高山岩地";
    }

    // Whittaker 分類
    if (temperature < 0.2) {
        if (moisture < 0.3) return "🌫️ 苔原";
        if (moisture < 0.6) return "🌲 針葉林";
        return "❄️ 雪地森林";
    }

    if (temperature < 0.4) {
        if (moisture < 0.2) return "🏔️ 寒漠";
        if (moisture < 0.4) return "🌾 寒帶草原";
        if (moisture < 0.7) return "🌲 北方針葉林";
        return "🌳 溫帶雨林";
    }

    if (temperature < 0.6) {
        if (moisture < 0.2) return "🌵 灌木叢";
        if (moisture < 0.4) return "🌾 溫帶草原";
        if (moisture < 0.7) return "🌳 溫帶森林";
        return "🌲 溫帶雨林";
    }

    // 熱帶
    if (moisture < 0.15) return "🏜️ 熱沙漠";
    if (moisture < 0.3) return "🦁 莽原";
    if (moisture < 0.5) return "🌴 熱帶森林";
    if (moisture < 0.8) return "🐍 熱帶雨林";

    if (h < terrainConfig.seaLevel + 0.1) return "🌿 紅樹林";
    return "🐊 沼澤";
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
