import { getBaseHeader } from '~/libs/request/interceptors/request/browser'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { useUser } from '~/containers/knowledge-base/store/useUser'

/**
 * 可重试的错误
 */
class RetriableError extends Error {}
/**
 * 致命错误
 */
class FatalError extends Error {}

type StreamRequestProps = {
  url: string
  data: any
  doing?: (data: any, abort: () => void) => void
  done?: (data: any) => void
  error?: (error: Error) => void
}

export const inferQuestionStreamAPI = async ({ url, data, doing, done, error }: StreamRequestProps) => {
  const controller = new AbortController()
  const signal = controller.signal

  const getTimeoutTimer = () => {
    return setTimeout(() => {
      abort()
      error?.(new Error('网络正在开小差，请检查网络状态'))
    }, 1000 * 60 * 2) // 两分钟超时
  }

  let timeoutTimer = getTimeoutTimer()
  const abort = () => {
    clearTimeout(timeoutTimer)
    controller.abort()
  }

  const fetchPromise = fetchEventSource(url, {
    method: 'POST',
    keepalive: true,
    openWhenHidden: true, // 阻止重复发送请求
    headers: {
      'Content-Type': 'application/json',
      ...getBaseHeader()
    },
    body: JSON.stringify(data),
    signal,
    async onopen(response) {
      if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
        return // everything's good
      } else if (response.status !== 200) {
        const getMsg = async () => {
          try {
            const data = JSON.parse(await response.text())
            console.log('response data', data)
            return data.msg
          } catch (error) {}
        }
        // client-side errors are usually non-retriable:
        if (response.status === 400) {
          throw new FatalError(await getMsg())
        } else if (response.status === 401) {
          useUser().showLogin()
          let msg = await getMsg()
          if (msg.includes('Unauthorized')) {
            msg = '未登录或者登录已失效，请重新登录'
          }
          throw new FatalError(msg)
        }
        throw new FatalError()
      } else {
        // throw new RetriableError()
      }
    },
    onmessage(ev) {
      if (signal.aborted) {
        throw new FatalError('停止生成')
      }
      clearTimeout(timeoutTimer)
      timeoutTimer = getTimeoutTimer()

      // 表示整体结束
      if (ev.data === '[DONE]') {
        return
      }
      const ret = JSON.parse(ev.data)
      if (['DOING', 'Doing'].includes(ret.status)) {
        ret.status = 'DOING'
        doing?.(ret, abort)
      } else if (['DOING', 'Doing'].includes(ret.data?.status)) {
        ret.data.status = 'DOING'
        doing?.(ret.data, abort)
      }
      // 回答完成
      else if (['DONE', 'Done'].includes(ret.status)) {
        ret.status = 'DONE'
        done?.(ret)
        clearTimeout(timeoutTimer)
        abort()
      }
      //  回答完成
      else if (['DONE', 'Done'].includes(ret.data?.status)) {
        ret.data.status = 'DONE'
        done?.(ret.data)
        clearTimeout(timeoutTimer)
        abort()
      }
    },
    onerror(e) {
      clearTimeout(timeoutTimer)
      console.log('error :>> ', Object.getOwnPropertyNames(e), e)
      error?.(e)
      if (e instanceof FatalError) {
        throw e // rethrow to stop the operation
      } else {
        // do nothing to automatically retry. You can also
        // return a specific retry interval here.
        abort()
        throw e
      }
    },
    onclose() {
      clearTimeout(timeoutTimer)
      abort()
      // throw new RetriableError('close')
    }
  })
  return fetchPromise
}
