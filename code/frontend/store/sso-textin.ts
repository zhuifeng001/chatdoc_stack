import { defineStore } from 'pinia'
import { getTextinSSOInfo, loginByTextinSSO } from '~/api'
import { useUser } from '~/containers/knowledge-base/store/useUser'

export const useTextinSSO = defineStore('sso-textin', () => {
  const userStore = useUser()

  const readySSOLogin = async () => {
    const res = await getTextinSSOInfo({ sso: 'textin' })
    track({ name: '登录', keyword: 'textin登录' })
    window.location.replace(res.data.sso_login_url)
  }

  const ssoLogin = async () => {
    const route = useRoute()
    const router = useRouter()

    console.log('sso login')
    const res = await loginByTextinSSO(route.query)
    userStore.clearUser()
    userStore.setUserInfo(res?.data)
    setTimeout(() => {
      // query 刪除 sso, code，reload
      // const params = new URLSearchParams()
      // for (const key in route.query) {
      //   if (!['sso', 'code', 'state'].includes(key)) {
      //     params.append(key, String(route.query[key]))
      //   }
      // }
      // const url = new URL(window.location.origin)
      // url.search = params.toString()
      // window.location.replace(url.href)
      router.replace('/financial')
    })
  }

  const run = async () => {
    if (!isClient) {
      return
    }
    const route = useRoute()
    // 跳转 textin login
    if (route.query?.sso === 'textin' && !route.query?.state) {
      readySSOLogin()
    }
    // sso登录
    if (route.query?.sso === 'textin' && route.query?.code) {
      ssoLogin()
    }
  }

  return {
    readySSOLogin,
    ssoLogin,
    run
  }
})
