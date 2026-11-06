import { Button, Result, Spin } from "antd";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../app/routes";
import { useSession } from "../sessionContext";
import styles from "../auth.module.css";

export default function SessionFeedback() {
  const { status, retry } = useSession();
  return (
    <div className={styles.feedback}>
      {status === "loading" ? (
        <Spin tip="正在检查登录状态">
          <div className={styles.loading} />
        </Spin>
      ) : (
        <Result
          status="warning"
          title="设备服务暂时不可用"
          subTitle="请确认本地服务已启动，然后重新连接。"
          extra={[
            <Button key="retry" type="primary" onClick={retry}>
              重新连接
            </Button>,
            <Link key="demo" to={ROUTES.tickets}>
              查看工单演示
            </Link>,
          ]}
        />
      )}
    </div>
  );
}
