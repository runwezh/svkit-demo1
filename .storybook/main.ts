export default {
  stories: ['../src/**/*.stories.@(js|ts|svelte)'],
  addons: [
    '@storybook/addon-essentials',
    {
      name: '@storybook/addon-svelte-csf',
      options: {
        legacyTemplate: true // 添加此配置以支持传统模板
      }
    }
  ],
  framework: {
    name: '@storybook/sveltekit',
    options: {}
  },
  docs: {
    autodocs: true
  }
};