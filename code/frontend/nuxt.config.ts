import fs from 'fs'
import path from 'path'
import lessToJs from 'less-vars-to-js'
import { cssModuleAliasPlugin } from './vite/plugins/css-module-alias'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

const env = process.env
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // experimental: {
  // renderJsonPayloads: false
  // },
  routeRules: {
    '/history': {
      ssr: false // 会出现 config.js 未加载的情况
    }
  },
  app: {},
  // experimental: {
  //   externalVue: true
  // },
  // 关闭预渲染
  // routeRules: {
  //   '*': {
  //     prerender: false
  //   },
  //   '/user-center/*': {
  //     prerender: false
  //   }
  // },
  // watch: ['node_modules/@intsig/canvas-mark/src/*'],
  runtimeConfig: {
    // 公开的键，也会暴露给客户端
    public: {
      apiBase: '' // can be overridden by NUXT_PUBLIC_API_BASE environment variable
    }
  },

  build: {},

  css: [
    'ant-design-vue/dist/reset.css',
    '~/assets/styles/var.less', //
    '~/assets/styles/qa-theme.less', //
    '~/assets/styles/global.less', //
    '~/assets/styles/custom.less',
    '~/assets/styles/module.less', //
    '~/assets/styles/index.css' //
  ],
  antd: {
    // 防止页面闪烁
    extractStyle: true
  },

  modules: [
    '@ant-design-vue/nuxt',
    '@pinia/nuxt', //
    '@pinia-plugin-persistedstate/nuxt',
    '@nuxt/image', //
    '@vueuse/nuxt',
    '@nuxtjs/tailwindcss',
    'nuxt-aos'
  ],

  alias: {
    '@intsig/canvas-mark': path.resolve(__dirname, 'libs/canvas-mark'),
  },

  aos: {
    once: true
  },

  // @ts-ignore
  piniaPersistedstate: {
    storage: 'sessionStorage'
  },

  devtools: { enabled: true },

  nitro: {
    preset: 'node-server',
    compressPublicAssets: true
    // externals: {
    //   traceInclude: ['@vue/server-renderer']
    // },
    // prerender: {
    //   ignore: [],
    //   routes: ['/financial']
    // }
  },

  vite: {
    worker: {
      // format: 'es'
    },
    resolve: {
      preserveSymlinks: true
    },
    define: {
      'process.env': env
    },
    css: {
      preprocessorOptions: {
        less: {
          modifyVars: lessToJs(fs.readFileSync(path.resolve(__dirname, './assets/styles/antd.theme.less'), 'utf8'), {
            resolveVariables: true,
            stripPrefix: true
          }),
          javascriptEnabled: true
          // 注入全局变量
          //     additionalData: `
          //     @import "${path.resolve(__dirname, './src/assets/css/variables.less')}";
          // `
        }
      }
    },
    optimizeDeps: {
      exclude: ['@intsig/canvas-mark']
    },
    plugins: [
      // cssModuleAliasPlugin() //
      // viteCompression({
      // algorithm: 'brotliCompress',
      //   algorithm: 'gzip', // 压缩算法，压缩算法，可选 [ 'gzip', 'brotliCompress', 'deflate', 'deflateRaw']
      //   disable: false, // 是否禁用压缩
      //   deleteOriginFile: false, // 压缩后是否删除源文件
      //   ext: '.gz', // 生成的压缩包后缀
      //   // threshold: 20480, // 默认 1025, 体积大于 threshold 才会被压缩，单位 b
      //   verbose: true, // 是否在控制台输出压缩结果
      //   filter: path => {
      //     return /\.(css|js|json|svg|html|png|jpg|webp)$/.test(path)
      //   }
      // }),
      // @ts-ignore
      // visualizer({ open: true })
    ],
    build: {
      // target: 'es2015', // 异步函数会转换成 GeneratorFunction,不支持 web worker
      sourcemap: false,
      chunkSizeWarningLimit: 1024,
      rollupOptions: {
        output: {
          manualChunks(id: any, meta) {
            if (id.includes('node_modules')) {
              // const name = id.toString().split('node_modules/')[1].split('/')[0].toString()
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg')) {
                return '__pdf'
              }
              if (id.includes('tiff.js')) {
                return '__tiff'
              }
              if (id.includes('prismjs') || id.includes('marked') || id.includes('dompurify')) {
                return '__writer'
              }
              if (id.includes('intro.js')) {
                return '__intro'
              }
              return '__lib'
            }
            if (id.includes('canvas-mark')) {
              return '__mark'
            }
            if (id.includes('fonts/')) {
              return '__fonts'
            }
            // 不可以使用一个chunk,否则会报错
            // return '__vendor'
          }
        }
      }
    },

    server: {
      proxy: {
      }
    }
  },

  devServer: {
    port: 3001,
    host: '0.0.0.0'
  },

  compatibilityDate: '2024-08-03'
})
