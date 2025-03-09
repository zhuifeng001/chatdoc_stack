<script setup lang="ts">
import {
  ArrowRight,
  Search,
  DocumentFolder,
  ToLeft,
  ToRight,
} from '@icon-park/vue-next'
import { useUser } from '~/containers/knowledge-base/store/useUser'

enum MenuItem {
  QA = 'qa',
  Public = 'public',
  Private = 'private',
  Creative = 'Creative',
  DocumentList = 'DocumentList',
  DocumentSource = 'DocumentSource'
}

const props = defineProps({
  expand: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['update:expand'])

const userStore = useUser()
const { isLogin } = storeToRefs(userStore)
const route = useRoute()
const router = useRouter()
const isHome = computed(() => route.path === '/' || route.path === '/financial')

const matchDefaultMenu = () => {
  const path = route.path
  if (path.startsWith('/financial/user-kb')) {
    return MenuItem.Private
  } else if (path.startsWith('/financial/public') || path.startsWith('/financial/search')) {
    return MenuItem.Public
  } else if (path.startsWith('/financial/creative')) {
    return MenuItem.Creative
  } else if (path.startsWith('/financial/document')) {
    return MenuItem.DocumentList
  } else if (path.startsWith('/financial')) {
    return MenuItem.QA
  }
}
const activeMenu = ref(matchDefaultMenu())
watchEffect(() => {
  activeMenu.value = matchDefaultMenu()
})

const isProdTest = computed(() => globalThis.location?.origin.includes('prod-test'))

const onClickMenu = (menu?: MenuItem) => {
  switch (menu) {
    case MenuItem.QA:
      // if (!route.path.startsWith('/financial')) {
      router.push('/financial')
      // }
      break
    case MenuItem.Public:
      activeMenu.value = menu
      if (!['/financial/public'].includes(route.path)) {
        router.push('/financial/public')
      }
      break
    case MenuItem.Private:
      if (!isLogin.value) {
        userStore.showLogin()
        return
      }
      activeMenu.value = menu
      if (!route.path.startsWith('/financial/user-kb')) {
        router.push('/financial/user-kb')
      }
      break
    case MenuItem.Creative:
      if (!isLogin.value) {
        userStore.showLogin()
        return
      }
      activeMenu.value = menu
      if (!route.path.startsWith('/financial/creative')) {
        router.push('/financial/creative')
      }
      break
    case MenuItem.DocumentList:
      if (!isLogin.value) {
        userStore.showLogin()
        return
      }
      activeMenu.value = menu
      if (!route.path.startsWith('/financial/document')) {
        router.push('/financial/document')
      }
      break
    default:
      message.warning('敬请期待')
      return
  }
}
</script>
<template>
  <div :class="[$style['page-nav-container'], 'flex flex-col', expand ? $style['expand'] : '']">
    <NuxtLink :class="[$style['page-nav-title']]" to="/">
      <NuxtImg v-show="expand" :class="isHome ? 'cursor-default' : ''" src="/logo.png" alt="" format="webp"
        width="144px" height="38px" />
      <NuxtImg v-show="!expand" :class="isHome ? 'cursor-default' : ''" src="/favicon_3x.png" alt="" format="webp"
        width="38px" height="38px" />
    </NuxtLink>

    <div class="flex-grow mt-10 scroll-bar">
      <a-popover title="知识检索" :overlayClassName="$style['nav-item-popover']" placement="right"
        :open="!expand ? undefined : false">
        <div :class="[
          $style['menu-item'],
          $style['menu-item-qa'],
          activeMenu === MenuItem.QA ? $style['menu-item-active'] : ''
        ]" @click="onClickMenu(MenuItem.QA)">
          <div class="flex items-center overflow-hidden">
            <Search size="18px" class="shrink-0 ml-[2px]" />
            <span v-show="expand" class="ml-[17px] text-nowrap text-base">知识检索</span>
          </div>
          <a-button v-show="expand" class="flex items-center justify-center w-[40px] h-[40px] border-none p-0">
            <ArrowRight />
          </a-button>
        </div>
      </a-popover>
      <!-- <a-popover
        title="公开知识库"
        :overlayClassName="$style['nav-item-popover']"
        placement="right"
        :open="!expand ? undefined : false"
      >
        <div
          v-show="!isProdTest"
          :class="[$style['menu-item'], activeMenu === MenuItem.Public ? $style['menu-item-active'] : '']"
          @click="onClickMenu(MenuItem.Public)"
        >
          <div class="flex items-center overflow-hidden">
            <div :class="$style.icon">
              <TableReport size="18px" />
            </div>
            <span v-show="expand" class="ml-2 text-nowrap">公开知识库</span>
          </div>
        </div>
      </a-popover> -->
      <a-popover title="个人知识库" :overlayClassName="$style['nav-item-popover']" placement="right"
        :open="!expand ? undefined : false">
        <div v-show="!isProdTest"
          :class="[$style['menu-item'], activeMenu === MenuItem.Private ? $style['menu-item-active'] : '']"
          @click="onClickMenu(MenuItem.Private)">
          <div class="flex items-center overflow-hidden">
            <div :class="$style.icon">
              <DocumentFolder size="18px" />
            </div>
            <span v-show="expand" class="ml-2 text-nowrap">个人知识库</span>
          </div>
        </div>
      </a-popover>
      <a-divider class="my-6" />
      <acg-tooltip v-if="expand" overlayClassName="acg-tooltip" title="收起" placement="right">
        <ToLeft size="16px"
          class="absolute bottom-4 right-3 cursor-pointer p-3 hover:text-primary-color bg-white hover:bg-gray-50 rounded-full"
          @click="emit('update:expand', !expand)" />
      </acg-tooltip>
      <acg-tooltip v-else overlayClassName="acg-tooltip" title="展开" placement="right">
        <ToRight size="16px"
          class="absolute bottom-4 right-3 cursor-pointer p-3 hover:text-primary-color bg-white hover:bg-gray-50 rounded-full"
          @click="emit('update:expand', !expand)" />
      </acg-tooltip>
    </div>
  </div>
</template>
<style lang="less" module>
@gap: 0px;
@distance: 10px;

.page-nav-container {
  position: fixed;
  left: @distance;
  top: @distance;
  z-index: 100;
  width: 64px;
  height: calc(100vh - @gap * 2 - @distance * 2);
  margin: @gap;
  padding: 20px 8px;

  background: #ffffff;
  // box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  border-radius: 12px;
  // border: 1px solid var(--secondary-color);
  transition: all 0.3s;

  &.expand {
    width: 200px;

    .menu-item:not(.menu-item-qa) {
      padding-left: 8px;
    }
  }

  .page-nav-title {
    width: 100%;
    height: 38px;
    display: flex;
    justify-content: center;
  }

  .menu-item {
    margin-bottom: 16px;
    padding-left: 6px;
    width: 100%;
    height: 48px;

    display: flex;
    align-items: center;

    border-radius: 24px;
    cursor: pointer;
    transition: all 0.3s;

    .icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;

      border-radius: 24px;
      transition: all 0.3s;

      display: flex;
      align-items: center;
      justify-content: center;
    }

    &.menu-item-active {
      background: #e0ebff;

      .icon {
        background: var(--primary-color);
        color: #fff;
      }
    }

    &:hover {
      background: #e0ebff;
    }
  }

  .menu-item-qa {
    padding-left: 14px;
    padding-right: 4px;
    width: 100%;
    height: 48px;
    background: #f2f4f7;
    box-shadow: 1px 1px 4px 0px rgba(204, 208, 217, 0.2);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
  }
}

.nav-item-popover {
  width: 150px;

  :global {
    .ant-popover-title {
      margin-bottom: 0;
    }
  }
}
</style>
