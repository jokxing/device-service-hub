import { StyleSheet, Text, View } from "react-native";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import { colors, fontSizes, spacing, lineHeights } from "../../shared/theme";
import { ROLE_GUIDES } from "./content";

export default function GuideScreen() {
  return (
    <Screen dense>
      <Text style={styles.intro}>
        准备清晰的设备与问题信息，有助于维修人员定位故障。
      </Text>

      <ContentCard title="提交前准备">
        <Text style={styles.body}>
          核对设备编号、安装位置，记录故障现象与发生时间。问题描述尽量具体，便于安排处理；待分派阶段还可补充现场照片。
        </Text>
      </ContentCard>

      <ContentCard title="服务角色与访问范围">
        <View style={styles.roles}>
          {ROLE_GUIDES.map((item) => (
            <View key={item.role} style={styles.role}>
              <Text style={styles.roleTitle}>{item.title}</Text>
              <Text style={styles.meta}>{item.description}</Text>
            </View>
          ))}
        </View>
      </ContentCard>

      <ContentCard title="维修完成后">
        <Text style={styles.body}>
          先核对处理说明与设备实际情况，再确认完成。确认后工单结束，当前不支持撤销或重新打开。
        </Text>
      </ContentCard>

      <Text style={styles.note}>
        当前支持登录、授权设备查询、扫码核对、文字报修、现场照片、本人记录与订单跟进；管理员分派请使用
        Web 后台。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: colors.muted,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  body: {
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.relaxed,
  },
  roles: { gap: spacing.sm },
  role: { gap: spacing.xxs },
  roleTitle: {
    color: colors.text,
    fontSize: fontSizes.body,
    fontWeight: "600",
  },
  meta: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
  note: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
});
