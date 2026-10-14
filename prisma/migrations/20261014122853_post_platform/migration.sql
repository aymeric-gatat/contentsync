/*
  Warnings:

  - Added the required column `platform` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "platform" "Platform" NOT NULL,
ALTER COLUMN "channelId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Post_masterPostId_idx" ON "Post"("masterPostId");
