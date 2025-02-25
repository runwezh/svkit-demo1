<script context="module" lang="ts">
    // 仅在客户端导入 Tone.js
    let Tone: any;
    
    // 这个函数只会在浏览器中执行
    if (typeof window !== 'undefined') {
        import('tone').then(module => {
            Tone = module;
        });
    }
</script>

<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';

    const instrumentFiles = {
        bass: './audio/bass.mp3',
        hihat: './audio/hihat.mp3',
        kick: './audio/kick.mp3',
        snare: './audio/snare.mp3'
    };

    let isPlaying = false;
    let progress = 0;
    
    // 使用Tone.Player替代Howl
    let instruments: {
        [key: string]: {
            player: any;
            enabled: boolean;
        };
    } = {
        bass: { player: null, enabled: true },
        hihat: { player: null, enabled: true },
        kick: { player: null, enabled: true },
        snare: { player: null, enabled: true }
    };

    // 用于绘制波形的Canvas元素
    let canvasRefs: {[key: string]: HTMLCanvasElement | null} = {
        bass: null,
        hihat: null,
        kick: null,
        snare: null
    };

    let animationFrameId: number;
    let startTime = 0;
    let totalDuration = 0;
    let isToneInitialized = false;
    let isBrowserEnv = false;

    // 跟踪每个音频文件的加载状态
    let loadingState = {
        bass: false,
        hihat: false,
        kick: false,
        snare: false
    };
    
    // 显示加载状态
    let isLoading = false;
    let loadingMessage = "初始化中...";

    // 初始化Tone.js
    async function initTone() {
        if (!browser || !Tone) return false;
        
        try {
            await Tone.start();
            console.log("音频已初始化，可以播放");
            
            // 设置Transport参数
            if (Tone.Transport) {
                Tone.Transport.bpm.value = 120;
                Tone.Transport.loop = true;
                Tone.Transport.loopStart = 0;
                Tone.Transport.loopEnd = 10; // 默认10秒，稍后会根据实际长度调整
            }
            
            isToneInitialized = true;
            return true;
        } catch (e) {
            console.error("初始化Tone.js失败:", e);
            return false;
        }
    }

    // 初始化所有乐器
    async function initInstruments() {
        if (!browser || !Tone || !isToneInitialized) return;
        
        isLoading = true;
        loadingMessage = "加载音频中...";
        
        // 先创建所有播放器实例
        for (const [name, file] of Object.entries(instrumentFiles) as [keyof typeof loadingState, string][]) {
            try {
                // 创建Tone.Player实例但不立即加载
                instruments[name].player = new Tone.Player({
                    url: file,
                    loop: true,
                    autostart: false,
                    onload: () => {
                        loadingState[name] = true;
                        console.log(`${name} 加载完成`);
                        
                        if (instruments[name].player) {
                            const duration = instruments[name].player.buffer.duration;
                            if (duration > totalDuration) {
                                totalDuration = duration;
                                if (Tone.Transport) {
                                    Tone.Transport.loopEnd = totalDuration;
                                }
                            }
                        }
                        
                        // 检查是否所有音频都已加载
                        checkAllLoaded();
                    }
                }).toDestination();

                // 设置音量（启用/禁用）
                if (instruments[name].player) {
                    instruments[name].player.volume.value = instruments[name].enabled ? 0 : -Infinity;
                }
                
                // 开始加载
                loadingState[name] = false;
            } catch (e) {
                console.error(`初始化乐器 ${name} 失败:`, e);
                loadingState[name] = true; // 标记为已加载，避免永久等待
            }
        }
        
        // 初始化波形显示
        initCanvasWaveforms();
    }
    
    // 检查所有音频是否都已加载
    function checkAllLoaded() {
        const allLoaded = Object.values(loadingState).every(state => state === true);
        if (allLoaded) {
            isLoading = false;
            console.log("所有音频已加载完成");
        }
    }

    // 初始化所有波形画布
    function initCanvasWaveforms() {
        for (const name of Object.keys(instruments)) {
            if (canvasRefs[name]) {
                const ctx = canvasRefs[name]?.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#4a9eff';
                    drawWaveform(ctx, name);
                }
            }
        }
    }

    // 切换乐器启用/禁用状态
    function toggleInstrument(name: string) {
        if (!browser) return;
        
        instruments[name].enabled = !instruments[name].enabled;
        if (instruments[name].player) {
            instruments[name].player.volume.value = instruments[name].enabled ? 0 : -Infinity;
        }
    }

    // 安全地操作Tone.Transport
    function safeTransportOperation(operation: 'start' | 'stop') {
        if (!browser || !Tone || !Tone.Transport) return;
        
        try {
            if (operation === 'start') {
                Tone.Transport.start();
            } else if (operation === 'stop') {
                Tone.Transport.stop();
            }
        } catch (e) {
            console.error(`Tone.Transport.${operation} 操作失败:`, e);
        }
    }

    // 播放或暂停所有乐器
    async function play() {
        if (!browser) return;
        
        if (!isToneInitialized) {
            const success = await initTone();
            if (success) {
                await initInstruments();
            } else {
                return;
            }
        }
        
        // 如果尚未加载，首次点击时只初始化
        if (isLoading) {
            loadingMessage = "音频加载中，请稍后...";
            return;
        }
        
        // 确保所有音频都已加载
        const allLoaded = Object.values(loadingState).every(state => state === true);
        if (!allLoaded) {
            loadingMessage = "正在加载音频文件...";
            isLoading = true;
            return;
        }
        
        isPlaying = !isPlaying;
        
        if (isPlaying) {
            if (Tone) startTime = Tone.now ? Tone.now() : 0;
            safeTransportOperation('start');
            
            for (const name of Object.keys(instruments)) {
                if (instruments[name].player && instruments[name].enabled) {
                    try {
                        // 确保缓冲区已加载
                        if (instruments[name].player.loaded) {
                            instruments[name].player.start();
                        } else {
                            console.warn(`${name} 未加载完成，跳过播放`);
                        }
                    } catch (e) {
                        console.error(`启动乐器 ${name} 失败:`, e);
                    }
                }
            }
            
            updateProgress();
        } else {
            safeTransportOperation('stop');
            
            for (const name of Object.keys(instruments)) {
                if (instruments[name].player) {
                    try {
                        instruments[name].player.stop();
                    } catch (e) {
                        console.error(`停止乐器 ${name} 失败:`, e);
                    }
                }
            }
            
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            progress = 0;
        }
    }

    // 更新进度条和波形动画
    function updateProgress() {
        if (!isPlaying || !browser || !Tone) return;
        
        let now = 0;
        try {
            now = Tone.Transport ? Tone.Transport.seconds : 0;
        } catch (e) {
            console.error("获取 Tone.Transport.seconds 失败:", e);
        }
        
        if (totalDuration > 0) {
            progress = ((now % totalDuration) / totalDuration) * 100;
        }
        
        // 画波形动画
        for (const name of Object.keys(instruments)) {
            const ctx = canvasRefs[name]?.getContext('2d');
            if (ctx) {
                drawWaveform(ctx, name);
            }
        }
        
        animationFrameId = requestAnimationFrame(updateProgress);
    }
    
    // 绘制波形
    function drawWaveform(ctx: CanvasRenderingContext2D, name: string) {
        if (!browser) return;
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!instruments[name].enabled) {
            // 绘制灰色平线
            ctx.fillStyle = '#ccc';
            ctx.fillRect(0, height/2 - 1, width, 2);
            return;
        }
        
        ctx.fillStyle = '#4a9eff';
        
        // 使用模拟时间创建动画效果
        let timeOffset = 0;
        try {
            timeOffset = Tone && Tone.Transport ? Tone.Transport.seconds : performance.now() / 1000;
        } catch (e) {
            timeOffset = performance.now() / 1000;
        }
        
        // 绘制波形
        const segmentWidth = 5;
        for (let x = 0; x < width; x += segmentWidth) {
            // 使用伪随机函数生成波形高度
            const seed = (x + timeOffset * 50) / 100;
            const y = Math.sin(seed) * 10 + Math.sin(seed * 0.5) * 5;
            const amplitude = isPlaying && instruments[name].enabled ? Math.abs(y) * 15 : 5;
            
            // 高度限制在canvas高度范围内
            const barHeight = Math.min(amplitude, height / 2 - 5);
            
            // 从中间向上下绘制
            ctx.fillRect(x, height/2 - barHeight/2, segmentWidth - 1, barHeight);
            
            // 如果超过当前进度位置，减弱颜色
            if (x / width > progress / 100) {
                ctx.fillStyle = '#ccc';
            } else {
                ctx.fillStyle = '#1e6bc7';
            }
        }
    }

    onMount(async () => {
        isBrowserEnv = browser;
        if (!browser) return;
        
        // 等待Tone加载
        if (!Tone) {
            await new Promise<void>(resolve => {
                const checkTone = setInterval(() => {
                    if (Tone) {
                        clearInterval(checkTone);
                        resolve();
                    }
                }, 100);
                
                // 如果5秒后还没加载，也继续执行
                setTimeout(() => {
                    clearInterval(checkTone);
                    resolve();
                }, 5000);
            });
        }
        
        // 仅在用户交互后初始化音频
        console.log("音频将在用户交互后初始化");
    });

    onDestroy(() => {
        if (!browser) return;
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        // 安全地销毁所有Tone.Player实例
        for (const name of Object.keys(instruments)) {
            if (instruments[name].player) {
                try {
                    instruments[name].player.stop().dispose();
                } catch (e) {
                    console.error(`销毁乐器 ${name} 失败:`, e);
                }
            }
        }
        
        // 安全地停止Tone.Transport
        if (Tone && Tone.Transport) {
            try {
                Tone.Transport.stop();
            } catch (e) {
                console.error("停止 Tone.Transport 失败:", e);
            }
        }
    });
</script>

<div class="controls">
    <div class="buttons">
        <button on:click={play} disabled={isLoading}>
            {#if isLoading}
                {loadingMessage}
            {:else}
                {isPlaying ? '暂停' : '播放'}
            {/if}
        </button>
        {#each Object.keys(instruments) as name}
            <button on:click={() => toggleInstrument(name)} disabled={isLoading || !loadingState[name]}>
                {instruments[name].enabled ? `禁用 ${name}` : `启用 ${name}`}
            </button>
            <div id="waveform-{name}" class="waveform-container">
                <canvas 
                    bind:this={canvasRefs[name]} 
                    width="300" 
                    height="50"
                ></canvas>
                {#if isLoading && !loadingState[name]}
                    <div class="loading-overlay">加载中...</div>
                {/if}
            </div>
        {/each}
    </div>
    <div class="progress">
        <div class="progress-bar" style="width: {progress}%;"></div>
    </div>
</div>

<style>
    .controls {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .buttons {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
    }
    .progress {
        width: 80%;
        height: 20px;
        background-color: #ccc;
        border-radius: 10px;
        overflow: hidden;
    }
    .progress-bar {
        height: 100%;
        background-color: #4caf50;
        transition: width 0.1s linear;
    }
    .waveform-container {
        border: 1px solid #ddd;
        border-radius: 4px;
        margin: 5px 0;
        position: relative;
    }
    
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.2);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
    }
    
    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
</style>