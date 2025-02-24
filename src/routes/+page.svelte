<script>
    import LyricsPlayer from '$lib/LyricsPlayer.svelte';
    import MusicPlayer from '$lib/MusicPlayer.svelte';
    import MusicWave from '$lib/MusicWave.svelte';
    import RhythmPlayer from '$lib/RhythmPlayer.svelte';
</script>

<div class="container">
    <h1>Welcome to SvelteKit</h1>
    <p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
    <p>This is about page <a href="/about">about page </a> to about</p>
    <hr>
    <h1 class="title">音乐播放器</h1>
    <MusicPlayer />
    <hr>
    <MusicWave />
    <hr>
    <RhythmPlayer />
    <hr>
    <LyricsPlayer />
</div>

<style>
    :global(body) {
        background-color: hsl(90, 24%, 92%); /* 修改背景颜色 */
        color: #7b1313;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
    }

    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
    }

    .title {
        text-align: center;
    }
</style>