import { rejectQuote } from "../../../../../../features/quotes/server/handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return rejectQuote(request, id);
}
