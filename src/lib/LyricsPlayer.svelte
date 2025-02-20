<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Howl } from 'howler';

  // Props: audio source URL, subtitle content, and format ("lrc", "srt", or "vtt")
  export let audioSrc = '/audio/videoplayback.wav';
  export let subtitleContent = '[00:00.00]After a marathon day of inaugural festivities celebrating his return to the \n[00:04.44]Oval Office, President Trump sits behind the Resolute Desk, signing dozens of \n[00:08.64]executive actions, starting with perhaps the most controversial one. \n[00:12.52]So this is about January 6th. These are the defendants. Approximately 1,500. Full pardon. \n[00:20.84]What they\'ve done to these people is outrageous. \n[00:24.48]Pardoning nearly all January 6th defendants, effectively ending the \n[00:28.48]largest investigation in federal law - enforcement history. On January 6th, more \n[00:33.12]than 140 officers were injured and Capitol property was destroyed. The \n[00:38.20]president had teased his plans, specifically for some of the defendants, \n[00:41.88]including earlier, after greeting relatives of Israelis \n[00:45.76]and Americans taken hostage by Hamas, he said, \"I\'m going to be signing on the J 6 \n[00:52.36]defendants.\" But it had not been clear that the action would include those \n[00:58.52]convicted of violent offenses, including assaulting police, which some \n[01:03.12]Republicans had argued against. \"If you committed violence on that day, \n[01:07.76]obviously you shouldn\'t be pardoned.\" Trump also commuted the sentences of \n[01:11.44]individuals associated with far - right groups, the Oath Keepers and Proud Boys, \n[01:16.64]including its leader, Stewart Rhodes, who had been serving 22 years in \n[01:20.92]federal prison for seditious conspiracy. \n[01:26.00]Supporters of those pardoned celebrated overnight. \n[01:30.56]President Trump also responded to the day\'s other pardon announcements in the \n[01:34.76]last hours of his presidency. Joe Biden preemptively pardoned the members of \n[01:39.24]the committee that investigated January 6th, including former Congresswoman \n[01:43.44]Liz Cheney, along with Dr. Anthony Fauci and General Mark Milley. None has been \n[01:49.04]convicted of any crime. Biden also later pardoned members of his own family. \n[01:54.32]\"I was a little bit surprised that he did it because it makes him look guilty.\" \n[01:58.48]Trump also signed a barrage of executive orders, including declaring a \n[02:02.48]national emergency at the U.S. - Mexico border and attempting to end birthright \n[02:07.04]citizenship in some circumstances, a right that\'s guaranteed by the \n[02:11.52]Constitution. \n[02:14.04]The inauguration day had started with a show of unity between Trump and Biden. \n[02:19.32]Before Trump took his oath inside the Capitol due to frigid temperatures. \n[02:23.64]\"I don\'t know, John. Trump was all fired up.\" \n[02:26.60]In his inaugural address, Trump delivered this searing critique of his predecessor \n[02:30.96]without ever mentioning him by name. \n[02:32.96]\"My recent election is a mandate to completely and totally reverse a horrible \n[02:38.92]betrayal. From this moment on.\" \n[02:42.32]\"America\'s decline is over.\" \n[02:45.88]The traditional parade also moved inside, with the president celebrating in front of a \n[02:53.24]massive crowd of MAGA faithful in downtown D.C. \n[02:56.96]\"You\'re witnessing the dawn of the golden age of America.\" '; // the raw subtitle text
  export let subtitleFormat = 'lrc'; // default format

  let subtitles = /** @type {{ start: number, end: number, text: string }[]} */ ([]);
  let currentTime = 0;
  let audioPlaying = false;
  let animationId: number;
  /** @type {Howl} */
  let audioPlayer;

  // --- Subtitle Parsing Functions ---

  // Parse lrc format subtitles.
  function parseLrc(content) {
    const lines = [];
    const regex = /\[(\d+):(\d+\.\d+)\](.*)/;
    const contentLines = content.split(/\r?\n/);
    for (const line of contentLines) {
      const match = line.match(regex);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        const start = minutes * 60 + seconds;
        const text = match[3].trim();
        if (text !== '') {
          lines.push({ start, text });
        }
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

  // Parse SRT format subtitles.
  function parseSrt(content) {
    const lines = [];
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
  function parseVtt(content) {
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

  // Helper: Parse SRT time strings ("00:00:20,000" or "00:00:20.000")
  function parseSrtTime(timeStr) {
    timeStr = timeStr.replace(',', '.');
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  // Helper: Parse VTT time strings ("00:00.000" or "00:00:00.000")
  function parseVttTime(timeStr) {
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

  // Parse the subtitle content based on the provided format.
  function parseSubtitles(content, format) {
    if (!content) return [];
    if (format === 'lrc') {
      return parseLrc(content);
    } else if (format === 'srt') {
      return parseSrt(content);
    } else if (format === 'vtt') {
      return parseVtt(content);
    }
    return [];
  }

  // Update current subtitle highlighting based on playback time.
  function updateHighlight() {
    if (!audioPlaying) return;
    currentTime = audioPlayer.seek() || 0;

    // Loop playback: if audio resets, currentTime resets automatically.
    animationId = requestAnimationFrame(updateHighlight);
  }

  // Toggle audio playback.
  function togglePlayback() {
    if (!audioPlaying) {
      audioPlayer.play();
      audioPlaying = true;
      updateHighlight();
    } else {
      audioPlayer.stop();
      audioPlaying = false;
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(animationId);
      }
    }
  }

  // Lifecycle: Setup audio and parse subtitles on component mount.
  onMount(() => {
    subtitles = parseSubtitles(subtitleContent, subtitleFormat);

    // Create Howler instance with looping enabled.
    audioPlayer = new Howl({
      src: [audioSrc],
      loop: true
    });

    startAnimation();
  });

  onDestroy(() => {
    if (audioPlayer) {
      audioPlayer.stop();
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

<style>
  .lyrics-container {
    max-width: 800px;
    margin: 20px auto;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: sans-serif;
    line-height: 1.6;
  }
  .line {
    padding: 5px 0;
  }
  .active {
    color: #d32f2f;
    font-weight: bold;
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
  .highlight {
    background-color: yellow;
  }
</style>

<div class="lyrics-container">
  {#each subtitles as line (line.start)}
    <div class="line {currentTime >= line.start && currentTime < line.end ? 'active' : ''}">
      {#each line.text.split('') as char, i}
        <span class="{currentTime >= line.start + (i / line.text.length) * (line.end - line.start) ? 'highlight' : ''}">
          {char}
        </span>
      {/each}
    </div>
  {/each}
</div>

<div class="controls">
  <button on:click="{togglePlayback}">
    {audioPlaying ? '停止音频' : '播放音频'}
  </button>
</div>
