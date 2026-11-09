import { acceptQuote } from "../../../../../../features/quotes/server/handlers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return acceptQuote(request, id);
}
