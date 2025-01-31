CREATE TABLE "public"."cities" ( 
  "id" SERIAL,
  "name" VARCHAR(250) NULL,
  "location" VARCHAR(500) NULL,
  CONSTRAINT "PK_cities" PRIMARY KEY ("id")
);
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (1, 'Praha', 'POLYGON((14.2 50,14.2 50.15,14.6 50.15,14.6 50,14.2 50))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (2, 'Brno', 'POLYGON((16.5 49.1,16.5 49.3,16.8 49.3,16.8 49.1,16.5 49.1))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (3, 'Ostrava', 'POLYGON((18.15 49.7,18.15 49.9,18.4 49.9,18.4 49.7,18.15 49.7))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (4, 'Plzeň', 'POLYGON((13.3 49.7,13.3 49.8,13.5 49.8,13.5 49.7,13.3 49.7))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (5, 'Olomouc', 'POLYGON((17.2 49.5,17.2 49.65,17.3 49.65,17.3 49.5,17.2 49.5))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (6, 'Liberec', 'POLYGON((14.9 50.7,14.9 50.8,15.1 50.8,15.1 50.7,14.9 50.7))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (7, 'České Budějovice', 'POLYGON((14.4 48.9,14.4 49,14.6 49,14.6 48.9,14.4 48.9))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (8, 'Hradec Králové', 'POLYGON((15.7 50.1,15.7 50.3,16 50.3,16 50.1,15.7 50.1))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (9, 'Pardubice', 'POLYGON((15.7 49.9,15.7 50.1,15.9 50.1,15.9 49.9,15.7 49.9))');
INSERT INTO "public"."cities" ("id", "name", "location") VALUES (10, 'Ústí nad Labem', 'POLYGON((13.9 50.6,13.9 50.7,14.2 50.7,14.2 50.6,13.9 50.6))');
