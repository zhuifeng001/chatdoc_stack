import { useIdlePromise } from '@/utils/util'

/**
 * paragraph
 * list
 * edge
 * table
 * borderless_table
 * image
 * stamp
 * formula
 * watermark
 */
export const AreaTypeEnums = {
  line: 'line', // 段落
  paragraph: 'paragraph', // 段落
  list: 'list', // 列表
  edge: 'edge', // 页眉页脚
  table: 'table', // 有线表格
  border_less_table: 'borderless_table', // 无线表格
  image: 'image', // 图片
  stamp: 'stamp', // 印章
  formula: 'formula', // 公式
  watermark: 'watermark' // 水印
}

export const AreaTypeNewEnums = {
  line: 'line', // 文字
  image: 'image' // 图片
}

/**
 * 文档分析配置类型
 */
export enum LayoutRestoreConfigEnums {
  EDGE = 'edge',
  STAMP = 'stamp',
  IMAGE = 'image'
}

export const isSupportedAreaType = (areaType: string, isNewDocParser: boolean) => {
  if (!isNewDocParser) {
    return [
      AreaTypeEnums.line,
      AreaTypeEnums.paragraph,
      AreaTypeEnums.list,
      AreaTypeEnums.table,
      AreaTypeEnums.border_less_table,
      AreaTypeEnums.image,
      AreaTypeEnums.formula,
      AreaTypeEnums.stamp,
      AreaTypeEnums.edge
      // AreaTypeEnums.watermark,
    ].includes(areaType)
  } else {
    return [AreaTypeNewEnums.line, AreaTypeNewEnums.image].includes(areaType)
  }
}

/**
 * 合同信息抽取页面
 */
export const ResultPaneEnums = {
  INFO_EXTRACTION: 'INFO_EXTRACTION', // 信息抽取
  LAYOUT_RESTORE: 'LAYOUT_RESTORE' // 文档分析
}

function escapeRegExp(str) {
  if (typeof str !== 'string') {
    return ''
  }

  // eslint-disable-next-line no-useless-escape
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
}

const SymbolMap = [
  ['(', '（'], //
  [')', '）'],
  ['.', '。'],
  [';', '；'],
  ['[', '【'],
  [']', '】'],
  [']', '】']
]

const compatSymbolOfChineseAndEnglish = (fullText, keyword, start) => {
  // 符号转换
  const replaceKeywordSymbol = (keyword, prev, next) => {
    return keyword.replace(new RegExp(escapeRegExp(prev), 'g'), next)
  }

  // 改变原文本
  const transformSymbol = (en2cn = true) => {
    let keywordOfSymbol = keyword
    for (const [left, right] of SymbolMap) {
      keywordOfSymbol = replaceKeywordSymbol(keywordOfSymbol, en2cn ? left : right, en2cn ? right : left)
    }
    return keywordOfSymbol
  }

  let index = -1

  // 转中文符号搜索
  const keywordOfChineseSymbol = transformSymbol()
  if (keywordOfChineseSymbol !== fullText && ~(index = fullText.indexOf(keywordOfChineseSymbol, start))) {
    return { index, keyword: keywordOfChineseSymbol }
  }

  // 转英文符号搜索
  const keywordOfEnglishSymbol = transformSymbol(false)
  if (keywordOfEnglishSymbol !== fullText && ~(index = fullText.indexOf(keywordOfEnglishSymbol, start))) {
    return { index, keyword: keywordOfEnglishSymbol }
  }

  return { index, keyword }
}

const enableSearchEngine = (text = '', keyword = '', start = 0, threshold = 1, internal = false) => {
  const index = text.indexOf(keyword, start)
  const origin = keyword
  let minEditDistance = 0

  // 忽略大小写搜索
  if (index === -1 && !internal) {
    const { index: index2, keyword: keyword2 } = compatSymbolOfChineseAndEnglish(text, keyword, start)
    if (~index2) {
      return { index: index2, origin: keyword2, minEditDistance }
    }
  }

  // 长度小于等于2，忽略编辑距离
  if (keyword.length <= 2) return { index, origin, minEditDistance }

  // 编辑距离搜索
  let tempWord: string | null = null
  const keywordLen = keyword.length
  threshold = 0 //  Math.floor(Math.pow(keywordLen, 1 / 3))
  for (let i = start; i < text.length - keywordLen; i++) {
    tempWord = text.slice(Math.max(0, i), i + keywordLen)
    // 去除编辑距离
    if (threshold) {
      minEditDistance = calcMinEditDistance(tempWord, keyword)
      if (minEditDistance <= threshold) {
        return { index: i, origin: tempWord, minEditDistance }
      }
    } else {
      if (keyword.includes(tempWord)) {
        return { index: i, origin: tempWord, minEditDistance }
      }
    }
  }

  return { index, origin, minEditDistance }
}

/**
 * 标记关键词
 * @param {Object} page
 * @param {Array<String>} keywords 关键词数组
 * @returns
 */
export const signSearchKey = async (page, keywords) => {
  return useIdlePromise(() => {
    const arr: any[] = []
    const lines = page.lines
    let line
    let lineText
    // 关键词之前的文字
    let start
    // 相对于关键词的开始索引
    let startIndex
    // 关键词之后的文字
    let end
    // 前后最多展示6个字符
    const MaxStartLength = 6
    // 显示的最大字符
    const MaxLength = 12
    // 相对于关键词的结束索引
    let endIndex
    // 存放所有关键词、所有line的当前索引、当一次索引位置
    const keywordStateMap = Object.create(null)
    // keywordStateMap 中的 key
    let key
    //存放关键词的当前索引，和上一次索引
    let state
    // 关键词的默认当前索引，上一次索引位置
    const defaultState = { prev: -1, curr: -1 }

    for (let i = 0; i < (1 || lines.length); i++) {
      line = lines[i]
      lineText = page.textList // line.text;
      for (let j = 0; j < keywords.length; j++) {
        const keyword = keywords[j]
        key = `key-${i}-${j}-${encodeURIComponent(keyword)}`
        if (!keywordStateMap[key]) {
          keywordStateMap[key] = { ...defaultState }
        }
        let { prev, curr } = (state = keywordStateMap[key])
        const { index, origin, minEditDistance } = enableSearchEngine(lineText, keyword, prev + 1)
        if ((curr = index) > prev) {
          if (origin.length > MaxLength) {
            startIndex = curr
            start = ''
            endIndex = curr + MaxLength
            end = ''
          } else {
            const mid = Math.floor((MaxLength - origin.length) / 2)
            startIndex = Math.max(0, curr - Math.min(MaxStartLength, mid))

            // 保证展示 MaxLength 个字符
            if (curr + origin.length + mid > lineText.length) {
              startIndex = Math.max(0, lineText.length - MaxLength - 1)
            }
            start = lineText.slice(startIndex, curr)
            endIndex = startIndex + MaxLength
            end = lineText.slice(curr + origin.length, endIndex)
          }

          arr.push({
            ...line,
            _page_index: page.index,
            _line_id: page.lineIdMap[curr],
            _area_index: page.areaIndexMap[curr],
            _area_type: page.areaTypeMap[curr],
            _keyword: keyword,
            _text: `${startIndex > 0 ? '...' : ''}${formatBlank(start)}<span style="color: #4877ff">${formatBlank(
              getMinLengthText(origin, MaxLength)
            )}</span>${formatBlank(end)}${endIndex < lineText.length ? '...' : ''}`,
            _char_index: curr, // 当前关键词的索引，排序用
            _minEditDistance: minEditDistance // 当前关键词的最小编辑距离
          })

          prev = curr
          state.prev = prev
          state.curr = curr

          if (prev < lineText.length) {
            j--
          }
        }
      }
    }
    return arr
      .sort((a, b) => {
        if (a._index !== b._index) {
          return a._index - b._index
        }
        return a._char_index - b._char_index
      })
      .sort((a, b) => {
        return a._minEditDistance - b._minEditDistance
      })
  })
}

function getMinLengthText(str, maxLen) {
  return str.substr(0, Math.min(str.length, maxLen))
}

function formatBlank(str) {
  return str.replace(/\s/g, '&nbsp;')
}

/**
 * 最小编辑距离
 */
function calcMinEditDistance(s, t) {
  // const cache = new Map();

  // const dfs = (w1, w2) => {
  // 	let ans;
  // 	let w1Map = cache.get(w1);
  // 	if ((ans = w1Map?.get(w2) ?? 0)) return ans;

  // 	if (!w1.length || !w2.length) {
  // 		ans = Math.max(w1.length, w2.length);
  // 	} else if (w1[w1.length - 1] === w2[w2.length - 1]) {
  // 		ans = dfs(w1.slice(0, w1.length - 1), w2.slice(0, w2.length - 1));
  // 	} else {
  // 		ans =
  // 			1 +
  // 			Math.min(
  // 				dfs(w1, w2.slice(0, w2.length - 1)),
  // 				dfs(w1.slice(0, w1.length - 1), w2),
  // 				dfs(w1.slice(0, w1.length - 1), w2.slice(0, w2.length - 1)),
  // 			);
  // 	}

  // 	if (!w1Map) {
  // 		w1Map = new Map();
  // 	}
  // 	w1Map.set(w2, ans);
  // 	cache.set(w1, w1Map);
  // 	return ans;
  // };

  // return dfs(word1, word2);

  const m = s.length,
    n = t.length
  if (m < n) return calcMinEditDistance(t, s)
  let previousRow = [...Array(n + 1).keys()]

  for (let i = 0; i < m; i++) {
    const currentRow = [i + 1]
    for (let j = 0; j < n; j++) {
      const insertCost = currentRow[j] + 1
      const deleteCost = previousRow[j + 1] + 1
      const replaceCost = previousRow[j] + (s[i] !== t[j] ? 1 : 0)
      currentRow.push(Math.min(insertCost, deleteCost, replaceCost))
    }
    previousRow = currentRow
  }

  return previousRow[n]
}
