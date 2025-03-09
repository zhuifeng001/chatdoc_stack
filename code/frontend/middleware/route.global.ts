export default defineNuxtRouteMiddleware((to, from) => {
  // console.log('to:', to)
  // console.log('from:', from)
  if (to.path === '/') {
    return navigateTo('/financial')
  }
  if (to.path === '/financial') {
    // 没有 code
    if (to.query.sso === 'textin' && !to.query?.code) {
      return navigateTo({ path: '/sso', query: to.query })
    }
  }
})
