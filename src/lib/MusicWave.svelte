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
    import * as d3 from 'd3';
    import { browser } from '$app/environment';
    
    let svg: SVGSVGElement;
    const width = 800;
    const height = 400;
    let animationId: number;

    let musicPlaying = false;
    let audioPlayer: any;
    let analyser: any;
    const amplitudeFactor = 0.5;
    let startTime = 0;
    let isToneInitialized = false;
    
    // 波形显示Canvas
    let waveformCanvas: HTMLCanvasElement;

    let isLoading = false;
    let loadingMessage = "初始化中...";
    let audioLoaded = false;

    // 创建正弦波数据
    function createSineData(offset: number, amplitude: number) {
        const data = [];
        for (let x = 0; x <= width; x += 5) {
            const y = height / 2 + amplitude * Math.sin(x * 0.02 + offset);
            data.push([x, y]);
        }
        return data;
    }

    // 安全地获取Tone.Transport.seconds
    function safeGetTransportSeconds(): number {
        if (!browser || !Tone || !Tone.Transport) return performance.now() / 1000;
        
        try {
            return Tone.Transport.seconds;
        } catch (e) {
            return performance.now() / 1000;
        }
    }

    // 初始化Tone.js
    async function initTone() {
        if (!browser || !Tone) return false;
        
        try {
            await Tone.start();
            console.log("音频已初始化，可以播放");
            
            isLoading = true;
            loadingMessage = "加载音频中...";
            
            // 创建Player和分析器
            audioPlayer = new Tone.Player({
                url: "./audio/bass.mp3",
                loop: true,
                autostart: false,
                onload: () => {
                    console.log("音频加载完成");
                    audioLoaded = true;
                    isLoading = false;
                }
            }).toDestination();
            
            // 创建分析器
            analyser = new Tone.Analyser({
                type: "fft",
                size: 1024
            });
            
            // 连接Player到分析器，再到输出
            audioPlayer.connect(analyser);
            
            isToneInitialized = true;
            return true;
        } catch (e) {
            console.error("初始化Tone.js失败:", e);
            isLoading = false;
            return false;
        }
    }

    // 更新正弦波动画
    function updateSine() {
        if (!musicPlaying || !browser || !Tone) return;
        
        let spectrumData: Float32Array;
        let avgAmplitude = 0;
        
        // 安全地获取频谱数据
        try {
            spectrumData = analyser.getValue() as Float32Array;
            const sum = Array.from(spectrumData).reduce((acc, val) => acc + Math.abs(val), 0);
            avgAmplitude = (sum / spectrumData.length) * amplitudeFactor;
        } catch (e) {
            console.error("获取频谱数据失败:", e);
            avgAmplitude = 0.5;  // 默认值
        }

        // 计算缩放后的振幅
        const scaledAmplitude = 80 + 70 * avgAmplitude;
        
        // 使用当前时间创建偏移
        const timeOffset = safeGetTransportSeconds();
        
        // 绘制波形
        try {
            const data = createSineData(timeOffset, scaledAmplitude);
            const lineGenerator = d3.line().curve(d3.curveBasis);
            const pathData = lineGenerator(data);
            d3.select(svg).select('path').attr('d', pathData);
            
            // 绘制波形到Canvas
            drawWaveform();
        } catch (e) {
            console.error("绘制波形失败:", e);
        }
        
        animationId = requestAnimationFrame(updateSine);
    }

    // 绘制波形到Canvas
    function drawWaveform() {
        if (!browser) return;
        
        const ctx = waveformCanvas.getContext('2d');
        if (!ctx) return;
        
        const width = waveformCanvas.width;
        const height = waveformCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // 背景
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        if (audioPlayer && audioPlayer.loaded) {
            let currentTime = 0;
            let duration = 1;
            
            // 安全地获取当前时间和总时长
            try {
                currentTime = audioPlayer.immediate();
                duration = audioPlayer.buffer.duration;
            } catch (e) {
                currentTime = 0;
                duration = 1;
                console.error("获取音频时间信息失败:", e);
            }
            
            const progress = (currentTime / duration) * width;
            
            // 安全地获取波形数据
            let values: Float32Array;
            try {
                values = analyser.getValue() as Float32Array;
            } catch (e) {
                // 创建模拟数据
                values = new Float32Array(1024);
                for (let i = 0; i < values.length; i++) {
                    values[i] = Math.sin(i * 0.1) * 0.1;
                }
            }
            
            // 绘制波形线
            ctx.beginPath();
            ctx.moveTo(0, height/2);
            
            // 使用频谱数据绘制波形
            for (let i = 0; i < width; i++) {
                const dataIndex = Math.floor((i / width) * values.length);
                const value = values[dataIndex];
                // 将-1到1的值映射到canvas高度
                const y = height/2 + (value * height/2);
                ctx.lineTo(i, y);
            }
            
            ctx.strokeStyle = '#4a9eff';
            ctx.stroke();
            
            // 绘制已播放部分
            ctx.beginPath();
            ctx.rect(0, 0, progress, height);
            ctx.fillStyle = 'rgba(30, 107, 199, 0.2)';
            ctx.fill();
            
            // 绘制进度线
            ctx.beginPath();
            ctx.moveTo(progress, 0);
            ctx.lineTo(progress, height);
            ctx.strokeStyle = '#1e6bc7';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // 切换音乐播放/暂停状态
    async function toggleMusic() {
        if (!browser) return;
        
        if (!isToneInitialized) {
            const success = await initTone();
            if (!success) return;
        }
        
        // 如果正在加载，不做任何操作
        if (isLoading) {
            return;
        }
        
        // 确保音频已加载
        if (!audioLoaded) {
            isLoading = true;
            loadingMessage = "音频加载中，请稍后...";
            return;
        }
        
        if (!musicPlaying) {
            try {
                startTime = Tone ? Tone.now() : performance.now() / 1000;
                audioPlayer.start();
                musicPlaying = true;
                updateSine();
            } catch (e) {
                console.error("启动音频失败:", e);
            }
        } else {
            try {
                audioPlayer.stop();
                cancelAnimationFrame(animationId);
                musicPlaying = false;
                d3.select(svg).select('path').attr('d', null);
            } catch (e) {
                console.error("停止音频失败:", e);
            }
        }
    }

    onMount(async () => {
        if (!browser) return;
        
        // 初始化SVG
        try {
            const svgContainer = d3.select(svg)
                .attr('width', width)
                .attr('height', height);
            svgContainer.append('path')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 3)
                .attr('fill', 'none');
        } catch (e) {
            console.error("初始化SVG失败:", e);
        }
        
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
        
        if (musicPlaying) {
            cancelAnimationFrame(animationId);
        }
        
        // 安全地销毁音频资源
        if (audioPlayer) {
            try {
                audioPlayer.stop().dispose();
            } catch (e) {
                console.error("销毁音频播放器失败:", e);
            }
        }
        
        if (analyser) {
            try {
                analyser.dispose();
            } catch (e) {
                console.error("销毁音频分析器失败:", e);
            }
        }
    });
</script>

<style>
  .container {
    text-align: center;
    padding: 20px;
  }
  svg {
    border: 1px solid #ccc;
    margin-top: 20px;
    background-color: #f5f5f5;
  }
  button {
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
  }
  .waveform {
    width: 800px;
    height: 50px;
    margin: 20px auto;
    border: 1px solid #ccc;
  }
  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
</style>

<div class="container">
  <h1>MusicWave 音乐可视化</h1>
  <canvas bind:this={waveformCanvas} class="waveform" width="800" height="50"></canvas>
  <svg bind:this={svg}></svg>
  <button on:click={toggleMusic} disabled={isLoading}>
    {isLoading ? loadingMessage : (musicPlaying ? '停止音乐' : '播放音乐')}
  </button>
</div>