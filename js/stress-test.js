/**
 * Phase 13: 壓力測試與性能基準測試機器人
 *
 * 目標：推動引擎到極限，測量性能指標，識別瓶頸
 * 策略：負載注入 → 指標測量 → 瓶頸分析
 *
 * 安全措施：
 * - Panic Stop：單次執行超過 5 秒自動中止
 * - Memory Monitor：監控記憶體使用（如果可用）
 * - Progressive Load：漸進式增加負載
 */

import { generateTerrain, generateRivers, applyHydrologyToMoistureAdvanced } from './terrain.js';
import { renderTerrain } from './renderer.js';
import { terrainConfig } from './config.js';

/**
 * 壓力測試機器人類
 */
class StressBot {
    constructor() {
        this.results = [];
        this.panicThreshold = 5000; // 單次操作最大允許時間（ms）
        this.memorySupported = performance.memory !== undefined;
    }

    /**
     * 執行完整的壓力測試套件
     */
    async runFullStressTest() {
        console.log('%c╔════════════════════════════════════════════════════════════════╗', 'color: #FF6B6B; font-weight: bold');
        console.log('%c║  Phase 13: 壓力測試與性能基準測試                              ║', 'color: #FF6B6B; font-weight: bold');
        console.log('%c║  推動引擎到極限...                                              ║', 'color: #FF6B6B; font-weight: bold');
        console.log('%c╚════════════════════════════════════════════════════════════════╝', 'color: #FF6B6B; font-weight: bold');
        console.log('');

        const startTime = performance.now();

        // 測試 1: 快速重複生成（記憶體洩漏檢查）
        await this.testRapidRegeneration();

        // 測試 2: 重度水文測試（CPU 壓力）
        await this.testHeavyHydrology();

        // 測試 3: 複雜度壓縮測試（演算法壓力）
        await this.testComplexityCrunch();

        // 測試 4: 邊界條件測試
        await this.testBoundaryConditions();

        const endTime = performance.now();
        const totalDuration = (endTime - startTime) / 1000;

        // 生成報告
        this.generateStressReport(totalDuration);

        return this.results;
    }

    /**
     * 測試 1: 快速重複生成（記憶體洩漏檢查）
     *
     * 目標：驗證重複調用 generateTerrain() 不會導致記憶體累積
     * 方法：執行 50 次快速生成，測量每次執行時間和記憶體使用
     */
    async testRapidRegeneration() {
        console.log('%c▶ 測試 1: 快速重複生成（Memory Leak Check）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        const iterations = 50;
        const timings = [];
        const memorySnapshots = [];

        // 保存原始配置
        const originalConfig = { ...terrainConfig };

        try {
            for (let i = 0; i < iterations; i++) {
                // 記錄記憶體快照（如果可用）
                if (this.memorySupported) {
                    memorySnapshots.push(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
                }

                const startTime = performance.now();

                // 生成地形
                generateTerrain();

                const endTime = performance.now();
                const duration = endTime - startTime;
                timings.push(duration);

                // Panic Stop 檢查
                if (duration > this.panicThreshold) {
                    console.error(`  ⚠️ PANIC STOP: 第 ${i + 1} 次迭代超過 ${this.panicThreshold}ms`);
                    break;
                }

                // 進度指示（每 10 次）
                if ((i + 1) % 10 === 0) {
                    console.log(`  🔄 進度: ${i + 1}/${iterations} (平均: ${this.average(timings).toFixed(2)}ms)`);
                }
            }

            // 分析結果
            const avgTime = this.average(timings);
            const minTime = Math.min(...timings);
            const maxTime = Math.max(...timings);
            const stdDev = this.standardDeviation(timings);

            // 記憶體洩漏檢測（線性回歸）
            let memoryLeakDetected = false;
            let memoryGrowthRate = 0;

            if (this.memorySupported && memorySnapshots.length > 10) {
                const firstHalf = memorySnapshots.slice(0, Math.floor(memorySnapshots.length / 2));
                const secondHalf = memorySnapshots.slice(Math.floor(memorySnapshots.length / 2));

                const avgFirstHalf = this.average(firstHalf);
                const avgSecondHalf = this.average(secondHalf);

                memoryGrowthRate = ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100;

                // 如果記憶體增長超過 10%，視為可能的洩漏
                if (memoryGrowthRate > 10) {
                    memoryLeakDetected = true;
                }
            }

            // 性能退化檢測
            const firstQuarter = timings.slice(0, Math.floor(timings.length / 4));
            const lastQuarter = timings.slice(-Math.floor(timings.length / 4));
            const avgFirstQuarter = this.average(firstQuarter);
            const avgLastQuarter = this.average(lastQuarter);
            const performanceDegradation = ((avgLastQuarter - avgFirstQuarter) / avgFirstQuarter) * 100;

            const testResult = {
                test: '快速重複生成',
                iterations: timings.length,
                avgTime: avgTime.toFixed(2),
                minTime: minTime.toFixed(2),
                maxTime: maxTime.toFixed(2),
                stdDev: stdDev.toFixed(2),
                throughput: (1000 / avgTime).toFixed(2), // 每秒生成次數
                performanceDegradation: performanceDegradation.toFixed(2) + '%',
                memoryLeakDetected: memoryLeakDetected ? '⚠️ 是' : '✅ 否',
                memoryGrowthRate: this.memorySupported ? memoryGrowthRate.toFixed(2) + '%' : 'N/A',
                status: (!memoryLeakDetected && performanceDegradation < 20) ? '✅ PASS' : '⚠️ WARNING'
            };

            this.results.push(testResult);

            console.log('');
            console.log('  📊 測試結果：');
            console.log(`     平均時間: ${avgTime.toFixed(2)}ms`);
            console.log(`     範圍: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`);
            console.log(`     標準差: ${stdDev.toFixed(2)}ms`);
            console.log(`     吞吐量: ${(1000 / avgTime).toFixed(2)} 次/秒`);
            console.log(`     性能退化: ${performanceDegradation.toFixed(2)}%`);
            if (this.memorySupported) {
                console.log(`     記憶體增長: ${memoryGrowthRate.toFixed(2)}%`);
                console.log(`     記憶體洩漏: ${memoryLeakDetected ? '⚠️ 檢測到' : '✅ 未檢測到'}`);
            }
            console.log('');

        } catch (error) {
            console.error(`  ❌ 測試失敗: ${error.message}`);
            this.results.push({
                test: '快速重複生成',
                status: '❌ ERROR',
                error: error.message
            });
        } finally {
            // 恢復原始配置
            Object.assign(terrainConfig, originalConfig);
        }
    }

    /**
     * 測試 2: 重度水文測試（CPU 壓力）
     *
     * 目標：找到河流密度的性能拐點
     * 方法：漸進式增加 riverDensity，測量執行時間
     */
    async testHeavyHydrology() {
        console.log('%c▶ 測試 2: 重度水文測試（Heavy Hydrology - CPU Stress）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        const densityLevels = [
            { density: 10000, label: '低負載' },
            { density: 25000, label: '中負載' },
            { density: 50000, label: '高負載' },
            { density: 100000, label: '超高負載' },
            { density: 200000, label: '極限負載' }
        ];

        const originalDensity = terrainConfig.riverDensity;

        try {
            for (const level of densityLevels) {
                console.log(`  🌊 測試密度: ${level.density.toLocaleString()} 滴水 (${level.label})`);

                terrainConfig.riverDensity = level.density;

                // 預熱（避免 JIT 影響）
                if (level.density === densityLevels[0].density) {
                    generateRivers(level.density);
                    await this.sleep(100);
                }

                // 執行 3 次測試取平均
                const timings = [];
                for (let i = 0; i < 3; i++) {
                    const startTime = performance.now();

                    generateRivers(level.density);

                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    timings.push(duration);

                    // Panic Stop
                    if (duration > this.panicThreshold) {
                        console.error(`     ⚠️ PANIC STOP: 執行時間超過 ${this.panicThreshold}ms`);
                        break;
                    }

                    await this.sleep(50); // 短暫延遲
                }

                const avgTime = this.average(timings);
                const dropletsPerSecond = (level.density / avgTime) * 1000;

                const testResult = {
                    test: `水文壓力 - ${level.label}`,
                    density: level.density.toLocaleString(),
                    avgTime: avgTime.toFixed(2) + 'ms',
                    dropletsPerSecond: dropletsPerSecond.toFixed(0),
                    status: avgTime < this.panicThreshold ? '✅ PASS' : '⚠️ SLOW'
                };

                this.results.push(testResult);

                console.log(`     平均時間: ${avgTime.toFixed(2)}ms`);
                console.log(`     處理速度: ${dropletsPerSecond.toFixed(0)} 滴水/秒`);
                console.log('');

                // 如果執行時間超過閾值，停止測試
                if (avgTime > this.panicThreshold) {
                    console.log(`  ⚠️ 達到性能極限，停止更高密度測試`);
                    break;
                }
            }

        } catch (error) {
            console.error(`  ❌ 測試失敗: ${error.message}`);
            this.results.push({
                test: '重度水文測試',
                status: '❌ ERROR',
                error: error.message
            });
        } finally {
            terrainConfig.riverDensity = originalDensity;
        }
    }

    /**
     * 測試 3: 複雜度壓縮測試（演算法壓力）
     *
     * 目標：測試最大複雜度配置下的性能
     * 方法：設置所有參數到最大值，測量完整渲染流程
     */
    async testComplexityCrunch() {
        console.log('%c▶ 測試 3: 複雜度壓縮測試（Complexity Crunch）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        // 保存原始配置
        const originalConfig = { ...terrainConfig };

        try {
            // 設置為最大複雜度
            terrainConfig.octaves = 6;              // 最大細節層數
            terrainConfig.irrigationStrength = 5.0; // 最大灌溉強度
            terrainConfig.useAdvancedIrrigation = true;
            terrainConfig.riverDensity = 50000;     // 高密度河流

            console.log('  🔧 配置: Octaves=6, Irrigation=5.0, Advanced=ON, Rivers=50k');
            console.log('');

            // 測試完整流程
            const phases = [
                { name: '地形生成', fn: () => generateTerrain() },
                { name: '河流生成', fn: () => generateRivers(terrainConfig.riverDensity) },
                { name: '生態回饋', fn: () => applyHydrologyToMoistureAdvanced(
                    terrainConfig.irrigationStrength,
                    2,
                    Math.max(3, terrainConfig.riverThreshold)
                )},
                { name: '渲染繪製', fn: () => renderTerrain() }
            ];

            let totalTime = 0;
            const phaseResults = [];

            for (const phase of phases) {
                console.log(`  ⚙️ 執行階段: ${phase.name}`);

                const timings = [];
                for (let i = 0; i < 3; i++) {
                    const startTime = performance.now();

                    phase.fn();

                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    timings.push(duration);

                    // Panic Stop
                    if (duration > this.panicThreshold) {
                        console.error(`     ⚠️ PANIC STOP: ${phase.name} 超過閾值`);
                        break;
                    }
                }

                const avgTime = this.average(timings);
                totalTime += avgTime;

                phaseResults.push({
                    phase: phase.name,
                    avgTime: avgTime.toFixed(2) + 'ms',
                    percentage: '0%' // 稍後計算
                });

                console.log(`     平均時間: ${avgTime.toFixed(2)}ms`);
            }

            // 計算百分比
            phaseResults.forEach(result => {
                const time = parseFloat(result.avgTime);
                result.percentage = ((time / totalTime) * 100).toFixed(1) + '%';
            });

            // 計算 FPS（假設目標 60 FPS = 16.67ms per frame）
            const targetFrameTime = 16.67;
            const fps = totalTime > 0 ? Math.min(60, 1000 / totalTime) : 60;
            const framesBehind = Math.max(0, Math.ceil(totalTime / targetFrameTime) - 1);

            const testResult = {
                test: '複雜度壓縮（最大配置）',
                totalTime: totalTime.toFixed(2) + 'ms',
                estimatedFPS: fps.toFixed(1),
                framesBehind: framesBehind,
                bottleneck: phaseResults.reduce((max, r) =>
                    parseFloat(r.avgTime) > parseFloat(max.avgTime) ? r : max
                ).phase,
                status: totalTime < 500 ? '✅ PASS' : (totalTime < 2000 ? '⚠️ SLOW' : '❌ FAIL')
            };

            this.results.push(testResult);
            this.results.push(...phaseResults);

            console.log('');
            console.log('  📊 總體結果：');
            console.log(`     總執行時間: ${totalTime.toFixed(2)}ms`);
            console.log(`     預估 FPS: ${fps.toFixed(1)}`);
            console.log(`     落後幀數: ${framesBehind}`);
            console.log(`     主要瓶頸: ${testResult.bottleneck}`);
            console.log('');

        } catch (error) {
            console.error(`  ❌ 測試失敗: ${error.message}`);
            this.results.push({
                test: '複雜度壓縮測試',
                status: '❌ ERROR',
                error: error.message
            });
        } finally {
            Object.assign(terrainConfig, originalConfig);
        }
    }

    /**
     * 測試 4: 邊界條件測試
     *
     * 目標：測試極端參數組合
     * 方法：嘗試最小值、最大值、零值等邊界條件
     */
    async testBoundaryConditions() {
        console.log('%c▶ 測試 4: 邊界條件測試（Boundary Conditions）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        const originalConfig = { ...terrainConfig };

        const boundaryTests = [
            {
                name: '最小配置',
                config: { octaves: 1, scale: 10, riverDensity: 1000 }
            },
            {
                name: '最大配置',
                config: { octaves: 6, scale: 150, riverDensity: 50000 }
            },
            {
                name: '零灌溉',
                config: { irrigationStrength: 0, useAdvancedIrrigation: false }
            },
            {
                name: '極端海平面（低）',
                config: { seaLevel: 0.1 }
            },
            {
                name: '極端海平面（高）',
                config: { seaLevel: 0.8 }
            }
        ];

        try {
            for (const test of boundaryTests) {
                console.log(`  🧪 測試配置: ${test.name}`);

                // 應用配置
                Object.assign(terrainConfig, test.config);

                const startTime = performance.now();

                try {
                    generateTerrain();

                    const endTime = performance.now();
                    const duration = endTime - startTime;

                    const testResult = {
                        test: `邊界測試 - ${test.name}`,
                        time: duration.toFixed(2) + 'ms',
                        status: duration < 1000 ? '✅ PASS' : '⚠️ SLOW'
                    };

                    this.results.push(testResult);

                    console.log(`     執行時間: ${duration.toFixed(2)}ms - ${testResult.status}`);

                } catch (error) {
                    console.error(`     ❌ 失敗: ${error.message}`);
                    this.results.push({
                        test: `邊界測試 - ${test.name}`,
                        status: '❌ ERROR',
                        error: error.message
                    });
                }

                // 恢復原始配置
                Object.assign(terrainConfig, originalConfig);
            }

            console.log('');

        } catch (error) {
            console.error(`  ❌ 測試失敗: ${error.message}`);
        }
    }

    /**
     * 生成壓力測試報告
     */
    generateStressReport(totalDuration) {
        console.log('%c╔════════════════════════════════════════════════════════════════╗', 'color: #FF6B6B; font-weight: bold');
        console.log('%c║  壓力測試報告 (Stress Test Report)                             ║', 'color: #FF6B6B; font-weight: bold');
        console.log('%c╚════════════════════════════════════════════════════════════════╝', 'color: #FF6B6B; font-weight: bold');
        console.log('');

        // 使用 console.table 顯示結果
        console.table(this.results);

        console.log('');
        console.log('  📈 性能建議：');
        console.log('');

        // 分析結果並給出建議
        const recommendations = this.analyzeResults();
        recommendations.forEach(rec => {
            console.log(`     ${rec.icon} ${rec.text}`);
        });

        console.log('');
        console.log(`  ⏱️ 總測試時間: ${totalDuration.toFixed(2)} 秒`);
        console.log('');

        // 存儲到全局變量
        window.stressTestReport = {
            results: this.results,
            recommendations: recommendations,
            totalDuration: totalDuration,
            timestamp: new Date().toISOString()
        };

        console.log('%c  完整報告已存儲在 window.stressTestReport 中', 'color: #888');
        console.log('');
    }

    /**
     * 分析結果並生成建議
     */
    analyzeResults() {
        const recommendations = [];

        // 檢查記憶體洩漏
        const memoryTest = this.results.find(r => r.test === '快速重複生成');
        if (memoryTest) {
            if (memoryTest.memoryLeakDetected === '⚠️ 是') {
                recommendations.push({
                    icon: '⚠️',
                    text: '檢測到可能的記憶體洩漏，建議檢查 generateTerrain() 中的變量釋放'
                });
            } else {
                recommendations.push({
                    icon: '✅',
                    text: '記憶體管理良好，未檢測到洩漏'
                });
            }
        }

        // 檢查河流密度建議
        const hydroTests = this.results.filter(r => r.test && r.test.includes('水文壓力'));
        if (hydroTests.length > 0) {
            const lastPass = hydroTests.filter(t => t.status === '✅ PASS').pop();
            if (lastPass) {
                const density = lastPass.density.replace(/,/g, '');
                recommendations.push({
                    icon: '🌊',
                    text: `建議最大河流密度: ${density} 滴水（保持良好性能）`
                });
            }
        }

        // 檢查複雜度測試
        const complexityTest = this.results.find(r => r.test === '複雜度壓縮（最大配置）');
        if (complexityTest) {
            const totalTime = parseFloat(complexityTest.totalTime);
            if (totalTime < 200) {
                recommendations.push({
                    icon: '🚀',
                    text: `系統性能優秀！最大配置下僅需 ${totalTime.toFixed(0)}ms`
                });
            } else if (totalTime < 1000) {
                recommendations.push({
                    icon: '✅',
                    text: `性能良好，最大配置可用（${totalTime.toFixed(0)}ms）`
                });
            } else {
                recommendations.push({
                    icon: '⚠️',
                    text: `最大配置性能吃緊（${totalTime.toFixed(0)}ms），建議降低參數`
                });
            }

            if (complexityTest.bottleneck) {
                recommendations.push({
                    icon: '🔍',
                    text: `主要瓶頸: ${complexityTest.bottleneck}，優化此階段可顯著提升性能`
                });
            }
        }

        // 通用建議
        recommendations.push({
            icon: '💡',
            text: '對於實時互動應用，建議保持總生成時間 < 500ms'
        });

        recommendations.push({
            icon: '📱',
            text: '移動設備建議降低 riverDensity 至 10,000-25,000'
        });

        return recommendations;
    }

    /**
     * 輔助函數：計算平均值
     */
    average(array) {
        return array.reduce((a, b) => a + b, 0) / array.length;
    }

    /**
     * 輔助函數：計算標準差
     */
    standardDeviation(array) {
        const avg = this.average(array);
        const squareDiffs = array.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = this.average(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    }

    /**
     * 輔助函數：延遲
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 創建全局實例
const stressBot = new StressBot();

// 暴露到全局作用域
window.StressBot = stressBot;
window.runStressTest = () => stressBot.runFullStressTest();

console.log('%c🔥 壓力測試機器人已加載！', 'color: #FF6B6B; font-weight: bold');
console.log('%c   使用 runStressTest() 開始壓力測試', 'color: #888');
console.log('%c   ⚠️ 警告：此測試會進行高強度運算，可能導致瀏覽器暫時無響應', 'color: #FF9800');
console.log('');

export default stressBot;
