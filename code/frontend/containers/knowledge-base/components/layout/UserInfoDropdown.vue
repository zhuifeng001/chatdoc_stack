<template>
  <div :class="$style['dropdown-user']">
    <div :class="$style['user-info']">
      <div :class="$style['user-icon']">
        <UserCircleOutlined />
      </div>
      <div :class="$style.username">
        <div :class="$style.line">
          <span :class="$style.name">用户{{ userInfo?.account }}</span>
          <!-- <Right /> -->
        </div>
        <div :class="$style.phone">{{ userInfo?.mobile || '' }}</div>
      </div>
    </div>
    <!-- <div :class="$style['theme-config']">
      <div :class="$style['font-icon']">Aa</div>
      <div :class="$style['font-setting']">
        <div :class="$style.label">字号</div>
        <div :class="$style['font-slider']">
          <span>12</span>
          <a-slider v-model:value="fontSizeValue" :min="12" :max="18" />
          <span>18</span>
        </div>
      </div>
    </div> -->
    <div :class="$style['nav-list']">
      <NuxtLink :class="$style['nav-item']" to="/user-center/global-qa-records">
        <InfoCircleFilled />
        <span>问答记录</span>
      </NuxtLink>
      <NuxtLink :class="$style['nav-item']" @click="onLogout">
        <SignOutFilled />
        <span>退出登录</span>
      </NuxtLink>
      <!-- <div :class="$style['nav-item']">
        <CommentOutlined />
        <span>联系我们</span>
      </div> -->
      <!-- <div :class="$style['nav-item']">
        <LogOutFilled />
        <span>注销账号</span>
      </div> -->
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { useUser } from '../../store/useUser'
import UserCircleOutlined from '../../images/UserCircleOutlined.vue'
import { storeToRefs } from 'pinia'
import { Right } from '@icon-park/vue-next'
import CommentOutlined from '../../images/CommentOutlined.vue'
import SignOutFilled from '../../images/SignOutFilled.vue'
import LogOutFilled from '../../images/LogOutFilled.vue'
import InfoCircleFilled from '../../images/InfoCircleFilled.vue'
import { useTheme } from '../../store/useTheme'

const router = useRouter()
const userStore = useUser()
const { userInfo } = storeToRefs(userStore)
const { fontSizeValue } = storeToRefs(useTheme())

const onLogout = async () => {
  await userStore.logout()
  const route = useRoute()
  track({ name: '退出登录', keyword: route.fullPath })
  setTimeout(() => {
    // location.reload()
    router.push('/')
  }, 300)
}

const toRecords = () => {
  router.push('/user-center/qa-records')
}
</script>
<style lang="less" module>
.dropdown-user {
  padding: 20px;
  width: 250px;

  .user-info {
    margin-bottom: 20px;
    display: flex;
    align-items: center;

    .user-icon {
      margin-right: 8px;
      width: 42px;
      height: 42px;
      background: #ccd0d9;
      border-radius: 21px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .username {
      font-size: 16px;
      font-weight: 600;
      color: #000000;
      line-height: 16px;
      .line {
        display: flex;
        align-items: center;

        .name {
          color: #000000;
          margin-right: 4px;
        }
      }
    }

    .phone {
      margin-top: 4px;
      font-size: 14px;
      font-weight: 400;
      color: #757a85;
      line-height: 16px;
    }
  }
}

.nav-list {
  margin-top: 9px;
  padding: 8px 0px;
  display: flex;
  flex-wrap: wrap;
  // justify-content: space-between;
  justify-content: center;
  border-top: 1px solid #e1e4eb;

  .nav-item {
    // margin-right: 20px;
    padding: 12px 0 8px 0;
    width: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    font-size: 12px;
    font-weight: 400;
    color: #757a85;
    line-height: 18px;

    svg {
      margin-bottom: 8px;
      width: 20px;
      height: 20px;
    }

    &:hover {
      background: #f2f4f7;
      border-radius: 4px;
      color: var(--primary-color);
    }

    &:nth-of-type(2n) {
      margin-right: 0;
    }
  }
}

.theme-config {
  padding: 12px;
  height: 68px;
  background: #f2f4f7;
  border-radius: 8px;

  display: flex;
  align-items: center;

  .font-icon {
    width: 44px;
    height: 44px;
    background: #ffffff;
    border-radius: 8px;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 18px;
    font-weight: normal;
    color: #ccd0d9;
    line-height: 20px;
  }

  .font-setting {
    margin-left: 8px;
    width: calc(100% - 44px - 8px);

    font-size: 14px;
    font-weight: 500;
    color: #000000;
    line-height: 20px;
  }

  .font-slider {
    display: flex;
    align-items: center;

    font-size: 12px;
    font-weight: 400;
    color: #757a85;
    line-height: 18px;

    :global {
      .ant-slider {
        position: relative;
        top: 1px;
        flex-grow: 1;
        margin: 0 4px 0;
      }
      .ant-slider-rail,
      .ant-slider-track,
      .ant-slider-step {
        height: 2px;
        border-radius: 1px;
      }

      .ant-slider-rail {
        background: #e1e4eb;
      }
      .ant-slider-track {
        background: var(--primary-color) !important;
      }

      .ant-slider-handle {
        margin-top: -2px;
        width: 6px;
        height: 6px;
        border: 0;
        box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.2);
        // border-color: #c7d7f9;
        background: var(--primary-color);

        &:focus {
        }
      }
    }
  }
}
</style>
