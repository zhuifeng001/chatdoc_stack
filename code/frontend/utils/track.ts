import { getStorageUser } from '~/containers/knowledge-base/store/useUser'

export const identify = function ({ id, info }: { id: string; info?: any }) {
  if (window.zhuge) {
    window.zhuge.identify(id, info)
  }
}

export const track = function (data: { [key: string]: any; name: string; keyword: string; userId?: string }) {
  // console.log('data', data)
  if (window.zhuge) {
    let { name, keyword, userId, ...rest } = data
    userId = userId || getStorageUser()?.id
    window.zhuge.track(name, { keyword: keyword, user_id: userId, ...rest })
  }
}
