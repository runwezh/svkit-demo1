<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as d3 from 'd3';

    let svg: SVGElement;
    const width = 800;
    const height = 200;
    let animationId: number;

    let musicPlaying = false;
    let audioElement: HTMLAudioElement;
    let previousTime = 0;
    let duration = 10;

    const drumBeats = [1, 2.5, 4, 5.5, 7, 8.5];

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
        const currentTime = audioElement.currentTime; // 使用原生currentTime属性

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

        if (currentTime < previousTime) {
            previousTime = 0;
        } else {
            previousTime = currentTime;
        }
        animationId = requestAnimationFrame(update);
    }

    function toggleMusic() {
        if (!musicPlaying) {
            audioElement.play();
            musicPlaying = true;
            previousTime = 0;
            update();
        } else {
            audioElement.pause();
            audioElement.currentTime = 0;
            musicPlaying = false;
            cancelAnimationFrame(animationId);
        }
    }

    onMount(() => {
        setupSvg();

        // 初始化音频元素
        audioElement = new Audio('/audio/intro/normal.mp3');
        audioElement.loop = true;

        // 音频加载完成后更新duration和位置
        audioElement.addEventListener('loadedmetadata', () => {
            duration = audioElement.duration;
            xScale.domain([0, duration]);
            drumBeats.forEach((beat, index) => {
                d3.select(`#beat-${index}`).attr('cx', xScale(beat));
            });
        });

        // 音频播放开始时开始更新
        audioElement.addEventListener('play', updatePlayback);
    });

    function updatePlayback() {
        if (!musicPlaying) return;
        console.log(`Current playback time: ${audioElement.currentTime} seconds`);
        animationId = requestAnimationFrame(updatePlayback);
    }

    onDestroy(() => {
        if (musicPlaying) {
            audioElement.pause();
            audioElement.src = '';
            cancelAnimationFrame(animationId);
        }
    });
</script>

<div class="container">
    <h1>RhythmPlayer 音乐鼓点可视化</h1>
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
