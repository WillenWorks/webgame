-- Schema inicial do MVP 0.2 - Carmen Sandiego
-- Banco: carmen_mvp02

CREATE DATABASE IF NOT EXISTS carmen_mvp02
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE carmen_mvp02;

-- ------------------------------------------------------
-- TABELAS DE USUÁRIO / AGENTE
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  codename VARCHAR(120) NOT NULL,
  rank VARCHAR(50) DEFAULT 'recruit',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- CATÁLOGO DE VILÕES E LOCAIS
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS villain_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE, -- ex: suspect_carlos_monaco
  name VARCHAR(120) NOT NULL,
  sex VARCHAR(20),                  -- male/female/other
  occupation VARCHAR(120),
  hobby VARCHAR(120),
  hair_color VARCHAR(60),
  vehicle VARCHAR(120),
  feature VARCHAR(255),             -- traço marcante
  other TEXT,
  danger_level TINYINT DEFAULT 1,
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,   -- ex: london, paris
  name VARCHAR(120) NOT NULL,         -- ex: London
  type VARCHAR(30) DEFAULT 'city',    -- city, country, landmark
  country VARCHAR(120),
  region VARCHAR(120),
  description TEXT
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- CASOS, SUSPEITOS E ETAPAS
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  external_case_id VARCHAR(64),        -- id lógico vindo da IA, se quiser
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  status VARCHAR(30) DEFAULT 'available',  -- available, in_progress, success, failed
  difficulty VARCHAR(20) DEFAULT 'easy',   -- easy, medium, hard
  villain_template_id INT,                -- vilão culpado
  start_location_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (villain_template_id) REFERENCES villain_templates(id),
  FOREIGN KEY (start_location_id) REFERENCES locations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS case_suspects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  villain_template_id INT NOT NULL,
  is_guilty TINYINT(1) DEFAULT 0,
  -- snapshot dos dados do vilão no momento do caso
  name_snapshot VARCHAR(120) NOT NULL,
  sex_snapshot VARCHAR(20),
  occupation_snapshot VARCHAR(120),
  hobby_snapshot VARCHAR(120),
  hair_color_snapshot VARCHAR(60),
  vehicle_snapshot VARCHAR(120),
  feature_snapshot VARCHAR(255),
  other_snapshot TEXT,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (villain_template_id) REFERENCES villain_templates(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS case_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  step_order INT NOT NULL,              -- ordem da etapa
  from_location_id INT,
  to_location_id INT,
  step_type VARCHAR(30) DEFAULT 'clue', -- clue, travel, npc, decision, etc.
  description TEXT,                     -- texto da pista/etapa
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (from_location_id) REFERENCES locations(id),
  FOREIGN KEY (to_location_id) REFERENCES locations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS case_villain_clues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  suspect_id INT NOT NULL,              -- referência em case_suspects
  attribute_key VARCHAR(64) NOT NULL,   -- ex: sex, hobby, hair_color
  attribute_value VARCHAR(120) NOT NULL,
  text TEXT NOT NULL,                   -- fala do NPC / descrição da pista
  step_order INT,                       -- em que etapa isso aparece
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (suspect_id) REFERENCES case_suspects(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- MANDADO E HISTÓRICO
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS warrants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  agent_id INT NOT NULL,
  suspect_id INT NOT NULL,
  selected_attributes TEXT,             -- JSON ou texto com filtros usados
  is_correct TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (suspect_id) REFERENCES case_suspects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS captured_villains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  case_id INT NOT NULL,
  villain_template_id INT NOT NULL,
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (villain_template_id) REFERENCES villain_templates(id)
) ENGINE=InnoDB;
