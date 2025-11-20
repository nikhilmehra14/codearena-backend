-- CreateTable
CREATE TABLE "login_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" VARCHAR(500),
    "deviceInfo" VARCHAR(255),
    "browser" VARCHAR(100),
    "os" VARCHAR(100),
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_activities_userId_idx" ON "login_activities"("userId");

-- CreateIndex
CREATE INDEX "login_activities_loginAt_idx" ON "login_activities"("loginAt");

-- CreateIndex
CREATE INDEX "login_activities_ipAddress_idx" ON "login_activities"("ipAddress");

-- AddForeignKey
ALTER TABLE "login_activities" ADD CONSTRAINT "login_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
