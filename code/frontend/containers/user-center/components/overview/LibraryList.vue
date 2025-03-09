<template>
  <a-tabs v-model:activeKey="activeKey" :class="$style['tab-wrapper']">
    <a-tab-pane key="1" tab="官方知识库">
      <div :class="$style['data-box']">
        <FolderLayout v-if="loading" v-for="(item, i) in new Array(rowNum)" :key="i" :row="6">
          <a-skeleton-button active block />
        </FolderLayout>
        <FolderLayout v-else v-for="item in curData" :key="item.id" :row="6">
          <UserKBFolder :source="item" @click="detail(item)" hiddenMenu />
        </FolderLayout>
      </div>
    </a-tab-pane>
    <a-tab-pane key="2" tab="自定义知识库">
      <div :class="$style['data-box']">
        <FolderLayout v-if="loading" v-for="(item, i) in new Array(rowNum)" :key="i" :row="6">
          <a-skeleton-button active block />
        </FolderLayout>
        <FolderLayout v-else v-for="item in curData" :key="item.id" :row="6">
          <UserKBFolder :source="item" @click="detail(item, true)" hiddenMenu />
        </FolderLayout>
      </div>
    </a-tab-pane>
  </a-tabs>
  <div :class="$style['footer-pagination']">
    <span>共 {{ page.total }} 条</span>
    <a-pagination v-model:current="page.current" :pageSize="pageSize" simple :total="page.total" />
  </div>
</template>
<script lang="ts" setup>
import { getKBLibraryList } from '@/api/knowledge-base'
import FolderLayout from './FolderLayout.vue'
import UserKBFolder from '../user-kb/UserKBFolder.vue'

const activeKey = ref('1')
const officialData = ref<any[]>([])
const userData = ref<any[]>([])
const page = ref({ current: 1, total: 0 })
const loading = ref(true)
const rowNum = 6
const pageSize = 12

onMounted(() => {
  getData()
})

watch([activeKey], () => {
  if (activeKey.value === '1') {
    page.value = { total: officialData.value.length, current: 1 }
  } else {
    page.value = { total: userData.value.length, current: 1 }
  }
})

const curData = computed(() => {
  const list = activeKey.value === '1' ? officialData.value : userData.value
  const { current } = page.value
  const res = list.slice((current - 1) * pageSize, current * pageSize)
  return res
})

const getData = async () => {
  loading.value = true
  const { data } = await getKBLibraryList()
  for (const item of data) {
    if (item.type === 10) {
      userData.value.push(...item.children)
    } else {
      officialData.value.push(item)
    }
  }
  page.value = { total: officialData.value.length, current: 1 }
  loading.value = false
}

const detail = (item, type?: boolean) => {
  if (type) {
    navigateTo(`/user-center/user-kb/${item.id}`)
  } else {
    navigateTo('/')
  }
}
</script>
<style lang="less" module>
.tab-wrapper {
  margin-top: 4px;
  :global {
    .ant-tabs-nav {
      margin-bottom: 20px;
      &::before {
        display: none;
      }
    }
  }

  .data-box {
    display: flex;
    flex-wrap: wrap;
    padding: 0 1px;

    :global {
      .ant-skeleton-button {
        height: 100%;
      }
    }
  }
}
.footer-pagination {
  display: flex;
  justify-content: space-between;
}
</style>
