<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import WaveSurfer from 'wavesurfer.js';

    const instrumentFiles = {
        bass: './audio/bass.mp3',
        hihat: './audio/hihat.mp3',
        kick: './audio/kick.mp3',
        snare: './audio/snare.mp3'
    };

    let isPlaying = false;
    let progress = 0;
    
    // WaveSurfer实例
    let instruments: {
        [key: string]: {
            wavesurfer: WaveSurfer | null;
            enabled: boolean;
        };
    } = {
        bass: { wavesurfer: null, enabled: true },
        hihat: { wavesurfer: null, enabled: true },
        kick: { wavesurfer: null, enabled: true },
        snare: { wavesurfer: null, enabled: true }
    };

    function initInstruments() {
        for (const [name, file] of Object.entries(instrumentFiles)) {
            instruments[name].wavesurfer = WaveSurfer.create({
                container: `#waveform-${name}`,
                waveColor: '#4a9eff',
                progressColor: '#1e6bc7',
                height: 50,
                cursorWidth: 1,
                cursorColor: '#333',
                normalize: true,
            } as any); // 使用类型断言避免TypeScript错误
            
            instruments[name].wavesurfer.load(file);
            
            // 添加事件监听器，当track播放结束时立即重新播放以实现循环效果
            instruments[name].wavesurfer.on('finish', () => {
                if (isPlaying && instruments[name].enabled) {
                    instruments[name].wavesurfer?.play();
                }
            });
            
            // 添加ready事件监听器，当所有音频加载完成后自动播放
            instruments[name].wavesurfer.on('ready', () => {
                // 检查是否所有track都加载完成
                let allReady = true;
                for (const key of Object.keys(instruments)) {
                    if (!instruments[key].wavesurfer?.isReady) {
                        allReady = false;
                        break;
                    }
                }
                
                // 如果所有track都准备好了，自动开始播放
                if (allReady && !isPlaying) {
                    isPlaying = true;
                    for (const key of Object.keys(instruments)) {
                        if (instruments[key].enabled) {
                            instruments[key].wavesurfer?.play();
                        }
                    }
                } else if (isPlaying && instruments[name].enabled) {
                    instruments[name].wavesurfer?.play();
                }
            });

            // 添加audioprocess事件监听器，更新播放进度
            instruments[name].wavesurfer.on('audioprocess', updateProgress);
            instruments[name].wavesurfer.on('seek', updateProgress);
        }
    }

    function toggleInstrument(name: string) {
        instruments[name].enabled = !instruments[name].enabled;
        if (instruments[name].wavesurfer) {
            if (!instruments[name].enabled) {
                instruments[name].wavesurfer.setVolume(0);
            } else {
                instruments[name].wavesurfer.setVolume(1);
            }
        }
    }

    function play() {
        isPlaying = !isPlaying;
        for (const name of Object.keys(instruments)) {
            if (instruments[name].wavesurfer && instruments[name].enabled) {
                if (isPlaying) {
                    instruments[name].wavesurfer.play();
                } else {
                    instruments[name].wavesurfer.pause();
                    instruments[name].wavesurfer.seekTo(0);
                }
            }
        }
    }

    function updateProgress() {
        const totalDuration = Math.max(...Object.values(instruments).map(inst => inst.wavesurfer?.getDuration() || 0));
        const currentTime = Math.max(...Object.values(instruments).map(inst => inst.wavesurfer?.getCurrentTime() || 0));
        progress = (currentTime / totalDuration) * 100;
    }

    onMount(() => {
        initInstruments();
    });

    onDestroy(() => {
        for (const name of Object.keys(instruments)) {
            if (instruments[name].wavesurfer) {
                instruments[name].wavesurfer.destroy();
            }
        }
    });
</script>

<div class="controls">
    <div class="buttons">
        <button on:click={play}>{isPlaying ? '暂停' : '播放'}</button>
        {#each Object.keys(instruments) as name}
            <button on:click={() => toggleInstrument(name)}>
                {instruments[name].enabled ? `禁用 ${name}` : `启用 ${name}`}
            </button>
            <div id="waveform-{name}"></div>
        {/each}
    </div>
    <div class="progress">
        <div class="progress-bar" style="width: {progress}%"></div>
    </div>
</div>

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