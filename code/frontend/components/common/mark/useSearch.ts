import { computed, ref, watch } from 'vue'
import { signSearchKey } from './search-util'
import { delay } from '@/utils/util'
import { dataSearchIndex, getAttrSearchIndex, getMultiLineBoxes } from './util'

export const useSearch = ({ PageMarkRef, pageList, pageIndex }) => {
  const searchResults = ref<any[]>([])
  const keyword = ref<any>('')
  const loading = ref(false)

  const flatSearchResults = computed(() => {
    return searchResults.value
      .map((page, i) => {
        return page._lines_by_search?.map(o => ({
          ...o,
          _page_index: page.index
        }))
      })
      .filter(Boolean)
      .flat(1)
  })

  const changeSearchKey = searchKey => {
    keyword.value = searchKey.trim()
  }

  const searchDocKeyInfo = async () => {
    if (!keyword.value) {
      searchResults.value = []
      return
    }
    loading.value = true
    const startTime = +new Date()
    console.time('search')
    const resultPromises = Promise.allSettled(
      pageList.value.map(async (page, index) => {
        page._lines_by_search = await signSearchKey(page, [keyword.value.trim()])
        page._lines_by_search?.forEach((line, i) => {
          line._line_index = i
        })

        const hasCharPos = page._lines_by_search?.[0]?._line_id == null
        if (!hasCharPos) {
          // 只有行坐标定位，这里去重行重复的数据
          const idMap = {}
          for (const o of page._lines_by_search) {
            idMap[o._line_id] = o
          }
          page._lines_by_search = Object.values(idMap)
        }

        page._active = false

        return page
      })
    )
    console.timeEnd('search')
    // 搜索时间短，加上300ms的延迟，显示loading效果
    if (+new Date() - startTime <= 300) {
      await delay(300)
    }
    searchResults.value = (await resultPromises).map((o: any) => o.value).filter(o => o._lines_by_search?.length)

    loading.value = false
  }
  const focusSearchMarkItem = async line => {
    const { _page_index, _line_index } = line
    if (pageIndex.value !== _page_index) {
      pageIndex.value = _page_index
      // await PageMarkRef.value.changePage(+_page_index, false)
      await delay(150)
    }

    const shapeActivatedOptions = { strokeStyle: '#d94141' }
    const shapeDeactivatedOptions = { strokeStyle: 'transparent' }
    PageMarkRef.value.removeActive({ shapeOptions: shapeDeactivatedOptions })
    PageMarkRef.value.setActive(_page_index, getAttrSearchIndex(_line_index), {
      block: 'center',
      shapeOptions: shapeActivatedOptions
    })
  }

  watch(pageIndex, () => {
    preCreateSearchMark(pageIndex.value)
  })

  const preCreateSearchMarkByPage = (page_index: number) => {
    const page = searchResults.value.find(v => v.index === page_index)
    const lines = page?._lines_by_search || []
    for (const line of lines) {
      createSearchMarkLine(line)
    }
  }

  // 预加载搜索框
  const preCreateSearchMark = (page_index: number) => {
    if (page_index == null) return
    preCreateSearchMarkByPage(page_index)

    const preloadNum = 2 // 预加载前后两页的框

    const preload = () => {
      const len = pageList.value.length
      const start = Math.max(1, page_index - preloadNum)
      const end = Math.min(len, page_index + preloadNum)
      let i = page_index
      let j = page_index
      while (i >= start || j <= end) {
        i--
        j++
        i > 0 && preCreateSearchMarkByPage(i)
        j <= len && preCreateSearchMarkByPage(j)
      }
    }
    preload()
  }

  const clearSearchMarkItem = () => {
    PageMarkRef.value.getMarkInstance()?.removeShape({ selector: '.search-item' })
    PageMarkRef.value.getMarkInstance()?.render()
  }

  async function createSearchMarkLine(line) {
    if (line._rendered) return
    line._rendered = true

    const { _page_index, _line_index, _char_index, _keyword } = line
    const pd = pageList.value.find(v => v.index === _page_index)

    const mark = {
      index: _line_index, // 搜索 search_index
      page_index: _page_index,
      // 多个字符合并点位
      box: getMultiLineBoxes(pd.positionList.slice(_char_index, _char_index + _keyword.length)),
      text: _keyword
    }
    createSearchMarkDom(mark)
  }

  async function createSearchMarkDom(mark) {
    const { page_index, box, text, index } = mark

    // 本次插入框
    // await PageMarkRef.value.changePage(+page_index)

    box.forEach(position => {
      const pos = position.map(item => item)
      PageMarkRef.value.createMark({
        page: page_index,
        position: pos.length === 8 ? [pos[6], pos[7], pos[2], pos[3]] : pos,
        attrs: {
          title: `${text}`, // #${index} :
          [dataSearchIndex]: index
        },
        classNames: ['search-item'],
        canvasStyleOptions: {
          strokeStyle: 'transparent',
          fillStyle: 'rgba(255, 255, 0, 0.3)'
        }
      })
    })
  }

  return {
    loading,
    searchResults,
    flatSearchResults,
    keyword,
    changeSearchKey,
    searchDocKeyInfo,
    focusSearchMarkItem,
    preCreateSearchMark,
    clearSearchMarkItem
  }
}
