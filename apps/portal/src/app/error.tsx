"use client";
import { Button } from "antd";
import styles from "../shared/components/PortalPage.module.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className={styles.error} role="alert">
      <h1>设备服务暂时不可用</h1>
      <p>请稍后重试，或刷新页面重新连接。</p>
      <Button onClick={reset}>重试</Button>
    </section>
  );
}
