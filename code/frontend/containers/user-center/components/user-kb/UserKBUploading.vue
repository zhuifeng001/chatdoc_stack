<template>
  <div :class="$style['user-kb-uploading']" v-show="visible">
    <!-- <div :class="$style['upload-main']">
      <a-progress v-if="!listShowing" type="circle" :width="60" :percent="totalPercent" :strokeWidth="8" />
      <div :class="$style['upload-title']">
        <span :class="$style['upload-text']"
          >{{ isAllSuccess ? '上传成功' : '上传中' }} {{ successCount }} / {{ uploadFileList.length }}</span
        >
        <img
          src="./../../images/DefDownOutlined.svg"
          v-if="listShowing"
          :class="[$style.icon, $style['ml-10']]"
          @click.stop="fileListShow"
        />
        <img src="./../../images/DefUpOutlined.svg" v-else :class="[$style.icon, 'ml-10']" @click.stop="fileListShow" />
      </div>
      <close-outlined :class="$style['text-gray']" @click="fileListHide" />
    </div> -->

    <div v-if="listShowing" class="max-h-[200px] scroll-bar">
      <div
        class="m-[2px] flex items-center pr-3 py-2 mb-2 bg-white rounded-lg"
        style="box-shadow: 0px 1px 4px 0px rgba(3, 10, 26, 0.1)"
        v-for="item in uploadFileList"
        :key="item.name"
      >
        <FileIcon :name="item.name" />
        <div class="mx-2 grow">
          <div class="flex justify-between items-center">
            <div :class="['text-sm', 'ellipsis-1']" :title="item.name">
              {{ item.name }}
            </div>
            <div class="text-xs shrink-0">{{ formatDataSize(item.size) }}</div>
          </div>
          <a-progress class="m-0 h-5" :showInfo="false" :percent="item.percent" :size="4" />
        </div>
        <div class="">
          <template v-if="item.status === UploadTypeEnums.ACTIVE">
            <acg-tooltip
              placement="top"
              overlayClassName="acg-tooltip"
              :title="item.percent === 100 ? '解析中' : '上传中'"
            >
              <Loading3QuartersOutlined class="cursor-pointer anticon-loading anticon-spin" />
            </acg-tooltip>
          </template>
          <template v-if="item.status === UploadTypeEnums.EXCEPTION">
            <acg-tooltip placement="top" overlayClassName="acg-tooltip" :title="item.errorMsg">
              <div
                v-if="item.errorMsg === '该文档已存在'"
                class="cursor-pointer bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                重
              </div>
              <Warning v-else class="cursor-pointer w-5 h-5 flex items-center justify-center" />
            </acg-tooltip>
          </template>
          <template v-else-if="item.status === UploadTypeEnums.SUCCESS">
            <acg-tooltip placement="top" overlayClassName="acg-tooltip" title="文件上传成功">
              <CheckOutlined style="color: #25b873" class="w-5 h-5 flex items-center justify-center" />
            </acg-tooltip>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { InfoCircleOutlined, CheckOutlined } from '@ant-design/icons-vue'
import { type UploadFileItem } from './../../helpers/user-folder-file'
import Warning from '~/containers/user-center/images/Warning.vue'
import FileIcon from '~/containers/user-center/components/UserFolder/FileIcon.vue'
import { UploadTypeEnums } from '../../store/useUpload'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  uploadFileList: {
    type: Array as PropType<UploadFileItem[]>,
    default: () => []
  }
})
const emit = defineEmits(['update:visible', 'onFileChange'])

const listShowing = ref(true)

const reUpload = item => {
  Object.assign(item, {
    status: UploadTypeEnums.ACTIVE,
    percent: 0,
    loaded: 0
  })
  emit('onFileChange', item.file, item)
}
</script>
<style lang="less" module>
.user-kb-uploading {
  margin-top: 30px;
  width: 100%;
  min-height: 68px;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  z-index: 2200;
  text-align: left;

  .upload-main {
    padding: 14px 18px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .upload-title {
    display: flex;
    align-items: center;
    .upload-text {
      font-weight: 600;
      font-size: 18px;
    }

    .icon {
      width: 20px !important;
      height: 20px !important;
    }
  }
}
</style>
