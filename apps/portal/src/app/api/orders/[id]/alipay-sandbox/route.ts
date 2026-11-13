import { sandboxCommand } from "../../../../../features/payments/server/alipay-sandbox";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return sandboxCommand(request, (await params).id);
}
