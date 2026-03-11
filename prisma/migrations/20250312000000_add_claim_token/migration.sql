-- CreateTable: ClaimToken for "Claim this business" flow
CREATE TABLE "ClaimToken" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClaimToken_token_key" ON "ClaimToken"("token");

ALTER TABLE "ClaimToken" ADD CONSTRAINT "ClaimToken_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
