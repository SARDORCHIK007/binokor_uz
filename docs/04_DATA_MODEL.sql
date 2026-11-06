-- =====================================================================
-- 04. UYCHI BINOKOR — Ma'lumotlar bazasi sxemasi (PostgreSQL 16)
-- Bu fayl ma'lumotlar modelining manbasi hisoblanadi. Alembic migratsiyalari
-- shu sxemaga mos yoziladi. Jadval va ustun nomlari ingliz tilida.
-- Konvensiyalar: PK = uuid (v7, ilovada generatsiya qilinadi), vaqt = timestamptz (UTC),
-- tarjima qilinadigan matnlar = jsonb {"uz-Latn": "...", "uz-Cyrl": "...", "ru": "...", "en": "..."}
-- Yumshoq o'chirish: deleted_at. Har bir jadvalda created_at / updated_at bor.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------- ENUMlar ----------
CREATE TYPE role_code AS ENUM (
  'superadmin','admin','education_lead','cert_officer','placement_manager','coordinator',
  'mentor','teacher','curator','student','worker','employer_local','employer_foreign',
  'producer','partner_viewer','vocab_author','content_editor');
CREATE TYPE track_code        AS ENUM ('DOMESTIC','FOREIGN');
CREATE TYPE matrix_class      AS ENUM ('A','B','C','D');
CREATE TYPE application_type  AS ENUM ('YOUTH','WORKER_UPSKILL','UNIVERSITY_GRAD');
CREATE TYPE application_status AS ENUM ('DRAFT','SUBMITTED','SCREENING','VOUCHER_CHECK','INTERVIEW',
  'TRIAL','ACCEPTED','ENROLLED','WAITLIST','REJECTED','WITHDRAWN');
CREATE TYPE voucher_status    AS ENUM ('NOT_REQUIRED','PENDING','APPROVED','DENIED');
CREATE TYPE enrollment_status AS ENUM ('ACTIVE','SUSPENDED','COMPLETED','DROPPED','TRANSFERRED');
CREATE TYPE attendance_status AS ENUM ('PRESENT','LATE','ABSENT_EXCUSED','ABSENT_UNEXCUSED');
CREATE TYPE module_kind       AS ENUM ('THEORY','WORKSHOP','SITE','LANGUAGE','SAFETY');
-- SAFETY soatlari courses.hours_theory ichida hisoblanadi (BR-05).
CREATE TYPE cert_issuer       AS ENUM ('UB_NAMDTU','STATE','INTERNATIONAL');
CREATE TYPE cert_status       AS ENUM ('DRAFT','PENDING_APPROVAL','ISSUED','REJECTED','REVOKED','EXPIRED');
CREATE TYPE worker_level      AS ENUM ('APPRENTICE','ASSISTANT','MASTER','FOREMAN');
CREATE TYPE availability      AS ENUM ('FREE','BUSY','ABROAD','INACTIVE');
CREATE TYPE brigade_status    AS ENUM ('FORMING','READY','PROPOSED','DEPLOYED','RETURNED','DISBANDED');
CREATE TYPE employer_kind     AS ENUM ('LOCAL','FOREIGN','AGENCY');
CREATE TYPE request_status    AS ENUM ('NEW','IN_REVIEW','VIA_AGENCY','SHORTLIST_SENT','EMPLOYER_APPROVED',
  'CONTRACTING','MATCHED','CLOSED','CANCELLED');
CREATE TYPE placement_kind    AS ENUM ('OUTSTAFF','CONTRACT_WORK','DIRECT','ABROAD');
CREATE TYPE partner_kind      AS ENUM ('GOV','EDU','INTL','EMPLOYER','AGENCY','PRODUCER');
CREATE TYPE partner_status    AS ENUM ('SIGNED','NEGOTIATING','PLANNED','ENDED');
CREATE TYPE media_source      AS ENUM ('REAL_UYCHI','PARTNER','ILLUSTRATION','USER_UPLOAD');
CREATE TYPE order_status      AS ENUM ('NEW','CONTACTED','DONE','CANCELLED');
CREATE TYPE object_status     AS ENUM ('PLANNED','IN_PROGRESS','COMPLETED','PAUSED');

-- ---------- Foydalanuvchilar va identifikatsiya ----------
CREATE TABLE users (
  id              uuid PRIMARY KEY,
  phone           varchar(13) UNIQUE NOT NULL CHECK (phone ~ '^\+998[0-9]{9}$'),
  email           citext UNIQUE,
  telegram_id     bigint UNIQUE,
  full_name       varchar(200) NOT NULL,
  photo_file_id   uuid,
  locale          varchar(8) NOT NULL DEFAULT 'uz-Latn',
  totp_secret_enc bytea,                       -- adminlar uchun 2FA (shifrlangan)
  is_active       boolean NOT NULL DEFAULT true,
  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE TABLE user_roles (
  id        uuid PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      role_code NOT NULL,
  scope_id  uuid,               -- masalan, koordinator uchun mahalla_id, agentlik uchun employer_id
  granted_by uuid REFERENCES users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, role, scope_id)
);
CREATE TABLE sessions (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash  bytea NOT NULL,            -- refresh token xeshi (sha256)
  user_agent    text, ip_hash bytea,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);
CREATE TABLE otp_codes (
  id          uuid PRIMARY KEY,
  phone       varchar(13) NOT NULL,
  code_hash   bytea NOT NULL,
  channel     varchar(10) NOT NULL CHECK (channel IN ('telegram','sms')),
  attempts    smallint NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON otp_codes (phone, created_at DESC);

CREATE TABLE consents (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id),
  kind        varchar(40) NOT NULL,   -- 'pd_processing','public_profile','public_photo','telegram_notify','ai_processing'
  version     varchar(20) NOT NULL,   -- rozilik matni versiyasi
  granted     boolean NOT NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  ip_hash     bytea
);
CREATE INDEX ON consents (user_id, kind, granted_at DESC);

-- ---------- Ma'lumotnomalar ----------
CREATE TABLE mahallas (
  id        uuid PRIMARY KEY,
  name      jsonb NOT NULL,
  district  varchar(60) NOT NULL DEFAULT 'Uychi',
  geom      geometry(MultiPolygon, 4326),
  coordinator_user_id uuid REFERENCES users(id)
);
CREATE TABLE trades (
  id                 uuid PRIMARY KEY,
  code               varchar(40) UNIQUE NOT NULL,      -- 'plumber','electrician',...
  name               jsonb NOT NULL,
  description        jsonb,
  icon               varchar(80),
  model_3d_file_id   uuid,
  poster_file_id     uuid,
  domestic_months    smallint NOT NULL CHECK (domestic_months BETWEEN 3 AND 6),
  foreign_lang_months smallint CHECK (foreign_lang_months BETWEEN 0 AND 6),
  standard_ref       varchar(60),                      -- 'UZ-KS-2026-T1.0-0036'
  price_per_month    numeric(12,0),                    -- so'm, taxminiy
  salary_ranges      jsonb,                            -- {"ASSISTANT":[5000000,6000000],...}
  is_active          boolean NOT NULL DEFAULT true,
  CHECK (
    coalesce(foreign_lang_months, 0) = 0
    OR (domestic_months + foreign_lang_months) BETWEEN 6 AND 12
  )
);
CREATE TABLE languages (
  code   varchar(5) PRIMARY KEY,   -- 'de','en','ar','ja','ko','tr','ru'
  name   jsonb NOT NULL,
  rtl    boolean NOT NULL DEFAULT false
);
CREATE TABLE destinations (
  id            uuid PRIMARY KEY,
  country_code  char(2) NOT NULL,             -- ISO 3166-1
  name          jsonb NOT NULL,
  lang_code     varchar(5) REFERENCES languages(code),
  required_exams jsonb,                        -- [{"name":"JFT-Basic","level":"A2"}, ...]
  notes         jsonb,
  is_active     boolean NOT NULL DEFAULT true
);

-- ---------- Shaxs va arizalar ----------
CREATE TABLE persons (
  id              uuid PRIMARY KEY,
  user_id         uuid UNIQUE REFERENCES users(id),
  last_name       varchar(80) NOT NULL,
  first_name      varchar(80) NOT NULL,
  middle_name     varchar(80),
  birth_date      date NOT NULL,
  gender          char(1) CHECK (gender IN ('M','F')),
  mahalla_id      uuid REFERENCES mahallas(id),
  address_enc     bytea,
  pinfl_enc       bytea,                 -- JShShIR (AES-GCM, ilova darajasida)
  pinfl_hash      bytea UNIQUE,          -- dublikat qidirish uchun HMAC
  passport_enc    bytea,
  education_level varchar(30),
  university      varchar(200),
  graduation_year smallint,
  social_registry boolean,
  medical_check_at date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE person_languages (
  person_id   uuid REFERENCES persons(id) ON DELETE CASCADE,
  lang_code   varchar(5) REFERENCES languages(code),
  level       smallint NOT NULL CHECK (level BETWEEN 0 AND 6),   -- 0=yo'q, 1=A1 ... 6=C2
  document_file_id uuid,                                         -- sertifikat (IELTS, Goethe, JLPT...)
  verified_by uuid REFERENCES users(id),
  PRIMARY KEY (person_id, lang_code)
);
CREATE TABLE applications (
  id                   uuid PRIMARY KEY,
  person_id            uuid REFERENCES persons(id),   -- faqat SUBMITTED dan keyin; qoralamada NULL
  type                 application_type NOT NULL,
  source               varchar(10) NOT NULL CHECK (source IN ('MAHALLA','ONLINE','IMPORT')),
  desired_trade_id     uuid REFERENCES trades(id),
  desired_track        track_code NOT NULL,
  destination_id       uuid REFERENCES destinations(id),
  trade_experience_years numeric(4,1) NOT NULL DEFAULT 0,
  matrix_suggested     matrix_class,                 -- topshirishda hisoblanadi; qoralamada NULL
  draft_data           jsonb,                            -- qoralama javoblari; persons yozuvi submitda yaratiladi
  matrix_final         matrix_class,
  status               application_status NOT NULL DEFAULT 'DRAFT',
  voucher_status       voucher_status NOT NULL DEFAULT 'PENDING',
  interview_notes      text,
  trial_result         jsonb,
  rejection_reason     text,
  created_by           uuid REFERENCES users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL),
  CHECK (status = 'DRAFT' OR (person_id IS NOT NULL AND matrix_suggested IS NOT NULL))
);
CREATE INDEX ON applications (status, created_at DESC);
CREATE TABLE application_events (
  id             bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    application_status, to_status application_status NOT NULL,
  actor_id       uuid REFERENCES users(id), note text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE training_contracts (
  id              uuid PRIMARY KEY,
  application_id  uuid NOT NULL REFERENCES applications(id),
  template_version varchar(20) NOT NULL,
  work_obligation_months smallint,
  generated_file_id uuid, signed_file_id uuid, signed_at date
);

-- ---------- Ta'lim ----------
CREATE TABLE courses (
  id            uuid PRIMARY KEY,
  trade_id      uuid NOT NULL REFERENCES trades(id),
  track         track_code NOT NULL,
  destination_id uuid REFERENCES destinations(id),
  title         jsonb NOT NULL,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  hours_theory  smallint NOT NULL, hours_workshop smallint NOT NULL, hours_site smallint NOT NULL,
  hours_language smallint NOT NULL DEFAULT 0,
  cert_rules    jsonb NOT NULL DEFAULT
    '{"attendance_min":0.8,"theory_min":60,"practice_min":70,"all_modules_passed":true}',
  demand_basis  text,                                -- BR-21: kurs qanday talab asosida ochildi
  CHECK (end_date > start_date),
  CHECK (
    (track = 'DOMESTIC' AND (end_date - start_date) BETWEEN 80 AND 190)
    OR (track = 'FOREIGN' AND (end_date - start_date) BETWEEN 170 AND 380)
  ),
  CHECK (track = 'FOREIGN' OR hours_language = 0)      -- BR-03
);
CREATE TABLE modules (
  id         uuid PRIMARY KEY,
  course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  kind       module_kind NOT NULL,
  title      jsonb NOT NULL,
  ord        smallint NOT NULL,
  hours      smallint NOT NULL,
  rubric     jsonb,
  UNIQUE (course_id, ord)
);
CREATE TABLE groups (
  id             uuid PRIMARY KEY,
  course_id      uuid NOT NULL REFERENCES courses(id),
  code           varchar(30) UNIQUE NOT NULL,      -- 'SANT-2026-03'
  mentor_user_id uuid NOT NULL REFERENCES users(id),
  max_students   smallint NOT NULL DEFAULT 10 CHECK (max_students BETWEEN 1 AND 10),  -- BR-01
  schedule       jsonb NOT NULL
);
CREATE TABLE enrollments (
  id             uuid PRIMARY KEY,
  group_id       uuid NOT NULL REFERENCES groups(id),
  student_user_id uuid NOT NULL REFERENCES users(id),
  application_id uuid REFERENCES applications(id),
  status         enrollment_status NOT NULL DEFAULT 'ACTIVE',
  status_reason  text,
  enrolled_at    date NOT NULL DEFAULT current_date,
  completed_at   date,
  UNIQUE (group_id, student_user_id)
);
-- BR-01: guruh ≤ max_students va ustozning barcha guruhlaridagi faol tinglovchilar ≤ 10
CREATE FUNCTION enforce_group_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt int; cap int; mentor uuid; mentor_cnt int;
BEGIN
  IF NEW.status NOT IN ('ACTIVE','SUSPENDED') THEN
    RETURN NEW;
  END IF;
  SELECT mentor_user_id INTO mentor FROM groups WHERE id = NEW.group_id;
  PERFORM id FROM groups WHERE mentor_user_id = mentor ORDER BY id FOR UPDATE;
  SELECT max_students INTO cap FROM groups WHERE id = NEW.group_id;
  SELECT count(*) INTO cnt FROM enrollments
   WHERE group_id = NEW.group_id AND status IN ('ACTIVE','SUSPENDED') AND id IS DISTINCT FROM NEW.id;
  IF cnt >= cap THEN
    RAISE EXCEPTION 'GROUP_FULL' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO mentor_cnt
    FROM enrollments e
    JOIN groups g ON g.id = e.group_id
   WHERE g.mentor_user_id = mentor
     AND e.status IN ('ACTIVE','SUSPENDED')
     AND e.id IS DISTINCT FROM NEW.id;
  IF mentor_cnt >= 10 THEN
    RAISE EXCEPTION 'MENTOR_FULL' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_group_capacity BEFORE INSERT OR UPDATE OF status, group_id ON enrollments
  FOR EACH ROW EXECUTE FUNCTION enforce_group_capacity();

CREATE TABLE curator_groups (
  id              uuid PRIMARY KEY,
  curator_user_id uuid NOT NULL REFERENCES users(id),
  lang_code       varchar(5) REFERENCES languages(code),
  max_members     smallint NOT NULL DEFAULT 10 CHECK (max_members BETWEEN 8 AND 10)   -- BR-02
);
CREATE TABLE curator_members (
  curator_group_id uuid REFERENCES curator_groups(id) ON DELETE CASCADE,
  student_user_id  uuid REFERENCES users(id),
  PRIMARY KEY (curator_group_id, student_user_id)
);
-- BR-02: 10 tadan oshirish taqiqlanadi. 8 tadan kam bo'lishi ogohlantirish, cheklov emas.
CREATE FUNCTION enforce_curator_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt int;
BEGIN
  PERFORM id FROM curator_groups WHERE id = NEW.curator_group_id FOR UPDATE;
  SELECT count(*) INTO cnt FROM curator_members
   WHERE curator_group_id = NEW.curator_group_id
     AND student_user_id IS DISTINCT FROM NEW.student_user_id;
  IF cnt >= 10 THEN
    RAISE EXCEPTION 'CURATOR_GROUP_FULL' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_curator_capacity BEFORE INSERT OR UPDATE OF curator_group_id ON curator_members
  FOR EACH ROW EXECUTE FUNCTION enforce_curator_capacity();
CREATE TABLE attendance (
  id              uuid PRIMARY KEY,
  enrollment_id   uuid NOT NULL REFERENCES enrollments(id),
  date            date NOT NULL,
  status          attendance_status NOT NULL,
  site_hours      numeric(4,1) NOT NULL DEFAULT 0 CHECK (site_hours BETWEEN 0 AND 12),
  object_id       uuid,
  recorded_by     uuid NOT NULL REFERENCES users(id),
  client_created_at timestamptz,
  idempotency_key uuid UNIQUE,
  confirmed_by_employer uuid REFERENCES users(id),
  UNIQUE (enrollment_id, date)
);
CREATE TABLE assessments (
  id            uuid PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id),
  module_id     uuid NOT NULL REFERENCES modules(id),
  score         smallint CHECK (score BETWEEN 0 AND 100),
  passed        boolean NOT NULL,
  comment       text,
  evidence_file_ids uuid[] NOT NULL DEFAULT '{}',
  assessed_by   uuid NOT NULL REFERENCES users(id),
  assessed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, module_id)
);
CREATE TABLE question_bank (
  id         uuid PRIMARY KEY,
  trade_id   uuid NOT NULL REFERENCES trades(id),
  body       jsonb NOT NULL, options jsonb NOT NULL, correct smallint NOT NULL,
  difficulty smallint NOT NULL DEFAULT 2, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE final_exams (
  id             uuid PRIMARY KEY,
  enrollment_id  uuid UNIQUE NOT NULL REFERENCES enrollments(id),
  theory_score   smallint CHECK (theory_score BETWEEN 0 AND 100),
  practice_score smallint CHECK (practice_score BETWEEN 0 AND 100),
  question_ids   uuid[], answers jsonb,
  examiner_ids   uuid[] NOT NULL,
  held_at        timestamptz NOT NULL
);

-- ---------- Lug'at ----------
CREATE TABLE vocab_words (
  id              uuid PRIMARY KEY,
  lang_code       varchar(5) NOT NULL REFERENCES languages(code),
  word            varchar(120) NOT NULL,
  transcription_latn varchar(160) NOT NULL,
  transcription_cyrl varchar(160) NOT NULL,
  translation_uz  varchar(200) NOT NULL,
  example         text,
  example_uz      text,
  category        varchar(30) NOT NULL CHECK (category IN
    ('communication','safety','tools','materials','actions','numbers','trade')),
  trade_id        uuid REFERENCES trades(id),           -- NULL = umumiy yadro
  rank            smallint NOT NULL,
  image_file_id   uuid, audio_file_id uuid,
  status          varchar(12) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEW','PUBLISHED')),
  author_id       uuid REFERENCES users(id), reviewer_id uuid REFERENCES users(id),
  UNIQUE (lang_code, word, trade_id),
  CHECK ((category = 'trade') = (trade_id IS NOT NULL))
);
CREATE TABLE vocab_progress (
  user_id        uuid REFERENCES users(id) ON DELETE CASCADE,
  word_id        uuid REFERENCES vocab_words(id) ON DELETE CASCADE,
  box            smallint NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  next_review_at timestamptz NOT NULL,
  correct_count  int NOT NULL DEFAULT 0, wrong_count int NOT NULL DEFAULT 0,
  last_answer_at timestamptz,
  PRIMARY KEY (user_id, word_id)
);
CREATE INDEX ON vocab_progress (user_id, next_review_at);
CREATE TABLE vocab_settings (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lang_code   varchar(5) NOT NULL REFERENCES languages(code),
  trade_id    uuid REFERENCES trades(id),
  daily_new   smallint NOT NULL DEFAULT 20 CHECK (daily_new BETWEEN 5 AND 50),
  push_time   time NOT NULL DEFAULT '08:00'
);

-- ---------- Sertifikatlar va ishchi profili ----------
CREATE SEQUENCE cert_seq_2026; -- har yil uchun alohida ketma-ketlik ilova tomonidan yaratiladi
CREATE TABLE certificates (
  id             uuid PRIMARY KEY,
  number         varchar(20) UNIQUE,                   -- 'UB-2026-000123' (ISSUED bo'lganda)
  person_id      uuid NOT NULL REFERENCES persons(id),
  enrollment_id  uuid REFERENCES enrollments(id),
  trade_id       uuid NOT NULL REFERENCES trades(id),
  issuer         cert_issuer NOT NULL,
  level          varchar(20),
  external_ref   varchar(200),                         -- davlat reyestri raqami / havolasi
  external_file_id uuid,
  status         cert_status NOT NULL DEFAULT 'DRAFT',
  issued_at      timestamptz, valid_until date,
  payload        jsonb,                                -- imzolangan kanonik ma'lumot
  payload_hash   bytea,                                -- sha256(JCS(payload))
  signature      bytea,                                -- Ed25519
  key_id         varchar(20),
  pdf_file_id    uuid,
  revoked_at     timestamptz, revoke_reason text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'REVOKED' OR revoke_reason IS NOT NULL),
  CHECK (status <> 'ISSUED' OR (number IS NOT NULL AND signature IS NOT NULL) OR issuer <> 'UB_NAMDTU'),
  CHECK (status <> 'EXPIRED' OR (issuer <> 'UB_NAMDTU' AND valid_until IS NOT NULL))
);
CREATE TABLE certificate_approvals (
  certificate_id uuid REFERENCES certificates(id) ON DELETE CASCADE,
  approver_id    uuid REFERENCES users(id),
  role           role_code NOT NULL,
  decision       varchar(10) NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
  comment        text,
  decided_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (certificate_id, approver_id)            -- BR-10: bir shaxs bir marta
);
CREATE TABLE verification_logs (
  id             bigserial PRIMARY KEY,
  certificate_id uuid REFERENCES certificates(id),
  number_queried varchar(40),
  result         varchar(12) NOT NULL,                 -- VALID / REVOKED / NOT_FOUND / TAMPERED
  ip_hash        bytea, country char(2), user_agent text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE worker_profiles (
  user_id        uuid PRIMARY KEY REFERENCES users(id),
  person_id      uuid UNIQUE NOT NULL REFERENCES persons(id),
  slug           varchar(40) UNIQUE NOT NULL,          -- ochiq havola uchun, taxmin qilib bo'lmaydigan
  primary_trade_id uuid REFERENCES trades(id),
  level          worker_level NOT NULL DEFAULT 'APPRENTICE',
  availability   availability NOT NULL DEFAULT 'FREE',
  busy_until     date,
  mahalla_id     uuid REFERENCES mahallas(id),
  verified_hours int NOT NULL DEFAULT 0,
  rating_avg     numeric(3,2), rating_count int NOT NULL DEFAULT 0,
  visibility     jsonb NOT NULL DEFAULT
    '{"photo":false,"full_name":false,"portfolio":true,"ratings":true,"languages":true}',
  bio            jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE worker_level_history (
  id bigserial PRIMARY KEY, user_id uuid REFERENCES users(id),
  from_level worker_level, to_level worker_level NOT NULL,
  suggested_by_system boolean NOT NULL, approved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE portfolio_items (
  id          uuid PRIMARY KEY,
  worker_user_id uuid NOT NULL REFERENCES users(id),
  object_id   uuid,
  title       jsonb NOT NULL,
  file_ids    uuid[] NOT NULL,
  confirmed_by uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- Brigadalar ----------
CREATE TABLE brigades (
  id             uuid PRIMARY KEY,
  name           varchar(80) NOT NULL,
  trade_id       uuid NOT NULL REFERENCES trades(id),
  leader_user_id uuid NOT NULL REFERENCES users(id),
  destination_id uuid REFERENCES destinations(id),
  status         brigade_status NOT NULL DEFAULT 'FORMING',
  readiness      jsonb,                                -- BR-08 tekshiruv natijasi
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE brigade_members (
  brigade_id     uuid REFERENCES brigades(id) ON DELETE CASCADE,
  worker_user_id uuid REFERENCES users(id),
  joined_at      date NOT NULL DEFAULT current_date,
  left_at        date,
  PRIMARY KEY (brigade_id, worker_user_id)
);
-- BR-07: faol a'zolar (left_at IS NULL) 10 tadan oshmaydi.
CREATE FUNCTION enforce_brigade_member_cap() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt int;
BEGIN
  IF NEW.left_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  PERFORM id FROM brigades WHERE id = NEW.brigade_id FOR UPDATE;
  SELECT count(*) INTO cnt FROM brigade_members
   WHERE brigade_id = NEW.brigade_id AND left_at IS NULL
     AND worker_user_id IS DISTINCT FROM NEW.worker_user_id;
  IF cnt >= 10 THEN
    RAISE EXCEPTION 'BRIGADE_SIZE_INVALID' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_brigade_member_cap BEFORE INSERT OR UPDATE OF left_at, brigade_id ON brigade_members
  FOR EACH ROW EXECUTE FUNCTION enforce_brigade_member_cap();

-- BR-07: READY ga o'tishda faol a'zolar 8..10. Qolgan BR-08 shartlari servis qatlamida.
CREATE FUNCTION enforce_brigade_ready_size() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt int;
BEGIN
  IF NEW.status = 'READY' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'READY') THEN
    SELECT count(*) INTO cnt FROM brigade_members
     WHERE brigade_id = NEW.id AND left_at IS NULL;
    IF cnt < 8 OR cnt > 10 THEN
      RAISE EXCEPTION 'BRIGADE_SIZE_INVALID' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_brigade_ready_size BEFORE INSERT OR UPDATE OF status ON brigades
  FOR EACH ROW EXECUTE FUNCTION enforce_brigade_ready_size();

-- ---------- Ish beruvchilar va joylashtirish ----------
CREATE TABLE employers (
  id          uuid PRIMARY KEY,
  kind        employer_kind NOT NULL,
  name        varchar(200) NOT NULL,
  country_code char(2) NOT NULL DEFAULT 'UZ',
  inn         varchar(20),                             -- STIR (UZ uchun majburiy)
  license_ref varchar(80),                             -- agentlik litsenziyasi
  verified_at timestamptz, verified_by uuid REFERENCES users(id),
  logo_file_id uuid,
  CHECK (country_code <> 'UZ' OR kind = 'AGENCY' OR inn IS NOT NULL)
);
CREATE TABLE employer_members (
  employer_id uuid REFERENCES employers(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id),
  is_owner    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (employer_id, user_id)
);
CREATE TABLE demand_requests (
  id              uuid PRIMARY KEY,
  employer_id     uuid NOT NULL REFERENCES employers(id),
  trade_id        uuid NOT NULL REFERENCES trades(id),
  quantity        smallint NOT NULL CHECK (quantity BETWEEN 1 AND 500),
  as_brigade      boolean NOT NULL DEFAULT false,
  track           track_code NOT NULL,
  destination_id  uuid REFERENCES destinations(id),
  location        varchar(200),
  start_date      date, duration_months smallint,
  salary_from     numeric(14,2), salary_to numeric(14,2), salary_currency char(3),
  conditions      text,
  status          request_status NOT NULL DEFAULT 'NEW',
  agency_id       uuid REFERENCES employers(id),       -- BR-14
  assigned_manager_id uuid REFERENCES users(id),
  first_response_at timestamptz,                        -- KPI-08
  cancel_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (track = 'DOMESTIC' OR status IN ('NEW','CANCELLED') OR agency_id IS NOT NULL)
);
CREATE TABLE request_candidates (
  id            uuid PRIMARY KEY,
  request_id    uuid NOT NULL REFERENCES demand_requests(id) ON DELETE CASCADE,
  worker_user_id uuid REFERENCES users(id),
  brigade_id    uuid REFERENCES brigades(id),
  ai_score      numeric(4,3),                          -- tavsiya (07_AI.md)
  ai_explanation jsonb,
  status        varchar(16) NOT NULL DEFAULT 'PROPOSED'
                 CHECK (status IN ('PROPOSED','WORKER_ACCEPTED','WORKER_DECLINED','EMPLOYER_APPROVED','EMPLOYER_REJECTED','HIRED')),
  CHECK ((worker_user_id IS NULL) <> (brigade_id IS NULL))
);
CREATE TABLE placements (
  id            uuid PRIMARY KEY,
  worker_user_id uuid NOT NULL REFERENCES users(id),
  request_id    uuid REFERENCES demand_requests(id),
  employer_id   uuid NOT NULL REFERENCES employers(id),
  kind          placement_kind NOT NULL,
  start_date    date NOT NULL, end_date date,
  monthly_salary numeric(14,2), currency char(3) NOT NULL DEFAULT 'UZS',
  contract_file_id uuid
);
CREATE TABLE reviews (
  id            uuid PRIMARY KEY,
  placement_id  uuid UNIQUE NOT NULL REFERENCES placements(id),
  score_quality smallint NOT NULL CHECK (score_quality BETWEEN 1 AND 5),
  score_discipline smallint NOT NULL CHECK (score_discipline BETWEEN 1 AND 5),
  score_safety  smallint NOT NULL CHECK (score_safety BETWEEN 1 AND 5),
  score_communication smallint NOT NULL CHECK (score_communication BETWEEN 1 AND 5),
  comment       text,
  author_id     uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------- Obyektlar, materiallar ----------
CREATE TABLE construction_objects (
  id            uuid PRIMARY KEY,
  name          jsonb NOT NULL,
  address       varchar(300),
  geom          geometry(Point, 4326) NOT NULL,
  mahalla_id    uuid REFERENCES mahallas(id),
  client        varchar(200),
  status        object_status NOT NULL DEFAULT 'IN_PROGRESS',
  progress_pct  smallint NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  start_date    date, end_date date,
  is_public     boolean NOT NULL DEFAULT true
);
CREATE INDEX ON construction_objects USING gist (geom);
CREATE TABLE object_photos (
  id         uuid PRIMARY KEY,
  object_id  uuid NOT NULL REFERENCES construction_objects(id) ON DELETE CASCADE,
  file_id    uuid NOT NULL,
  phase      varchar(8) NOT NULL CHECK (phase IN ('BEFORE','DURING','AFTER')),
  taken_at   timestamptz, geom geometry(Point,4326)
);
CREATE TABLE object_workers (
  object_id  uuid REFERENCES construction_objects(id) ON DELETE CASCADE,
  worker_user_id uuid REFERENCES users(id),
  brigade_id uuid REFERENCES brigades(id),
  PRIMARY KEY (object_id, worker_user_id)
);
ALTER TABLE attendance ADD CONSTRAINT fk_att_object FOREIGN KEY (object_id) REFERENCES construction_objects(id);
ALTER TABLE portfolio_items ADD CONSTRAINT fk_pf_object FOREIGN KEY (object_id) REFERENCES construction_objects(id);

CREATE TABLE producers (
  id          uuid PRIMARY KEY,
  name        varchar(200) NOT NULL,
  inn         varchar(20) NOT NULL,
  address     varchar(300), geom geometry(Point,4326),
  phone       varchar(13), logo_file_id uuid,
  verified_at timestamptz
);
CREATE TABLE producer_members (
  producer_id uuid REFERENCES producers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id), PRIMARY KEY (producer_id, user_id)
);
CREATE TABLE product_categories (
  id uuid PRIMARY KEY, code varchar(40) UNIQUE NOT NULL, name jsonb NOT NULL, parent_id uuid REFERENCES product_categories(id)
);
CREATE TABLE products (
  id            uuid PRIMARY KEY,
  producer_id   uuid NOT NULL REFERENCES producers(id),
  category_id   uuid NOT NULL REFERENCES product_categories(id),
  name          jsonb NOT NULL, description jsonb,
  unit          varchar(16) NOT NULL,                  -- 'dona','m2','m3','tonna','qop'
  price         numeric(14,2), price_updated_at timestamptz,
  min_order     numeric(12,2),
  standard_ref  varchar(80),                           -- O'z DSt / GOST
  file_ids      uuid[] NOT NULL DEFAULT '{}',
  in_stock      boolean NOT NULL DEFAULT true,
  is_published  boolean NOT NULL DEFAULT false
);
CREATE TABLE order_requests (
  id          uuid PRIMARY KEY,
  product_id  uuid NOT NULL REFERENCES products(id),
  buyer_name  varchar(120) NOT NULL,
  buyer_phone varchar(13) NOT NULL,
  quantity    numeric(12,2) NOT NULL,
  comment     text,
  status      order_status NOT NULL DEFAULT 'NEW',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- Hamkorlar, kontent, fayllar ----------
CREATE TABLE partners (
  id              uuid PRIMARY KEY,
  name            jsonb NOT NULL,
  kind            partner_kind NOT NULL,
  country_code    char(2) NOT NULL DEFAULT 'UZ',
  status          partner_status NOT NULL,
  role_description jsonb,
  logo_file_id    uuid,
  logo_permission boolean NOT NULL DEFAULT false,
  logo_permission_file_id uuid,                        -- yozma ruxsat nusxasi
  agreement_file_id uuid,
  signed_at       date,
  sort_order      smallint NOT NULL DEFAULT 100,
  CHECK (status <> 'SIGNED' OR signed_at IS NOT NULL),
  CHECK (NOT logo_permission OR logo_permission_file_id IS NOT NULL)
);
CREATE TABLE files (
  id          uuid PRIMARY KEY,
  bucket      varchar(20) NOT NULL CHECK (bucket IN ('quarantine','public','private')),
  key         text NOT NULL,
  mime        varchar(80) NOT NULL,
  size_bytes  int NOT NULL,
  sha256      bytea,
  scan_status varchar(10) NOT NULL DEFAULT 'PENDING' CHECK (scan_status IN ('PENDING','CLEAN','INFECTED','ERROR')),
  variants    jsonb,                                   -- {"avif_768": "...", ...}
  owner_id    uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE media (
  id          uuid PRIMARY KEY,
  file_id     uuid NOT NULL REFERENCES files(id),
  source      media_source NOT NULL,
  caption     jsonb, alt jsonb NOT NULL,
  taken_at    date, author varchar(120), location varchar(200),
  license     varchar(80) NOT NULL DEFAULT 'owned',
  tags        text[] NOT NULL DEFAULT '{}'
);
CREATE TABLE cms_pages (
  id uuid PRIMARY KEY, slug varchar(80) UNIQUE NOT NULL, title jsonb NOT NULL, body jsonb NOT NULL,
  status varchar(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  published_at timestamptz, updated_by uuid REFERENCES users(id)
);
CREATE TABLE news (
  id uuid PRIMARY KEY, slug varchar(120) UNIQUE NOT NULL, title jsonb NOT NULL, body jsonb NOT NULL,
  cover_media_id uuid REFERENCES media(id),
  status varchar(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  published_at timestamptz, author_id uuid REFERENCES users(id)
);

-- ---------- Xabarnomalar, audit, SI ----------
CREATE TABLE notifications (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id),
  kind        varchar(40) NOT NULL,
  channel     varchar(10) NOT NULL CHECK (channel IN ('telegram','sms','email','inapp')),
  payload     jsonb NOT NULL,
  status      varchar(10) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','FAILED','SKIPPED')),
  attempts    smallint NOT NULL DEFAULT 0,
  sent_at     timestamptz, read_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON notifications (user_id, created_at DESC);
CREATE TABLE notification_prefs (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE, kind varchar(40), enabled boolean NOT NULL,
  PRIMARY KEY (user_id, kind)
);
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES users(id),
  actor_role  role_code,
  action      varchar(60) NOT NULL,          -- 'certificate.approve','person.pinfl.view','export.xlsx',...
  entity      varchar(40) NOT NULL,
  entity_id   uuid,
  diff        jsonb,
  ip_hash     bytea,
  request_id  varchar(40),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_log (entity, entity_id, created_at DESC);
-- audit_log faqat INSERT qilinadi: ilova foydalanuvchisiga UPDATE/DELETE huquqi berilmaydi.
CREATE TABLE ai_runs (
  id          uuid PRIMARY KEY,
  feature     varchar(30) NOT NULL,          -- 'matching','cv','pronunciation','photo_check'
  model       varchar(60) NOT NULL,
  input_ref   jsonb NOT NULL,                -- anonimlashtirilgan kirish ma'lumoti havolasi, xom PD saqlanmaydi
  output      jsonb,
  latency_ms  int, cost_usd numeric(8,4),
  accepted_by uuid REFERENCES users(id),     -- inson qarori (BR-22)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- Qidiruv ----------
-- Sertifikatlar bu ko'rinishda yo'q: ^UB-\d{4}-\d{6}$ so'rov /verify/{number} ga ketadi.
-- To'liq ism roziligisiz usta qoladi, nomi "Aziz K." ko'rinishida. Rasm indeksda saqlanmaydi.
CREATE MATERIALIZED VIEW search_index AS
  SELECT 'worker'::text AS kind, wp.user_id AS id, wp.slug AS ref,
         to_tsvector('simple', unaccent(
           CASE
             WHEN coalesce((wp.visibility->>'full_name')::boolean, false) THEN u.full_name
             ELSE split_part(btrim(u.full_name), ' ', 1)
                  || CASE
                       WHEN split_part(btrim(u.full_name), ' ', 2) = '' THEN ''
                       ELSE ' ' || left(split_part(btrim(u.full_name), ' ', 2), 1) || '.'
                     END
           END
           || ' ' || coalesce(t.name->>'uz-Latn','') || ' ' || coalesce(t.name->>'ru','')
         )) AS tsv,
         CASE
           WHEN coalesce((wp.visibility->>'full_name')::boolean, false) THEN u.full_name
           ELSE split_part(btrim(u.full_name), ' ', 1)
                || CASE
                     WHEN split_part(btrim(u.full_name), ' ', 2) = '' THEN ''
                     ELSE ' ' || left(split_part(btrim(u.full_name), ' ', 2), 1) || '.'
                   END
         END
         || ' ' || coalesce(t.name->>'uz-Latn','') AS title
    FROM worker_profiles wp JOIN users u ON u.id = wp.user_id LEFT JOIN trades t ON t.id = wp.primary_trade_id
  UNION ALL
  SELECT 'product', p.id, p.id::text,
         to_tsvector('simple', unaccent(coalesce(p.name->>'uz-Latn','') || ' ' || coalesce(p.name->>'ru',''))),
         p.name->>'uz-Latn'
    FROM products p WHERE p.is_published
  UNION ALL
  SELECT 'object', o.id, o.id::text,
         to_tsvector('simple', unaccent(coalesce(o.name->>'uz-Latn','') || ' ' || coalesce(o.address,''))),
         o.name->>'uz-Latn'
    FROM construction_objects o WHERE o.is_public;
CREATE UNIQUE INDEX ON search_index (kind, id);
CREATE INDEX ON search_index USING gin (tsv);
CREATE INDEX ON search_index USING gin (title gin_trgm_ops);
