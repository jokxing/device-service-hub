import { notFound } from "next/navigation";
import AlipaySandboxReturn from "../../../features/payments/components/AlipaySandboxReturn";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "返回订单",
  robots: { index: false, follow: false },
};
export default async function AlipayReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string | string[] }>;
}) {
  const { orderId } = await searchParams;
  if (
    typeof orderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      orderId,
    )
  )
    notFound();
  // Public navigation bridge only. The destination enforces the portal session and ownership.
  return <AlipaySandboxReturn orderId={orderId} />;
}
