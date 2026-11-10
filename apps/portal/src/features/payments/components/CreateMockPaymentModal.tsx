"use client";
import { useState } from "react";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { createMockPayment } from "../api";
export default function CreateMockPaymentModal({
  order,
  onClose,
}: {
  order: Pick<ServiceOrderRecord, "id" | "code" | "totalCents">;
  onClose: () => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const { submitting, error, run } = useApiMutation(
    "尚未确认模拟支付单创建结果，可重试，或关闭后刷新查看。",
    () => window.location.replace("/login"),
  );
  return (
    <MutationModal
      title="创建模拟支付单"
      okText="确认创建模拟支付单"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() =>
        run(
          (signal) => createMockPayment(order.id, { requestId }, signal),
          () => window.location.reload(),
        )
      }
    >
      <p>
        <strong>{order.code}</strong>
      </p>
      <p>订单金额：¥{formatCents(order.totalCents)}（人民币）</p>
      <p>渠道：本地模拟</p>
      <p>
        确认后只生成待支付记录，不会扣款，也不代表付款成功。金额以服务端订单快照为准。
      </p>
    </MutationModal>
  );
}
