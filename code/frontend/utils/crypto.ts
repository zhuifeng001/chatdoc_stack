import CryptoJS from 'crypto-js'

export function encryptAes(word: string) {
  const key = CryptoJS.enc.Utf8.parse('Jdd7jsTeJcw*^rx7')
  const iv = CryptoJS.enc.Utf8.parse('6gm!2^$EfXrn^5oI')

  const res = CryptoJS.enc.Utf8.parse(word)
  const encrypted = CryptoJS.AES.encrypt(res, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  return CryptoJS.enc.Base64.stringify(encrypted.ciphertext)
}

export function getUrlParam(name: string) {
  const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
  const r = window.location.search.substr(1).match(reg) // search,查询？后面的参数，并匹配正则
  if (r != null) {
    return unescape(r[2])
  }
  return undefined
}

export function isIos() {
  const platform = getUrlParam('platform')
  if (platform) {
    return platform === 'ios'
  } else {
    return !!navigator.userAgent.match(/(ios|iphone|ipod|ipad|Macintosh)/i)
  }
}

export function getClientId() {
  let client_id = storage.getItem('client_id')
  if (!client_id) {
    client_id = Math.floor((Math.random() + Math.floor(Math.random() * 9 + 1)) * Math.pow(10, 13 - 1)).toString()
    storage.setItem('client_id', client_id)
  }
  return client_id
}

export function getLogDeviceId(deviceId: string) {
  const tmpDeviceIdArray = deviceId.split('_')
  return tmpDeviceIdArray.length >= 2 && tmpDeviceIdArray[0] === 'AD' ? tmpDeviceIdArray[1] : deviceId
}

/**
 * 随机生成字符串
 * @param length，字符串长度
 * @returns {string}
 */
export function randomString(length: number = 32) {
  let string = ''
  const randomArray = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z'
  ]
  for (let i = 0; i < length; i++) {
    const pos = Math.round(Math.random() * 35)
    string += randomArray[pos]
  }

  return string
}

export function dateFormat(fmt: string, date?: Date) {
  let ret
  if (!date) {
    date = new Date()
  }
  const opt = {
    'Y+': date.getFullYear().toString(), // 年
    'm+': (date.getMonth() + 1).toString(), // 月
    'd+': date.getDate().toString(), // 日
    'H+': date.getHours().toString(), // 时
    'M+': date.getMinutes().toString(), // 分
    'S+': date.getSeconds().toString() // 秒
    // 有其他格式化字符需求可以继续添加，必须转化成字符串
  }
  let k: keyof typeof opt
  for (k in opt) {
    ret = new RegExp('(' + k + ')').exec(fmt)
    if (ret) {
      fmt = fmt.replace(ret[1], ret[1].length === 1 ? opt[k] : opt[k].padStart(ret[1].length, '0'))
    }
  }
  return fmt
}

export function scrollTargetLocation(location: number) {
  document.documentElement.scrollTop = location
  document.body.scrollTop = location
}

export function randomFrom(lowerValue: number, upperValue: number) {
  return Math.floor(Math.random() * (upperValue - lowerValue + 1) + lowerValue)
}

export function throttle(fn: Function, delay: number) {
  let valid = true
  return function () {
    if (!valid) {
      return false
    }
    valid = false
    setTimeout(function () {
      fn()
      valid = true
    }, delay)
  }
}
// 邮箱脱敏
export function noPassByEmail(email: string) {
  let new_email = email
  if (String(email).indexOf('@') > 0) {
    const str = email.split('@')
    let _s = ''
    if (str[0].length > 3) {
      // @前面多于3位
      for (let i = 3; i < str[0].length; i++) {
        _s += '*'
      }
      new_email = str[0].substr(0, 3) + _s + '@' + str[1]
    } else {
      // @前面小于等于于3位
      for (let i = 1; i < str[0].length; i++) {
        _s += '*'
      }
      new_email = str[0].substr(0, 1) + _s + '@' + str[1]
    }
  }
  return new_email
}

// 手机号码脱敏
export function phoneNumberConvert(number: string) {
  if (!number) return ''
  return number.replace(/(\d{3})\d*(\d{4})/, '$1***$2')
}

// 解密操作
export function decryptAes(word: string) {
  const key = CryptoJS.enc.Utf8.parse('Jdd7jsTeJcw*^rx7')
  const iv = CryptoJS.enc.Utf8.parse('6gm!2^$EfXrn^5oI')

  const base64 = CryptoJS.enc.Base64.parse(word)
  const src = CryptoJS.enc.Base64.stringify(base64)
  // 解密模式为CBC，补码方式为PKCS5Padding（也就是PKCS7）
  const decrypt = CryptoJS.AES.decrypt(src, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  return decrypt.toString(CryptoJS.enc.Utf8)
}

export function _copyExec(text: string) {
  const input = document.createElement('input')
  input.setAttribute('readonly', 'readonly')
  input.setAttribute('value', text)
  document.body.appendChild(input)
  input.setSelectionRange(0, 9999)
  input.select()
  if (document.execCommand('copy')) {
    document.execCommand('copy')
  }
  document.body.removeChild(input)
}

export function copyClipboard(text: string) {
  return new Promise<void>(function (resolve) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          resolve()
        })
        .catch(() => {
          _copyExec(text)
          resolve()
        })
    } else {
      _copyExec(text)
      resolve()
    }
  })
}

// 手机号码脱敏
export function phoneNuberConvert(number: string) {
  if (!number) return ''
  const pat = /(\d{3})\d*(\d{4})/
  return number.replace(pat, '$1***$2')
}

// md5加密 加盐
export function md5Salt(text: string, salt = '3rnx1qy239', md5Length = 32) {
  return CryptoJS.MD5(text + salt)
    .toString()
    .substring(0, md5Length)
}

// 计算sign
export function getSign(params: { [key: string]: string | number | undefined }) {
  let sign = ''
  const arr = Object.keys(params).sort()
  arr.map((item, index) => {
    if (item !== 'sign_type') {
      sign += item + '=' + params[item]
      if (arr.length - 1 !== index) {
        sign += '&'
      }
    }
  })
  return sign
}

declare global {
  interface Window {
    initGeetest: any
  }
}

export function setCookie(name: string, value: string, expire: number) {
  const date = new Date(expire)
  // @ts-ignore
  document.cookie = name + '=' + value + '; expires=' + date.toGMTString() + ';domain=.camscanner.com' + ';path=/'
}
export function getCookie(name: string) {
  const reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)')
  const arr = document.cookie.match(reg)
  if (arr) {
    return unescape(arr[2])
  }
  return ''
}
// 检查是哪个back
export function checkBack(routeName, modelName) {
  console.log('routeName, modelName', routeName, modelName)
  // 选择了这些模型就是back2
  const back2 = ['Azure GPT4.0', 'Azure GPT3.5', 'Azure GPT4.0 32K']
  // 在这些路由里面就是back2
  const back2Route = ['aiwriting', 'csagentbot', 'enterprisebot']
  if (back2Route.includes(routeName)) {
    return 'back2'
  }
  if (back2.includes(modelName)) {
    return 'back2'
  }
  return 'back1'
}
