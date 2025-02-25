<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import WaveSurfer from 'wavesurfer.js';
    import * as d3 from 'd3';

    let wavesurfer: WaveSurfer;
    let svg: SVGElement;
    const width = 800;
    const height = 200;
    let animationId: number;

    let musicPlaying = false;
    let previousTime = 0;
    let duration = 10;

    const drumBeats = [2.4,3.0,3.6,4.2,4.8,5.4,6.0,6.6,7.2,7.8,8.4,9.0,9.6,10.2,10.8,11.4,12.0,12.6,13.2,13.8,14.4,15.0,15.6,16.2];

    let xScale = d3
        .scaleLinear()
        .domain([0, duration])
        .range([50, width - 50]);

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
        if (!musicPlaying) return;
        const currentTime = wavesurfer.getCurrentTime();

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

        previousTime = currentTime;
        animationId = requestAnimationFrame(update);
    }

    function toggleMusic() {
        if (!musicPlaying) {
            wavesurfer.play();
            musicPlaying = true;
            update();
        } else {
            wavesurfer.pause();
            wavesurfer.seekTo(0);
            musicPlaying = false;
            cancelAnimationFrame(animationId);
        }
    }

    onMount(() => {
        setupSvg();

        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#4a9eff',
            progressColor: '#1e6bc7',
            height: 50,
            cursorWidth: 1,
            cursorColor: '#333',
            normalize: true,
            // loop: true, // 移除，通过事件处理循环播放
        } as any);
        
        wavesurfer.on('finish', () => {
            if (musicPlaying) {
                wavesurfer.play();
            }
        });

        wavesurfer.load('./audio/intro/normal.mp3');
        
        wavesurfer.on('ready', () => {
            duration = wavesurfer.getDuration();
            xScale.domain([0, duration]);
            drumBeats.forEach((beat, index) => {
                d3.select(`#beat-${index}`).attr('cx', xScale(beat));
            });
        });
    });

    onDestroy(() => {
        if (wavesurfer) {
            wavesurfer.destroy();
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });
</script>

<div class="container">
    <h1>RhythmPlayer 音乐鼓点可视化</h1>
    <div id="waveform"></div>
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
</style>
