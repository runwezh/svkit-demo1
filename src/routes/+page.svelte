<script>
	import LyricsPlayer from '$lib/LyricsPlayer.svelte';
import MusicPlayer from '$lib/MusicPlayer.svelte';
	import MusicWave from '$lib/MusicWave.svelte';
	import RhythmPlayer from '$lib/RhythmPlayer.svelte';
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<p>This is about page <a href="/about">about page </a> to about</p>
<hr>
<h3>音乐播放器</h3>
<MusicPlayer />
<hr>
<MusicWave />
<hr>
<RhythmPlayer />
<hr>
<LyricsPlayer />