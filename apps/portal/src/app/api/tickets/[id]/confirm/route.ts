import { confirmTicket } from "../../../../../features/tickets/server/handlers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return confirmTicket(request, id);
}
