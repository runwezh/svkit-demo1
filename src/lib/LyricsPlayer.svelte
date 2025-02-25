<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as Tone from 'tone';
    
    export let audioSrc = './audio/leaving_the_club_edited.mp3';
    export let subtitleContent = '[00:00.00]As I\'m leaving the club, I\'m here in the vibration of the kick drum.[00:04.00]It was the most life - changing moment I ever had...[00:07.20]Like, did I hear that?[00:08.64]It sounded like the kick drum was played by a drunk three - year - old.[00:13.00]And I was like, are you allowed to do that?';
    export let subtitleFormat = 'lrc';

    let audioPlayer: Tone.Player;
    let currentTime = 0;
    let audioPlaying = false;
    let subtitles: { start: number, end: number, text: string }[] = [];
    let animationId: number;
    let waveformCanvas: HTMLCanvasElement;
    let startTime = 0;
    
    // 初始化Tone.js
    async function initTone() {
        await Tone.start();
        console.log("音频已初始化，可以播放");
        
        // 创建Player
        audioPlayer = new Tone.Player({
            url: audioSrc,
            loop: false,
            onload: () => {
                if (audioPlayer && audioPlayer.loaded) {
                    // 设置最后一个字幕的结束时间
                    if (subtitles.length > 0) {
                        subtitles[subtitles.length - 1].end = audioPlayer.buffer.duration;
                    }
                }
            },
            onstop: () => {
                // 清除高亮并重新开始
                currentTime = 0;
                audioPlaying = false;
                cancelAnimationFrame(animationId);
                drawWaveform(currentTime);
            },
            onended: () => {
                // 清除高亮并重新开始
                currentTime = 0;
                audioPlaying = false;
                cancelAnimationFrame(animationId);
                drawWaveform(currentTime);
            }
        }).toDestination();
    }

    // --- Subtitle Parsing Functions ---

    function splitByTimestamps(content: string) {
        const regex = /\[(\d{2}):(\d{2}\.\d{2})\]/g;
        let result;
        const segments = [];
        let lastIndex = 0;
        let lastStart = 0;

        while ((result = regex.exec(content)) !== null) {
            const minutes = parseInt(result[1]);
            const seconds = parseFloat(result[2]);
            const start = minutes * 60 + seconds;

            if (lastIndex < result.index) {
                const text = content.substring(lastIndex, result.index);
                if (text) {
                    segments.push({ start: lastStart, end: start, text });
                }
            }

            lastIndex = regex.lastIndex;
            lastStart = start;
        }

        // Add the last segment if any
        if (lastIndex < content.length) {
            const text = content.substring(lastIndex).trim();
            if (text) {
                segments.push({ start: lastStart, end: Infinity, text });
            }
        }

        return segments;
    }

    // Parse the subtitle content based on the provided format.
    function parseSubtitles(content: string, format: string) {
        if (!content) return [];
        if (format === 'lrc') {
            return parseLrc(content);
        } else if (format === 'srt') {
            return parseSrt(content);
        } else if (format === 'vtt') {
            return parseVtt(content);
        } else if (format === 'smi') {
            return parseSmi(content);
        } else if (format === 'plain') {
            return parsePlain(content);
        }
        return [];
    }

    // Parse lrc format subtitles.
    function parseLrc(content: string) {
        const lines: { start: number, end: number, text: string }[] = [];
        splitByTimestamps(content).forEach(({ start, text }) => {
            lines.push({ start, end: Infinity, text });
            // 打印line当前行内容
            console.log('line:', { start, end: Infinity, text });

        });

        // Sort by start time
        lines.sort((a, b) => a.start - b.start);
        // Define end times: next line's start, or Infinity (will be adjusted later)
        for (let i = 0; i < lines.length; i++) {
            lines[i].end = i < lines.length - 1 ? lines[i + 1].start : Infinity;
        }
        return lines;
    }

    // Parse SRT format subtitles.
    function parseSrt(content: string) {
        const lines: { start: number, end: number, text: string }[] = [];
        // SRT blocks are separated by blank lines.
        const blocks = content.split(/\r?\n\r?\n/);
        for (const block of blocks) {
            const blockLines = block.split(/\r?\n/);
            if (blockLines.length >= 2) {
                // The second line should contain time info.
                const timeLine = blockLines[1];
                const match = timeLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
                if (match) {
                    const start = parseSrtTime(match[1]);
                    const end = parseSrtTime(match[2]);
                    const text = blockLines.slice(2).join(' ').trim();
                    lines.push({ start, end, text });
                }
            }
        }
        return lines;
    }

    // Parse VTT format subtitles.
    function parseVtt(content: string) {
        const lines = [];
        // Remove possible WEBVTT header.
        content = content.replace(/WEBVTT[\s\S]*?\n\n/, '');
        // Split into blocks by double newlines.
        const blocks = content.split(/\r?\n\r?\n/);
        for (const block of blocks) {
            const blockLines = block.split(/\r?\n/).filter(l => l.trim() !== '');
            if (blockLines.length >= 2) {
                // The block may start with a time-code or an index line.
                let timeLine = '';
                if (blockLines[0].includes('-->')) {
                    timeLine = blockLines[0];
                } else if (blockLines[1].includes('-->')) {
                    timeLine = blockLines[1];
                }
                const match = timeLine.match(/(\d{2}:\d{2}(?::\d{2})?[.,]\d{3})\s*-->\s*(\d{2}:\d{2}(?::\d{2})?[.,]\d{3})/);
                if (match) {
                    const start = parseVttTime(match[1]);
                    const end = parseVttTime(match[2]);
                    // All lines excluding the time line (and possible index) are the text.
                    const text = blockLines.filter(l => !l.includes('-->')).join(' ').trim();
                    lines.push({ start, end, text });
                }
            }
        }
        return lines;
    }

    // Parse SMI format subtitles.
    function parseSmi(content: string) {
        const lines = [];
        const regex = /<SYNC Start=(\d+)>.*?<P Class=ENCC>(.*?)<\/P>/gi;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const start = parseInt(match[1]) / 1000; // Convert milliseconds to seconds
            const text = match[2].replace(/<br>/gi, ' ').trim();
            if (text !== '') {
                lines.push({ start, end: Infinity, text });
            }
        }
        // Sort by start time
        lines.sort((a, b) => a.start - b.start);
        // Define end times: next line's start, or Infinity (will be adjusted later)
        for (let i = 0; i < lines.length; i++) {
            lines[i].end = i < lines.length - 1 ? lines[i + 1].start : Infinity;
        }
        return lines;
    }

    // Parse plain format subtitles.
    function parsePlain(content: string) {
        const chars = content.split('');
        const durationPerChar = 0.1; // 每个字符显示0.1秒
        const lines = chars.map((char, index) => ({
            start: index * durationPerChar,
            end: (index + 1) * durationPerChar,
            text: char
        }));
        return lines;
    }

    // Helper: Parse SRT time strings ("00:00:20,000" or "00:00:20.000")
    function parseSrtTime(timeStr: string) {
        timeStr = timeStr.replace(',', '.');
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Helper: Parse VTT time strings ("00:00.000" or "00:00:00.000")
    function parseVttTime(timeStr: string) {
        timeStr = timeStr.replace(',', '.');
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0]);
            const seconds = parseFloat(parts[1]);
            return minutes * 60 + seconds;
        } else if (parts.length === 3) {
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            const seconds = parseFloat(parts[2]);
            return hours * 3600 + minutes * 60 + seconds;
        }
        return 0;
    }

    // 更新歌词高亮
    function updateHighlight() {
        if (!audioPlaying || !audioPlayer) return;
        
        // 获取当前播放时间
        currentTime = audioPlayer.immediate();
        
        // 绘制波形
        drawWaveform(currentTime);
        
        animationId = requestAnimationFrame(updateHighlight);
    }
    
    // 绘制波形
    function drawWaveform(currentTime: number) {
        if (!audioPlayer || !audioPlayer.loaded) return;
        
        const ctx = waveformCanvas.getContext('2d');
        if (!ctx) return;
        
        const width = waveformCanvas.width;
        const height = waveformCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        const duration = audioPlayer.buffer.duration;
        const progress = (currentTime / duration) * width;
        
        // 绘制基于字幕的波形
        ctx.beginPath();
        ctx.moveTo(0, height/2);
        
        const timeOffset = Tone.Transport.seconds;
        
        // 绘制波形
        for (let x = 0; x < width; x++) {
            const xRatio = x / width * duration;
            let y = height / 2;
            
            // 字幕位置附近创造波动
            for (const line of subtitles) {
                const startPos = (line.start / duration) * width;
                const endPos = (line.end / duration) * width;
                
                if (x >= startPos && x <= endPos) {
                    const lineProgress = (x - startPos) / (endPos - startPos);
                    y += Math.sin(lineProgress * Math.PI * 2 + timeOffset * 3) * 10;
                } else if (Math.abs(x - startPos) < 20) {
                    const impact = (20 - Math.abs(x - startPos)) / 20;
                    y += Math.sin(impact * Math.PI + timeOffset) * 15 * impact;
                }
            }
            
            y += Math.sin(x * 0.1 + timeOffset) * 3;
            ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制进度条
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

    // 播放/停止音频
    async function togglePlayback() {
        if (!audioPlayer) {
            await initTone();
        }
        
        if (!audioPlaying) {
            startTime = Tone.now();
            audioPlayer.start();
            audioPlaying = true;
            updateHighlight();
        } else {
            audioPlayer.stop();
            audioPlaying = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }
    }

    onMount(async () => {
        subtitles = parseSubtitles(subtitleContent, subtitleFormat);
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

<div class="lyrics-container">
    <canvas bind:this={waveformCanvas} class="waveform" width="800" height="50"></canvas>
    {#each subtitles as line (line.start)}
        <div class="line {currentTime >= line.start && currentTime < line.end ? 'active' : ''}">
            {#each line.text.split('') as char, i}
                <span
                    class={currentTime >= line.start + (i / line.text.length) * (line.end - line.start) ? 'highlight' : ''}
                >
                    {char}
                </span>
            {/each}
        </div>
    {/each}
</div>

<div class="controls">
    <button on:click={togglePlayback}>
        {audioPlaying ? '停止音频' : '播放音频'}
    </button>
</div>

<style>
    .lyrics-container {
        max-width: 800px;
        margin: 20px auto;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: sans-serif;
        line-height: 1.6;
        white-space: pre-wrap; /* 允许文本换行 */
    }
    .line {
        display: inline-block; /* 使每个字符在同一行显示 */
    }
    .active {
        background-color: rgb(219, 239, 194); /* 当前文字段背景色为蓝色 */
    }
    .highlight {
        color: red; /* 已播放的文字段字体颜色为红色 */
    }
    .waveform {
        width: 100%;
        height: 50px;
        border: 1px solid #ddd;
        margin-bottom: 10px;
    }
    .controls {
        text-align: center;
        margin-top: 20px;
    }
    button {
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
    }
</style>
