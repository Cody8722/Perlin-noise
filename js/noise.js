/**
 * Perlin Noise 噪聲生成器
 * 用於生成自然隨機的地形高度圖
 */

class PerlinNoise {
    constructor() {
        this.p = new Uint8Array(512);
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
        this.rng = null;  // Phase 12: 種子化隨機數生成器（確定性）
        this.init(0);
    }

    /**
     * Mulberry32 PRNG（確定性隨機數生成器）
     * 用於從種子生成一致的隨機序列
     * @param {number} seed - 隨機種子
     * @returns {function} 返回 [0, 1) 範圍的隨機數生成器
     */
    mulberry32(seed) {
        return function() {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    /**
     * 初始化置換表（使用種子）
     * 使用 Mulberry32 PRNG 確保不同種子產生不同的置換表
     * @param {number} seed - 隨機種子（支援完整 32 位元整數）
     */
    init(seed) {
        // Phase 12: 保存 RNG 實例供其他模組使用（河流生成）
        this.rng = this.mulberry32(seed);

        // 創建臨時 RNG 用於洗牌（避免影響主 RNG 狀態）
        const shuffleRng = this.mulberry32(seed);

        // Fisher-Yates 洗牌演算法：從基礎排列生成隨機置換
        const shuffled = [...this.perm];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(shuffleRng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // 填充置換表（雙倍長度以避免溢位檢查）
        for (let i = 0; i < 256; i++) {
            this.p[256 + i] = this.p[i] = shuffled[i];
        }
    }

    /**
     * Phase 12: 獲取確定性隨機數
     * 使用當前種子的 Mulberry32 PRNG
     * @returns {number} [0, 1) 範圍的隨機數
     */
    random() {
        if (!this.rng) {
            console.error('❌ RNG 未初始化！請先調用 init(seed)');
            return Math.random();  // 回退到 Math.random()
        }
        return this.rng();
    }

    /**
     * 淡化函數 (Fade function)
     * @param {number} t - 插值參數
     * @returns {number} 淡化後的值
     */
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * 線性插值
     * @param {number} t - 插值參數 (0-1)
     * @param {number} a - 起始值
     * @param {number} b - 結束值
     * @returns {number} 插值結果
     */
    lerp(t, a, b) {
        return a + t * (b - a);
    }

    /**
     * 梯度函數
     * @param {number} hash - 哈希值
     * @param {number} x - X 座標
     * @param {number} y - Y 座標
     * @returns {number} 梯度值
     */
    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14 ? x : 0);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    /**
     * 獲取二維 Perlin 噪聲值
     * @param {number} x - X 座標
     * @param {number} y - Y 座標
     * @returns {number} 噪聲值 (-1 到 1 之間)
     */
    get(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;

        return this.lerp(v,
            this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
            this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
        );
    }

    /**
     * 分形布朗運動 (Fractional Brownian Motion)
     * 疊加多個八度的噪聲以產生更自然的地形
     * @param {number} x - X 座標
     * @param {number} y - Y 座標
     * @param {number} octaves - 八度數（疊加層數）
     * @param {number} scale - 縮放比例
     * @param {number} seedOffset - 種子偏移量
     * @returns {number} FBM 噪聲值 (0-1 之間)
     */
    fbm(x, y, octaves, scale, seedOffset = 0) {
        let total = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.get(
                (x + seedOffset) / scale * frequency,
                (y + seedOffset) / scale * frequency
            ) * amplitude;

            maxValue += amplitude;
            amplitude *= 0.5;  // 每層振幅減半
            frequency *= 2;    // 每層頻率加倍
        }

        // 正規化到 0-1 範圍
        return (total / maxValue) + 0.5;
    }
}

// 建立單例
const noise = new PerlinNoise();

// 匯出供其他模組使用
export default noise;
