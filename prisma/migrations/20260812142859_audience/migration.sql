-- CreateTable
CREATE TABLE "AudienceDay" (
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AudienceDay_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "AudiencePage" (
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AudiencePage_pkey" PRIMARY KEY ("day","path")
);

-- CreateTable
CREATE TABLE "AudienceVisitor" (
    "day" DATE NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AudienceVisitor_pkey" PRIMARY KEY ("day","hash")
);

-- CreateIndex
CREATE INDEX "AudiencePage_day_idx" ON "AudiencePage"("day");

-- CreateIndex
CREATE INDEX "AudienceVisitor_day_idx" ON "AudienceVisitor"("day");
