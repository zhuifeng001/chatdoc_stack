import { formatTagAttrs, getTagAttrs, getTagSrc } from './utils'
import MagicString from 'magic-string'
import { getTransformResult } from './utils/sourcemap'
import fs from 'fs'
import type { Plugin } from 'vite'

function escapeRegExp(str) {
  if (typeof str !== 'string') {
    return ''
  }

  // eslint-disable-next-line no-useless-escape
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
}

export const CLASS_PREFIX = '-'

// 处理 $ 特殊字符开头
const handleForRegExp = (str: string) => (str.startsWith('$') ? `\\${str}` : str)

const matchedSignRE = new RegExp(`(?:^|[.\\s'\"])${CLASS_PREFIX}\\b[\\w\\d_-]+`, 'g')

/**
 * class="-class-name"    ===>   :class="$style['class-name']"
 */
export const parseCssModuleAlias = (src: string) => {
  const styleAttrs = getTagAttrs(src, 'style')
  if (styleAttrs.module) {
    const templateTag = 'template'
    let { srcMatchedTag: templateSrc, srcWithoutTag: srcWithoutTemplate } = getTagSrc(src, templateTag)

    if (!templateSrc.match(matchedSignRE)?.length) return src

    // const templateAttrs = formatTagAttrs(templateSrc, templateTag)
    // if (templateAttrs.lang === 'pug') {
    //   templateSrc = parsePugToHtml(templateSrc)
    // }

    const res = templateSrc.match(/(\s|:)class="[^"]*(\s)?"/g) || []

    for (const item of res) {
      const [, valueStr] =
        item
          .trim()
          .match(/[^=]+/g)
          ?.map(o => o.trim().replace(/^['"]|['"]$/g, '')) || []

      if (!valueStr) continue

      const classes = valueStr.split(/\s+/)
      const specialClasses = classes.filter(name => name.startsWith(CLASS_PREFIX))
      const nonSpecialClasses = classes.filter(name => !name.startsWith(CLASS_PREFIX))

      const getModuleClassName = name => name.trim().replace(new RegExp(`^${handleForRegExp(CLASS_PREFIX)}`), '')

      const moduleClassNames = specialClasses.map(name => `$style['${getModuleClassName(name)}']`).join(', ')

      const newClassAttr = moduleClassNames?.length ? ` :class="[${moduleClassNames}]"` : ''
      const otherClassAttrStr = nonSpecialClasses.length ? `class="${nonSpecialClasses.join(' ')}"` : ''
      templateSrc = templateSrc.replace(item, `${newClassAttr} ${otherClassAttrStr}`)
    }

    return `${templateSrc}${srcWithoutTemplate}`
  }

  return src
}

export const cssModuleAliasPlugin = (): Plugin => {
  return {
    name: 'vite-css-module-alias-plugin',
    enforce: 'pre',
    // apply: 'build',
    load(id) {
      if (!(id.endsWith('.vue') || id.includes('.vue?')) || id.includes('node_modules/')) return
      try {
        const filepath = id.includes('vue?') ? id.split('?')[0] : id
        // console.log('filepath', id, filepath)
        const code = fs.readFileSync(filepath, 'utf8').toString()
        const newCode = parseCssModuleAlias(code)

        // if (id.includes('containers/financial')) {
        //   console.log('1111', id)
        //   console.log('code', code)
        //   console.log('newCode', newCode)
        // }
        const s = new MagicString(code)
        if (newCode === code) {
          return getTransformResult(s, id)
        }
        s.overwrite(0, s.length(), newCode, false)
        console.log('s.toString()', s.toString())

        return getTransformResult(s, id)
      } catch (error) {
        console.log('id', id)
        console.log('error', error)
        return
      }
    }
    // transform(code, id) {
    //   const newCode = parseCssModuleAlias(code)

    //   const s = new MagicString(code)
    //   if (newCode === code) {
    //     return getTransformResult(s, id)
    //   }
    //   s.overwrite(0, s.length(), newCode, false)
    //   return getTransformResult(s, id)
    // },
  }
}

// const code = `<template>                                                                                                                           22:59:09
//   <div class="-page-header">
//     <NuxtLink :class="[$style['page-header-left'], isHome ? $style['no-hover'] : '']" to="/">
//       <NuxtImg src="/logo.png" alt="" format="webp" width="108px" height="30px" />
//       <!-- <span class="-kb-name">财经知识库问答</span> -->
//     </NuxtLink>
//     <div class="-page-header-right">
//       <ClientOnly>
//         <LayoutHeaderUser />
//       </ClientOnly>
//     </div>
//   </div>
// </template>
// <script lang="ts" setup>
// const route = useRoute()
// const isHome = route.path === '/financial'
// </script>
// <style lang="less" module>
// .page-header {
//   padding: 0 20px;
//   width: 100%;
//   height: 60px;
//   display: flex;
//   align-items: center;
//   justify-content: space-between;

//   .page-header-left {
//     display: flex;
//     align-items: center;

//     &.no-hover {
//       cursor: default;
//     }
//   }

//   .kb-name {
//     margin-left: 10px;
//     font-size: 18px;
//     font-weight: 600;
//     // color: var(--secondary-color);
//     color: #000;
//     line-height: 18px;
//   }
// }
// </style>`

// console.log('code', code)
// console.log('newCode', parseCssModuleAlias(code))
