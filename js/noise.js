/**
 * ========================================
 * Phase 14.5: Perlin Noise 噪聲生成器（專業版）
 * ========================================
 * 實作 Ken Perlin 的經典 Perlin Noise 算法
 * 用於程序化生成自然、連續的地形高度圖
 *
 * @see https://mrl.nyu.edu/~perlin/paper445.pdf - 原始論文
 * @see https://mrl.nyu.edu/~perlin/noise/ - Ken Perlin 官方實作
 */

import { PERLIN_CONSTANTS } from './config.js';

/**
 * Perlin Noise 生成器類別
 * 提供確定性的偽隨機噪聲生成，支援種子化和多八度 FBM
 *
 * @class PerlinNoise
 */
class PerlinNoise {
    /**
     * 建構函數
     * 初始化置換表和隨機數生成器
     */
    constructor() {
        // 置換表（Permutation Table）
        this.p = new Uint8Array(PERLIN_CONSTANTS.PERMUTATION_DOUBLE_SIZE);

        // Ken Perlin 的原始置換表（256 個預定義值）
        this.perm = [
            151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
            8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
            35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
            134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
            55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,
            169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,
            124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,
            28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,
            129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,
            34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,
            214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,
            93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
        ];

        // Phase 12: 種子化隨機數生成器（確保河流確定性）
        this.rng = null;

        // 預設初始化（種子 0）
        this.init(0);
    }

    /**
     * Mulberry32 PRNG（確定性偽隨機數生成器）
     * 高品質、高速的 32 位元 PRNG，完全確定性
     *
     * 算法來源：Tommy Ettinger
     * @see https://github.com/tommyettinger/sarong/blob/master/src/main/java/sarong/Mulberry32.java
     *
     * @param {number} seed - 隨機種子（32 位元整數）
     * @returns {function(): number} 隨機數生成器函數，返回 [0, 1) 範圍的浮點數
     * @throws {TypeError} 如果 seed 不是數字
     */
    mulberry32(seed) {
        // 參數驗證
        if (typeof seed !== 'number' || isNaN(seed)) {
            throw new TypeError(`Mulberry32: seed 必須是有效數字，收到：${typeof seed}`);
        }

        // 確保 seed 是 32 位元整數
        seed = seed | 0;

        /**
         * PRNG 閉包函數
         * 每次調用產生一個新的偽隨機數
         */
        return function() {
            // Mulberry32 核心算法（使用配置的常量）
            seed = seed + PERLIN_CONSTANTS.MULBERRY32_MAGIC | 0;
            let t = Math.imul(seed ^ seed >>> PERLIN_CONSTANTS.MULBERRY32_SHIFT_1,
                             PERLIN_CONSTANTS.MULBERRY32_MULTIPLIER_1 | seed);
            t = t + Math.imul(t ^ t >>> PERLIN_CONSTANTS.MULBERRY32_SHIFT_2,
                             PERLIN_CONSTANTS.MULBERRY32_MULTIPLIER_2 | t) ^ t;
            return ((t ^ t >>> PERLIN_CONSTANTS.MULBERRY32_SHIFT_3) >>> 0) / PERLIN_CONSTANTS.MULBERRY32_DIVISOR;
        };
    }

    /**
     * 初始化置換表（使用種子）
     * 使用 Mulberry32 PRNG 和 Fisher-Yates 洗牌算法
     * 確保不同種子產生不同但確定性的噪聲模式
     *
     * @param {number} seed - 隨機種子（支援完整 32 位元整數範圍）
     * @throws {TypeError} 如果 seed 不是數字
     */
    init(seed) {
        // 參數驗證
        if (typeof seed !== 'number' || isNaN(seed)) {
            console.error(`⚠️  init(): seed 必須是有效數字，收到：${typeof seed}，使用預設值 0`);
            seed = 0;
        }

        // Phase 12: 保存 RNG 實例供其他模組使用（河流生成）
        try {
            this.rng = this.mulberry32(seed);
        } catch (error) {
            console.error('❌ init(): 創建 RNG 失敗', error);
            this.rng = null;
            return;
        }

        // 創建臨時 RNG 用於洗牌（避免影響主 RNG 狀態）
        const shuffleRng = this.mulberry32(seed);

        // Fisher-Yates 洗牌演算法：從基礎排列生成隨機置換
        const shuffled = [...this.perm];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(shuffleRng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // 填充置換表（雙倍長度以避免溢位檢查）
        const size = PERLIN_CONSTANTS.PERMUTATION_SIZE;
        for (let i = 0; i < size; i++) {
            this.p[size + i] = this.p[i] = shuffled[i];
        }
    }

    /**
     * Phase 12: 獲取確定性隨機數
     * 使用當前種子的 Mulberry32 PRNG
     * 用於河流生成等需要確定性隨機的場景
     *
     * @returns {number} [0, 1) 範圍的隨機數
     */
    random() {
        if (!this.rng) {
            console.error('❌ random(): RNG 未初始化！請先調用 init(seed)');
            return Math.random();  // 回退到 Math.random()
        }
        return this.rng();
    }

    /**
     * 淡化函數（Fade Function）
     * 使用 Perlin 的改進插值多項式：6t^5 - 15t^4 + 10t^3
     * 確保在端點處一階和二階導數為零，產生平滑過渡
     *
     * 數學性質：
     * - f(0) = 0, f(1) = 1
     * - f'(0) = 0, f'(1) = 0 （一階導數在端點為零）
     * - f''(0) = 0, f''(1) = 0 （二階導數在端點為零）
     *
     * @param {number} t - 插值參數（通常在 [0, 1] 範圍）
     * @returns {number} 淡化後的值
     */
    fade(t) {
        return t * t * t * (t * (t * PERLIN_CONSTANTS.FADE_COEFF_1 - PERLIN_CONSTANTS.FADE_COEFF_2) + PERLIN_CONSTANTS.FADE_COEFF_3);
    }

    /**
     * 線性插值（Linear Interpolation）
     * 在兩個值之間進行平滑過渡
     *
     * @param {number} t - 插值參數（0 = 返回 a，1 = 返回 b）
     * @param {number} a - 起始值
     * @param {number} b - 結束值
     * @returns {number} 插值結果：a + t * (b - a)
     */
    lerp(t, a, b) {
        return a + t * (b - a);
    }

    /**
     * 梯度函數（Gradient Function）
     * 根據哈希值選擇梯度向量並計算點積
     * 這是 Perlin Noise 的核心：將整數網格映射到連續的梯度場
     *
     * 算法細節：
     * - 使用哈希值的低 4 位元選擇 16 個預定義梯度向量之一
     * - 梯度向量包括 (±1, ±1), (±1, 0), (0, ±1) 等組合
     * - 計算梯度向量與距離向量 (x, y) 的點積
     *
     * @param {number} hash - 哈希值（來自置換表）
     * @param {number} x - X 方向距離
     * @param {number} y - Y 方向距離
     * @returns {number} 梯度點積結果
     */
    grad(hash, x, y) {
        const h = hash & PERLIN_CONSTANTS.GRADIENT_HASH_MASK;  // 取低 4 位元（0-15）
        const u = h < PERLIN_CONSTANTS.GRADIENT_U_THRESHOLD ? x : y;
        const v = h < PERLIN_CONSTANTS.GRADIENT_V_THRESHOLD ? y :
                 (h === PERLIN_CONSTANTS.GRADIENT_V_SPECIAL_1 || h === PERLIN_CONSTANTS.GRADIENT_V_SPECIAL_2 ? x : 0);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    /**
     * 獲取二維 Perlin 噪聲值
     * 實作標準的 Perlin Noise 算法
     *
     * 算法步驟：
     * 1. 將座標分解為整數部分（網格座標）和小數部分（網格內位置）
     * 2. 計算網格四個角的哈希值
     * 3. 計算四個角的梯度點積
     * 4. 使用淡化函數和雙線性插值混合結果
     *
     * @param {number} x - X 座標（任意實數）
     * @param {number} y - Y 座標（任意實數）
     * @returns {number} 噪聲值（範圍約 [-1, 1]，實際範圍略小）
     */
    get(x, y) {
        // Step 1: 分解座標
        const X = Math.floor(x) & PERLIN_CONSTANTS.BITWISE_MASK_255;  // 整數部分（模 256）
        const Y = Math.floor(y) & PERLIN_CONSTANTS.BITWISE_MASK_255;
        x -= Math.floor(x);  // 小數部分
        y -= Math.floor(y);

        // Step 2: 計算淡化曲線
        const u = this.fade(x);
        const v = this.fade(y);

        // Step 3: 計算四個角的哈希索引
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;

        // Step 4: 雙線性插值
        // 首先沿 X 方向插值（上下兩排）
        // 然後沿 Y 方向插值（混合兩排）
        return this.lerp(v,
            this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
            this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
        );
    }

    /**
     * 分形布朗運動（Fractional Brownian Motion, FBM）
     * 疊加多個不同頻率和振幅的噪聲層（八度，octaves）
     * 產生更自然、更豐富細節的地形
     *
     * 原理：
     * - 每一層（octave）的頻率是前一層的 2 倍（細節加倍）
     * - 每一層的振幅是前一層的 0.5 倍（影響減半）
     * - 這種衰減稱為「持久性」（persistence）
     *
     * 應用：
     * - 高 octave 值 (5-6): 豐富細節，適合地形高度
     * - 低 octave 值 (2-3): 平滑變化，適合溫度/濕度
     *
     * @param {number} x - X 座標
     * @param {number} y - Y 座標
     * @param {number} octaves - 八度數（疊加層數，建議 1-8）
     * @param {number} scale - 縮放比例（控制特徵尺寸）
     * @param {number} [seedOffset=0] - 種子偏移量（用於生成不同的噪聲層）
     * @returns {number} FBM 噪聲值（正規化到 [0, 1] 範圍）
     * @throws {RangeError} 如果 octaves <= 0
     */
    fbm(x, y, octaves, scale, seedOffset = 0) {
        // 參數驗證
        if (octaves <= 0) {
            throw new RangeError(`fbm(): octaves 必須 > 0，收到：${octaves}`);
        }
        if (scale <= 0) {
            console.warn(`⚠️  fbm(): scale 應該 > 0，收到：${scale}，使用絕對值`);
            scale = Math.abs(scale);
        }

        let total = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        // 疊加多層噪聲
        for (let i = 0; i < octaves; i++) {
            total += this.get(
                (x + seedOffset) / scale * frequency,
                (y + seedOffset) / scale * frequency
            ) * amplitude;

            maxValue += amplitude;
            amplitude *= PERLIN_CONSTANTS.FBM_AMPLITUDE_DECAY;       // 振幅減半
            frequency *= PERLIN_CONSTANTS.FBM_FREQUENCY_MULTIPLIER;  // 頻率加倍
        }

        // 正規化到 [0, 1] 範圍
        return (total / maxValue) + PERLIN_CONSTANTS.FBM_NORMALIZATION_OFFSET;
    }
}

// 建立單例（Singleton Pattern）
// 全域共用一個 Perlin Noise 實例，避免重複初始化
const noise = new PerlinNoise();

// 匯出供其他模組使用
export default noise;
