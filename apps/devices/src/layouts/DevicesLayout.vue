<script setup lang="ts">
import { provide } from "vue";
import { RouterView } from "vue-router";
import { createSession, sessionKey } from "../features/auth/session";
import { useServiceNavigation } from "../app/bridge";
import controls from "../shared/styles/controls.module.css";
const session = createSession();
provide(sessionKey, session);
const { user, loading, error, anonymous, retry } = session;
const navigate = useServiceNavigation();
const roles = { admin: "管理员", reporter: "报修用户", technician: "维修人员" };
</script>
<template>
  <div :class="$style.page">
    <header :class="$style.header">
      <div>
        <span :class="$style.brand">DEVICE SERVICE HUB</span>
        <h1>设备台账</h1>
        <p>查看设备信息、安装位置与当前启用状态。</p>
      </div>
      <div :class="$style.identity">
        <span v-if="user">{{ user.name }} · {{ roles[user.role] }}</span
        ><button
          :class="controls.button"
          @click="navigate({ version: 1, action: 'sign-in' })"
        >
          前往服务后台
        </button>
      </div>
    </header>
    <p v-if="loading" role="status" :class="$style.feedback">
      正在核对登录状态…
    </p>
    <section v-else-if="anonymous" :class="$style.feedback">
      <h2>请先登录设备服务</h2>
      <p>登录后查看当前账号有权访问的设备。</p>
      <button
        :class="controls.primary"
        @click="navigate({ version: 1, action: 'sign-in' })"
      >
        前往登录
      </button>
    </section>
    <section v-else-if="error" role="alert" :class="$style.feedback">
      <p>{{ error }}</p>
      <button :class="controls.button" @click="retry">重新读取</button>
    </section>
    <RouterView v-else-if="user" :key="user.id" />
  </div>
</template>
<style module>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 28px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 28px;
}
.brand {
  color: var(--device-secondary);
  letter-spacing: 1.5px;
  font-size: 12px;
}
.header h1 {
  font-size: 26px;
  margin: 8px 0;
}
.header p {
  color: var(--device-secondary);
  margin: 0;
}
.identity {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.feedback {
  padding: 28px;
  border: 1px solid var(--device-border);
  border-radius: 10px;
  background: white;
}
.feedback h2 {
  margin-top: 0;
  font-size: 20px;
}
.feedback p {
  color: var(--device-secondary);
}
@media (max-width: 767px) {
  .page {
    padding: 24px 16px;
  }
}
</style>
