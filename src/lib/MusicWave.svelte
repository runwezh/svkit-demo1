<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import WaveSurfer from 'wavesurfer.js';

  let svg: SVGSVGElement;
  const width = 800;
  const height = 400;
  let animationId: number;

  let musicPlaying = false;
  let wavesurfer: WaveSurfer;
  const amplitudeFactor = 0.5; // 增加振幅因子使效果更明显
  let startTime: number | null = null;

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

    // 获取当前音频的音量信息
    const audioData = wavesurfer.getDecodedData();
    const currentTime = wavesurfer.getCurrentTime();
    if (!audioData) return;
    const sampleRate = audioData.sampleRate;
    const channelData = audioData.getChannelData(0); // 使用第一个声道

    // 计算当前时间点附近的音频数据的平均振幅
    const startSample = Math.floor((currentTime - 0.1) * sampleRate);
    const endSample = Math.floor((currentTime + 0.1) * sampleRate);
    let sum = 0;
    let count = 0;

    for (let i = Math.max(0, startSample); i < Math.min(endSample, channelData.length); i++) {
      sum += Math.abs(channelData[i]);
      count++;
    }

    // 计算平均振幅并应用放大因子
    const avgAmplitude = (count > 0 ? sum / count : 0) * amplitudeFactor;
    const scaledAmplitude = Math.min(150, avgAmplitude * 500); // 限制最大振幅并进行缩放

    // 使用当前时间计算偏移，让波形动起来
    const timeOffset = (Date.now() - (startTime ?? 0)) / 1000;
    const data = createSineData(timeOffset, scaledAmplitude);

    // 使用d3生成路径
    const lineGenerator = d3.line().curve(d3.curveBasis);
    const pathData = lineGenerator(data);
    d3.select(svg).select('path').attr('d', pathData);

    animationId = requestAnimationFrame(updateSine);
  }

  // 切换音乐播放/暂停状态
  function toggleMusic() {
    if (!musicPlaying) {
      startTime = Date.now();
      wavesurfer.play();
      musicPlaying = true;
      updateSine();
    } else {
      wavesurfer.pause();
      wavesurfer.seekTo(0);
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

    // 创建WaveSurfer实例
    wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: '#4a9eff',
      progressColor: '#1e6bc7',
      height: 50,
      cursorWidth: 1,
      cursorColor: '#333',
      normalize: true,
    } as any); // 使用类型断言

    // 监听音频处理事件
    wavesurfer.on('ready', () => {
      console.log("音频已加载完成，可以播放");
    });

    // 监听音频结束事件，实现循环播放
    wavesurfer.on('finish', () => {
      if (musicPlaying) {
        wavesurfer.play();
      }
    });

    // 加载音频
    wavesurfer.load('./audio/bass.mp3');
  });

  onDestroy(() => {
    if (musicPlaying) {
      cancelAnimationFrame(animationId);
    }
    if (wavesurfer) {
      wavesurfer.destroy();
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
    background-color: #f5f5f5; /* 添加背景色使波形更易观察 */
  }
  button {
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
  }
  #waveform {
    margin-top: 20px;
  }
</style>

<div class="container">
  <h1>MusicWave 音乐可视化</h1>
  <div id="waveform"></div>
  <svg bind:this={svg}></svg>
  <button on:click={toggleMusic}>
    {musicPlaying ? '停止音乐' : '播放音乐'}
  </button>
</div>