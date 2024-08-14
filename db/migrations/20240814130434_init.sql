-- migrate:up
----------------------------------------
-- IAM - Identity & Access Management --
----------------------------------------
CREATE TABLE "app_user" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL
);

CREATE TABLE "provider_login" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider_id" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "provider_login_unique_id" UNIQUE ("provider_id", "subject_id"),
  CONSTRAINT "provider_login_unique_email" UNIQUE ("user_id", "email"),
  CONSTRAINT "provider_login_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "app_user" ("id") ON DELETE CASCADE ON UPDATE no ACTION
);

CREATE TABLE "question" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL
);

CREATE TABLE "option" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "question_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "option_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "question" ("id") ON DELETE CASCADE ON UPDATE no ACTION
);

-- migrate:down
