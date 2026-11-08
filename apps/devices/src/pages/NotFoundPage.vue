<script setup lang="ts">
import { RouterLink } from "vue-router";
import controls from "../shared/styles/controls.module.css";
</script>
<template>
  <section>
    <h2>设备页面不存在</h2>
    <RouterLink to="/" :class="controls.link">返回设备台账</RouterLink>
  </section>
</template>
