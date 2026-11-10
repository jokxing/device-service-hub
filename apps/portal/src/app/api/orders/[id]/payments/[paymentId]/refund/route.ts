import { requestMockRefund } from "../../../../../../../features/payments/server/handlers";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await params;
  return requestMockRefund(request, id, paymentId);
}
