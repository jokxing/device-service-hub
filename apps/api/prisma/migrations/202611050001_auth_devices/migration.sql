CREATE TYPE "Role" AS ENUM ('admin', 'reporter', 'technician');
CREATE TABLE "User" (
  "id" TEXT NOT NULL, "username" TEXT NOT NULL, "name" TEXT NOT NULL,
  "role" "Role" NOT NULL, "passwordHash" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE TABLE "Device" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "category" TEXT NOT NULL, "location" TEXT NOT NULL, "model" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Device_code_key" ON "Device"("code");
CREATE TABLE "DeviceAccess" (
  "userId" TEXT NOT NULL, "deviceId" TEXT NOT NULL,
  CONSTRAINT "DeviceAccess_pkey" PRIMARY KEY ("userId", "deviceId"),
  CONSTRAINT "DeviceAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "DeviceAccess_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE
);
CREATE INDEX "DeviceAccess_deviceId_idx" ON "DeviceAccess"("deviceId");
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
