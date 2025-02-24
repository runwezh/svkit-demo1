<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    
    export let audioSrc = '/audio/leaving_the_club_edited.mp3';
    export let subtitleContent ='[00:00.00]As I\'m leaving the club, I\'m here in the vibration of the kick drum.[00:04.00]It was the most life - changing moment I ever had...[00:07.20]Like, did I hear that?[00:08.64]It sounded like the kick drum was played by a drunk three - year - old.[00:13.00]And I was like, are you allowed to do that?'; // the raw subtitle text
    export let subtitleFormat = 'lrc'; // default format

    let subtitles: { start: number, end: number, text: string }[] = [];
    let currentTime = 0;
    let audioPlaying = false;
    let animationId: number;
    let audioPlayer: HTMLAudioElement;

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
        });

        // Sort by start time
        lines.sort((a, b) => a.start - b.start);
        // Define end times: next line's start, or Infinity (will be adjusted later)
        for (let i = 0; i < lines.length; i++) {
            lines[i].end = i < lines.length - 1 ? lines[i + 1].start : Infinity;
            // 打印出来看看
            console.log(lines[i].start, lines[i].end, lines[i].text);
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

    // Update current subtitle highlighting based on playback time.
    function updateHighlight() {
        if (!audioPlaying) return;
        currentTime = audioPlayer.currentTime || 0;
        animationId = requestAnimationFrame(updateHighlight);
    }

    // Toggle audio playback.
    function togglePlayback() {
        if (!audioPlaying) {
            audioPlayer.play();
            audioPlaying = true;
            if (subtitles[subtitles.length - 1].end === Infinity) {
                subtitles[subtitles.length - 1].end = audioPlayer.duration || Infinity;
            }
            updateHighlight();
        } else {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            audioPlaying = false;
            if (typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(animationId);
            }
        }
    }

    // Lifecycle: Setup audio and parse subtitles on component mount.
    onMount(() => {
        subtitles = parseSubtitles(subtitleContent, subtitleFormat);

        // 创建Audio实例并设置循环播放
        audioPlayer = new Audio(audioSrc);
        audioPlayer.loop = true;

        startAnimation();
    });

    onDestroy(() => {
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.src = '';
        }
        if (typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(animationId);
        }
    });

    let animationFrameId: number;

    function startAnimation() {
        // 动画逻辑
        animationFrameId = requestAnimationFrame(startAnimation);
    }
</script>

<div class="lyrics-container">
    {#each subtitles as line (line.start)}
        <div class="line { (currentTime>0) && currentTime >= line.start && currentTime < line.end ? 'active' : ''}">
            {#each line.text.split('') as char, i}
                <span
                    class={currentTime > 0 && (currentTime >= line.start + (i / line.text.length) * (line.end - line.start))
                        ? 'highlight'
                        : ''}
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
