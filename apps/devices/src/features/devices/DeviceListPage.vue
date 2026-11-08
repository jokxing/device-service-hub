<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useApiResource } from "../../shared/composables/useApiResource";
import { useSession } from "../auth/session";
import { devicesApi } from "./api";
import controls from "../../shared/styles/controls.module.css";
const session = useSession();
const {
  data: devices,
  loading,
  error,
  refresh,
} = useApiResource(devicesApi.list, session.clear);
</script>
<template>
  <section :class="$style.panel">
    <div :class="$style.heading">
      <h2>
        可访问设备 <span v-if="devices">{{ devices.length }}</span>
      </h2>
      <button :class="controls.button" :disabled="loading" @click="refresh">
        刷新设备
      </button>
    </div>
    <p v-if="loading" role="status" :class="$style.feedback">正在读取设备…</p>
    <div v-else-if="error" role="alert" :class="$style.feedback">
      <p>{{ error }}</p>
      <button :class="controls.button" @click="refresh">重新读取</button>
    </div>
    <p v-else-if="!devices?.length" :class="$style.feedback">
      当前账号暂无可访问的设备
    </p>
    <ul v-else :class="$style.grid" aria-label="授权设备列表">
      <li v-for="device in devices" :key="device.id" :class="$style.card">
        <div :class="$style.meta">
          <span>{{ device.code }}</span
          ><span
            :class="[
              controls.tag,
              device.enabled ? controls.enabled : controls.disabled,
            ]"
            >{{ device.enabled ? "启用" : "停用" }}</span
          >
        </div>
        <h3>{{ device.name }}</h3>
        <dl>
          <div>
            <dt>设备类别</dt>
            <dd>{{ device.category }}</dd>
          </div>
          <div>
            <dt>安装位置</dt>
            <dd>{{ device.location }}</dd>
          </div>
        </dl>
        <RouterLink
          :class="controls.link"
          :to="'/' + encodeURIComponent(device.id)"
          >查看设备详情 →</RouterLink
        >
      </li>
    </ul>
  </section>
</template>
<style module>
.panel {
  border: 1px solid var(--device-border);
  border-radius: 12px;
  background: white;
  padding: 24px;
}
.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.heading h2 {
  margin: 0;
  font-size: 18px;
}
.heading h2 span {
  color: var(--device-secondary);
  font-size: 14px;
  margin-left: 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.card {
  padding: 24px;
  border: 1px solid var(--device-border);
  border-radius: 10px;
  min-width: 0;
}
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--device-secondary);
}
.card h3 {
  font-size: 20px;
  margin: 20px 0;
}
.card dl {
  margin: 0 0 24px;
}
.card dl div {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}
.card dt {
  flex: 0 0 70px;
  color: var(--device-secondary);
}
.card dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.feedback {
  padding: 24px 0;
  color: var(--device-secondary);
}
@media (max-width: 767px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .panel {
    padding: 20px;
  }
  .card {
    padding: 20px;
  }
}
</style>
