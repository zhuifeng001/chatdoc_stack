import { message } from 'ant-design-vue'

export enum ChatQAType {
  START = 0,
  QUESTION = 1,
  ANSWER = 2,
  DIVIDER = 3
}

export enum ChatTypeEnums {
  CHAT = 'chat',
  SUMMARY = 'summary'
}

export function copyText(text: string): Promise<boolean> {
  return new Promise(resolve => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        resolve(true)
      })
      .catch(() => {
        resolve(false)
      })
  })
}

/**
 * 文本复制
 * @param text 待复制的文本
 * @param message 复制成功消息，尝试调用项目的 noc 助手显示消息
 * @param messageFail 复制失败消息
 */
export function copy(text: string | undefined, messageSuccess: string = '复制成功', messageFail = '复制失败') {
  if (text) {
    copyText(text).then(isCopied => {
      isCopied ? message.success(messageSuccess) : message.warn(messageFail)
    })
  } else {
    message.warn('无数据')
  }
}

export const getDefaultStyle = () => ({
  strokeStyle: 'transparent',
  lineDash: [],
  fillStyle: 'transparent'
})

export const getActiveStyle = () => ({
  strokeStyle: 'transparent', // '#1A66FF',
  lineDash: [],
  fillStyle: 'rgba(72, 119, 255, 0.3)'
})

export enum AnswerFeedback {
  PRAISE = 1,
  BAD = 2
}
