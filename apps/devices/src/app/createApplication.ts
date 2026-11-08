import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "../App.vue";
import DeviceListPage from "../features/devices/DeviceListPage.vue";
import DeviceDetailPage from "../features/devices/DeviceDetailPage.vue";
import NotFoundPage from "../pages/NotFoundPage.vue";
import { navigationKey } from "./bridge";
import type { ServiceNavigation } from "./bridge";
import "../shared/styles/base.css";

export async function createApplication(
  element: HTMLElement,
  basePath = "/",
  onNavigate?: ServiceNavigation,
) {
  const history = createWebHistory(basePath);
  const router = createRouter({
    history,
    routes: [
      { path: "/", component: DeviceListPage },
      { path: "/:id", component: DeviceDetailPage },
      { path: "/:pathMatch(.*)*", component: NotFoundPage },
    ],
  });
  const app = createApp(App);
  app.provide(
    navigationKey,
    onNavigate ??
      ((request) => {
        const route =
          request.action === "sign-in"
            ? "/login"
            : `/service/devices?deviceId=${encodeURIComponent(request.deviceId)}`;
        window.location.assign("http://127.0.0.1:5173" + route);
      }),
  );
  app.use(router);
  try {
    await router.isReady();
    app.mount(element);
  } catch (error) {
    history.destroy();
    throw error;
  }
  return () => {
    app.unmount();
    history.destroy();
  };
}
