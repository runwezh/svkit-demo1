<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { Howl } from 'howler';

  let svg: SVGSVGElement;
  const width = 800;
  const height = 400;
  let animationId: number;

  let musicPlaying = false;
  let audioHowl: Howl;
  const amplitudeFactor = 0.5; 
  let startTime: number | null = null;
  
  // 为波形显示创建canvas
  let waveformCanvas: HTMLCanvasElement;

  // 创建正弦波数据
  function createSineData(offset: number, amplitude: number) {
    const data = [];
    for (let x = 0; x <= width; x += 5) {
      const y = height / 2 + amplitude * Math.sin(x * 0.02 + offset);
      data.push([x, y]);
    }
    return data;
  }

  // 更新正弦波动画
  function updateSine() {
    if (!musicPlaying) return;
    
    // 获取当前音频状态
    const seek = audioHowl.seek() || 0;
    
    // 使用seek值创建一个音频振幅模拟值
    // 这里用简单的算法模拟音频振幅，实际效果会比WaveSurfer的分析器稍弱
    const timeOffset = (Date.now() - (startTime ?? 0)) / 1000;
    let amplitude = 20 + 15 * Math.sin(timeOffset * 2) + 10 * Math.sin(timeOffset * 3.7);
    
    // 确保音频正在播放时才有振幅
    amplitude = audioHowl.playing() ? amplitude : 5;
    
    // 限制振幅范围
    const scaledAmplitude = Math.min(150, amplitude);
    
    // 绘制波形
    const data = createSineData(timeOffset, scaledAmplitude);
    const lineGenerator = d3.line().curve(d3.curveBasis);
    const pathData = lineGenerator(data);
    d3.select(svg).select('path').attr('d', pathData);
    
    // 绘制波形画布
    drawWaveform(seek);
    
    animationId = requestAnimationFrame(updateSine);
  }

  // 绘制波形到canvas
  function drawWaveform(seek: number) {
    const ctx = waveformCanvas.getContext('2d');
    if (!ctx) return;
    
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // 背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制波形
    const duration = audioHowl.duration() || 10;
    const progress = (seek / duration) * width;
    
    // 波形振幅随时间变化
    const timeOffset = (Date.now() - (startTime ?? 0)) / 1000;
    
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    
    for (let x = 0; x < width; x++) {
      // 结合多个正弦波创建更自然的波形
      const ratio = x / width;
      const y = height / 2 + 
                Math.sin((x + timeOffset * 100) * 0.1) * 10 + 
                Math.sin((x + timeOffset * 50) * 0.05) * 5 +
                Math.sin((x + timeOffset * 25) * 0.02) * 15;
                
      ctx.lineTo(x, y);
    }
    
    // 绘制已播放部分
    ctx.lineTo(width, height / 2);
    ctx.lineTo(0, height / 2);
    ctx.fillStyle = '#4a9eff55';
    ctx.fill();
    
    // 绘制进度线
    ctx.beginPath();
    ctx.moveTo(progress, 0);
    ctx.lineTo(progress, height);
    ctx.strokeStyle = '#1e6bc7';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 切换音乐播放/暂停状态
  function toggleMusic() {
    if (!musicPlaying) {
      startTime = Date.now();
      audioHowl.play();
      musicPlaying = true;
      updateSine();
    } else {
      audioHowl.stop();
      cancelAnimationFrame(animationId);
      musicPlaying = false;
      d3.select(svg).select('path').attr('d', null);
    }
  }

  onMount(() => {
    // 初始化SVG
    const svgContainer = d3.select(svg)
      .attr('width', width)
      .attr('height', height);
    svgContainer.append('path')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 3)
      .attr('fill', 'none');
    
    // 创建Howl实例
    audioHowl = new Howl({
      src: ['./audio/bass.mp3'],
      loop: true,
      html5: true
    });
  });

  onDestroy(() => {
    if (musicPlaying) {
      cancelAnimationFrame(animationId);
    }
    if (audioHowl) {
      audioHowl.stop();
      audioHowl.unload();
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
</style>

<div class="container">
  <h1>MusicWave 音乐可视化</h1>
  <canvas bind:this={waveformCanvas} class="waveform" width="800" height="50"></canvas>
  <svg bind:this={svg}></svg>
  <button on:click={toggleMusic}>
    {musicPlaying ? '停止音乐' : '播放音乐'}
  </button>
</div>