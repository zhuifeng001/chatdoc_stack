<template>
  <div :class="$style['user-wrapper']">
    <!-- <div v-show="userToken" :class="$style.username" @click="toKBPage">
      <UserOutlined2 style="margin-right: 4px" />
      {{ isUserCenter ? '财经知识库' : '我的知识库' }}
    </div> -->

    <a-popover
      v-if="userToken"
      v-model:open="popoverVisible"
      :showArrow="false"
      placement="bottomRight"
      overlayClassName="user-info-dropdown"
    >
      <div>
        <!-- <div v-show="!isUserCenter" :class="$style.username">你好，用户{{ userInfo.account }}</div> -->
        <div :class="$style['menu_btn']">
          <div :class="$style['user-avatar']">
            <AccountCircle />
          </div>
          <!-- <Down :class="$style.user_down_icon" /> -->
        </div>
      </div>

      <template v-slot:content>
        <UserInfoDropdown v-if="userToken" />
        <!-- <UserUnLoginDropdown v-else @close="popoverVisible = false" /> -->
      </template>
    </a-popover>
    <a-button :class="$style['login-btn']" v-else type="primary" @click.stop="store.showLogin">登录/注册</a-button>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'
import UserInfoDropdown from './UserInfoDropdown.vue'
import UserUnLoginDropdown from './UserUnLoginDropdown.vue'
import { useUser } from '../../store/useUser'
import { storeToRefs } from 'pinia'
import { Down } from '@icon-park/vue-next'
import AccountCircle from '../../images/AccountCircle.vue'
import UserOutlined2 from '~/containers/user-center/images/UserOutlined2.vue'

const route = useRoute()
const router = useRouter()
const isUserCenter = computed(() => route.path.includes('/user-center/'))

const store = useUser()
const { userToken, userInfo } = storeToRefs(store)

const popoverVisible = ref(false)
</script>

<style lang="less" module>
.user-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.username {
  margin-right: 12px;
  font-size: 15px;
  font-weight: bold;
  color: #333;
  line-height: 20px;
  // text-shadow: 0 0 1px rgba(255, 255, 255, 1);

  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--primary-color);
    text-shadow: 0 0 1px rgba(255, 255, 255, 1);
  }
}

.menu_btn {
  display: flex;
  align-items: center;
  cursor: pointer;

  .user_down_icon {
    margin-left: 8px;
    font-size: 14px;
    color: rgb(145, 145, 146);
  }

  &:hover {
    .user_down_icon {
      color: rgb(100, 100, 100);
    }
  }
}

.user-avatar {
  width: 30px;
  height: 30px;
  background: #e1e4eb;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 14px;
    height: 14px;
  }
}

.login-btn {
  border-radius: 4px;
}
</style>
<style lang="less">
.user-info-dropdown {
  .ant-popover-inner {
    background: #ffffff;
    box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
    border-radius: 6px;
  }
}
</style>
