import ACGTooltip from '@/components/common/ACGTooltip.vue'
import vResize from '@/libs/directives/resizable'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.use(vResize)
  nuxtApp.vueApp.component('ACGTooltip', ACGTooltip)
  nuxtApp.vueApp.component('acg-tooltip', ACGTooltip)
})
