<script context="module" lang="ts">
    import MusicPlayer from './lib/MusicPlayer.svelte';
    import { Meta, Story } from '@storybook/addon-svelte-csf';
  
    const meta = {
      title: '组件/MusicPlayer',
      component: MusicPlayer,
      parameters: {
        layout: 'fullscreen'
      },
      argTypes: {
        // 在这里定义组件的参数类型
      }
    };
  </script>
  
  <Meta />
  
  <Story name="默认">
    <MusicPlayer />
  </Story>