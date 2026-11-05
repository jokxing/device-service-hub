import helpStyles from "./help.module.css";
import { Button, Modal } from "antd";
import { SettingOutlined } from "@ant-design/icons";
export default function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title={
        <span>
          <SettingOutlined /> 关于本地预览
        </span>
      }
      open
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          知道了
        </Button>
      }
    >
      <div className={helpStyles["help-content"]}>
        <p>
          本轮只搭建 React + TypeScript + Ant Design + Tailwind CSS 的 Web
          环境及交互预览。
        </p>
        <p>
          右上角可切换角色：报修用户仅见本人记录和授权设备；维修人员仅见被分派任务；管理员可查看全部样例。
        </p>
        <p>
          可以体验新建报修、分派、接单、提交结果和用户确认。先切换角色，再完成对应操作；刷新后全部恢复。
        </p>
        <p>
          所有设备、姓名、工单均为虚构。图片未上传；当前没有真实登录、API、数据库或服务端权限保障。
        </p>
        <p>未部署、未运行 Git；依赖、缓存和临时文件配置在 E 盘项目内。</p>
      </div>
    </Modal>
  );
}
