<script setup lang="ts">
import { useRoute, RouterLink } from "vue-router";
import { useApiResource } from "../../shared/composables/useApiResource";
import { useSession } from "../auth/session";
import { useServiceNavigation } from "../../app/bridge";
import { devicesApi } from "./api";
import controls from "../../shared/styles/controls.module.css";
const route = useRoute(),
  session = useSession(),
  navigate = useServiceNavigation();
const {
  data: device,
  loading,
  error,
  refresh,
} = useApiResource(
  (signal) => devicesApi.detail(String(route.params.id), signal),
  session.clear,
);
</script>
<template>
  <RouterLink to="/" :class="controls.link">← 返回设备台账</RouterLink>
  <section :class="$style.panel">
    <p v-if="loading" role="status">正在读取设备详情…</p>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <button :class="controls.button" @click="refresh">重新读取</button>
    </div>
    <template v-else-if="device">
      <div :class="$style.heading">
        <div>
          <span :class="$style.code">{{ device.code }}</span>
          <h2>{{ device.name }}</h2>
        </div>
        <span
          :class="[
            controls.tag,
            device.enabled ? controls.enabled : controls.disabled,
          ]"
          >{{ device.enabled ? "启用" : "停用" }}</span
        >
      </div>
      <dl :class="$style.fields">
        <div>
          <dt>设备类别</dt>
          <dd>{{ device.category }}</dd>
        </div>
        <div>
          <dt>设备型号</dt>
          <dd>{{ device.model }}</dd>
        </div>
        <div>
          <dt>安装位置</dt>
          <dd>{{ device.location }}</dd>
        </div>
      </dl>
      <div :class="$style.actions">
        <button
          :class="controls.primary"
          @click="
            navigate({ version: 1, action: 'open-device', deviceId: device.id })
          "
        >
          在服务后台查看</button
        ><button :class="controls.button" :disabled="loading" @click="refresh">
          刷新详情
        </button>
      </div>
    </template>
  </section>
</template>
<style module>
.panel {
  margin-top: 20px;
  padding: 28px;
  border: 1px solid var(--device-border);
  border-radius: 12px;
  background: white;
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}
.heading h2 {
  font-size: 24px;
  margin: 8px 0 0;
}
.code {
  color: var(--device-secondary);
}
.fields {
  margin: 32px 0;
}
.fields div {
  display: flex;
  gap: 20px;
  margin: 20px 0;
}
.fields dt {
  color: var(--device-secondary);
  flex: 0 0 70px;
}
.fields dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--device-border);
}
@media (max-width: 767px) {
  .panel {
    padding: 24px 20px;
  }
  .heading h2 {
    font-size: 21px;
  }
}
</style>
