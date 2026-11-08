import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { StyleProvider, createCache } from "@ant-design/cssinjs";
import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "../App";
import { theme } from "./theme";
import "../styles/global.css";

export function createApplication(element: HTMLElement, basename?: string) {
  const scope = element.getRootNode();
  const shadow = scope instanceof ShadowRoot ? scope : undefined;
  const popupContainer = shadow ? () => element : undefined;
  const root = createRoot(element);
  const cache = createCache();
  flushSync(() =>
    root.render(
      <StrictMode>
        <StyleProvider cache={cache} container={shadow}>
          <ConfigProvider
            locale={zhCN}
            theme={theme}
            getPopupContainer={popupContainer}
          >
            <AntdApp
              message={{ getContainer: popupContainer }}
              notification={{ getContainer: popupContainer }}
            >
              <App basename={basename} />
            </AntdApp>
          </ConfigProvider>
        </StyleProvider>
      </StrictMode>,
    ),
  );
  return () => root.unmount();
}
