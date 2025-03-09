import { isClient } from './../../../utils/env'
import { userLogin, userLogout } from '@/api/knowledge-base'
import { defineStore, skipHydrate } from 'pinia'
import { computed, ref } from 'vue'
import { pick } from 'lodash-es'

export const getStorageUser = () => {
  try {
    return JSON.parse(storage.getItem('KB_USER') || '')
  } catch (error) {
    return
  }
}

export const useUser = defineStore('user', () => {
  const userToken = skipHydrate(ref(storage.getItem('KB_TOKEN') || ''))
  const userInfo = skipHydrate(ref<any>(getStorageUser()))

  const isLogin = skipHydrate(computed(() => !!userToken.value))

  const setUserInfo = (data: any) => {
    userInfo.value = data
    const token = data?.token || ''
    userToken.value = token
    storage.setItem('KB_USER', JSON.stringify(data))
    storage.setItem('KB_TOKEN', userToken.value)
    if (data) {
      identify({ id: data.id, info: pick(data, ['account', 'name', 'openid', 'mobile', 'email']) })
    }
  }

  const clearUser = () => {
    userInfo.value = undefined
    userToken.value = ''
    storage.removeItem('KB_USER')
    storage.removeItem('KB_TOKEN')
  }

  const loginModalVisible = ref(false)
  const showLogin = () => {
    if (!isClient) return
    clearUser()
    loginModalVisible.value = true
  }

  const login = async (data: { account?: string; password?: string }) => {
    const res = await userLogin(data)
    console.log(res)
    setUserInfo(res?.data)
    return res
  }

  const logout = async () => {
    const res = await userLogout()
    clearUser()
    return res
  }

  return {
    userToken,
    userInfo,
    setUserInfo,
    clearUser,
    loginModalVisible,
    isLogin,
    showLogin,
    login,
    logout
  }
})
