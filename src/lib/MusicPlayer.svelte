<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
  
    const instrumentFiles = {
      bass: '/audio/bass.mp3',
      hihat: '/audio/hihat.mp3',
      kick: '/audio/kick.mp3',
      snare: '/audio/snare.mp3'
    };
  
    let isPlaying = false;
    let startTime = 0;
    let currentTime = 0;
    let progress = 0;
    let animationFrameId: number;
    let rafId: number;
  
    // 使用 Audio 元素替代 Howler
    let instruments: {
      bass: { audio: HTMLAudioElement | null, enabled: boolean },
      hihat: { audio: HTMLAudioElement | null, enabled: boolean },
      kick: { audio: HTMLAudioElement | null, enabled: boolean },
      snare: { audio: HTMLAudioElement | null, enabled: boolean }
    } = {
      bass: { audio: null, enabled: true },
      hihat: { audio: null, enabled: true },
      kick: { audio: null, enabled: true },
      snare: { audio: null, enabled: true }
    };
  
    function initInstruments() {
      for (const instrument of Object.keys(instrumentFiles) as (keyof typeof instrumentFiles)[]) {
        const audio = new Audio(instrumentFiles[instrument]);
        audio.loop = true;
        instruments[instrument].audio = audio;
      }
    }
  
    function toggleInstrument(instrument: keyof typeof instruments) {
      instruments[instrument].enabled = !instruments[instrument].enabled;
      if (instruments[instrument].audio) {
        instruments[instrument].audio.volume = instruments[instrument].enabled ? 1 : 0;
      }
    }
  
    function play() {
      if (!isPlaying) {
        // 播放所有启用的音轨
        for (const key of Object.keys(instruments) as (keyof typeof instruments)[]) {
          if (instruments[key].audio && instruments[key].enabled) {
            instruments[key].audio.play();
          }
        }
        isPlaying = true;
        startTime = Date.now();
        updateProgress();
      } else {
        // 停止所有音轨
        for (const key of Object.keys(instruments) as (keyof typeof instruments)[]) {
          if (instruments[key].audio) {
            instruments[key].audio.pause();
            instruments[key].audio.currentTime = 0;
          }
        }
        isPlaying = false;
        cancelAnimationFrame(animationFrameId);
        progress = 0;
      }
    }
  
    function updateProgress() {
      if (isPlaying) {
        currentTime = (Date.now() - startTime) / 1000;
        const loopDuration = 10;
        progress = ((currentTime % loopDuration) / loopDuration) * 100;
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    }
  
    onMount(() => {
      initInstruments();
      function animate() {
        rafId = requestAnimationFrame(animate);
      }
      animate();
    });
  
    onDestroy(() => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(animationFrameId);
        cancelAnimationFrame(rafId);
      }
      // 清理音频资源
      for (const key of Object.keys(instruments) as Array<keyof typeof instruments>) {
        if (instruments[key].audio) {
          instruments[key].audio.pause();
          instruments[key].audio.src = '';
          instruments[key].audio = null;
        }
      }
    });
</script>

<style>
    .controls {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .progress {
      width: 80%;
      height: 20px;
      background-color: #ccc;
      border-radius: 10px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background-color: #4caf50;
      transition: width 0.1s linear;
    }
</style>
  
<div class="controls">
    <div class="buttons">
      <button on:click="{play}">{isPlaying ? '暂停' : '播放'}</button>
      <button on:click="{() => toggleInstrument('bass')}">
        {instruments.bass.enabled ? '禁用 Bass' : '启用 Bass'}
      </button>
      <button on:click="{() => toggleInstrument('hihat')}">
        {instruments.hihat.enabled ? '禁用 Hi-hat' : '启用 Hi-hat'}
      </button>
      <button on:click="{() => toggleInstrument('kick')}">
        {instruments.kick.enabled ? '禁用 Kick' : '启用 Kick'}
      </button>
      <button on:click="{() => toggleInstrument('snare')}">
        {instruments.snare.enabled ? '禁用 Snare' : '启用 Snare'}
      </button>
    </div>
    <div class="progress">
      <div class="progress-bar" style="width: {progress}%;"></div>
    </div>
</div>