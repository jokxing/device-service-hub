CREATE TYPE "AlipayCheckoutKind" AS ENUM ('page', 'app');
ALTER TABLE "AlipaySandboxPayment" ADD COLUMN "checkoutKind" "AlipayCheckoutKind" NOT NULL DEFAULT 'page';
