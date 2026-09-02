-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('ACTIVE', 'SOLVED', 'FAILED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'HARD', 'EXTREME');

-- CreateEnum
CREATE TYPE "ClueType" AS ENUM ('NEXT_LOCATION', 'VILLAIN', 'WARNING', 'CAPTURE', 'VILLAIN_ATTRIBUTE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "min_xp" INTEGER NOT NULL DEFAULT 0,
    "max_xp" INTEGER,
    "mission_select_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "difficulty_modifier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "detective_name" TEXT NOT NULL,
    "rank_id" INTEGER,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "reputation_score" INTEGER NOT NULL DEFAULT 0,
    "cases_solved" INTEGER NOT NULL DEFAULT 0,
    "cases_failed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_difficulty" (
    "id" SERIAL NOT NULL,
    "code" "Difficulty" NOT NULL,
    "max_fails_allowed" INTEGER NOT NULL DEFAULT 0,
    "visits_buffer" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_difficulty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_rules" (
    "id" SERIAL NOT NULL,
    "difficulty_id" INTEGER NOT NULL,
    "xp_base" INTEGER NOT NULL,
    "bonus_time_factor" DECIMAL(6,3) NOT NULL DEFAULT 1.0,
    "bonus_precision" INTEGER NOT NULL DEFAULT 0,
    "debuff_failure_factor" DECIMAL(6,3) NOT NULL DEFAULT 1.0,

    CONSTRAINT "xp_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_rules" (
    "id" SERIAL NOT NULL,
    "min_rep" INTEGER NOT NULL,
    "max_rep" INTEGER NOT NULL,
    "debuff_base_factor" DECIMAL(6,3) NOT NULL DEFAULT 1.0,
    "bonus_multiplier" DECIMAL(6,3) NOT NULL DEFAULT 1.0,

    CONSTRAINT "reputation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" INTEGER,
    "cultural_info" TEXT,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_neighbors" (
    "country_id" INTEGER NOT NULL,
    "neighbor_country_id" INTEGER NOT NULL,

    CONSTRAINT "country_neighbors_pkey" PRIMARY KEY ("country_id","neighbor_country_id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country_id" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description_prompt" TEXT,
    "image_url" TEXT,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_time_overrides" (
    "from_city_id" INTEGER NOT NULL,
    "to_city_id" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,

    CONSTRAINT "travel_time_overrides_pkey" PRIMARY KEY ("from_city_id","to_city_id")
);

-- CreateTable
CREATE TABLE "attr_sex" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "attr_sex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attr_hair" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "attr_hair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attr_hobby" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "attr_hobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attr_vehicle" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "attr_vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attr_feature" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "attr_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_cases" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "stolen_object" TEXT,
    "intro_text" TEXT,
    "start_time" TIMESTAMP(3),
    "time_limit_hours" INTEGER,
    "difficulty_id" INTEGER NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "warrant_suspect_id" TEXT,
    "capture_place_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "active_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_route" (
    "active_case_id" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,
    "step_order" INTEGER NOT NULL,
    "clues_generated_json" JSONB,
    "visited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "case_route_pkey" PRIMARY KEY ("active_case_id","step_order")
);

-- CreateTable
CREATE TABLE "case_time_state" (
    "case_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "deadline_time" TIMESTAMP(3) NOT NULL,
    "current_time" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',

    CONSTRAINT "case_time_state_pkey" PRIMARY KEY ("case_id")
);

-- CreateTable
CREATE TABLE "case_current_view" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,
    "step_order" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_current_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_travel_log" (
    "id" TEXT NOT NULL,
    "active_case_id" TEXT NOT NULL,
    "from_city_id" INTEGER NOT NULL,
    "to_city_id" INTEGER NOT NULL,
    "step_order" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "arrival_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_travel_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_performance" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "difficulty_code" INTEGER NOT NULL,
    "visits_count" INTEGER NOT NULL DEFAULT 0,
    "route_errors" INTEGER NOT NULL DEFAULT 0,
    "finished_earlier_minutes" INTEGER NOT NULL DEFAULT 0,
    "perfect_precision" BOOLEAN NOT NULL DEFAULT false,
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,
    "reputation_delta" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_suspect_pool" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex_id" INTEGER NOT NULL,
    "hair_id" INTEGER NOT NULL,
    "hobby_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "feature_id" INTEGER NOT NULL,
    "is_culprit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "case_suspect_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "interaction_style" TEXT NOT NULL,

    CONSTRAINT "place_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_city_places" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,
    "place_type_id" INTEGER NOT NULL,
    "clue_type" "ClueType" NOT NULL,
    "is_capture_location" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "case_city_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_clues" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "city_place_id" TEXT NOT NULL,
    "clue_type" "ClueType" NOT NULL,
    "target_type" TEXT NOT NULL DEFAULT 'NONE',
    "target_value" TEXT,
    "target_ref_id" INTEGER,
    "generated_text" TEXT NOT NULL,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_clues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_villain_clues" (
    "id" TEXT NOT NULL,
    "active_case_id" TEXT NOT NULL,
    "attribute_type" TEXT NOT NULL,
    "attribute_value" TEXT NOT NULL,
    "target_ref_id" INTEGER,
    "is_revealed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_villain_clues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_dossier_notes" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "sex_id" INTEGER,
    "hair_id" INTEGER,
    "hobby_id" INTEGER,
    "vehicle_id" INTEGER,
    "feature_id" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_dossier_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "captured_villains_log" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "case_id" TEXT,
    "villain_name" TEXT NOT NULL,
    "attributes_snapshot" JSONB,
    "final_dialogue" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captured_villains_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_reputation" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "case_id" TEXT,
    "reputation_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_reputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_reputation_history" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "reputation_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_reputation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_xp_history" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "xp_awarded" INTEGER NOT NULL,
    "breakdown_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_xp_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_stats_history" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "reputation_score" INTEGER NOT NULL,
    "rank_id" INTEGER,
    "cases_solved" INTEGER NOT NULL,
    "cases_failed" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_stats_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_tokens_token_key" ON "auth_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_user_id_idx" ON "auth_refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_detective_name_key" ON "profiles"("detective_name");

-- CreateIndex
CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_difficulty_code_key" ON "game_difficulty"("code");

-- CreateIndex
CREATE UNIQUE INDEX "xp_rules_difficulty_id_key" ON "xp_rules"("difficulty_id");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE INDEX "countries_region_id_idx" ON "countries"("region_id");

-- CreateIndex
CREATE INDEX "country_neighbors_neighbor_country_id_idx" ON "country_neighbors"("neighbor_country_id");

-- CreateIndex
CREATE INDEX "cities_country_id_idx" ON "cities"("country_id");

-- CreateIndex
CREATE INDEX "travel_time_overrides_to_city_id_idx" ON "travel_time_overrides"("to_city_id");

-- CreateIndex
CREATE UNIQUE INDEX "attr_sex_name_key" ON "attr_sex"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attr_hair_name_key" ON "attr_hair"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attr_hobby_name_key" ON "attr_hobby"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attr_vehicle_name_key" ON "attr_vehicle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attr_feature_name_key" ON "attr_feature"("name");

-- CreateIndex
CREATE INDEX "active_cases_profile_id_idx" ON "active_cases"("profile_id");

-- CreateIndex
CREATE INDEX "active_cases_profile_id_status_idx" ON "active_cases"("profile_id", "status");

-- CreateIndex
CREATE INDEX "case_route_city_id_idx" ON "case_route"("city_id");

-- CreateIndex
CREATE INDEX "case_current_view_case_id_step_order_idx" ON "case_current_view"("case_id", "step_order");

-- CreateIndex
CREATE INDEX "case_travel_log_active_case_id_idx" ON "case_travel_log"("active_case_id");

-- CreateIndex
CREATE INDEX "case_performance_case_id_idx" ON "case_performance"("case_id");

-- CreateIndex
CREATE INDEX "case_suspect_pool_case_id_idx" ON "case_suspect_pool"("case_id");

-- CreateIndex
CREATE INDEX "case_suspect_pool_case_id_is_culprit_idx" ON "case_suspect_pool"("case_id", "is_culprit");

-- CreateIndex
CREATE INDEX "case_city_places_case_id_city_id_idx" ON "case_city_places"("case_id", "city_id");

-- CreateIndex
CREATE INDEX "case_clues_case_id_idx" ON "case_clues"("case_id");

-- CreateIndex
CREATE INDEX "case_clues_city_place_id_idx" ON "case_clues"("city_place_id");

-- CreateIndex
CREATE INDEX "case_villain_clues_active_case_id_idx" ON "case_villain_clues"("active_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_dossier_notes_case_id_profile_id_key" ON "case_dossier_notes"("case_id", "profile_id");

-- CreateIndex
CREATE INDEX "captured_villains_log_profile_id_idx" ON "captured_villains_log"("profile_id");

-- CreateIndex
CREATE INDEX "player_reputation_profile_id_idx" ON "player_reputation"("profile_id");

-- CreateIndex
CREATE INDEX "player_reputation_profile_id_case_id_idx" ON "player_reputation"("profile_id", "case_id");

-- CreateIndex
CREATE INDEX "player_reputation_history_profile_id_case_id_idx" ON "player_reputation_history"("profile_id", "case_id");

-- CreateIndex
CREATE INDEX "player_xp_history_profile_id_case_id_idx" ON "player_xp_history"("profile_id", "case_id");

-- CreateIndex
CREATE INDEX "profile_stats_history_profile_id_case_id_idx" ON "profile_stats_history"("profile_id", "case_id");

-- AddForeignKey
ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "auth_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_rules" ADD CONSTRAINT "xp_rules_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "game_difficulty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "countries" ADD CONSTRAINT "countries_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_neighbors" ADD CONSTRAINT "country_neighbors_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_neighbors" ADD CONSTRAINT "country_neighbors_neighbor_country_id_fkey" FOREIGN KEY ("neighbor_country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_time_overrides" ADD CONSTRAINT "travel_time_overrides_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_time_overrides" ADD CONSTRAINT "travel_time_overrides_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_cases" ADD CONSTRAINT "active_cases_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_cases" ADD CONSTRAINT "active_cases_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "game_difficulty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_cases" ADD CONSTRAINT "active_cases_warrant_suspect_id_fkey" FOREIGN KEY ("warrant_suspect_id") REFERENCES "case_suspect_pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_route" ADD CONSTRAINT "case_route_active_case_id_fkey" FOREIGN KEY ("active_case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_route" ADD CONSTRAINT "case_route_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_time_state" ADD CONSTRAINT "case_time_state_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_current_view" ADD CONSTRAINT "case_current_view_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_current_view" ADD CONSTRAINT "case_current_view_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_travel_log" ADD CONSTRAINT "case_travel_log_active_case_id_fkey" FOREIGN KEY ("active_case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_travel_log" ADD CONSTRAINT "case_travel_log_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_travel_log" ADD CONSTRAINT "case_travel_log_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_performance" ADD CONSTRAINT "case_performance_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_performance" ADD CONSTRAINT "case_performance_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_suspect_pool" ADD CONSTRAINT "case_suspect_pool_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_suspect_pool" ADD CONSTRAINT "case_suspect_pool_sex_id_fkey" FOREIGN KEY ("sex_id") REFERENCES "attr_sex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_suspect_pool" ADD CONSTRAINT "case_suspect_pool_hair_id_fkey" FOREIGN KEY ("hair_id") REFERENCES "attr_hair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_suspect_pool" ADD CONSTRAINT "case_suspect_pool_hobby_id_fkey" FOREIGN KEY ("hobby_id") REFERENCES "attr_hobby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_suspect_pool" ADD CONSTRAINT "case_suspect_pool_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "attr_vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_suspect_pool" ADD CONSTRAINT "case_suspect_pool_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "attr_feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_city_places" ADD CONSTRAINT "case_city_places_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_city_places" ADD CONSTRAINT "case_city_places_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_city_places" ADD CONSTRAINT "case_city_places_place_type_id_fkey" FOREIGN KEY ("place_type_id") REFERENCES "place_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_clues" ADD CONSTRAINT "case_clues_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_clues" ADD CONSTRAINT "case_clues_city_place_id_fkey" FOREIGN KEY ("city_place_id") REFERENCES "case_city_places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_villain_clues" ADD CONSTRAINT "case_villain_clues_active_case_id_fkey" FOREIGN KEY ("active_case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dossier_notes" ADD CONSTRAINT "case_dossier_notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dossier_notes" ADD CONSTRAINT "case_dossier_notes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dossier_notes" ADD CONSTRAINT "case_dossier_notes_sex_id_fkey" FOREIGN KEY ("sex_id") REFERENCES "attr_sex"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dossier_notes" ADD CONSTRAINT "case_dossier_notes_hair_id_fkey" FOREIGN KEY ("hair_id") REFERENCES "attr_hair"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dossier_notes" ADD CONSTRAINT "case_dossier_notes_hobby_id_fkey" FOREIGN KEY ("hobby_id") REFERENCES "attr_hobby"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dossier_notes" ADD CONSTRAINT "case_dossier_notes_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "attr_vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dossier_notes" ADD CONSTRAINT "case_dossier_notes_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "attr_feature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captured_villains_log" ADD CONSTRAINT "captured_villains_log_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captured_villains_log" ADD CONSTRAINT "captured_villains_log_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_reputation" ADD CONSTRAINT "player_reputation_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_reputation" ADD CONSTRAINT "player_reputation_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_reputation_history" ADD CONSTRAINT "player_reputation_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_reputation_history" ADD CONSTRAINT "player_reputation_history_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_xp_history" ADD CONSTRAINT "player_xp_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_xp_history" ADD CONSTRAINT "player_xp_history_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_stats_history" ADD CONSTRAINT "profile_stats_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_stats_history" ADD CONSTRAINT "profile_stats_history_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "active_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_stats_history" ADD CONSTRAINT "profile_stats_history_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
