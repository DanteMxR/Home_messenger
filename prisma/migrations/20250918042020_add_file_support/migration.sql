-- AlterTable
ALTER TABLE "messages" ADD COLUMN "fileName" TEXT;
ALTER TABLE "messages" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "messages" ADD COLUMN "fileType" TEXT;
ALTER TABLE "messages" ADD COLUMN "fileUrl" TEXT;

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "files_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
