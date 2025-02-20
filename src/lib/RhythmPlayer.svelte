<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Howl } from 'howler';
	import * as d3 from 'd3';

	let svg: SVGElement; // Reference to the SVG element
	const width = 800;
	const height = 200; // Canvas height for the visualization
	let animationId: number;

	let musicPlaying = false;
	let musicHowl: Howl;
	let previousTime = 0;
	let duration = 10; // Default duration (will update when audio loads)

	// Pre-defined drum beat timestamps in seconds.
	// These values should be adjusted to match the drum beats in the music.
	const drumBeats = [1, 2.5, 4, 5.5, 7, 8.5];

	// Create a linear scale to map time (seconds) to x-axis positions on the SVG.
	let xScale = d3
		.scaleLinear()
		.domain([0, duration])
		.range([50, width - 50]);

	// Set up the SVG: draw a horizontal axis and place circles that represent drum beats.
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

	// The update loop checks the current playback time,
	// and if a new drum beat has been reached, it triggers an animation on the corresponding circle.
	function update() {
		if (!musicPlaying) return;
		const currentTime = typeof musicHowl.seek() === 'number' ? musicHowl.seek() : 0; // Get current playback time in seconds.

		// Check each beat: if we just passed the beat, trigger an animation.
		drumBeats.forEach((beat, index) => {
			if (previousTime < beat && typeof currentTime === 'number' && currentTime >= beat) {
				// Animate the circle: scale up then scale back to original size.
				d3.select(`#beat-${index}`)
					.transition()
					.duration(150)
					.attr('r', 15)
					.transition()
					.duration(150)
					.attr('r', 8);
			}
		});

		// If the playback loops back to the start, reset the previousTime.
		if (typeof currentTime === 'number' && currentTime < previousTime) {
			previousTime = 0;
		} else {
			previousTime = typeof currentTime === 'number' ? currentTime : 0;
		}
		animationId = requestAnimationFrame(update);
	}

	// Toggle music playback.
	function toggleMusic() {
		if (!musicPlaying) {
			// Start playing the music.
			console.log(`Music started at ${musicHowl.seek()} seconds`);

			musicHowl.on('play', () => {
				console.log(`Music starting at ${musicHowl.seek()} seconds`);
			});
			musicHowl.play();

			musicHowl.on('end', () => {
				console.log('Music ended, restarting...');
				musicHowl.play();
			});

			musicPlaying = true;
			previousTime = 0;
			update();
		} else {
			// Stop the music.
			musicHowl.stop();
			musicPlaying = false;
			cancelAnimationFrame(animationId);
		}
	}

	onMount(() => {
		setupSvg();

		// Initialize Howler.js for music playback.
		musicHowl = new Howl({
			src: ['/audio/intro/normal.mp3'], // Ensure the audio file is placed in static/audio/drum.mp3
			loop: true,
			onload: function () {
				// Update the duration based on the loaded audio.
				duration = musicHowl.duration();
				// Update the xScale with the correct duration.
				xScale.domain([0, duration]);
				// Reposition beat circles based on the updated scale.
				drumBeats.forEach((beat, index) => {
					d3.select(`#beat-${index}`).attr('cx', xScale(beat));
					console.log(`Beat ${index} positioned at ${xScale(beat)}`);
				});
			},
			onplay: function () {
				console.log('Music started11111111111');
				// Start the update loop when playback begins.
				updatePlayback();
			}
		});
	});
	// The update function continuously checks the current playback time.
	function updatePlayback() {
		if (!musicPlaying) return;
		let mCurrentTime = musicHowl.seek() || 0;
		console.log(`Current playback time: ${mCurrentTime} seconds`);
		animationId = requestAnimationFrame(updatePlayback);
	}

	onDestroy(() => {
		if (musicPlaying) {
			musicHowl.stop();
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
