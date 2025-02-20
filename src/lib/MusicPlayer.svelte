<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Howl } from 'howler';
  
    // 音频文件路径（请确保这些文件已经放在 public/audio 目录下）
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
  
    // 定义各个乐器的状态和 Howl 实例，默认均启用
    let instruments: {
      bass: { howl: Howl | null, enabled: boolean },
      hihat: { howl: Howl | null, enabled: boolean },
      kick: { howl: Howl | null, enabled: boolean },
      snare: { howl: Howl | null, enabled: boolean }
    } = {
      bass: { howl: null, enabled: true },
      hihat: { howl: null, enabled: true },
      kick: { howl: null, enabled: true },
      snare: { howl: null, enabled: true }
    };
  
    function initInstruments() {
      for (const instrument of Object.keys(instrumentFiles) as (keyof typeof instrumentFiles)[]) {
        instruments[instrument].howl = new Howl({
          src: [instrumentFiles[instrument]],
          loop: true,
          volume: instruments[instrument].enabled ? 1 : 0
        });
      }
    }
  
    function toggleInstrument(instrument: keyof typeof instruments) {
      instruments[instrument].enabled = !instruments[instrument].enabled;
      if (instruments[instrument].howl) {
        instruments[instrument].howl.volume(instruments[instrument].enabled ? 1 : 0);
      }
    }
  
    function play() {
      if (!isPlaying) {
        for (const key of Object.keys(instruments) as (keyof typeof instruments)[]) {
          if (instruments[key].howl) {
            (instruments[key].howl as any).play();
          }
        }
        isPlaying = true;
        startTime = Date.now();
        updateProgress();
      } else {
        for (const key of Object.keys(instruments) as (keyof typeof instruments)[]) {
          if (instruments[key].howl) {
            (instruments[key].howl as any).stop();
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
        // ...你的动画更新逻辑...
        rafId = requestAnimationFrame(animate);
      }
      animate();

      return () => {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafId);
        }
      };
    });
  
    onDestroy(() => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(animationFrameId);
      }
      for (const key of Object.keys(instruments) as Array<keyof typeof instruments>) {
        if (instruments[key].howl) {
          instruments[key].howl.unload();
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