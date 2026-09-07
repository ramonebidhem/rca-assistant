-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('step', 'check');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('OK', 'NG');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin');

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_path" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failure_types" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_path" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failure_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "root_causes" (
    "id" SERIAL NOT NULL,
    "failure_type_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "root_causes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "root_cause_steps" (
    "id" SERIAL NOT NULL,
    "root_cause_id" INTEGER NOT NULL,
    "step_no" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "type" "StepType" NOT NULL DEFAULT 'step',

    CONSTRAINT "root_cause_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "root_cause_id" INTEGER NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "file_path" TEXT NOT NULL,
    "caption" TEXT,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestions" (
    "id" SERIAL NOT NULL,
    "failure_type_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "photo_path" TEXT,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'pending',
    "admin_comment" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'admin',
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "failure_types_category_id_name_key" ON "failure_types"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "root_causes_failure_type_id_title_key" ON "root_causes"("failure_type_id", "title");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "failure_types" ADD CONSTRAINT "failure_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_causes" ADD CONSTRAINT "root_causes_failure_type_id_fkey" FOREIGN KEY ("failure_type_id") REFERENCES "failure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_cause_steps" ADD CONSTRAINT "root_cause_steps_root_cause_id_fkey" FOREIGN KEY ("root_cause_id") REFERENCES "root_causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_root_cause_id_fkey" FOREIGN KEY ("root_cause_id") REFERENCES "root_causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_failure_type_id_fkey" FOREIGN KEY ("failure_type_id") REFERENCES "failure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
