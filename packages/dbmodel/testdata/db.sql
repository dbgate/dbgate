BEGIN TRANSACTION;
CREATE TABLE "language" ( 
  "language_id" CHARACTER(31) NOT NULL,
  "name" VARCHAR(255) NULL,
   PRIMARY KEY ("language_id")
);
CREATE TABLE "preparation_step" ( 
  "preparation_step_id" SERIAL,
  "recipe_id" INTEGER NULL,
  "description" VARCHAR NULL,
  "duration" INTERVAL NULL,
  "step_order" SMALLINT NULL,
  "language_id" CHARACTER(31) NULL,
   PRIMARY KEY ("preparation_step_id")
);
CREATE TABLE "recipe" ( 
  "recipe_id" SERIAL,
  "name" VARCHAR(1000) NOT NULL,
  "is_public" BOOLEAN NULL,
  "user_id" INTEGER NULL,
  "source_url" VARCHAR(1000) NULL,
  "cook_duration" INTERVAL NULL,
  "servings" SMALLINT NULL,
  "language_id" CHARACTER(31) NULL,
  "deleted_date" TIMESTAMP NULL,
   PRIMARY KEY ("recipe_id")
);
CREATE TABLE "recipe_has_ingredient" ( 
  "recipe_id" INTEGER NOT NULL,
  "recipe_ingredient_id" INTEGER NOT NULL,
  "unit_id" INTEGER NULL,
  "unit" VARCHAR(100) NULL,
  "name" VARCHAR(1000) NULL,
  "amount" REAL NULL,
   PRIMARY KEY ("recipe_id", "recipe_ingredient_id")
);
CREATE TABLE "recipe_photo" ( 
  "recipe_photo_id" SERIAL,
  "path" VARCHAR NULL,
  "name" VARCHAR(255) NULL,
  "recipe_id" INTEGER NULL,
  "user_id" INTEGER NULL,
  "created_on" TIMESTAMP NULL,
   PRIMARY KEY ("recipe_photo_id")
);
CREATE TABLE "shop" ( 
  "shop_id" SERIAL,
  "name" VARCHAR(255) NULL,
  "url" VARCHAR NULL,
  "logo_path" VARCHAR NULL,
   PRIMARY KEY ("shop_id")
);
CREATE TABLE "unit" ( 
  "unit_id" SERIAL,
  "name" VARCHAR(255) NOT NULL,
  "user_id" INTEGER NULL,
   PRIMARY KEY ("unit_id")
);
CREATE TABLE "user" ( 
  "user_id" SERIAL,
  "name" VARCHAR(255) NULL,
  "email" VARCHAR(255) NULL,
  "password_hash" VARCHAR NULL,
  "last_logged_on" TIMESTAMP NULL,
  "user_settings_id" INTEGER NULL,
   PRIMARY KEY ("user_id")
);
ALTER TABLE "preparation_step" ADD FOREIGN KEY ("recipe_id") REFERENCES "recipe" ("recipe_id");
ALTER TABLE "preparation_step" ADD FOREIGN KEY ("language_id") REFERENCES "language" ("language_id");
ALTER TABLE "recipe" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("user_id");
ALTER TABLE "recipe" ADD FOREIGN KEY ("language_id") REFERENCES "language" ("language_id");
ALTER TABLE "recipe_has_ingredient" ADD FOREIGN KEY ("recipe_id") REFERENCES "recipe" ("recipe_id");
ALTER TABLE "recipe_has_ingredient" ADD FOREIGN KEY ("unit_id") REFERENCES "unit" ("unit_id");
ALTER TABLE "recipe_photo" ADD FOREIGN KEY ("recipe_id") REFERENCES "recipe" ("recipe_id");
ALTER TABLE "recipe_photo" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("user_id");
COMMIT;
