-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "site_name" TEXT NOT NULL DEFAULT 'Défauthèque',
    "slogan" TEXT NOT NULL DEFAULT 'Find the cause. Fix it right.',
    "logo_path" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
