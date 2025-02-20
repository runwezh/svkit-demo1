<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Howl, Howler } from 'howler';
  import * as d3 from 'd3';

  let svg: SVGSVGElement; // reference to the SVG element
  const width = 800;
  const height = 400;
  let animationId: number;

  let musicPlaying = false;
  let musicHowl: Howl;
  let analyser: AnalyserNode, dataArray: Uint8Array, bufferLength: number;
  let startTime: number | null = null;
  let audioContext: AudioContext;
  const amplitudeFactor = 10; // 控制波形幅度的因子

  // Generates sine wave data modulated by the audio amplitude.
  function createSineData(offset: number, amplitude: number) {
    const data = [];
    for (let x = 0; x <= width; x += 5) {
      const y = height / 2 + amplitude * Math.sin(x * 0.02 + offset);
      data.push([x, y]);
    }
    return data;
  }

  // Continuously updates the sine curve based on audio frequency data.
  function updateSine() {
    if (!musicPlaying) return;
    analyser.getByteFrequencyData(dataArray);
    const avg = d3.mean(dataArray);
    // Map the average frequency (0–255) to an amplitude (0–100)
    const amplitude = avg * (100 / 255) * amplitudeFactor;
    const currentTime = (Date.now() - (startTime ?? 0)) / 1000;
    const data = createSineData(currentTime, amplitude);
    const lineGenerator = d3.line().curve(d3.curveBasis);
    const pathData = lineGenerator(data);
    d3.select(svg).select('path').attr('d', pathData);
    animationId = requestAnimationFrame(updateSine);
  }

  // Toggles music playback and starts or stops the visualization.
  function toggleMusic() {
    if (!musicPlaying) {
      startTime = Date.now();
      musicHowl.play();
      // Delay to allow the audio node to initialize.
      setTimeout(() => {
        const sound = (musicHowl as any)._sounds[0]._node;
        sound.disconnect();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        sound.connect(analyser);
        analyser.connect(audioContext.destination);
        musicPlaying = true;
        updateSine();
      }, 200);
    } else {
      musicHowl.stop();
      cancelAnimationFrame(animationId);
      musicPlaying = false;
      d3.select(svg).select('path').attr('d', null);
    }
  }

  onMount(() => {
    // Initialize SVG container with D3.
    const svgContainer = d3.select(svg)
      .attr('width', width)
      .attr('height', height);
    svgContainer.append('path')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 3)
      .attr('fill', 'none');

    // Create the Howl instance for the background music.
    musicHowl = new Howl({
      src: ['/audio/bass.mp3'], // Ensure the audio file is placed in static/audio/music.mp3
      loop: true
    });

    // Use Howler's AudioContext
    audioContext = Howler.ctx;
  });

  onDestroy(() => {
    if (musicPlaying) {
      musicHowl.stop();
      cancelAnimationFrame(animationId);
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