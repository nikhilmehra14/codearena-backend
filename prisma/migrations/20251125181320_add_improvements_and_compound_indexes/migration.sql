-- CreateIndex
CREATE INDEX "contests_status_endTime_idx" ON "contests"("status", "endTime");

-- CreateIndex
CREATE INDEX "contests_platform_status_startTime_idx" ON "contests"("platform", "status", "startTime");

-- CreateIndex
CREATE INDEX "reminders_userId_isActive_idx" ON "reminders"("userId", "isActive");

-- CreateIndex
CREATE INDEX "reminders_notificationSent_isActive_scheduledTime_idx" ON "reminders"("notificationSent", "isActive", "scheduledTime");
