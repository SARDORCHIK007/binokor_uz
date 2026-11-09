-- Baseline schema (FR-OPS-01). Generated with pg_dump --schema-only from the running dev DB.
-- Source of truth for the model remains docs/04_DATA_MODEL.sql.

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg110+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg110+1)

--
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: -
--

--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: -
--

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: -
--

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

--
-- Name: postgis_tiger_geocoder; Type: EXTENSION; Schema: -; Owner: -
--

--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'SCREENING',
    'VOUCHER_CHECK',
    'INTERVIEW',
    'TRIAL',
    'ACCEPTED',
    'ENROLLED',
    'WAITLIST',
    'REJECTED',
    'WITHDRAWN'
);

--
-- Name: application_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_type AS ENUM (
    'YOUTH',
    'WORKER_UPSKILL',
    'UNIVERSITY_GRAD'
);

--
-- Name: attendance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendance_status AS ENUM (
    'PRESENT',
    'LATE',
    'ABSENT_EXCUSED',
    'ABSENT_UNEXCUSED'
);

--
-- Name: availability; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.availability AS ENUM (
    'FREE',
    'BUSY',
    'ABROAD',
    'INACTIVE'
);

--
-- Name: brigade_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.brigade_status AS ENUM (
    'FORMING',
    'READY',
    'PROPOSED',
    'DEPLOYED',
    'RETURNED',
    'DISBANDED'
);

--
-- Name: cert_issuer; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cert_issuer AS ENUM (
    'UB_NAMDTU',
    'STATE',
    'INTERNATIONAL'
);

--
-- Name: cert_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cert_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'ISSUED',
    'REJECTED',
    'REVOKED',
    'EXPIRED'
);

--
-- Name: employer_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employer_kind AS ENUM (
    'LOCAL',
    'FOREIGN',
    'AGENCY'
);

--
-- Name: enrollment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enrollment_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'COMPLETED',
    'DROPPED',
    'TRANSFERRED'
);

--
-- Name: matrix_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.matrix_class AS ENUM (
    'A',
    'B',
    'C',
    'D'
);

--
-- Name: media_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.media_source AS ENUM (
    'REAL_UYCHI',
    'PARTNER',
    'ILLUSTRATION',
    'USER_UPLOAD'
);

--
-- Name: module_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.module_kind AS ENUM (
    'THEORY',
    'WORKSHOP',
    'SITE',
    'LANGUAGE',
    'SAFETY'
);

--
-- Name: object_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.object_status AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'PAUSED'
);

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'NEW',
    'CONTACTED',
    'DONE',
    'CANCELLED'
);

--
-- Name: partner_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.partner_kind AS ENUM (
    'GOV',
    'EDU',
    'INTL',
    'EMPLOYER',
    'AGENCY',
    'PRODUCER'
);

--
-- Name: partner_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.partner_status AS ENUM (
    'SIGNED',
    'NEGOTIATING',
    'PLANNED',
    'ENDED'
);

--
-- Name: placement_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.placement_kind AS ENUM (
    'OUTSTAFF',
    'CONTRACT_WORK',
    'DIRECT',
    'ABROAD'
);

--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'NEW',
    'IN_REVIEW',
    'VIA_AGENCY',
    'SHORTLIST_SENT',
    'EMPLOYER_APPROVED',
    'CONTRACTING',
    'MATCHED',
    'CLOSED',
    'CANCELLED'
);

--
-- Name: role_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_code AS ENUM (
    'superadmin',
    'admin',
    'education_lead',
    'cert_officer',
    'placement_manager',
    'coordinator',
    'mentor',
    'teacher',
    'curator',
    'student',
    'worker',
    'employer_local',
    'employer_foreign',
    'producer',
    'partner_viewer',
    'vocab_author',
    'content_editor'
);

--
-- Name: track_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.track_code AS ENUM (
    'DOMESTIC',
    'FOREIGN'
);

--
-- Name: voucher_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.voucher_status AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'APPROVED',
    'DENIED'
);

--
-- Name: worker_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.worker_level AS ENUM (
    'APPRENTICE',
    'ASSISTANT',
    'MASTER',
    'FOREMAN'
);

--
-- Name: enforce_brigade_member_cap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_brigade_member_cap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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

--
-- Name: enforce_brigade_ready_size(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_brigade_ready_size() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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

--
-- Name: enforce_curator_capacity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_curator_capacity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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

--
-- Name: enforce_group_capacity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_group_capacity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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

--
-- Name: enforce_no_language_on_domestic(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_no_language_on_domestic() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
              IF NEW.kind = 'LANGUAGE' AND EXISTS (
                SELECT 1 FROM courses WHERE id = NEW.course_id AND track = 'DOMESTIC'
              ) THEN
                RAISE EXCEPTION 'DOMESTIC_NO_LANGUAGE' USING ERRCODE = 'P0001';
              END IF;
              RETURN NEW;
            END $$;

--
-- Name: ai_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_runs (
    id uuid NOT NULL,
    feature character varying(30) NOT NULL,
    model character varying(60) NOT NULL,
    input_ref jsonb NOT NULL,
    output jsonb,
    latency_ms integer,
    cost_usd numeric(8,4),
    accepted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--


--
-- Name: application_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_events (
    id bigint NOT NULL,
    application_id uuid NOT NULL,
    from_status public.application_status,
    to_status public.application_status NOT NULL,
    actor_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: application_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.application_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: application_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.application_events_id_seq OWNED BY public.application_events.id;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid NOT NULL,
    person_id uuid,
    type public.application_type NOT NULL,
    source character varying(10) NOT NULL,
    desired_trade_id uuid,
    desired_track public.track_code NOT NULL,
    destination_id uuid,
    trade_experience_years numeric(4,1) DEFAULT 0 NOT NULL,
    matrix_suggested public.matrix_class,
    draft_data jsonb,
    matrix_final public.matrix_class,
    status public.application_status DEFAULT 'DRAFT'::public.application_status NOT NULL,
    voucher_status public.voucher_status DEFAULT 'PENDING'::public.voucher_status NOT NULL,
    interview_notes text,
    trial_result jsonb,
    rejection_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT applications_check CHECK (((status <> 'REJECTED'::public.application_status) OR (rejection_reason IS NOT NULL))),
    CONSTRAINT applications_check1 CHECK (((status = 'DRAFT'::public.application_status) OR ((person_id IS NOT NULL) AND (matrix_suggested IS NOT NULL)))),
    CONSTRAINT applications_source_check CHECK (((source)::text = ANY ((ARRAY['MAHALLA'::character varying, 'ONLINE'::character varying, 'IMPORT'::character varying])::text[])))
);

--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    module_id uuid NOT NULL,
    score smallint,
    passed boolean NOT NULL,
    comment text,
    evidence_file_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    assessed_by uuid NOT NULL,
    assessed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessments_score_check CHECK (((score >= 0) AND (score <= 100)))
);

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    date date NOT NULL,
    status public.attendance_status NOT NULL,
    site_hours numeric(4,1) DEFAULT 0 NOT NULL,
    object_id uuid,
    recorded_by uuid NOT NULL,
    client_created_at timestamp with time zone,
    idempotency_key uuid,
    confirmed_by_employer uuid,
    CONSTRAINT attendance_site_hours_check CHECK (((site_hours >= (0)::numeric) AND (site_hours <= (12)::numeric)))
);

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor_id uuid,
    actor_role public.role_code,
    action character varying(60) NOT NULL,
    entity character varying(40) NOT NULL,
    entity_id uuid,
    diff jsonb,
    ip_hash bytea,
    request_id character varying(40),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;

--
-- Name: brigade_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brigade_members (
    brigade_id uuid NOT NULL,
    worker_user_id uuid NOT NULL,
    joined_at date DEFAULT CURRENT_DATE NOT NULL,
    left_at date
);

--
-- Name: brigades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brigades (
    id uuid NOT NULL,
    name character varying(80) NOT NULL,
    trade_id uuid NOT NULL,
    leader_user_id uuid NOT NULL,
    destination_id uuid,
    status public.brigade_status DEFAULT 'FORMING'::public.brigade_status NOT NULL,
    readiness jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: cert_seq_2026; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cert_seq_2026
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: certificate_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificate_approvals (
    certificate_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    role public.role_code NOT NULL,
    decision character varying(10) NOT NULL,
    comment text,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT certificate_approvals_decision_check CHECK (((decision)::text = ANY ((ARRAY['APPROVE'::character varying, 'REJECT'::character varying])::text[])))
);

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id uuid NOT NULL,
    number character varying(20),
    person_id uuid NOT NULL,
    enrollment_id uuid,
    trade_id uuid NOT NULL,
    issuer public.cert_issuer NOT NULL,
    level character varying(20),
    external_ref character varying(200),
    external_file_id uuid,
    status public.cert_status DEFAULT 'DRAFT'::public.cert_status NOT NULL,
    issued_at timestamp with time zone,
    valid_until date,
    payload jsonb,
    payload_hash bytea,
    signature bytea,
    key_id character varying(20),
    pdf_file_id uuid,
    revoked_at timestamp with time zone,
    revoke_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT certificates_check CHECK (((status <> 'REVOKED'::public.cert_status) OR (revoke_reason IS NOT NULL))),
    CONSTRAINT certificates_check1 CHECK (((status <> 'ISSUED'::public.cert_status) OR ((number IS NOT NULL) AND (signature IS NOT NULL)) OR (issuer <> 'UB_NAMDTU'::public.cert_issuer))),
    CONSTRAINT certificates_check2 CHECK (((status <> 'EXPIRED'::public.cert_status) OR ((issuer <> 'UB_NAMDTU'::public.cert_issuer) AND (valid_until IS NOT NULL))))
);

--
-- Name: cms_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_pages (
    id uuid NOT NULL,
    slug character varying(80) NOT NULL,
    title jsonb NOT NULL,
    body jsonb NOT NULL,
    status character varying(10) DEFAULT 'DRAFT'::character varying NOT NULL,
    published_at timestamp with time zone,
    updated_by uuid,
    CONSTRAINT cms_pages_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PUBLISHED'::character varying])::text[])))
);

--
-- Name: consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind character varying(40) NOT NULL,
    version character varying(20) NOT NULL,
    granted boolean NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_hash bytea
);

--
-- Name: construction_objects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.construction_objects (
    id uuid NOT NULL,
    name jsonb NOT NULL,
    address character varying(300),
    geom public.geometry(Point,4326) NOT NULL,
    mahalla_id uuid,
    client character varying(200),
    status public.object_status DEFAULT 'IN_PROGRESS'::public.object_status NOT NULL,
    progress_pct smallint DEFAULT 0 NOT NULL,
    start_date date,
    end_date date,
    is_public boolean DEFAULT true NOT NULL,
    CONSTRAINT construction_objects_progress_pct_check CHECK (((progress_pct >= 0) AND (progress_pct <= 100)))
);

--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid NOT NULL,
    trade_id uuid NOT NULL,
    track public.track_code NOT NULL,
    destination_id uuid,
    title jsonb NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    hours_theory smallint NOT NULL,
    hours_workshop smallint NOT NULL,
    hours_site smallint NOT NULL,
    hours_language smallint DEFAULT 0 NOT NULL,
    cert_rules jsonb DEFAULT '{"theory_min": 60, "practice_min": 70, "attendance_min": 0.8, "all_modules_passed": true}'::jsonb NOT NULL,
    demand_basis text,
    CONSTRAINT courses_check CHECK ((end_date > start_date)),
    CONSTRAINT courses_check1 CHECK ((((track = 'DOMESTIC'::public.track_code) AND (((end_date - start_date) >= 80) AND ((end_date - start_date) <= 190))) OR ((track = 'FOREIGN'::public.track_code) AND (((end_date - start_date) >= 170) AND ((end_date - start_date) <= 380))))),
    CONSTRAINT courses_check2 CHECK (((track = 'FOREIGN'::public.track_code) OR (hours_language = 0)))
);

--
-- Name: curator_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curator_groups (
    id uuid NOT NULL,
    curator_user_id uuid NOT NULL,
    lang_code character varying(5),
    max_members smallint DEFAULT 10 NOT NULL,
    CONSTRAINT curator_groups_max_members_check CHECK (((max_members >= 8) AND (max_members <= 10)))
);

--
-- Name: curator_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curator_members (
    curator_group_id uuid NOT NULL,
    student_user_id uuid NOT NULL
);

--
-- Name: demand_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demand_requests (
    id uuid NOT NULL,
    employer_id uuid NOT NULL,
    trade_id uuid NOT NULL,
    quantity smallint NOT NULL,
    as_brigade boolean DEFAULT false NOT NULL,
    track public.track_code NOT NULL,
    destination_id uuid,
    location character varying(200),
    start_date date,
    duration_months smallint,
    salary_from numeric(14,2),
    salary_to numeric(14,2),
    salary_currency character(3),
    conditions text,
    status public.request_status DEFAULT 'NEW'::public.request_status NOT NULL,
    agency_id uuid,
    assigned_manager_id uuid,
    first_response_at timestamp with time zone,
    cancel_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT demand_requests_check CHECK (((track = 'DOMESTIC'::public.track_code) OR (status = ANY (ARRAY['NEW'::public.request_status, 'CANCELLED'::public.request_status])) OR (agency_id IS NOT NULL))),
    CONSTRAINT demand_requests_quantity_check CHECK (((quantity >= 1) AND (quantity <= 500)))
);

--
-- Name: destinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.destinations (
    id uuid NOT NULL,
    country_code character(2) NOT NULL,
    name jsonb NOT NULL,
    lang_code character varying(5),
    required_exams jsonb,
    notes jsonb,
    is_active boolean DEFAULT true NOT NULL
);

--
-- Name: employer_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employer_members (
    employer_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_owner boolean DEFAULT false NOT NULL
);

--
-- Name: employers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employers (
    id uuid NOT NULL,
    kind public.employer_kind NOT NULL,
    name character varying(200) NOT NULL,
    country_code character(2) DEFAULT 'UZ'::bpchar NOT NULL,
    inn character varying(20),
    license_ref character varying(80),
    verified_at timestamp with time zone,
    verified_by uuid,
    logo_file_id uuid,
    CONSTRAINT employers_check CHECK (((country_code <> 'UZ'::bpchar) OR (kind = 'AGENCY'::public.employer_kind) OR (inn IS NOT NULL)))
);

--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid NOT NULL,
    group_id uuid NOT NULL,
    student_user_id uuid NOT NULL,
    application_id uuid,
    status public.enrollment_status DEFAULT 'ACTIVE'::public.enrollment_status NOT NULL,
    status_reason text,
    enrolled_at date DEFAULT CURRENT_DATE NOT NULL,
    completed_at date
);

--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id uuid NOT NULL,
    bucket character varying(20) NOT NULL,
    key text NOT NULL,
    mime character varying(80) NOT NULL,
    size_bytes integer NOT NULL,
    sha256 bytea,
    scan_status character varying(10) DEFAULT 'PENDING'::character varying NOT NULL,
    variants jsonb,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT files_bucket_check CHECK (((bucket)::text = ANY ((ARRAY['quarantine'::character varying, 'public'::character varying, 'private'::character varying])::text[]))),
    CONSTRAINT files_scan_status_check CHECK (((scan_status)::text = ANY ((ARRAY['PENDING'::character varying, 'CLEAN'::character varying, 'INFECTED'::character varying, 'ERROR'::character varying])::text[])))
);

--
-- Name: final_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_exams (
    id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    theory_score smallint,
    practice_score smallint,
    question_ids uuid[],
    answers jsonb,
    examiner_ids uuid[] NOT NULL,
    held_at timestamp with time zone NOT NULL,
    CONSTRAINT final_exams_practice_score_check CHECK (((practice_score >= 0) AND (practice_score <= 100))),
    CONSTRAINT final_exams_theory_score_check CHECK (((theory_score >= 0) AND (theory_score <= 100)))
);

--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid NOT NULL,
    course_id uuid NOT NULL,
    code character varying(30) NOT NULL,
    mentor_user_id uuid NOT NULL,
    max_students smallint DEFAULT 10 NOT NULL,
    schedule jsonb NOT NULL,
    CONSTRAINT groups_max_students_check CHECK (((max_students >= 1) AND (max_students <= 10)))
);

--
-- Name: languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.languages (
    code character varying(5) NOT NULL,
    name jsonb NOT NULL,
    rtl boolean DEFAULT false NOT NULL
);

--
-- Name: mahallas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mahallas (
    id uuid NOT NULL,
    name jsonb NOT NULL,
    district character varying(60) DEFAULT 'Uychi'::character varying NOT NULL,
    geom public.geometry(MultiPolygon,4326),
    coordinator_user_id uuid
);

--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id uuid NOT NULL,
    file_id uuid NOT NULL,
    source public.media_source NOT NULL,
    caption jsonb,
    alt jsonb NOT NULL,
    taken_at date,
    author character varying(120),
    location character varying(200),
    license character varying(80) DEFAULT 'owned'::character varying NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL
);

--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    id uuid NOT NULL,
    course_id uuid NOT NULL,
    kind public.module_kind NOT NULL,
    title jsonb NOT NULL,
    ord smallint NOT NULL,
    hours smallint NOT NULL,
    rubric jsonb
);

--
-- Name: news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news (
    id uuid NOT NULL,
    slug character varying(120) NOT NULL,
    title jsonb NOT NULL,
    body jsonb NOT NULL,
    cover_media_id uuid,
    status character varying(10) DEFAULT 'DRAFT'::character varying NOT NULL,
    published_at timestamp with time zone,
    author_id uuid,
    CONSTRAINT news_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PUBLISHED'::character varying])::text[])))
);

--
-- Name: notification_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_prefs (
    user_id uuid NOT NULL,
    kind character varying(40) NOT NULL,
    enabled boolean NOT NULL
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind character varying(40) NOT NULL,
    channel character varying(10) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(10) DEFAULT 'QUEUED'::character varying NOT NULL,
    attempts smallint DEFAULT 0 NOT NULL,
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_channel_check CHECK (((channel)::text = ANY ((ARRAY['telegram'::character varying, 'sms'::character varying, 'email'::character varying, 'inapp'::character varying])::text[]))),
    CONSTRAINT notifications_status_check CHECK (((status)::text = ANY ((ARRAY['QUEUED'::character varying, 'SENT'::character varying, 'FAILED'::character varying, 'SKIPPED'::character varying])::text[])))
);

--
-- Name: object_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.object_photos (
    id uuid NOT NULL,
    object_id uuid NOT NULL,
    file_id uuid NOT NULL,
    phase character varying(8) NOT NULL,
    taken_at timestamp with time zone,
    geom public.geometry(Point,4326),
    CONSTRAINT object_photos_phase_check CHECK (((phase)::text = ANY ((ARRAY['BEFORE'::character varying, 'DURING'::character varying, 'AFTER'::character varying])::text[])))
);

--
-- Name: object_workers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.object_workers (
    object_id uuid NOT NULL,
    worker_user_id uuid NOT NULL,
    brigade_id uuid
);

--
-- Name: order_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_requests (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    buyer_name character varying(120) NOT NULL,
    buyer_phone character varying(13) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    comment text,
    status public.order_status DEFAULT 'NEW'::public.order_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_codes (
    id uuid NOT NULL,
    phone character varying(13) NOT NULL,
    code_hash bytea NOT NULL,
    channel character varying(10) NOT NULL,
    attempts smallint DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT otp_codes_channel_check CHECK (((channel)::text = ANY ((ARRAY['telegram'::character varying, 'sms'::character varying])::text[])))
);

--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id uuid NOT NULL,
    name jsonb NOT NULL,
    kind public.partner_kind NOT NULL,
    country_code character(2) DEFAULT 'UZ'::bpchar NOT NULL,
    status public.partner_status NOT NULL,
    role_description jsonb,
    logo_file_id uuid,
    logo_permission boolean DEFAULT false NOT NULL,
    logo_permission_file_id uuid,
    agreement_file_id uuid,
    signed_at date,
    sort_order smallint DEFAULT 100 NOT NULL,
    CONSTRAINT partners_check CHECK (((status <> 'SIGNED'::public.partner_status) OR (signed_at IS NOT NULL))),
    CONSTRAINT partners_check1 CHECK (((NOT logo_permission) OR (logo_permission_file_id IS NOT NULL)))
);

--
-- Name: person_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_languages (
    person_id uuid NOT NULL,
    lang_code character varying(5) NOT NULL,
    level smallint NOT NULL,
    document_file_id uuid,
    verified_by uuid,
    CONSTRAINT person_languages_level_check CHECK (((level >= 0) AND (level <= 6)))
);

--
-- Name: persons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persons (
    id uuid NOT NULL,
    user_id uuid,
    last_name character varying(80) NOT NULL,
    first_name character varying(80) NOT NULL,
    middle_name character varying(80),
    birth_date date NOT NULL,
    gender character(1),
    mahalla_id uuid,
    address_enc bytea,
    pinfl_enc bytea,
    pinfl_hash bytea,
    passport_enc bytea,
    education_level character varying(30),
    university character varying(200),
    graduation_year smallint,
    social_registry boolean,
    medical_check_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT persons_gender_check CHECK ((gender = ANY (ARRAY['M'::bpchar, 'F'::bpchar])))
);

--
-- Name: placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placements (
    id uuid NOT NULL,
    worker_user_id uuid NOT NULL,
    request_id uuid,
    employer_id uuid NOT NULL,
    kind public.placement_kind NOT NULL,
    start_date date NOT NULL,
    end_date date,
    monthly_salary numeric(14,2),
    currency character(3) DEFAULT 'UZS'::bpchar NOT NULL,
    contract_file_id uuid
);

--
-- Name: portfolio_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_items (
    id uuid NOT NULL,
    worker_user_id uuid NOT NULL,
    object_id uuid,
    title jsonb NOT NULL,
    file_ids uuid[] NOT NULL,
    confirmed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: producer_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producer_members (
    producer_id uuid NOT NULL,
    user_id uuid NOT NULL
);

--
-- Name: producers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producers (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    inn character varying(20) NOT NULL,
    address character varying(300),
    geom public.geometry(Point,4326),
    phone character varying(13),
    logo_file_id uuid,
    verified_at timestamp with time zone
);

--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id uuid NOT NULL,
    code character varying(40) NOT NULL,
    name jsonb NOT NULL,
    parent_id uuid
);

--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    producer_id uuid NOT NULL,
    category_id uuid NOT NULL,
    name jsonb NOT NULL,
    description jsonb,
    unit character varying(16) NOT NULL,
    price numeric(14,2),
    price_updated_at timestamp with time zone,
    min_order numeric(12,2),
    standard_ref character varying(80),
    file_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    in_stock boolean DEFAULT true NOT NULL,
    is_published boolean DEFAULT false NOT NULL
);

--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_bank (
    id uuid NOT NULL,
    trade_id uuid NOT NULL,
    body jsonb NOT NULL,
    options jsonb NOT NULL,
    correct smallint NOT NULL,
    difficulty smallint DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

--
-- Name: request_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_candidates (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    worker_user_id uuid,
    brigade_id uuid,
    ai_score numeric(4,3),
    ai_explanation jsonb,
    status character varying(16) DEFAULT 'PROPOSED'::character varying NOT NULL,
    CONSTRAINT request_candidates_check CHECK (((worker_user_id IS NULL) <> (brigade_id IS NULL))),
    CONSTRAINT request_candidates_status_check CHECK (((status)::text = ANY ((ARRAY['PROPOSED'::character varying, 'WORKER_ACCEPTED'::character varying, 'WORKER_DECLINED'::character varying, 'EMPLOYER_APPROVED'::character varying, 'EMPLOYER_REJECTED'::character varying, 'HIRED'::character varying])::text[])))
);

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid NOT NULL,
    placement_id uuid NOT NULL,
    score_quality smallint NOT NULL,
    score_discipline smallint NOT NULL,
    score_safety smallint NOT NULL,
    score_communication smallint NOT NULL,
    comment text,
    author_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_score_communication_check CHECK (((score_communication >= 1) AND (score_communication <= 5))),
    CONSTRAINT reviews_score_discipline_check CHECK (((score_discipline >= 1) AND (score_discipline <= 5))),
    CONSTRAINT reviews_score_quality_check CHECK (((score_quality >= 1) AND (score_quality <= 5))),
    CONSTRAINT reviews_score_safety_check CHECK (((score_safety >= 1) AND (score_safety <= 5)))
);

--
-- Name: trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trades (
    id uuid NOT NULL,
    code character varying(40) NOT NULL,
    name jsonb NOT NULL,
    description jsonb,
    icon character varying(80),
    model_3d_file_id uuid,
    poster_file_id uuid,
    domestic_months smallint NOT NULL,
    foreign_lang_months smallint,
    standard_ref character varying(60),
    price_per_month numeric(12,0),
    salary_ranges jsonb,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT trades_check CHECK (((COALESCE((foreign_lang_months)::integer, 0) = 0) OR (((domestic_months + foreign_lang_months) >= 6) AND ((domestic_months + foreign_lang_months) <= 12)))),
    CONSTRAINT trades_domestic_months_check CHECK (((domestic_months >= 3) AND (domestic_months <= 6))),
    CONSTRAINT trades_foreign_lang_months_check CHECK (((foreign_lang_months >= 0) AND (foreign_lang_months <= 6)))
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    phone character varying(13) NOT NULL,
    email public.citext,
    telegram_id bigint,
    full_name character varying(200) NOT NULL,
    photo_file_id uuid,
    locale character varying(8) DEFAULT 'uz-Latn'::character varying NOT NULL,
    totp_secret_enc bytea,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT users_phone_check CHECK (((phone)::text ~ '^\+998[0-9]{9}$'::text))
);

--
-- Name: worker_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_profiles (
    user_id uuid NOT NULL,
    person_id uuid NOT NULL,
    slug character varying(40) NOT NULL,
    primary_trade_id uuid,
    level public.worker_level DEFAULT 'APPRENTICE'::public.worker_level NOT NULL,
    availability public.availability DEFAULT 'FREE'::public.availability NOT NULL,
    busy_until date,
    mahalla_id uuid,
    verified_hours integer DEFAULT 0 NOT NULL,
    rating_avg numeric(3,2),
    rating_count integer DEFAULT 0 NOT NULL,
    visibility jsonb DEFAULT '{"photo": false, "ratings": true, "full_name": false, "languages": true, "portfolio": true}'::jsonb NOT NULL,
    bio jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: search_index; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.search_index AS
 SELECT 'worker'::text AS kind,
    wp.user_id AS id,
    wp.slug AS ref,
    to_tsvector('simple'::regconfig, public.unaccent(((((
        CASE
            WHEN COALESCE(((wp.visibility ->> 'full_name'::text))::boolean, false) THEN (u.full_name)::text
            ELSE (split_part(btrim((u.full_name)::text), ' '::text, 1) ||
            CASE
                WHEN (split_part(btrim((u.full_name)::text), ' '::text, 2) = ''::text) THEN ''::text
                ELSE ((' '::text || "left"(split_part(btrim((u.full_name)::text), ' '::text, 2), 1)) || '.'::text)
            END)
        END || ' '::text) || COALESCE((t.name ->> 'uz-Latn'::text), ''::text)) || ' '::text) || COALESCE((t.name ->> 'ru'::text), ''::text)))) AS tsv,
    ((
        CASE
            WHEN COALESCE(((wp.visibility ->> 'full_name'::text))::boolean, false) THEN (u.full_name)::text
            ELSE (split_part(btrim((u.full_name)::text), ' '::text, 1) ||
            CASE
                WHEN (split_part(btrim((u.full_name)::text), ' '::text, 2) = ''::text) THEN ''::text
                ELSE ((' '::text || "left"(split_part(btrim((u.full_name)::text), ' '::text, 2), 1)) || '.'::text)
            END)
        END || ' '::text) || COALESCE((t.name ->> 'uz-Latn'::text), ''::text)) AS title
   FROM ((public.worker_profiles wp
     JOIN public.users u ON ((u.id = wp.user_id)))
     LEFT JOIN public.trades t ON ((t.id = wp.primary_trade_id)))
UNION ALL
 SELECT 'product'::text AS kind,
    p.id,
    (p.id)::text AS ref,
    to_tsvector('simple'::regconfig, public.unaccent(((COALESCE((p.name ->> 'uz-Latn'::text), ''::text) || ' '::text) || COALESCE((p.name ->> 'ru'::text), ''::text)))) AS tsv,
    (p.name ->> 'uz-Latn'::text) AS title
   FROM public.products p
  WHERE p.is_published
UNION ALL
 SELECT 'object'::text AS kind,
    o.id,
    (o.id)::text AS ref,
    to_tsvector('simple'::regconfig, public.unaccent(((COALESCE((o.name ->> 'uz-Latn'::text), ''::text) || ' '::text) || (COALESCE(o.address, ''::character varying))::text))) AS tsv,
    (o.name ->> 'uz-Latn'::text) AS title
   FROM public.construction_objects o
  WHERE o.is_public
  WITH NO DATA;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    refresh_hash bytea NOT NULL,
    user_agent text,
    ip_hash bytea,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);

--
-- Name: training_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_contracts (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    template_version character varying(20) NOT NULL,
    work_obligation_months smallint,
    generated_file_id uuid,
    signed_file_id uuid,
    signed_at date
);

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.role_code NOT NULL,
    scope_id uuid,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: verification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_logs (
    id bigint NOT NULL,
    certificate_id uuid,
    number_queried character varying(40),
    result character varying(12) NOT NULL,
    ip_hash bytea,
    country character(2),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: verification_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verification_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: verification_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verification_logs_id_seq OWNED BY public.verification_logs.id;

--
-- Name: vocab_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vocab_progress (
    user_id uuid NOT NULL,
    word_id uuid NOT NULL,
    box smallint DEFAULT 1 NOT NULL,
    next_review_at timestamp with time zone NOT NULL,
    correct_count integer DEFAULT 0 NOT NULL,
    wrong_count integer DEFAULT 0 NOT NULL,
    last_answer_at timestamp with time zone,
    CONSTRAINT vocab_progress_box_check CHECK (((box >= 1) AND (box <= 5)))
);

--
-- Name: vocab_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vocab_settings (
    user_id uuid NOT NULL,
    lang_code character varying(5) NOT NULL,
    trade_id uuid,
    daily_new smallint DEFAULT 20 NOT NULL,
    push_time time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    CONSTRAINT vocab_settings_daily_new_check CHECK (((daily_new >= 5) AND (daily_new <= 50)))
);

--
-- Name: vocab_words; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vocab_words (
    id uuid NOT NULL,
    lang_code character varying(5) NOT NULL,
    word character varying(120) NOT NULL,
    transcription_latn character varying(160) NOT NULL,
    transcription_cyrl character varying(160) NOT NULL,
    translation_uz character varying(200) NOT NULL,
    example text,
    example_uz text,
    category character varying(30) NOT NULL,
    trade_id uuid,
    rank smallint NOT NULL,
    image_file_id uuid,
    audio_file_id uuid,
    status character varying(12) DEFAULT 'DRAFT'::character varying NOT NULL,
    author_id uuid,
    reviewer_id uuid,
    CONSTRAINT vocab_words_category_check CHECK (((category)::text = ANY ((ARRAY['communication'::character varying, 'safety'::character varying, 'tools'::character varying, 'materials'::character varying, 'actions'::character varying, 'numbers'::character varying, 'trade'::character varying])::text[]))),
    CONSTRAINT vocab_words_check CHECK ((((category)::text = 'trade'::text) = (trade_id IS NOT NULL))),
    CONSTRAINT vocab_words_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'REVIEW'::character varying, 'PUBLISHED'::character varying])::text[])))
);

--
-- Name: worker_level_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_level_history (
    id bigint NOT NULL,
    user_id uuid,
    from_level public.worker_level,
    to_level public.worker_level NOT NULL,
    suggested_by_system boolean NOT NULL,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: worker_level_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.worker_level_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: worker_level_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.worker_level_history_id_seq OWNED BY public.worker_level_history.id;

--
-- Name: application_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_events ALTER COLUMN id SET DEFAULT nextval('public.application_events_id_seq'::regclass);

--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);

--
-- Name: verification_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_logs ALTER COLUMN id SET DEFAULT nextval('public.verification_logs_id_seq'::regclass);

--
-- Name: worker_level_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_level_history ALTER COLUMN id SET DEFAULT nextval('public.worker_level_history_id_seq'::regclass);

--
-- Name: ai_runs ai_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_runs
    ADD CONSTRAINT ai_runs_pkey PRIMARY KEY (id);

--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--


--
-- Name: application_events application_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_events
    ADD CONSTRAINT application_events_pkey PRIMARY KEY (id);

--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);

--
-- Name: assessments assessments_enrollment_id_module_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_enrollment_id_module_id_key UNIQUE (enrollment_id, module_id);

--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);

--
-- Name: attendance attendance_enrollment_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_enrollment_id_date_key UNIQUE (enrollment_id, date);

--
-- Name: attendance attendance_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_idempotency_key_key UNIQUE (idempotency_key);

--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);

--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

--
-- Name: brigade_members brigade_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigade_members
    ADD CONSTRAINT brigade_members_pkey PRIMARY KEY (brigade_id, worker_user_id);

--
-- Name: brigades brigades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigades
    ADD CONSTRAINT brigades_pkey PRIMARY KEY (id);

--
-- Name: certificate_approvals certificate_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_approvals
    ADD CONSTRAINT certificate_approvals_pkey PRIMARY KEY (certificate_id, approver_id);

--
-- Name: certificates certificates_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_number_key UNIQUE (number);

--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);

--
-- Name: cms_pages cms_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_pkey PRIMARY KEY (id);

--
-- Name: cms_pages cms_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_slug_key UNIQUE (slug);

--
-- Name: consents consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_pkey PRIMARY KEY (id);

--
-- Name: construction_objects construction_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_objects
    ADD CONSTRAINT construction_objects_pkey PRIMARY KEY (id);

--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);

--
-- Name: curator_groups curator_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curator_groups
    ADD CONSTRAINT curator_groups_pkey PRIMARY KEY (id);

--
-- Name: curator_members curator_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curator_members
    ADD CONSTRAINT curator_members_pkey PRIMARY KEY (curator_group_id, student_user_id);

--
-- Name: demand_requests demand_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_requests
    ADD CONSTRAINT demand_requests_pkey PRIMARY KEY (id);

--
-- Name: destinations destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (id);

--
-- Name: employer_members employer_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employer_members
    ADD CONSTRAINT employer_members_pkey PRIMARY KEY (employer_id, user_id);

--
-- Name: employers employers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_pkey PRIMARY KEY (id);

--
-- Name: enrollments enrollments_group_id_student_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_group_id_student_user_id_key UNIQUE (group_id, student_user_id);

--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);

--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);

--
-- Name: final_exams final_exams_enrollment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exams
    ADD CONSTRAINT final_exams_enrollment_id_key UNIQUE (enrollment_id);

--
-- Name: final_exams final_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exams
    ADD CONSTRAINT final_exams_pkey PRIMARY KEY (id);

--
-- Name: groups groups_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_code_key UNIQUE (code);

--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);

--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (code);

--
-- Name: mahallas mahallas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mahallas
    ADD CONSTRAINT mahallas_pkey PRIMARY KEY (id);

--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);

--
-- Name: modules modules_course_id_ord_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_course_id_ord_key UNIQUE (course_id, ord);

--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);

--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);

--
-- Name: news news_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_slug_key UNIQUE (slug);

--
-- Name: notification_prefs notification_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_prefs
    ADD CONSTRAINT notification_prefs_pkey PRIMARY KEY (user_id, kind);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Name: object_photos object_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_photos
    ADD CONSTRAINT object_photos_pkey PRIMARY KEY (id);

--
-- Name: object_workers object_workers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_workers
    ADD CONSTRAINT object_workers_pkey PRIMARY KEY (object_id, worker_user_id);

--
-- Name: order_requests order_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_requests
    ADD CONSTRAINT order_requests_pkey PRIMARY KEY (id);

--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);

--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);

--
-- Name: person_languages person_languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_languages
    ADD CONSTRAINT person_languages_pkey PRIMARY KEY (person_id, lang_code);

--
-- Name: persons persons_pinfl_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pinfl_hash_key UNIQUE (pinfl_hash);

--
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);

--
-- Name: persons persons_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_user_id_key UNIQUE (user_id);

--
-- Name: placements placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_pkey PRIMARY KEY (id);

--
-- Name: portfolio_items portfolio_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);

--
-- Name: producer_members producer_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producer_members
    ADD CONSTRAINT producer_members_pkey PRIMARY KEY (producer_id, user_id);

--
-- Name: producers producers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producers
    ADD CONSTRAINT producers_pkey PRIMARY KEY (id);

--
-- Name: product_categories product_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_code_key UNIQUE (code);

--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);

--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

--
-- Name: question_bank question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);

--
-- Name: request_candidates request_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_candidates
    ADD CONSTRAINT request_candidates_pkey PRIMARY KEY (id);

--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

--
-- Name: reviews reviews_placement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_placement_id_key UNIQUE (placement_id);

--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

--
-- Name: trades trades_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_code_key UNIQUE (code);

--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);

--
-- Name: training_contracts training_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_contracts
    ADD CONSTRAINT training_contracts_pkey PRIMARY KEY (id);

--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

--
-- Name: user_roles user_roles_user_id_role_scope_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_scope_id_key UNIQUE NULLS NOT DISTINCT (user_id, role, scope_id);

--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);

--
-- Name: verification_logs verification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_logs
    ADD CONSTRAINT verification_logs_pkey PRIMARY KEY (id);

--
-- Name: vocab_progress vocab_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_progress
    ADD CONSTRAINT vocab_progress_pkey PRIMARY KEY (user_id, word_id);

--
-- Name: vocab_settings vocab_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_settings
    ADD CONSTRAINT vocab_settings_pkey PRIMARY KEY (user_id);

--
-- Name: vocab_words vocab_words_lang_code_word_trade_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_words
    ADD CONSTRAINT vocab_words_lang_code_word_trade_id_key UNIQUE (lang_code, word, trade_id);

--
-- Name: vocab_words vocab_words_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_words
    ADD CONSTRAINT vocab_words_pkey PRIMARY KEY (id);

--
-- Name: worker_level_history worker_level_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_level_history
    ADD CONSTRAINT worker_level_history_pkey PRIMARY KEY (id);

--
-- Name: worker_profiles worker_profiles_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_person_id_key UNIQUE (person_id);

--
-- Name: worker_profiles worker_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_pkey PRIMARY KEY (user_id);

--
-- Name: worker_profiles worker_profiles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_slug_key UNIQUE (slug);

--
-- Name: applications_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_status_created_at_idx ON public.applications USING btree (status, created_at DESC);

--
-- Name: audit_log_entity_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_entity_entity_id_created_at_idx ON public.audit_log USING btree (entity, entity_id, created_at DESC);

--
-- Name: consents_user_id_kind_granted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consents_user_id_kind_granted_at_idx ON public.consents USING btree (user_id, kind, granted_at DESC);

--
-- Name: construction_objects_geom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX construction_objects_geom_idx ON public.construction_objects USING gist (geom);

--
-- Name: notifications_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_created_at_idx ON public.notifications USING btree (user_id, created_at DESC);

--
-- Name: otp_codes_phone_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otp_codes_phone_created_at_idx ON public.otp_codes USING btree (phone, created_at DESC);

--
-- Name: search_index_kind_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX search_index_kind_id_idx ON public.search_index USING btree (kind, id);

--
-- Name: search_index_title_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX search_index_title_idx ON public.search_index USING gin (title public.gin_trgm_ops);

--
-- Name: search_index_tsv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX search_index_tsv_idx ON public.search_index USING gin (tsv);

--
-- Name: vocab_progress_user_id_next_review_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vocab_progress_user_id_next_review_at_idx ON public.vocab_progress USING btree (user_id, next_review_at);

--
-- Name: brigade_members trg_brigade_member_cap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_brigade_member_cap BEFORE INSERT OR UPDATE OF left_at, brigade_id ON public.brigade_members FOR EACH ROW EXECUTE FUNCTION public.enforce_brigade_member_cap();

--
-- Name: brigades trg_brigade_ready_size; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_brigade_ready_size BEFORE INSERT OR UPDATE OF status ON public.brigades FOR EACH ROW EXECUTE FUNCTION public.enforce_brigade_ready_size();

--
-- Name: curator_members trg_curator_capacity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_curator_capacity BEFORE INSERT OR UPDATE OF curator_group_id ON public.curator_members FOR EACH ROW EXECUTE FUNCTION public.enforce_curator_capacity();

--
-- Name: modules trg_domestic_language; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_domestic_language BEFORE INSERT OR UPDATE OF kind, course_id ON public.modules FOR EACH ROW EXECUTE FUNCTION public.enforce_no_language_on_domestic();

--
-- Name: enrollments trg_group_capacity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_group_capacity BEFORE INSERT OR UPDATE OF status, group_id ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.enforce_group_capacity();

--
-- Name: ai_runs ai_runs_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_runs
    ADD CONSTRAINT ai_runs_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id);

--
-- Name: application_events application_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_events
    ADD CONSTRAINT application_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);

--
-- Name: application_events application_events_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_events
    ADD CONSTRAINT application_events_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

--
-- Name: applications applications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: applications applications_desired_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_desired_trade_id_fkey FOREIGN KEY (desired_trade_id) REFERENCES public.trades(id);

--
-- Name: applications applications_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id);

--
-- Name: applications applications_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);

--
-- Name: assessments assessments_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.users(id);

--
-- Name: assessments assessments_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);

--
-- Name: assessments assessments_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id);

--
-- Name: attendance attendance_confirmed_by_employer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_confirmed_by_employer_fkey FOREIGN KEY (confirmed_by_employer) REFERENCES public.users(id);

--
-- Name: attendance attendance_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);

--
-- Name: attendance attendance_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);

--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);

--
-- Name: brigade_members brigade_members_brigade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigade_members
    ADD CONSTRAINT brigade_members_brigade_id_fkey FOREIGN KEY (brigade_id) REFERENCES public.brigades(id) ON DELETE CASCADE;

--
-- Name: brigade_members brigade_members_worker_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigade_members
    ADD CONSTRAINT brigade_members_worker_user_id_fkey FOREIGN KEY (worker_user_id) REFERENCES public.users(id);

--
-- Name: brigades brigades_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigades
    ADD CONSTRAINT brigades_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: brigades brigades_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigades
    ADD CONSTRAINT brigades_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id);

--
-- Name: brigades brigades_leader_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigades
    ADD CONSTRAINT brigades_leader_user_id_fkey FOREIGN KEY (leader_user_id) REFERENCES public.users(id);

--
-- Name: brigades brigades_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigades
    ADD CONSTRAINT brigades_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

--
-- Name: certificate_approvals certificate_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_approvals
    ADD CONSTRAINT certificate_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);

--
-- Name: certificate_approvals certificate_approvals_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_approvals
    ADD CONSTRAINT certificate_approvals_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(id) ON DELETE CASCADE;

--
-- Name: certificates certificates_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);

--
-- Name: certificates certificates_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);

--
-- Name: certificates certificates_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

--
-- Name: cms_pages cms_pages_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);

--
-- Name: consents consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

--
-- Name: construction_objects construction_objects_mahalla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_objects
    ADD CONSTRAINT construction_objects_mahalla_id_fkey FOREIGN KEY (mahalla_id) REFERENCES public.mahallas(id);

--
-- Name: courses courses_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id);

--
-- Name: courses courses_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

--
-- Name: curator_groups curator_groups_curator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curator_groups
    ADD CONSTRAINT curator_groups_curator_user_id_fkey FOREIGN KEY (curator_user_id) REFERENCES public.users(id);

--
-- Name: curator_groups curator_groups_lang_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curator_groups
    ADD CONSTRAINT curator_groups_lang_code_fkey FOREIGN KEY (lang_code) REFERENCES public.languages(code);

--
-- Name: curator_members curator_members_curator_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curator_members
    ADD CONSTRAINT curator_members_curator_group_id_fkey FOREIGN KEY (curator_group_id) REFERENCES public.curator_groups(id) ON DELETE CASCADE;

--
-- Name: curator_members curator_members_student_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curator_members
    ADD CONSTRAINT curator_members_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES public.users(id);

--
-- Name: demand_requests demand_requests_agency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_requests
    ADD CONSTRAINT demand_requests_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.employers(id);

--
-- Name: demand_requests demand_requests_assigned_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_requests
    ADD CONSTRAINT demand_requests_assigned_manager_id_fkey FOREIGN KEY (assigned_manager_id) REFERENCES public.users(id);

--
-- Name: demand_requests demand_requests_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_requests
    ADD CONSTRAINT demand_requests_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id);

--
-- Name: demand_requests demand_requests_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_requests
    ADD CONSTRAINT demand_requests_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(id);

--
-- Name: demand_requests demand_requests_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_requests
    ADD CONSTRAINT demand_requests_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

--
-- Name: destinations destinations_lang_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_lang_code_fkey FOREIGN KEY (lang_code) REFERENCES public.languages(code);

--
-- Name: employer_members employer_members_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employer_members
    ADD CONSTRAINT employer_members_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(id) ON DELETE CASCADE;

--
-- Name: employer_members employer_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employer_members
    ADD CONSTRAINT employer_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

--
-- Name: employers employers_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);

--
-- Name: enrollments enrollments_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id);

--
-- Name: enrollments enrollments_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);

--
-- Name: enrollments enrollments_student_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES public.users(id);

--
-- Name: files files_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);

--
-- Name: final_exams final_exams_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exams
    ADD CONSTRAINT final_exams_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);

--
-- Name: attendance fk_att_object; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT fk_att_object FOREIGN KEY (object_id) REFERENCES public.construction_objects(id);

--
-- Name: portfolio_items fk_pf_object; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT fk_pf_object FOREIGN KEY (object_id) REFERENCES public.construction_objects(id);

--
-- Name: groups groups_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);

--
-- Name: groups groups_mentor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_mentor_user_id_fkey FOREIGN KEY (mentor_user_id) REFERENCES public.users(id);

--
-- Name: mahallas mahallas_coordinator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mahallas
    ADD CONSTRAINT mahallas_coordinator_user_id_fkey FOREIGN KEY (coordinator_user_id) REFERENCES public.users(id);

--
-- Name: media media_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);

--
-- Name: modules modules_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: news news_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);

--
-- Name: news news_cover_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_cover_media_id_fkey FOREIGN KEY (cover_media_id) REFERENCES public.media(id);

--
-- Name: notification_prefs notification_prefs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_prefs
    ADD CONSTRAINT notification_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

--
-- Name: object_photos object_photos_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_photos
    ADD CONSTRAINT object_photos_object_id_fkey FOREIGN KEY (object_id) REFERENCES public.construction_objects(id) ON DELETE CASCADE;

--
-- Name: object_workers object_workers_brigade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_workers
    ADD CONSTRAINT object_workers_brigade_id_fkey FOREIGN KEY (brigade_id) REFERENCES public.brigades(id);

--
-- Name: object_workers object_workers_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_workers
    ADD CONSTRAINT object_workers_object_id_fkey FOREIGN KEY (object_id) REFERENCES public.construction_objects(id) ON DELETE CASCADE;

--
-- Name: object_workers object_workers_worker_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_workers
    ADD CONSTRAINT object_workers_worker_user_id_fkey FOREIGN KEY (worker_user_id) REFERENCES public.users(id);

--
-- Name: order_requests order_requests_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_requests
    ADD CONSTRAINT order_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

--
-- Name: person_languages person_languages_lang_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_languages
    ADD CONSTRAINT person_languages_lang_code_fkey FOREIGN KEY (lang_code) REFERENCES public.languages(code);

--
-- Name: person_languages person_languages_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_languages
    ADD CONSTRAINT person_languages_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;

--
-- Name: person_languages person_languages_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_languages
    ADD CONSTRAINT person_languages_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);

--
-- Name: persons persons_mahalla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_mahalla_id_fkey FOREIGN KEY (mahalla_id) REFERENCES public.mahallas(id);

--
-- Name: persons persons_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

--
-- Name: placements placements_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(id);

--
-- Name: placements placements_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.demand_requests(id);

--
-- Name: placements placements_worker_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_worker_user_id_fkey FOREIGN KEY (worker_user_id) REFERENCES public.users(id);

--
-- Name: portfolio_items portfolio_items_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id);

--
-- Name: portfolio_items portfolio_items_worker_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_worker_user_id_fkey FOREIGN KEY (worker_user_id) REFERENCES public.users(id);

--
-- Name: producer_members producer_members_producer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producer_members
    ADD CONSTRAINT producer_members_producer_id_fkey FOREIGN KEY (producer_id) REFERENCES public.producers(id) ON DELETE CASCADE;

--
-- Name: producer_members producer_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producer_members
    ADD CONSTRAINT producer_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

--
-- Name: product_categories product_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_categories(id);

--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id);

--
-- Name: products products_producer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_producer_id_fkey FOREIGN KEY (producer_id) REFERENCES public.producers(id);

--
-- Name: question_bank question_bank_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

--
-- Name: request_candidates request_candidates_brigade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_candidates
    ADD CONSTRAINT request_candidates_brigade_id_fkey FOREIGN KEY (brigade_id) REFERENCES public.brigades(id);

--
-- Name: request_candidates request_candidates_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_candidates
    ADD CONSTRAINT request_candidates_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.demand_requests(id) ON DELETE CASCADE;

--
-- Name: request_candidates request_candidates_worker_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_candidates
    ADD CONSTRAINT request_candidates_worker_user_id_fkey FOREIGN KEY (worker_user_id) REFERENCES public.users(id);

--
-- Name: reviews reviews_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);

--
-- Name: reviews reviews_placement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_placement_id_fkey FOREIGN KEY (placement_id) REFERENCES public.placements(id);

--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: training_contracts training_contracts_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_contracts
    ADD CONSTRAINT training_contracts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id);

--
-- Name: user_roles user_roles_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);

--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: verification_logs verification_logs_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_logs
    ADD CONSTRAINT verification_logs_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(id);

--
-- Name: vocab_progress vocab_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_progress
    ADD CONSTRAINT vocab_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: vocab_progress vocab_progress_word_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_progress
    ADD CONSTRAINT vocab_progress_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.vocab_words(id) ON DELETE CASCADE;

--
-- Name: vocab_settings vocab_settings_lang_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_settings
    ADD CONSTRAINT vocab_settings_lang_code_fkey FOREIGN KEY (lang_code) REFERENCES public.languages(code);

--
-- Name: vocab_settings vocab_settings_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_settings
    ADD CONSTRAINT vocab_settings_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

--
-- Name: vocab_settings vocab_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_settings
    ADD CONSTRAINT vocab_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: vocab_words vocab_words_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_words
    ADD CONSTRAINT vocab_words_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);

--
-- Name: vocab_words vocab_words_lang_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_words
    ADD CONSTRAINT vocab_words_lang_code_fkey FOREIGN KEY (lang_code) REFERENCES public.languages(code);

--
-- Name: vocab_words vocab_words_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_words
    ADD CONSTRAINT vocab_words_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);

--
-- Name: vocab_words vocab_words_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocab_words
    ADD CONSTRAINT vocab_words_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

--
-- Name: worker_level_history worker_level_history_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_level_history
    ADD CONSTRAINT worker_level_history_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

--
-- Name: worker_level_history worker_level_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_level_history
    ADD CONSTRAINT worker_level_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

--
-- Name: worker_profiles worker_profiles_mahalla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_mahalla_id_fkey FOREIGN KEY (mahalla_id) REFERENCES public.mahallas(id);

--
-- Name: worker_profiles worker_profiles_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);

--
-- Name: worker_profiles worker_profiles_primary_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_primary_trade_id_fkey FOREIGN KEY (primary_trade_id) REFERENCES public.trades(id);

--
-- Name: worker_profiles worker_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_profiles
    ADD CONSTRAINT worker_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

--
-- PostgreSQL database dump complete
--

