<template>
  <table :class="[$style['w-100'], $style['table'], $style['table-hover']]">
    <thead class="ant-table-thead">
      <tr class="text-nowrap-title">
        <th>
          <Sort @change="sort => changeSortType(sort, 'name')"> 文件名称 </Sort>
        </th>
        <th>
          <Sort @change="sort => changeSortType(sort, 'updateTime')"> 更新时间 </Sort>
        </th>
        <th>
          <Sort @change="sort => changeSortType(sort, 'createTime')"> 创建时间 </Sort>
        </th>
        <th>
          <Sort @change="sort => changeSortType(sort, 'size')"> 文件大小 </Sort>
        </th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody v-if="dataList.length">
      <tr v-for="(item, i) in getDatalist(dataList)" :key="item.id">
        <td>
          <div :class="$style['item-info']">
            <div :class="$style['item-image']">
              <a-image v-if="item.extraData?.cover" :src="getDocumentImage(item.extraData?.cover)" alt="" />
              <img v-else :class="$style['fallback-img']" src="@/assets/images/FileDocumentFilled.svg" alt="" />
            </div>
            <span :class="$style['item-name']" :title="item.name">{{ item.name }}</span>
          </div>
        </td>
        <td width="300">{{ docTime(item.updateTime) }}</td>
        <td width="300">{{ docTime(item.createTime) }}</td>
        <td width="300">{{ docSize(item) }}</td>
        <td width="300">
          <slot name="operation">
            <a-button type="link" @click="emit('toAsk', item)">提问</a-button>
            <a-button type="link" danger @click="emit('fileDelete', item)">删除</a-button>
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>
<script lang="ts" setup>
import { getDocumentImage } from '~/api'
import Sort from '@/components/kit/Sort.vue'
import { useFileStore } from '../../store/useFileStore'

const fileStore = useFileStore()
const { listSearchCondition } = storeToRefs(fileStore)
const props = defineProps({
  dataList: {
    type: Array as PropType<any[]>,
    default: () => []
  }
})

const emit = defineEmits(['fileDelete', 'toAsk'])

const changeSortType = (sort, type) => {
  Object.assign(listSearchCondition.value, {
    sortType: sort || 'ASC',
    sort: type
  })
  fileStore.getFolderFile()
}

const getDatalist = list => {
  // TODO 是否需要过滤文件夹
  return list.filter(item => item._type === 'file')
}

const docSize = computed(() => {
  return item => {
    const size = item.extraData?.documentSize
    if (typeof size !== 'number') return ''
    if (size < 1024) {
      return size + 'B'
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + 'KB'
    } else {
      return (size / 1024 / 1024).toFixed(2) + 'MB'
    }
  }
})

const docTime = computed(() => {
  return time => {
    return time.split('T')[0]
  }
})
</script>
<style lang="less" module>
.w-100 {
  width: 100%;
}

.table td,
.table th {
  padding: 0.75rem;
  border-top: 1px solid #dee2e6;
}

.table-hover > tbody > tr:hover > td,
.table-hover > tbody > tr:hover > th {
  background-color: #f2f4f7;
}

.item-info {
  display: flex;
  align-items: center;
}

.item-image {
  width: 64px;
  height: 100px;

  img {
    max-height: calc(100% - 8px);
  }

  .fallback-img {
    width: 64px;
    height: 100px;
  }
}
.item-name {
  margin-left: 10px;
  margin-right: 20px;
  max-width: 400px;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
