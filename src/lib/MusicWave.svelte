<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';

  let svg: SVGSVGElement;
  const width = 800;
  const height = 400;
  let animationId: number;

  let musicPlaying = false;
  let audioElement: HTMLAudioElement;
  let analyser: AnalyserNode, dataArray: Uint8Array, bufferLength: number;
  let startTime: number | null = null;
  let audioContext: AudioContext;
  const amplitudeFactor = 10;

  function createSineData(offset: number, amplitude: number) {
    const data = [];
    for (let x = 0; x <= width; x += 5) {
      const y = height / 2 + amplitude * Math.sin(x * 0.02 + offset);
      data.push([x, y]);
    }
    return data;
  }

  function updateSine() {
    if (!musicPlaying) return;
    analyser.getByteFrequencyData(dataArray);
    const avg = d3.mean(dataArray);
    const amplitude = avg * (100 / 255) * amplitudeFactor;
    const currentTime = (Date.now() - (startTime ?? 0)) / 1000;
    const data = createSineData(currentTime, amplitude);
    const lineGenerator = d3.line().curve(d3.curveBasis);
    const pathData = lineGenerator(data);
    d3.select(svg).select('path').attr('d', pathData);
    animationId = requestAnimationFrame(updateSine);
  }

  function toggleMusic() {
    if (!musicPlaying) {
      startTime = Date.now();
      
      // 创建新的AudioContext
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audioElement);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        // 连接音频节点
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      }

      audioElement.play();
      musicPlaying = true;
      updateSine();
    } else {
      audioElement.pause();
      audioElement.currentTime = 0;
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

    // 创建音频元素
    audioElement = new Audio('/audio/bass.mp3');
    audioElement.loop = true;
  });

  onDestroy(() => {
    if (musicPlaying) {
      audioElement.pause();
      audioElement.src = '';
      cancelAnimationFrame(animationId);
    }
    if (audioContext) {
      audioContext.close();
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
  }
  button {
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
  }
</style>

<div class="container">
  <h1>MusicWave 音乐可视化</h1>
  <svg bind:this={svg}></svg>
  <button on:click={toggleMusic}>
    {musicPlaying ? '停止音乐' : '播放音乐'}
  </button>
</div>