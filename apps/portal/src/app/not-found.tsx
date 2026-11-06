import Link from "next/link";
import styles from "../shared/components/PortalPage.module.css";
export default function NotFound() {
  return (
    <section className={styles.error}>
      <h1>未找到可访问的页面</h1>
      <p>记录可能不存在，或当前账号没有访问权限。</p>
      <Link href="/devices" prefetch={false}>
        返回我的设备
      </Link>
    </section>
  );
}
