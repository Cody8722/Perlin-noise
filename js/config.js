/**
 * ========================================
 * Phase 14.5: 全域配置與常量管理
 * ========================================
 * 集中管理所有魔術數字、配置參數、顏色方案
 * 確保代碼可維護性和可測試性
 */

// ========================================
// 地圖尺寸配置 (3:2 比例)
// ========================================
export const MAP_CONFIG = {
    width: 300,
    height: 200
};

// ========================================
// Phase 14.5: Perlin Noise 算法常量
// ========================================
/**
 * Perlin Noise 算法使用的數學常量
 * 這些值經過精心調整以產生最佳視覺效果
 */
export const PERLIN_CONSTANTS = {
    // Mulberry32 PRNG 常量
    MULBERRY32_MAGIC: 0x6D2B79F5,        // Mulberry32 魔數（質數相關）
    MULBERRY32_SHIFT_1: 15,              // 第一次位移量
    MULBERRY32_SHIFT_2: 7,               // 第二次位移量
    MULBERRY32_SHIFT_3: 14,              // 第三次位移量
    MULBERRY32_DIVISOR: 4294967296,      // 2^32，用於正規化到 [0,1)
    MULBERRY32_MULTIPLIER_1: 1,          // 第一次乘數
    MULBERRY32_MULTIPLIER_2: 61,         // 第二次乘數

    // 置換表常量
    PERMUTATION_SIZE: 256,               // 置換表大小（2^8）
    PERMUTATION_DOUBLE_SIZE: 512,        // 雙倍大小（避免溢位檢查）

    // 淡化函數（Fade Function）6t^5 - 15t^4 + 10t^3
    FADE_COEFF_1: 6,                     // t^5 係數
    FADE_COEFF_2: 15,                    // t^4 係數
    FADE_COEFF_3: 10,                    // t^3 係數

    // 梯度函數常量
    GRADIENT_HASH_MASK: 15,              // 梯度哈希掩碼（4 位元）
    GRADIENT_U_THRESHOLD: 8,             // u 方向閾值
    GRADIENT_V_THRESHOLD: 4,             // v 方向閾值
    GRADIENT_V_SPECIAL_1: 12,            // v 特殊情況 1
    GRADIENT_V_SPECIAL_2: 14,            // v 特殊情況 2

    // FBM（分形布朗運動）常量
    FBM_AMPLITUDE_DECAY: 0.5,            // 每層振幅衰減因子
    FBM_FREQUENCY_MULTIPLIER: 2,         // 每層頻率倍增因子
    FBM_NORMALIZATION_OFFSET: 0.5,       // 正規化偏移量（-1,1 → 0,1）

    // 位運算掩碼
    BITWISE_MASK_255: 255                // 8 位元掩碼（Math.floor & 255）
};

// ========================================
// Phase 14.5: 地形生成算法常量
// ========================================
/**
 * 控制地形生成的各項參數
 * 包括濕度、溫度、海拔的計算常量
 */
export const TERRAIN_GEN_CONSTANTS = {
    // 濕度生成參數
    MOISTURE_OCTAVES: 3,                 // 濕度噪聲層數（較少細節）
    MOISTURE_SCALE_MULTIPLIER: 1.5,      // 濕度縮放倍數（更大的氣候區）
    MOISTURE_SEED_OFFSET: 5000,          // 濕度種子偏移（避免與高度重疊）

    // 溫度生成參數
    TEMPERATURE_OCTAVES: 3,              // 溫度噪聲層數
    TEMPERATURE_SCALE_MULTIPLIER: 2,     // 溫度縮放倍數（更大的氣候帶）
    TEMPERATURE_SEED_OFFSET: 10000,      // 溫度種子偏移
    TEMPERATURE_LATITUDE_WEIGHT: 0.7,    // 緯度對溫度的權重（70%）
    TEMPERATURE_NOISE_WEIGHT: 0.3,       // 噪聲對溫度的權重（30%）
    TEMPERATURE_LATITUDE_FACTOR: 2,      // 緯度因子倍數（赤道-極地）

    // Phase 17.5: 海拔對溫度的影響（高度遞減率）
    ELEVATION_TEMPERATURE_PENALTY: 2.0,  // 海拔每 0.1 單位降溫 0.20（加強版，1.5→2.0）
    ELEVATION_BASELINE: 0,               // 海拔基準線（0 = 從海平面開始計算）

    // Phase 17.5: 氣候平滑參數（創造自然的生態過渡帶 Ecotones）
    CLIMATE_SMOOTHING_ITERATIONS: 2,     // 平滑迭代次數（1-3，2 為最佳平衡）
    CLIMATE_SMOOTHING_STRENGTH: 0.6,     // 平滑強度（0-1，越高越平滑）

    // 範圍限制
    VALUE_MIN: 0,                        // 最小值（高度/濕度/溫度）
    VALUE_MAX: 1                         // 最大值
};

// ========================================
// Phase 14.5: 河流生成（水文系統）常量
// ========================================
/**
 * Monte Carlo 水滴模擬的物理參數
 */
export const RIVER_GEN_CONSTANTS = {
    // 水滴模擬參數
    MAX_DROPLET_ITERATIONS: 1000,        // 單個水滴最大迭代次數（防止無限迴圈）
    DEFAULT_DROPLET_COUNT: 10000,        // 預設水滴數量

    // Phase 18: 水力侵蝕參數（Hydraulic Erosion）
    EROSION_RATE: 0.003,                 // 侵蝕率（下坡時削減高度）
    DEPOSITION_RATE: 0.008,              // 沉積率（填坑時增加高度）
    MIN_SLOPE_FOR_EROSION: 0.01,         // 最小坡度閾值（低於此值不侵蝕）
    EVAPORATION_RATE: 0.02,              // 蒸發率（水滴每步損失水量）
    INITIAL_WATER_VOLUME: 1.0,           // 水滴初始水量
    MIN_WATER_VOLUME: 0.01,              // 最小水量（低於此值水滴消失）

    // Flux 到濕度的轉換係數
    FLUX_TO_MOISTURE_COEFF: 0.005,       // Flux 轉濕度獎勵係數
    MAX_MOISTURE_BONUS: 0.5,             // 單個像素最大濕度獎勵

    // 濕度影響閾值
    MIN_FLUX_THRESHOLD: 3,               // 最小 Flux 閾值（過濾小支流）
    MOISTURE_INCREMENT_EPSILON: 0.001,   // 微小增量閾值（忽略噪聲）

    // 擴散與平滑參數
    SPREAD_BONUS_DECAY: 0.5,             // 擴散獎勵衰減係數
    SMOOTH_CENTER_WEIGHT: 0.4,           // 平滑中心權重（40%）
    SMOOTH_NEIGHBOR_WEIGHT: 0.15         // 平滑鄰居權重（15% 各）
};

// ========================================
// Phase 18.95: 進度回饋與湖泊生成
// ========================================
export const PROGRESS_CONSTANTS = {
    CHUNK_SIZE: 500,                     // 每次處理的水滴數（分塊避免 UI 凍結）
    UPDATE_INTERVAL: 16                  // 進度更新間隔（ms，~60fps）
};

export const LAKE_CONSTANTS = {
    MIN_LAKE_DEPTH: 0.02,                // 最小湖泊深度（窪地填充閾值）
    LAKE_MARKER_VALUE: -1                // 湖泊標記值（在 flux 陣列中）
};

// ========================================
// Phase 14.5: 高斯平滑核（Gaussian Kernel）
// ========================================
/**
 * 3×3 高斯核權重（已歸一化）
 * 用於濕度空間平滑，創造自然過渡
 *
 * 核心公式：G(x,y) = (1/16) * [1 2 1; 2 4 2; 1 2 1]
 */
export const GAUSSIAN_KERNEL_3X3 = [
    0.077, 0.123, 0.077,   // 上排   (1/13, 2/13, 1/13)
    0.123, 0.200, 0.123,   // 中排   (2/13, 3/13, 2/13) - 中心權重最高
    0.077, 0.123, 0.077    // 下排   (1/13, 2/13, 1/13)
];

// ========================================
// Phase 14.5: 渲染與視覺化常量
// ========================================
/**
 * 控制地形渲染的視覺效果參數
 */
export const RENDER_CONSTANTS = {
    // 河流寬度閾值（百分比）
    MEDIUM_RIVER_THRESHOLD: 0.15,        // 前 15% flux 為中型河流
    LARGE_RIVER_THRESHOLD: 0.30,         // 前 30% flux 為大型河流
    VERY_LARGE_RIVER_THRESHOLD: 0.50,    // 前 50% flux 為超大河流

    // Phase 18.9: 河流顏色（自然藍色）- 從霓虹色改為自然色
    RIVER_COLOR_SMALL: [100, 180, 230],   // 小河流：淺藍 (#64B4E6)
    RIVER_COLOR_MEDIUM: [70, 150, 220],   // 中型河流：中藍 (#4696DC)
    RIVER_COLOR_LARGE: [40, 100, 180],    // 大河流：深藍 (#2864B4)

    // Phase 18.9: 河流 Alpha 透明度（0-1）
    RIVER_ALPHA_SMALL: 0.6,              // 小河流：60% 不透明（讓地形顏色透出）
    RIVER_ALPHA_MEDIUM: 0.75,            // 中型河流：75% 不透明
    RIVER_ALPHA_LARGE: 0.9,              // 大河流：90% 不透明（接近完全不透明）
    RIVER_ALPHA_EDGE: 0.35,              // 河流邊緣：35% 不透明（抗鋸齒效果）

    // Phase 18.95: 湖泊顏色（深邃靜水藍）
    LAKE_COLOR: [30, 80, 140],           // 湖泊：深沉藍 (#1E508C)
    LAKE_ALPHA: 0.85,                    // 湖泊：85% 不透明（比河流更深沉）

    // 河流擴展尺寸（像素）
    RIVER_EXPAND_SMALL: 1,               // 小河流：單像素
    RIVER_EXPAND_MEDIUM: 2,              // 中型河流：十字形
    RIVER_EXPAND_LARGE: 3,               // 大河流：4×4 方塊
    RIVER_EXPAND_VERY_LARGE: 4,          // 超大河流：5×5 方塊

    // Flux 視覺化
    FLUX_GRADIENT_EXPONENT: 0.3,         // Flux 梯度指數（強調小河流）
    FLUX_BLUE_BASE: 200,                 // Flux 藍色基礎值
    FLUX_BLUE_RANGE: 55,                 // Flux 藍色範圍
    FLUX_INTENSITY_FACTOR: 0.6,          // Flux 強度係數

    // 陰影效果
    SHADOW_HEIGHT_THRESHOLD: 0.02,       // 陰影高度差閾值
    SHADOW_INTENSITY: 0.8,               // 陰影強度（0.8 = 20% 變暗）

    // 雲層渲染
    CLOUD_WIDTH_MULTIPLIER: 2,           // 雲層寬度倍數（無縫滾動）
    CLOUD_SEED_OFFSET: 999,              // 雲層種子偏移
    CLOUD_OCTAVES: 3,                    // 雲層噪聲層數
    CLOUD_SCALE: 100,                    // 雲層縮放
    CLOUD_THRESHOLD: 0.6,                // 雲層顯示閾值
    CLOUD_ALPHA_MULTIPLIER: 400,         // 雲層透明度乘數

    // 顏色強度
    RGB_MAX: 255,                        // RGB 最大值
    RGB_MIN: 0                           // RGB 最小值
};

/**
 * Phase 14: 性能限制配置（基於 Phase 13 壓力測試結果）
 *
 * 測試結果：
 * - ✅ 200,000 滴水：線性擴展成功（<400ms）
 * - ✅ 無記憶體洩漏
 * - ✅ O(N) 線性效能
 */
export const PERFORMANCE_LIMITS = {
    MAX_RIVER_DENSITY: 200000,      // 最大安全上限（壓測驗證）
    RECOMMENDED_DESKTOP: 50000,     // 建議桌面預設值
    RECOMMENDED_MOBILE: 15000,      // 建議移動設備預設值
    MIN_RIVER_DENSITY: 1000,        // 最小有意義值
    PANIC_THRESHOLD: 5000           // 安全停止閾值（毫秒）
};

/**
 * Phase 14: 設備檢測與智能預設值
 * 根據螢幕寬度自動偵測設備類型並調整效能參數
 *
 * @returns {Object} 設備配置 { type, riverDensity, label }
 */
function detectDeviceType() {
    // Worker 環境檢測：Worker 中沒有 window 物件
    if (typeof window === 'undefined') {
        return {
            type: 'desktop',
            riverDensity: PERFORMANCE_LIMITS.RECOMMENDED_DESKTOP,
            label: '🖥️ Worker 環境（桌面預設值）'
        };
    }

    const width = window.innerWidth || 1024;  // 預設桌面寬度
    const isMobile = width < 768;

    if (isMobile) {
        return {
            type: 'mobile',
            riverDensity: PERFORMANCE_LIMITS.RECOMMENDED_MOBILE,
            label: '📱 移動設備'
        };
    } else {
        return {
            type: 'desktop',
            riverDensity: PERFORMANCE_LIMITS.RECOMMENDED_DESKTOP,
            label: '🖥️ 桌面設備'
        };
    }
}

// Phase 14: 執行設備檢測（函數內部已有 Worker 環境保護）
const deviceConfig = detectDeviceType();

// 僅在瀏覽器主執行緒輸出檢測結果
if (typeof window !== 'undefined') {
    console.log(`🎯 設備檢測: ${deviceConfig.label} → 河流密度預設值: ${deviceConfig.riverDensity.toLocaleString()}`);
}

// 地形生成參數
export const terrainConfig = {
    seed: Math.floor(Math.random() * 5000),
    scale: 60,
    octaves: 5,
    seaLevel: 0.35,
    moistureOffset: 0,
    temperatureOffset: 0,      // 溫度偏移（-0.5 到 0.5，模擬冰河期/暖化）
    riverDensity: deviceConfig.riverDensity,  // Phase 14: 智能預設值（移動15k/桌面50k）
    riverThreshold: 5,         // Phase 8: 河流顯示閾值（最小 flux 值）
    irrigationStrength: 1.0,   // Phase 9: 灌溉強度（0.0-5.0，河流對濕度的影響）
    useAdvancedIrrigation: true, // Phase 9: 使用進階灌溉（擴散到鄰居）
    showClouds: true           // Phase 16: 雲層顯示狀態（預設顯示）
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
 * 簡單的字串雜湊函數（將文字轉換為數字種子）
 * 使用 djb2 演算法的變體
 * @param {string} str - 輸入字串
 * @returns {number} 雜湊值（正整數）
 */
export function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
    }
    return Math.abs(hash) % 100000; // 限制在 0-99999 範圍
}

/**
 * 設定種子（支援數字或字串）
 * @param {string|number} input - 種子輸入（可以是數字或字串）
 * @returns {number} 實際使用的種子值
 */
export function setSeed(input) {
    if (typeof input === 'string') {
        input = input.trim();
        if (input === '') {
            // 空字串：生成隨機種子
            terrainConfig.seed = Math.floor(Math.random() * 10000);
        } else if (/^\d+$/.test(input)) {
            // 純數字字串：直接使用
            terrainConfig.seed = parseInt(input, 10);
        } else {
            // 文字字串：雜湊為數字
            terrainConfig.seed = hashString(input);
        }
    } else if (typeof input === 'number') {
        terrainConfig.seed = Math.floor(input);
    } else {
        // 無效輸入：生成隨機種子
        terrainConfig.seed = Math.floor(Math.random() * 10000);
    }
    return terrainConfig.seed;
}

/**
 * 生成新的隨機種子
 */
export function generateNewSeed() {
    terrainConfig.seed = Math.floor(Math.random() * 10000);
    return terrainConfig.seed;
}

// ========================================
// Phase 18.99: Operation Bedrock - Centralized Config Architecture
// ========================================
/**
 * WORLD_CONFIG: 集中所有世界生成相關常量
 * 用於 Web Worker 傳遞，確保顯式狀態管理
 */
export const WORLD_CONFIG = {
    // 地圖尺寸
    map: MAP_CONFIG,

    // Perlin Noise 算法
    perlin: PERLIN_CONSTANTS,

    // 地形生成
    terrain: TERRAIN_GEN_CONSTANTS,

    // 河流生成（水文系統）
    river: RIVER_GEN_CONSTANTS,

    // 進度回饋
    progress: PROGRESS_CONSTANTS,

    // 湖泊生成
    lake: LAKE_CONSTANTS,

    // 高斯平滑核
    gaussianKernel: GAUSSIAN_KERNEL_3X3,
};

/**
 * RENDER_CONFIG: 集中所有渲染相關常量
 * 包含顏色方案與視覺化參數
 */
export const RENDER_CONFIG = {
    // 渲染常量（河流、陰影、雲層等）
    constants: RENDER_CONSTANTS,

    // 生物群系顏色方案
    biomeColors: BIOME_COLORS,
};

/**
 * SYSTEM_CONFIG: 集中所有系統/效能相關常量
 * 用於設備檢測與效能限制
 */
export const SYSTEM_CONFIG = {
    // 效能限制
    performance: PERFORMANCE_LIMITS,
};
