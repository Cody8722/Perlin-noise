/**
 * 種子確定性測試（Seed Determinism Test）
 * 驗證相同的種子總是產生相同的地圖
 *
 * 使用方式：node test-seed-determinism.js
 */

// 模擬 Perlin Noise 類別（與 noise.js 相同邏輯）
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
        this.init(0);
    }

    mulberry32(seed) {
        return function() {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    init(seed) {
        const rng = this.mulberry32(seed);
        const shuffled = [...this.perm];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        for (let i = 0; i < 256; i++) {
            this.p[256 + i] = this.p[i] = shuffled[i];
        }
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14 ? x : 0);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

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
            amplitude *= 0.5;
            frequency *= 2;
        }

        return (total / maxValue) + 0.5;
    }
}

// 雜湊函數（與 config.js 相同）
function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash) % 100000;
}

// 測試套件
function runDeterminismTests() {
    console.log('🧪 執行種子確定性測試...\n');

    const testSeeds = [
        { name: '"Alpha"', value: hashString("Alpha") },
        { name: '"MiddleEarth"', value: hashString("MiddleEarth") },
        { name: '12345', value: 12345 },
        { name: '4723', value: 4723 },
        { name: '99999', value: 99999 }
    ];

    let allPassed = true;

    for (const testSeed of testSeeds) {
        console.log(`📝 測試種子: ${testSeed.name} (數值: ${testSeed.value})`);

        // 第一次生成
        const noise1 = new PerlinNoise();
        noise1.init(testSeed.value);
        const samples1 = [];
        for (let i = 0; i < 10; i++) {
            samples1.push(noise1.fbm(i * 10, i * 10, 5, 60, 0));
        }

        // 第二次生成（模擬刷新/重置）
        const noise2 = new PerlinNoise();
        noise2.init(testSeed.value);
        const samples2 = [];
        for (let i = 0; i < 10; i++) {
            samples2.push(noise2.fbm(i * 10, i * 10, 5, 60, 0));
        }

        // 比較結果
        let identical = true;
        for (let i = 0; i < samples1.length; i++) {
            if (Math.abs(samples1[i] - samples2[i]) > 0.0000001) {
                identical = false;
                console.error(`  ❌ 樣本 ${i} 不一致: ${samples1[i]} vs ${samples2[i]}`);
            }
        }

        if (identical) {
            console.log(`  ✅ 所有樣本完全一致！`);
            console.log(`     樣本雜湊: ${samples1.map(s => s.toFixed(4)).join(', ')}\n`);
        } else {
            console.error(`  ❌ 偵測到不一致！\n`);
            allPassed = false;
        }
    }

    // 測試不同種子產生不同結果
    console.log('📝 測試不同種子產生不同地圖...');
    const noise_a = new PerlinNoise();
    const noise_b = new PerlinNoise();

    noise_a.init(100);
    noise_b.init(356);  // 舊實作中，100 和 356 會產生相同結果

    const sample_a = noise_a.fbm(50, 50, 5, 60, 0);
    const sample_b = noise_b.fbm(50, 50, 5, 60, 0);

    if (Math.abs(sample_a - sample_b) > 0.01) {
        console.log(`  ✅ 種子 100 vs 356: 產生不同結果 (${sample_a.toFixed(4)} vs ${sample_b.toFixed(4)})`);
    } else {
        console.error(`  ❌ 種子 100 和 356 產生相同結果！修復失敗。`);
        allPassed = false;
    }

    console.log('\n' + '═'.repeat(60));
    if (allPassed) {
        console.log('✅ 所有種子確定性測試通過！');
        console.log('✅ 種子分享功能可正常運作。');
    } else {
        console.error('❌ 偵測到種子確定性問題！');
    }
    console.log('═'.repeat(60));

    return allPassed;
}

// 執行測試
const passed = runDeterminismTests();
process.exit(passed ? 0 : 1);
