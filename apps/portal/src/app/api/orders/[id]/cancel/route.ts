import { cancelOrder } from "../../../../../features/orders/server/handlers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return cancelOrder(request, id);
}
