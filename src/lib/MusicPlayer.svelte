<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Howl } from 'howler';

    const instrumentFiles = {
        bass: './audio/bass.mp3',
        hihat: './audio/hihat.mp3',
        kick: './audio/kick.mp3',
        snare: './audio/snare.mp3'
    };

    let isPlaying = false;
    let progress = 0;
    
    // 使用Howl替代WaveSurfer实例
    let instruments: {
        [key: string]: {
            howl: Howl | null;
            enabled: boolean;
        };
    } = {
        bass: { howl: null, enabled: true },
        hihat: { howl: null, enabled: true },
        kick: { howl: null, enabled: true },
        snare: { howl: null, enabled: true }
    };

    // 用于绘制波形的Canvas元素
    let canvasRefs: {[key: string]: HTMLCanvasElement | null} = {
        bass: null,
        hihat: null,
        kick: null,
        snare: null
    };

    let animationFrameId: number;
    let startTime = Date.now();

    function initInstruments() {
        for (const [name, file] of Object.entries(instrumentFiles)) {
            instruments[name].howl = new Howl({
                src: [file],
                loop: true,
                autoplay: false,
                html5: true,
                volume: instruments[name].enabled ? 1 : 0,
                onend: function() {
                    if (isPlaying && instruments[name].enabled) {
                        instruments[name].howl?.play();
                    }
                }
            });

            // 初始化波形显示的Canvas
            if (canvasRefs[name]) {
                const ctx = canvasRefs[name]?.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#4a9eff';
                    drawWaveform(ctx, name);
                }
            }
        }
    }

    function toggleInstrument(name: string) {
        instruments[name].enabled = !instruments[name].enabled;
        if (instruments[name].howl) {
            instruments[name].howl.volume(instruments[name].enabled ? 1 : 0);
        }
    }

    function play() {
        isPlaying = !isPlaying;
        for (const name of Object.keys(instruments)) {
            if (instruments[name].howl && instruments[name].enabled) {
                if (isPlaying) {
                    instruments[name].howl.play();
                } else {
                    instruments[name].howl.stop();
                }
            }
        }
        
        if (isPlaying) {
            startTime = Date.now();
            updateProgress();
        } else {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            progress = 0;
        }
    }

    function updateProgress() {
        if (!isPlaying) return;
        
        // 使用第一个音频的seek作为进度参考
        const key = Object.keys(instruments)[0];
        if (instruments[key]?.howl) {
            const duration = instruments[key].howl.duration();
            const seek = instruments[key].howl.seek() || 0;
            progress = (seek / duration) * 100;
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
    
    // 绘制简单的波形，使用时间和随机值模拟音频波形
    function drawWaveform(ctx: CanvasRenderingContext2D, name: string) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!instruments[name].enabled) {
            // 如果该轨道被禁用，绘制一个灰色平线
            ctx.fillStyle = '#ccc';
            ctx.fillRect(0, height/2 - 1, width, 2);
            return;
        }
        
        ctx.fillStyle = '#4a9eff';
        
        // 使用Howl的seek值来确定进度位置
        const seek = instruments[name].howl?.seek() || 0;
        const timeOffset = (Date.now() - startTime) / 1000;
        
        // 绘制波形
        const segmentWidth = 5;
        for (let x = 0; x < width; x += segmentWidth) {
            // 使用伪随机函数生成波形高度
            const seed = (x + timeOffset * 50) / 100;
            const y = Math.sin(seed) * 10 + Math.sin(seed * 0.5) * 5;
            const amplitude = instruments[name].howl?.playing() ? 
                              Math.abs(y) * (instruments[name].howl?.volume() || 1) * 15 : 
                              5;
            
            // 高度限制在canvas高度范围内
            const barHeight = Math.min(amplitude, height / 2 - 5);
            
            // 从中间向上下绘制
            ctx.fillRect(x, height/2 - barHeight/2, segmentWidth - 1, barHeight);
            
            // 如果超过当前seek位置，减弱颜色
            if (x / width > progress / 100) {
                ctx.fillStyle = '#ccc';
            } else {
                ctx.fillStyle = '#1e6bc7';
            }
        }
    }

    onMount(() => {
        initInstruments();
    });

    onDestroy(() => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        for (const name of Object.keys(instruments)) {
            if (instruments[name].howl) {
                instruments[name].howl.stop();
                instruments[name].howl.unload();
            }
        }
    });
</script>

<div class="controls">
    <div class="buttons">
        <button on:click={play}>{isPlaying ? '暂停' : '播放'}</button>
        {#each Object.keys(instruments) as name}
            <button on:click={() => toggleInstrument(name)}>
                {instruments[name].enabled ? `禁用 ${name}` : `启用 ${name}`}
            </button>
            <div id="waveform-{name}" class="waveform-container">
                <canvas 
                    bind:this={canvasRefs[name]} 
                    width="300" 
                    height="50"
                ></canvas>
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
    }
</style>