import { createMockPayment } from "../../../../../features/payments/server/handlers";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return createMockPayment(request, id);
}
