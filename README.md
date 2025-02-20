# svkit-demo1

## 项目简介 (Project Introduction)

这是一个使用 SvelteKit 构建的示例项目，包含了音乐播放器、歌词播放器、音乐波形可视化和节奏播放器等功能。

This is a demo project built with SvelteKit, featuring a music player, lyrics player, music waveform visualization, and rhythm player.

## 功能 (Features)

- 音乐播放器 (Music Player)
- 歌词播放器 (Lyrics Player)
- 音乐波形可视化 (Music Waveform Visualization)
- 节奏播放器 (Rhythm Player)

## 安装 (Installation)

1. 克隆仓库 (Clone the repository):

   ```bash
   git clone https://github.com/runwezh/svkit-demo1.git
   cd svkit-demo1
   ```

2. 安装依赖 (Install dependencies):

   ```bash
   npm install
   ```

## 使用 (Usage)

1. 启动开发服务器 (Start the development server):

   ```bash
   npm run dev
   ```

2. 打开浏览器并访问 (Open your browser and visit):

   ```
   http://localhost:5137
   ```

## 构建 (Build)

1. 构建项目 (Build the project):

   ```bash
   npm run build
   ```

2. 预览构建结果 (Preview the build):

   ```bash
   npm run preview
   ```

## 目录结构 (Directory Structure)
  svkit-demo1/
  ├── src/
  │ ├── lib/
  │ │ ├── LyricsPlayer.svelte
  │ │ ├── MusicPlayer.svelte
  │ │ ├── MusicWave.svelte
  │ │ └── RhythmPlayer.svelte
  │ ├── routes/
  │ │ └── +page.svelte
  │ ├── app.d.ts
  │ └── app.html
  ├── static/
  │ └── audio/
  │ └── sample.wav
  ├── .gitignore
  ├── package.json
  ├── svelte.config.js
  ├── tsconfig.json
  └── README.md

## 贡献 (Contributing)

欢迎提交问题 (issues) 和拉取请求 (pull requests) 来改进此项目。

We welcome issues and pull requests to improve this project.

## 许可证 (License)

此项目使用 MIT 许可证。

This project is licensed under the MIT License.
