<template>
  <a-layout-header :class="[$style['layout-header'], 'kb-layout-header']">
    <a-page-header :class="$style['layout-header-left']">
      <template v-slot:title>
        <NuxtLink :class="$style.label" @click="router.go(-1)" title="返回">
          <Left :class="$style['label-back']" />
        </NuxtLink>
      </template>
      <template v-slot:subTitle>
        <NuxtLink :class="$style['ant-dropdown-link']" @click.prevent="router.go(-1)">
          <NuxtImg src="/logo.png" alt="" format="webp" height="30px" />
        </NuxtLink>
      </template>
    </a-page-header>
    <div :class="$style['layout-header-right']">
      <ClientOnly>
        <LayoutHeaderUser />
      </ClientOnly>
    </div>
    <LoginModal />
  </a-layout-header>
</template>
<script lang="ts" setup>
import { Down, Check, Left } from '@icon-park/vue-next'

import LayoutHeaderUser from '~/containers/knowledge-base/components/layout/LayoutHeaderUser.vue'
import LoginModal from '~/containers/knowledge-base/components/LoginModal.vue'

const router = useRouter()
</script>
<style lang="less" module>
.layout-header {
  .layout-header-left {
    padding: 0 0 0 16px;
    height: 100%;
    display: flex;
    align-items: center;

    :global {
      // .ant-page-header-heading {
      //   height: 100%;
      // }
      // .ant-page-header-heading-left {
      //   margin: 0;
      // }

      .ant-page-header-heading-title {
        font-size: 16px;
        font-weight: normal;
        line-height: 22px;
        color: #959ba6;
        display: flex;
        align-items: center;

        svg {
          width: 30px;
          height: 30px;
          cursor: pointer;
        }
      }

      .ant-page-header-heading-sub-title {
        margin-left: 7px;
        position: relative;
        padding-left: 16px;
        font-size: 18px;
        font-weight: 600;
        color: #0e121a;
        line-height: 22px;

        &::before {
          content: ' ';
          position: absolute;
          left: 3px;
          top: 50%;
          transform: translateY(-50%);
          width: 1px;
          height: 26px;
          background: #e1e4eb;
        }
      }
    }
  }
  .layout-header-right {
    height: 100%;
    display: flex;
    align-items: center;
  }
}

.ant-dropdown-link {
  padding: 0 15px 0 10px;
  // width: 200px;
  height: 50px;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  line-height: 18px;
  display: flex;
  align-items: center;
  // cursor: pointer;
  transition: all 0.3s;

  &:hover {
    // background: #f2f4f7;
    border-radius: 8px;

    svg {
      color: var(--primary-color);
    }
  }

  .kb-name {
    margin-right: 20px;
  }
}

.kb-icon {
  flex-shrink: 0;
  flex-grow: 0;
  margin-right: 6px;
  // width: 40px;
  // height: 40px;
  // padding: 4px;
  img {
    width: 100%;
    height: 100%;
  }
}

.kb-name {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  line-height: 18px;
}

.kb-item {
  // width: 200px;
  height: 50px;
  padding: 0 16px 0 10px;

  display: flex;
  align-items: center;
  justify-content: flex-start;

  svg {
    font-size: 16px;
    color: var(--primary-color);
  }

  .kb-name {
    width: 128px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.label {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #0e121a;
  .label-back {
    width: 24px;
    color: #959ba6;
    user-select: none;
  }
}
</style>
<style lang="less">
.kb-library-list-dropdown {
  .ant-dropdown-menu-item {
    padding: 0;
  }
}
</style>
