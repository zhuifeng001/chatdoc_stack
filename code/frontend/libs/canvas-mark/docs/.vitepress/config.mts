import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'Canvas Mark',
	description: '一款Canvas实现的图形工具库',
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'API', link: '/api/createMark' },
		],
		sidebar: [
			{
				text: '指南',
				items: [
					{ text: '简介', link: '/intro' },
					{ text: '开始使用', link: '/getting-started' },
				],
			},
			{
				text: 'API',
				items: [{ text: 'createMark', link: '/api/createMark.md' }],
			},
			{
				text: 'Methods',
				items: [{ text: '实例方法', link: '/methods/index.md' }],
			},
			{
				text: 'Types',
				items: [{ text: 'Typescript 类型', link: '/types/index.md' }],
			},
		],

		socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }],
	},
});
