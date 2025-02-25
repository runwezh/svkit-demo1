<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as Tone from 'tone';
    import * as d3 from 'd3';

    let audioPlayer: Tone.Player;
    let svg: SVGElement;
    let waveformCanvas: HTMLCanvasElement;
    const width = 800;
    const height = 200;
    let animationId: number;

    let musicPlaying = false;
    let previousTime = 0;
    let duration = 10;

    const drumBeats = [2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0, 6.6, 7.2, 7.8, 8.4, 9.0, 9.6, 10.2, 10.8, 11.4, 12.0, 12.6, 13.2, 13.8, 14.4, 15.0, 15.6, 16.2];

    let xScale = d3
        .scaleLinear()
        .domain([0, duration])
        .range([50, width - 50]);

    // 初始化Tone.js
    async function initTone() {
        await Tone.start();
        console.log("音频已初始化，可以播放");
        
        // 创建播放器并设置循环
        audioPlayer = new Tone.Player({
            url: "./audio/intro/normal.mp3",
            loop: true,
            onload: () => {
                if (audioPlayer && audioPlayer.loaded) {
                    duration = audioPlayer.buffer.duration;
                    xScale.domain([0, duration]);
                    drumBeats.forEach((beat, index) => {
                        d3.select(`#beat-${index}`).attr('cx', xScale(beat));
                    });
                    console.log("音频加载完成，时长：", duration);
                }
            }
        }).toDestination();
    }

    function setupSvg() {
        const svgContainer = d3.select(svg).attr('width', width).attr('height', height);

        // Draw horizontal axis line.
        svgContainer
            .append('line')
            .attr('x1', 50)
            .attr('y1', height / 2)
            .attr('x2', width - 50)
            .attr('y2', height / 2)
            .attr('stroke', '#aaa')
            .attr('stroke-width', 2)
            .attr('stroke', 'green');

        // Draw a circle for each drum beat.
        drumBeats.forEach((beat, index) => {
            svgContainer
                .append('circle')
                .attr('id', `beat-${index}`)
                .attr('cx', xScale(beat))
                .attr('cy', height / 2)
                .attr('r', 8)
                .attr('fill', 'steelblue');
        });
    }

    function update() {
        if (!musicPlaying || !audioPlayer) return;
        
        // 获取当前播放时间
        const currentTime = audioPlayer.immediate();
        
        // 检查鼓点
        drumBeats.forEach((beat, index) => {
            if (previousTime < beat && currentTime >= beat) {
                d3.select(`#beat-${index}`)
                    .transition()
                    .duration(150)
                    .attr('r', 15)
                    .transition()
                    .duration(150)
                    .attr('r', 8);
            }
        });
        
        // 绘制波形
        drawWaveform(currentTime);
        
        previousTime = currentTime;
        animationId = requestAnimationFrame(update);
    }

    // 绘制波形显示
    function drawWaveform(currentTime: number) {
        if (!audioPlayer || !audioPlayer.loaded) return;
        
        const ctx = waveformCanvas.getContext('2d');
        if (!ctx) return;
        
        const width = waveformCanvas.width;
        const height = waveformCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        // 计算进度
        const progress = (currentTime / duration) * width;
        
        // 绘制波形
        ctx.beginPath();
        ctx.moveTo(0, height/2);
        
        const timeOffset = Tone.Transport.seconds;
        
        // 绘制随鼓点变化的波形
        for (let x = 0; x < width; x++) {
            const xRatio = x / width;
            let y = height / 2;
            
            // 鼓点位置创建波峰
            for (const beat of drumBeats) {
                const beatPos = (beat / duration) * width;
                const distance = Math.abs(x - beatPos);
                if (distance < 30) {
                    const impact = (30 - distance) / 30;
                    y += Math.sin(xRatio * Math.PI * 10 + timeOffset * 5) * impact * 15;
                }
            }
            
            // 添加小波动
            y += Math.sin(x * 0.1 + timeOffset) * 2;
            
            ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = '#4a9eff';
        ctx.stroke();
        
        // 绘制进度遮罩
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

    async function toggleMusic() {
        if (!audioPlayer) {
            await initTone();
        }
        
        if (!musicPlaying) {
            audioPlayer.start();
            musicPlaying = true;
            update();
        } else {
            audioPlayer.stop();
            musicPlaying = false;
            previousTime = 0;
            cancelAnimationFrame(animationId);
        }
    }

    onMount(async () => {
        setupSvg();
        await initTone();
    });

    onDestroy(() => {
        if (audioPlayer) {
            audioPlayer.stop().dispose();
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });
</script>

<div class="container">
    <h1>RhythmPlayer 音乐鼓点可视化</h1>
    <canvas bind:this={waveformCanvas} class="waveform" width="800" height="50"></canvas>
    <svg bind:this={svg}></svg>
    <div>
        <button on:click={toggleMusic}>
            {musicPlaying ? '停止音乐' : '播放音乐'}
        </button>
    </div>
</div>

<style>
    .container {
        text-align: center;
        margin: 20px;
    }
    svg {
        border: 1px solid #ddd;
        margin-top: 20px;
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
        border: 1px solid #ddd;
        margin-top: 20px;
    }
</style>
