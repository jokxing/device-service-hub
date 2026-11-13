import { sandboxCommand } from "../../../../../../../features/payments/server/alipay-sandbox";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await params;
  return sandboxCommand(request, id, paymentId, "close");
}
