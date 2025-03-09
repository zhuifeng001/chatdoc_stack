export const assign = arr => Object.assign({}, ...arr)

export const formatAttrs = (str: string = '') => {
  // TODO: 使用后行断言
  // res = [ 'setup', 'lang="ts"', "auto", "auto='false'" ]
  const res = str.match(/([\w\d-_]+=['"][^'"]*['"])|([\w\d]+)/g)
  return assign(
    (res || [])
      .map(o => (o.match(/[^=]+/g) || []).map(o => o.trim()))
      .map(([key, value]) => ({ [key]: value ? value.replace(/^['"]|['"]$/g, '') : true }))
  )
}

export const getTagSrc = (src: string, tagName: string) => {
  const reg = new RegExp(`<${tagName}.*>[\\s\\S]*</${tagName}>`, 'g')
  return { srcMatchedTag: reg.exec(src)?.[0] || '', srcWithoutTag: src.replace(reg, '') }
}

export const formatTagAttrs = (srcMatchedTag: string, tagName: string) => {
  return formatAttrs(new RegExp(`<${tagName}([^>]*)>`).exec(srcMatchedTag)?.[1])
}

export const getTagAttrs = (src: string, tagName: string) => {
  const { srcMatchedTag } = getTagSrc(src, tagName)
  return formatTagAttrs(srcMatchedTag, tagName)
}
