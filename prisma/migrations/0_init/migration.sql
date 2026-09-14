-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'CENTER_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STUDENT', 'CENTER', 'PREMIUM');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('B1', 'B2');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TITLE_MATCHING', 'MULTIPLE_CHOICE', 'AD_MATCHING', 'CLOZE_DROPDOWN', 'WRITING');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('AUDIO_CHECK', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'SCORED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('FLUTTERWAVE', 'STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "emailVerified" TIMESTAMP(3),
    "planExpiresAt" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 2,
    "centerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Center" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "seats" INTEGER,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPart" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "sharedContent" JSONB,
    "audioUrl" TEXT,

    CONSTRAINT "ExamPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "content" JSONB NOT NULL,
    "answerKey" JSONB,
    "points" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'AUDIO_CHECK',
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "audioPlayed" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL,
    "maxPoints" DOUBLE PRECISION NOT NULL,
    "sectionScores" JSONB NOT NULL,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_centerId_idx" ON "User"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "Center_ownerId_key" ON "Center"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Center_inviteCode_key" ON "Center"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationToken_email_idx" ON "VerificationToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "ExamPart_examId_idx" ON "ExamPart"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamPart_examId_sectionId_partId_key" ON "ExamPart"("examId", "sectionId", "partId");

-- CreateIndex
CREATE INDEX "Question_partId_idx" ON "Question"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_partId_position_key" ON "Question"("partId", "position");

-- CreateIndex
CREATE INDEX "ExamSession_userId_idx" ON "ExamSession"("userId");

-- CreateIndex
CREATE INDEX "ExamSession_examId_idx" ON "ExamSession"("examId");

-- CreateIndex
CREATE INDEX "Answer_sessionId_idx" ON "Answer"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sessionId_questionId_key" ON "Answer"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_sessionId_key" ON "Result"("sessionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Center" ADD CONSTRAINT "Center_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPart" ADD CONSTRAINT "ExamPart_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_partId_fkey" FOREIGN KEY ("partId") REFERENCES "ExamPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
