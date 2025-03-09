import type { IntroJs } from 'intro.js/src/intro'
import { defineStore, skipHydrate, storeToRefs } from 'pinia'
import { computed, createApp, ref, shallowRef, watch, watchEffect, type Component } from 'vue'
import { useKBStore } from '.'
import TooltipStep1 from '../components/tour/TooltipStep1.vue'
import TooltipStep2 from '../components/tour/TooltipStep2.vue'
import TooltipStep3 from '../components/tour/TooltipStep3.vue'
import TooltipStep4 from '../components/tour/TooltipStep4.vue'
import TooltipStep5 from '../components/tour/TooltipStep5.vue'
import TooltipStep6 from '../components/tour/TooltipStep6.vue'
import { useUser } from './useUser'

const tourVisibleKey = 'tour_visible_1'
const tourNextVisibleKey = 'tour_next_visible_1'

const getVisible = (key: string) => {
  try {
    return JSON.parse(storage.getItem(key) || 'true')
  } catch (e) {
    return true
  }
}

export const useTour = defineStore('tour', () => {
  const userStore = useUser()
  const { isLogin } = storeToRefs(userStore)
  const { selectedFile, commonProblemList, isPersonalKB, isMultiDocumentsMode } = storeToRefs(useKBStore())

  //
  /**
   * 个人知识库、多文档问答：步骤只有3步，不包含推荐问题
   *
   * 公开知识库：步骤有4步，包含推荐问题
   */
  const totalTourSteps = computed(() => {
    return isPersonalKB.value || isMultiDocumentsMode ? 3 : 4
  })

  const welcomeVisible = skipHydrate(ref(false)) // getVisible('welcome_visible')

  const tourVisible = skipHydrate(ref(getVisible(tourVisibleKey)))
  const tourNextVisible = skipHydrate(ref(getVisible(tourNextVisibleKey)))
  const tour = shallowRef<IntroJs | null>()

  const prevZIndexState = new Map()
  let prevStep = 0

  const initState = () => {
    if (isLogin.value) {
      welcomeVisible.value = false
    }
  }
  initState()

  watch(isLogin, () => {
    if (!isLogin.value) {
      tourVisible.value = false
    }
  })

  watch(tourVisible, () => {
    if (isLogin.value) {
      storage.setItem(tourVisibleKey, String(tourVisible.value))
    }
    if (!tourVisible.value) {
      tour.value?.exit(true)
    }
  })
  watch(tourNextVisible, () => {
    if (isLogin.value) {
      storage.setItem(tourNextVisibleKey, String(tourNextVisible.value))
    }
  })

  const close = () => {
    tour.value?.exit(true)
  }

  const restoreZIndex = () => {
    for (const [target, prevZIndex] of prevZIndexState) {
      target.style.zIndex = prevZIndex
    }
    prevZIndexState.clear()
  }

  const loadTooltipComp = (Comp: Component) => {
    const dom = document.createDocumentFragment() as any
    const vueInstance = createApp(Comp).mount(dom)
    return (vueInstance.$el as HTMLElement).outerHTML
  }

  const listenCloseEvent = (parent = document) => {
    setTimeout(() => {
      document.querySelectorAll('.tour-close').forEach(node => {
        node.addEventListener('click', () => {
          close()
        })
      })
    }, 350)
  }
  const diff = 2

  const init = async () => {
    if (!isClient) return
    if (!tourVisible.value && !tourNextVisible.value) return
    const Intro = (await import('intro.js')).default
    await import('intro.js/introjs.css')

    tour.value = Intro().setOptions({
      tooltipClass: 'tour-wrapper',
      showBullets: false,
      helperElementPadding: 0,
      nextLabel: '下一页',
      prevLabel: '上一页',
      doneLabel: '我知道了', // '立即体验'
      hidePrev: true,
      scrollTo: 'off',
      exitOnOverlayClick: false,
      exitOnEsc: true,
      steps: [
        {
          element: document.getElementById('TourStep1') as HTMLElement, // .kb-sidebar-search
          intro: loadTooltipComp(TooltipStep1),
          position: 'right'
        }
      ]
    })
    tour.value?.onexit(() => {
      // 还原 z-index
      restoreZIndex()

      tourVisible.value = false
      if (tour.value && prevStep > 1) {
        tourNextVisible.value = false
      }
      prevStep = 0
    })
    tour.value.onbeforechange(Ele => {
      restoreZIndex()

      if (!tour.value) return true
      const _currentStep = tour.value._currentStep //  Number(Ele?.getAttribute('id')?.replace('TourStep', '')) || prevStep
      // 设置 z-index 层级
      if (_currentStep === 0) {
        const target = document.querySelector('.kb-document-list-container') as HTMLElement
        prevZIndexState.set(target, getComputedStyle(target).zIndex)
      }

      const prevBtnNode = document.querySelector('.introjs-prevbutton') as HTMLElement
      if (prevBtnNode) {
        if (_currentStep + diff === 5) {
          prevBtnNode.innerHTML = '重看引导'
          prevBtnNode.addEventListener('click', e => {
            e.stopPropagation()
            e.preventDefault()
            tour.value?.goToStepNumber(1)
          })
        } else {
          prevBtnNode.innerHTML = tour.value._options.prevLabel
        }
      }
      // 无常见问题，跳过此步引导
      if (!commonProblemList.value?.length) {
        if (prevStep + diff === 3 && _currentStep + diff === 4) {
          prevStep = _currentStep
          tour.value.nextStep()
          return false
        } else if (prevStep + diff === 5 && _currentStep + diff === 4) {
          prevStep = _currentStep
          tour.value.previousStep()
          return false
        } else if (prevStep + diff === _currentStep + diff && prevStep + diff === 5) {
          close()
          return false
        }
      }

      prevStep = _currentStep

      return true
    })
    tour.value.onafterchange(() => {
      listenCloseEvent()

      if (tour.value?._currentStep === 0) {
        const source = document.getElementById('TourStep2') as HTMLElement
        const target = document.querySelector('.kb-document-list-container') as HTMLElement
        target.style.zIndex = getComputedStyle(source).zIndex + 1
      }
    })

    if (tourVisible.value && tourNextVisible.value) {
      open()
    }
  }

  const open = () => {
    if (tour.value && tour.value._introItems.length + diff < 5) {
      tour.value.setOptions({
        doneLabel: '立即体验',
        hidePrev: false,
        steps: [
          // {
          //   element: document.getElementById('TourStep1') as HTMLElement, // .kb-sidebar-search
          //   intro: loadTooltipComp(TooltipStep1),
          //   position: 'right'
          // },
          // {
          //   element: document.getElementById('TourStep2') as HTMLElement, // .kb-document-list-container
          //   intro: loadTooltipComp(TooltipStep2),
          //   position: 'right'
          // },
          {
            element: document.getElementById('TourStep3') as HTMLElement, // document.querySelector('.page-mark-menu-content')
            intro: loadTooltipComp(TooltipStep3),
            position: 'right'
          },
          {
            element: document.getElementById('TourStep4') as HTMLElement, //  document.querySelector('.doc-page-container')
            intro: loadTooltipComp(TooltipStep4),
            position: 'right'
          },
          // commonProblemList.value?.length?
          {
            element: document.getElementById('TourStep5') as HTMLElement, // document.querySelector('.chat-common-problem')
            intro: loadTooltipComp(TooltipStep5),
            position: 'top-left-aligned'
          },
          // : null
          {
            element: document.getElementById('TourStep6') as HTMLElement, // document.querySelector('.chat-input-wrapper')
            intro: loadTooltipComp(TooltipStep6),
            position: 'top-left-aligned'
          }
        ].filter(Boolean) as any[]
      })
      tourVisible.value = true
      tour.value?.refresh(true)
      tour.value?.start()
      // tour.value?.goToStep(0) // 从第二步继续
    }
  }

  return { welcomeVisible, tourVisible, totalTourSteps, init, close }
})
