--
-- PostgreSQL database dump
--

\restrict aX9E2OsJzSOefXqhOfhK1Bw6cEaBChId0DwDWbpbYTxCGcFC6lVNmhelFrxwQ39

-- Dumped from database version 14.19 (Ubuntu 14.19-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.19 (Ubuntu 14.19-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    admin character varying(64),
    aksi character varying(64),
    target character varying(128),
    hasil character varying(16),
    detail text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
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
-- Name: bk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bk (
    id bigint NOT NULL,
    siswa_id integer NOT NULL,
    judul text NOT NULL,
    tanggal date,
    file_path text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bk_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bk_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bk_id_seq OWNED BY public.bk.id;


--
-- Name: jasmani_polda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jasmani_polda (
    id bigint NOT NULL,
    siswa_id integer,
    no_panda text,
    nama text,
    jenis_kelamin text,
    jalur_seleksi text,
    angkatan text,
    tb_cm numeric(10,2),
    bb_kg numeric(10,2),
    ratio_index text,
    somato_type text,
    klasifikasi_tipe_tubuh text,
    nilai_tipe_tubuh numeric(10,2),
    nilai_kelainan numeric(10,2),
    nilai_terkecil numeric(10,2),
    nilai_anthro numeric(10,2),
    antro text,
    antro_text text,
    pencapaian_nbl text,
    renang numeric(10,2),
    renang_x20 numeric(10,2),
    kesamaptaan_hga text,
    kesamaptaan_nga text,
    pull_up_hgb1 numeric(10,2),
    pull_up_ngb1 numeric(10,2),
    sit_up_hgb2 numeric(10,2),
    sit_up_ngb2 numeric(10,2),
    push_up_hgb3 numeric(10,2),
    push_up_ngb3 numeric(10,2),
    shuttle_run_hgb4 numeric(10,2),
    shuttle_run_ngb4 numeric(10,2),
    nilai_b numeric(10,2),
    na_a_b numeric(10,2),
    samapta_x80 numeric(10,2),
    nilai_akhir numeric(10,2),
    ktgr text,
    ket text,
    catatan text,
    sumber_file text,
    sheet_name text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: jasmani_polda_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jasmani_polda_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jasmani_polda_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jasmani_polda_id_seq OWNED BY public.jasmani_polda.id;


--
-- Name: jasmani_spn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jasmani_spn (
    id bigint NOT NULL,
    siswa_id integer,
    nosis character varying(50),
    lari_12_menit_ts numeric(10,2),
    lari_12_menit_rs numeric(10,2),
    sit_up_ts numeric(10,2),
    sit_up_rs numeric(10,2),
    shuttle_run_ts numeric(10,2),
    shuttle_run_rs numeric(10,2),
    push_up_ts numeric(10,2),
    push_up_rs numeric(10,2),
    pull_up_ts numeric(10,2),
    pull_up_rs numeric(10,2),
    tb_cm numeric(10,2),
    bb_kg numeric(10,2),
    nilai_akhir numeric(10,2),
    keterangan text,
    tahap integer,
    sumber_file text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: jasmani_spn_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jasmani_spn_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jasmani_spn_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jasmani_spn_id_seq OWNED BY public.jasmani_spn.id;


--
-- Name: mapel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mapel (
    id bigint NOT NULL,
    siswa_id integer NOT NULL,
    mapel text NOT NULL,
    nilai text,
    semester text,
    pertemuan integer,
    catatan text,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: mapel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mapel_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mapel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mapel_id_seq OWNED BY public.mapel.id;


--
-- Name: mental; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mental (
    id bigint NOT NULL,
    siswa_id integer NOT NULL,
    minggu_ke integer,
    nilai text,
    catatan text,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: mental_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mental_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mental_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mental_id_seq OWNED BY public.mental.id;


--
-- Name: pelanggaran; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pelanggaran (
    id bigint NOT NULL,
    siswa_id integer NOT NULL,
    judul text NOT NULL,
    tanggal date,
    file_path text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: pelanggaran_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pelanggaran_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pelanggaran_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pelanggaran_id_seq OWNED BY public.pelanggaran.id;


--
-- Name: prestasi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prestasi (
    id bigint NOT NULL,
    siswa_id integer NOT NULL,
    judul text,
    tingkat text,
    deskripsi text,
    file_path text,
    tanggal date,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: prestasi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prestasi_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prestasi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prestasi_id_seq OWNED BY public.prestasi.id;


--
-- Name: riwayat_kesehatan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riwayat_kesehatan (
    id bigint NOT NULL,
    siswa_id integer NOT NULL,
    judul text NOT NULL,
    deskripsi text,
    file_path text,
    tanggal date,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: riwayat_kesehatan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.riwayat_kesehatan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: riwayat_kesehatan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.riwayat_kesehatan_id_seq OWNED BY public.riwayat_kesehatan.id;


--
-- Name: siswa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siswa (
    id integer NOT NULL,
    nosis character varying(50),
    nama text NOT NULL,
    nik character varying(32),
    foto text,
    file_ktp text,
    alamat text,
    tempat_lahir text,
    tanggal_lahir text,
    umur text,
    agama text,
    jenis_kelamin text,
    email text,
    no_hp text,
    dikum_akhir text,
    jurusan text,
    jenis_pendidikan text,
    tb text,
    bb text,
    gol_darah text,
    no_bpjs text,
    sim_yang_dimiliki text,
    no_hp_keluarga text,
    nama_ayah_kandung text,
    nama_ibu_kandung text,
    pekerjaan_ayah_kandung text,
    pekerjaan_ibu_kandung text,
    asal_polda text,
    asal_polres text,
    kelompok_angkatan text,
    diktuk_awal text,
    tahun_diktuk text,
    personel text,
    ukuran_pakaian text,
    ukuran_celana text,
    ukuran_sepatu text,
    ukuran_tutup_kepala text,
    jenis_rekrutmen text,
    batalion text,
    ton text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: siswa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.siswa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: siswa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.siswa_id_seq OWNED BY public.siswa.id;


--
-- Name: tes_semarang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tes_semarang (
    id integer NOT NULL,
    siswa_id integer NOT NULL,
    jenis_tes character varying(32) NOT NULL,
    parameter character varying(64),
    skor numeric(6,2),
    tanggal date,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: tes_semarang_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tes_semarang_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tes_semarang_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tes_semarang_id_seq OWNED BY public.tes_semarang.id;


--
-- Name: v_jasmani_itemized; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jasmani_itemized AS
 WITH ident AS (
         SELECT j.id AS jasmani_spn_id,
            j.siswa_id,
            COALESCE(s.nosis, j.nosis) AS nosis,
            s.nama,
            upper(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*'::text, ''::text), ''::text)) AS kompi,
                CASE
                    WHEN (regexp_replace(COALESCE(s.ton, ''::text), '\\D+'::text, ''::text, 'g'::text) <> ''::text) THEN (regexp_replace(s.ton, '\\D+'::text, ''::text, 'g'::text))::integer
                    ELSE NULL::integer
                END AS pleton,
            j.tahap,
            j.keterangan,
            j.sumber_file,
            j.created_at,
            j.updated_at,
            j.lari_12_menit_ts,
            j.lari_12_menit_rs,
            j.sit_up_ts,
            j.sit_up_rs,
            j.shuttle_run_ts,
            j.shuttle_run_rs,
            j.push_up_ts,
            j.push_up_rs,
            j.pull_up_ts,
            j.pull_up_rs
           FROM (public.jasmani_spn j
             LEFT JOIN public.siswa s ON ((s.id = j.siswa_id)))
        )
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Lari 12 Menit (TS)'::text AS item,
    (ident.lari_12_menit_ts)::text AS nilai,
    'TS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Lari 12 Menit (RS)'::text AS item,
    (ident.lari_12_menit_rs)::text AS nilai,
    'RS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Sit Up (TS)'::text AS item,
    (ident.sit_up_ts)::text AS nilai,
    'TS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Sit Up (RS)'::text AS item,
    (ident.sit_up_rs)::text AS nilai,
    'RS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Shuttle Run (TS)'::text AS item,
    (ident.shuttle_run_ts)::text AS nilai,
    'TS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Shuttle Run (RS)'::text AS item,
    (ident.shuttle_run_rs)::text AS nilai,
    'RS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Push Up (TS)'::text AS item,
    (ident.push_up_ts)::text AS nilai,
    'TS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Push Up (RS)'::text AS item,
    (ident.push_up_rs)::text AS nilai,
    'RS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Pull Up (TS)'::text AS item,
    (ident.pull_up_ts)::text AS nilai,
    'TS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident
UNION ALL
 SELECT ident.jasmani_spn_id,
    ident.siswa_id,
    ident.nosis,
    ident.nama,
    ident.kompi,
    ident.pleton,
    ident.tahap,
    'Pull Up (RS)'::text AS item,
    (ident.pull_up_rs)::text AS nilai,
    'RS'::text AS kategori,
    ident.keterangan,
    ident.sumber_file,
    ident.created_at,
    ident.updated_at
   FROM ident;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: bk id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bk ALTER COLUMN id SET DEFAULT nextval('public.bk_id_seq'::regclass);


--
-- Name: jasmani_polda id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jasmani_polda ALTER COLUMN id SET DEFAULT nextval('public.jasmani_polda_id_seq'::regclass);


--
-- Name: jasmani_spn id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jasmani_spn ALTER COLUMN id SET DEFAULT nextval('public.jasmani_spn_id_seq'::regclass);


--
-- Name: mapel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mapel ALTER COLUMN id SET DEFAULT nextval('public.mapel_id_seq'::regclass);


--
-- Name: mental id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental ALTER COLUMN id SET DEFAULT nextval('public.mental_id_seq'::regclass);


--
-- Name: pelanggaran id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelanggaran ALTER COLUMN id SET DEFAULT nextval('public.pelanggaran_id_seq'::regclass);


--
-- Name: prestasi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestasi ALTER COLUMN id SET DEFAULT nextval('public.prestasi_id_seq'::regclass);


--
-- Name: riwayat_kesehatan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_kesehatan ALTER COLUMN id SET DEFAULT nextval('public.riwayat_kesehatan_id_seq'::regclass);


--
-- Name: siswa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siswa ALTER COLUMN id SET DEFAULT nextval('public.siswa_id_seq'::regclass);


--
-- Name: tes_semarang id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tes_semarang ALTER COLUMN id SET DEFAULT nextval('public.tes_semarang_id_seq'::regclass);


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, admin, aksi, target, hasil, detail, created_at) FROM stdin;
1	admin	import_siswa	sheet=data siswa; jenis=Diktuk	ok	{"sheetUsed":"data siswa","rows":228,"ok":228,"skip":0,"fail":0,"headerDetected":{"NAMA":"nama","NOSIS":"nosis","BATALION":"batalion","TON":"ton","NIK":"nik","FILE  KTP":"file_ktp","ALAMAT":"alamat","TEMPAT LAHIR":"tempat_lahir","TANGGAL LAHIR":"tanggal_lahir","UMUR":"umur","AGAMA":"agama","JENIS KELAMIN":"jenis_kelamin","EMAIL":"email","NO. HP.":"no_hp","DIKUM AKHIR":"dikum_akhir","JURUSAN":"jurusan","TB":"tb","BB":"bb","GOL. DARAH":"gol_darah","NO. BPJS":"no_bpjs","SIM YANG DIMILIKI":"sim_yang_dimiliki","NO. HP. KELUARGA":"no_hp_keluarga","NAMA AYAH KANDUNG":"nama_ayah_kandung","NAMA IBU KANDUNG":"nama_ibu_kandung","PEKERJAAN AYAH KANDUNG":"pekerjaan_ayah_kandung","PEKERJAAN IBU KANDUNG":"pekerjaan_ibu_kandung","ASAL POLDA":"asal_polda","ASAL POLRES":"asal_polres","KELOMPOK ANGKATAN":"kelompok_angkatan","DIKTUK AWAL":"diktuk_awal","TAHUN DIKTUK":"tahun_diktuk","PERSONEL":"personel","UKURAN PAKAIAN":"ukuran_pakaian","UKURAN CELANA":"ukuran_celana","UKURAN SEPATU":"ukuran_sepatu","UKURAN TUTUP KEPALA":"ukuran_tutup_kepala","JENIS REKRUTMEN":"jenis_rekrutmen"},"headerRow":1,"skipReasons":{"noname":0,"nonosis":0},"detailLists":{"ok":[{"nosis":"0001","nama":"FHARIZ INDRAWAN AFRIANTO"},{"nosis":"0002","nama":"YANUARTA ALDHI PRASETYA"},{"nosis":"0003","nama":"RAFA ESKA DHINATA"},{"nosis":"0004","nama":"ALFINDRA KHANSA"},{"nosis":"0005","nama":"FIKHRAM ARDYAN NUGRAHA"},{"nosis":"0006","nama":"ANFA MAILAN PRATAMA"},{"nosis":"0007","nama":"HASBIAN AJI WIDATAMA"},{"nosis":"0008","nama":"RAVY GATRA ARDAVA"},{"nosis":"0009","nama":"FAIZAL FIRMAN GHANI"},{"nosis":"0010","nama":"RICKY FIRMANSYAH"},{"nosis":"0011","nama":"MARIO SETIAWAN, S.M."},{"nosis":"0012","nama":"DHIKA PUTRA AZIZ TARUNA"},{"nosis":"0013","nama":"RIDWAN BEKTI SUWITO"},{"nosis":"0014","nama":"FIRDAN WIBY PRADANA"},{"nosis":"0015","nama":"MALIK ROHMANA PUTRA"},{"nosis":"0016","nama":"EXCEL KEVIN ARDANA"},{"nosis":"0017","nama":"ANDIKA SAPUTRA"},{"nosis":"0018","nama":"SATRIO GADING MUKTI"},{"nosis":"0019","nama":"MAULANA ZAKI WARDHANA"},{"nosis":"0020","nama":"OVI FADILLAH KURNIAWAN"},{"nosis":"0021","nama":"MUHAMAD REZA ALFIAN MUZAKI"},{"nosis":"0022","nama":"RAYI PRAMUKTI"},{"nosis":"0023","nama":"RIFQI ARDIAN ALFAREZA"},{"nosis":"0024","nama":"BRYAN ADAM MAIFA EKA PUTRA"},{"nosis":"0025","nama":"ALFIAN RAFI' SUSILA PUTRA"},{"nosis":"0026","nama":"QUILLA DWI NAUVAL"},{"nosis":"0027","nama":"DIMAS ARYAGUNA RAMADHAN"},{"nosis":"0028","nama":"BRYANDIKA KRISNA AJI"},{"nosis":"0029","nama":"FADHIL HERMAWAN"},{"nosis":"0030","nama":"MUHAMMAD AULIA RAMADAN, S.H."},{"nosis":"0031","nama":"RIFQI DHARMA SAPUTRA"},{"nosis":"0032","nama":"PRADIVTA SURYAWIBOWO"},{"nosis":"0033","nama":"SHEVA ALDITYA GUSTI SAPUTRA"},{"nosis":"0034","nama":"JEREMIA BICCAR PURBA"},{"nosis":"0035","nama":"HADZA MIN FADLI ROBBI"},{"nosis":"0036","nama":"ARYA GILANG PRADANA"},{"nosis":"0037","nama":"MUHAMMAD GILANG PRATAMA"},{"nosis":"0038","nama":"STEFANUS TRI WAHYU PRATAMA, S.H."},{"nosis":"0039","nama":"RAMADHAN LINANGKUNG AJI"},{"nosis":"0040","nama":"KELVIN YUSUF ALFIAN PUTRA"},{"nosis":"0041","nama":"MUH HELGA WAHYU ARDIAN"},{"nosis":"0042","nama":"MAHADEVA BAGUS RADITYA KUSUMA NAGARA"},{"nosis":"0043","nama":"MUHAMMAD ALDHIYA KAFI"},{"nosis":"0044","nama":"KAVINDRA RAFANI AHMAD"},{"nosis":"0045","nama":"RIFKY FERDIAN SAPUTRA"},{"nosis":"0046","nama":"NAZARUL FAIZ"},{"nosis":"0047","nama":"MUHAMMAD MUJAHIDUR ROHMAN"},{"nosis":"0048","nama":"YOSA REGA ANUGRAH"},{"nosis":"0049","nama":"FANDHANU WIGAYUNASA"},{"nosis":"0050","nama":"ARDIANSYAH"},{"nosis":"0051","nama":"SEPTA ZUHDI WIBOWO"},{"nosis":"0052","nama":"SHIDIQ LANDUNG RIHWATOMI"},{"nosis":"0053","nama":"ILHAM SYAHRUL FAIS"},{"nosis":"0054","nama":"MUHAMMAD FITRA JAFAR"},{"nosis":"0055","nama":"MUHAMMAD FARHAN"},{"nosis":"0056","nama":"CANDRA BAKTI UTAMA"},{"nosis":"0057","nama":"AHMAD SAUMIN FUADI"},{"nosis":"0058","nama":"MUHAMMAD KHARIS IRFANI"},{"nosis":"0059","nama":"SHENDY NAFISA ARCELLO"},{"nosis":"0060","nama":"ARIFKI YUDA PUTRATAMA"},{"nosis":"0061","nama":"ZULFA RIFAI PUTRA"},{"nosis":"0062","nama":"FANDRA ANIS DESADMA"},{"nosis":"0063","nama":"YEREMIA SHALLOM PRASANDA, S.I.P."},{"nosis":"0064","nama":"MUHAMMAD NARENDRA LIQAULLAH"},{"nosis":"0065","nama":"CHASKA VENO ZUHARA"},{"nosis":"0066","nama":"BANGGA FAHRIANTO"},{"nosis":"0067","nama":"LINTANG SAKTI ERLANGGA"},{"nosis":"0068","nama":"AKBAR TRISDAR ANUGRAH FIRDAUS"},{"nosis":"0069","nama":"EKA NOSA AJI WIRAYUDA"},{"nosis":"0070","nama":"MUHAMMAD AQMAL ZAKY MUBAROK"},{"nosis":"0071","nama":"AWANG EKA SEFANASTA"},{"nosis":"0072","nama":"LUCIO SAPUTRA NOFA HASAN"},{"nosis":"0073","nama":"FA'IZ RYAN AJIE PRANATA"},{"nosis":"0074","nama":"ANUNG NUGRAHANTO YUDHITO"},{"nosis":"0075","nama":"HERDYN PRATAMA OGANSAH"},{"nosis":"0076","nama":"ALFIAN FERDIANSAH"},{"nosis":"0077","nama":"RIZKY ADITYA"},{"nosis":"0078","nama":"SATRIYA BAYU PRANATA"},{"nosis":"0079","nama":"FACHRI AGUNG GINANJAR"},{"nosis":"0080","nama":"RIO PANGESTU"},{"nosis":"0081","nama":"APRILIADE JUMADIL SATMOKO"},{"nosis":"0082","nama":"ODWEEN FERDIANSYAH"},{"nosis":"0083","nama":"MUHAMMAD ABDUL AZIS"},{"nosis":"0084","nama":"ARTHUR LANDHAM PUTRA MAULANA"},{"nosis":"0085","nama":"FATTAN DESTA ABINAWA"},{"nosis":"0086","nama":"TEGAR MAHYA JAWWAD"},{"nosis":"0087","nama":"BINTANG FAREZA YUDHA WIBOWO"},{"nosis":"0088","nama":"RAIHAN RAFI MAHENDRA"},{"nosis":"0089","nama":"ADRIANSYAH ATHO’ULLAH PRATAMA"},{"nosis":"0090","nama":"DAMAR WIBISONO HARJO MARJONO"},{"nosis":"0091","nama":"RISAL AL AKBAR"},{"nosis":"0092","nama":"HELMY SHAFAN FADHIL"},{"nosis":"0093","nama":"FAHRI AGUS PRASETYO"},{"nosis":"0094","nama":"JOGAS DIVO NUGROHO"},{"nosis":"0095","nama":"KELVIN PRATIKTO, S.Akun."},{"nosis":"0096","nama":"ATTARIQ DEWA CANNAVARO, S.H."},{"nosis":"0097","nama":"MUHAMMAD IBNU DWI ANDIKA"},{"nosis":"0098","nama":"ARGASOKA RIZKY YUDISTIRA SUTOMO"},{"nosis":"0099","nama":"FAIZAL AFIF INDYARTO"},{"nosis":"0100","nama":"NIKI CHANDIKA PRATAMA"},{"nosis":"0101","nama":"HABIL JUNIAR RAHMAN"},{"nosis":"0102","nama":"MUHAMMAD AMIRUL HIDAYAT"},{"nosis":"0103","nama":"MUHAMMAD GALUH SAPUTRO"},{"nosis":"0104","nama":"ANDREA RADJA ZACKY AFRIALDY"},{"nosis":"0105","nama":"MUHAMMAD AFFAN ARDIANSYAH"},{"nosis":"0106","nama":"YILDIREY HAIKAL FADHLI"},{"nosis":"0107","nama":"HANIF IMAM MUZAKI"},{"nosis":"0108","nama":"JULIANDA IVAN BHAYANGKARA"},{"nosis":"0109","nama":"RADEN BAGUS ABDULLAH ASWIN SULA"},{"nosis":"0110","nama":"BAYU SATRIO RAMADANI"},{"nosis":"0111","nama":"HAIDAR RAYA GINARI PUTRA"},{"nosis":"0112","nama":"YOGI SAKTI WAHYUDI"},{"nosis":"0113","nama":"M. RIZAL WAHYU PRASETYO"},{"nosis":"0114","nama":"FAWWAZ IZZAN TSAQIF"},{"nosis":"0115","nama":"ERICH NAUFAL HANIF NUGROHO"},{"nosis":"0116","nama":"ZHAKARIA FADHILLA ADHI"},{"nosis":"0117","nama":"AKFAL ENGGA KUSUMAH"},{"nosis":"0118","nama":"RIEFKY ANDRI WIBOWO"},{"nosis":"0119","nama":"SEENDI FADHILATUL MUNNA"},{"nosis":"0120","nama":"DITO AKHMAD FAISAL"},{"nosis":"0121","nama":"EKA PRASTYA WIBOWO"},{"nosis":"0122","nama":"AFRIZAL REDY BRILIANSYACH"},{"nosis":"0123","nama":"ADHADE QUMARAN BEKTI"},{"nosis":"0124","nama":"RAFI TEGAR PAMBUDI"},{"nosis":"0125","nama":"GENTHUR RAHMADHANI"},{"nosis":"0126","nama":"MUHAMMAD DZAKY"},{"nosis":"0127","nama":"ALFAN FAWAS ILYASA"},{"nosis":"0128","nama":"SUSILO WAHYU ADI PRATAMA"},{"nosis":"0129","nama":"ALFARIZA ERDIANTO"},{"nosis":"0130","nama":"NUNO ELLANG SAMUDRA"},{"nosis":"0131","nama":"FIRMAN RIZKI PEBRIYANTO"},{"nosis":"0132","nama":"FITRORIC QUMAR HIDAYAT"},{"nosis":"0133","nama":"MUHAMMAD NUR WAHID, S.E."},{"nosis":"0134","nama":"MUHAMMAD SYAFIQ AVICENA"},{"nosis":"0135","nama":"RIVAI GAGAH PRAMANA"},{"nosis":"0136","nama":"ANDHYKA YUSUF KRISNA"},{"nosis":"0137","nama":"GIGIH ADHIYODHA"},{"nosis":"0138","nama":"RANDIKA DAVA PUTRA DEFRIAN"},{"nosis":"0139","nama":"CHRISTIAN RAFAEL MAHENDRA PASHA"},{"nosis":"0140","nama":"MUHAMMAD ALVIN HIDAYAT"},{"nosis":"0141","nama":"FAJAR PUTRA ARVIANTO"},{"nosis":"0142","nama":"MUHAMMAD FAISAL NURRAHMAN"},{"nosis":"0143","nama":"HAIDAR FATHIN FAKHRISANI"},{"nosis":"0144","nama":"TINO TEGAR WICAKSANA"},{"nosis":"0145","nama":"ENDRA ORVALA HUGA SAPUTRA"},{"nosis":"0146","nama":"MUHAMAD RIFKY RYZAL RAMADHANI"},{"nosis":"0147","nama":"DAMAR AJI PRIMANDARU"},{"nosis":"0148","nama":"SATYA HAPRABU PRANATA"},{"nosis":"0149","nama":"DAVIN RADINKA MAULANA SETYANTO"},{"nosis":"0150","nama":"DIKI KURNIAWAN"},{"nosis":"0151","nama":"RAISSA ANDHIKA WIDODO"},{"nosis":"0152","nama":"RIFKI FAJAR ASSHIDIQ"},{"nosis":"0153","nama":"SALMA ARDIANSYAH"},{"nosis":"0154","nama":"AQSAL KAYLA NANDA"},{"nosis":"0155","nama":"KHOIRUL ASHFA RIFA'I"},{"nosis":"0156","nama":"DHAMAR ADHAM DWI PRASETYA"},{"nosis":"0157","nama":"IDFI ARDI ARIYA KUSUMA, S.Kep., Ns."},{"nosis":"0158","nama":"FIKRI RIZA ANDHIKA"},{"nosis":"0159","nama":"ANUGRAH ANNAS SETIADI"},{"nosis":"0160","nama":"BOY TIKO SEIKA YAHARI"},{"nosis":"0161","nama":"ANDRA RIZQI PRADIPTA"},{"nosis":"0162","nama":"YUDI DWI PRASTYO"},{"nosis":"0163","nama":"RACHEL MERDHITIYA PRADANA"},{"nosis":"0164","nama":"ZIIDAN FAHIM ALVADY"},{"nosis":"0165","nama":"MUHAMMAD IRSYAD FAHMI TUMANGGOR"},{"nosis":"0166","nama":"DIMAS ARDIANSAH"},{"nosis":"0167","nama":"WAHYU FEBRIATMOKO"},{"nosis":"0168","nama":"AHMAD ZULFIAN MUFTAH"},{"nosis":"0169","nama":"FALS MAULANA"},{"nosis":"0170","nama":"ALFARIZI ADAM FIRDAUS NARAYA"},{"nosis":"0171","nama":"MACHEL ABIROY"},{"nosis":"0172","nama":"MUHAMMAD HAIKAL HUDAYA"},{"nosis":"0173","nama":"AJIMAS PUTRA PRATAMA"},{"nosis":"0174","nama":"YOGA IRFAN SAPUTRA"},{"nosis":"0175","nama":"SATYA ADI WICAKSANA"},{"nosis":"0176","nama":"IRFAN FADHILA"},{"nosis":"0177","nama":"RADIKA KUSUMA ADI"},{"nosis":"0178","nama":"IZZA MAULANA RIFQI FAUZI"},{"nosis":"0179","nama":"MUHAMMAD FAHDI RAMADHAN"},{"nosis":"0180","nama":"SULTAN BIMA HUSNUL HAKIM"},{"nosis":"0181","nama":"ANUN DWI YULIANTO, S.Tr.Ak."},{"nosis":"0182","nama":"ALVIN ROUUF SAPUTRO"},{"nosis":"0183","nama":"DAVID RAHMAT ENDRAWAN"},{"nosis":"0184","nama":"DIMAS AKBAR SETYAWAN"},{"nosis":"0185","nama":"YUDYANANDA RAFLI FIRDAUS"},{"nosis":"0186","nama":"EMMANUEL PETRA EVAN PRIANDIKA"},{"nosis":"0187","nama":"WILDAN RIFKY FADHLUR RAHMAN"},{"nosis":"0188","nama":"ACHMAD NASIR"},{"nosis":"0189","nama":"BRILIAN HARI IMANULLAH"},{"nosis":"0190","nama":"HAFIZ AQILA ALTHAF"},{"nosis":"0191","nama":"VIGO DWI PRILY ANDREAN"},{"nosis":"0192","nama":"MUHAMMAD FURQON HABIBULLOH"},{"nosis":"0193","nama":"BIMA SAKTI"},{"nosis":"0194","nama":"AMUSA KHOIRUL RIDHOI"},{"nosis":"0195","nama":"DAFFA NORMA DHARMAWAN"},{"nosis":"0196","nama":"PANDU HARIS PRADIPTA"},{"nosis":"0197","nama":"BIMA SATRIA NUGROHO"},{"nosis":"0198","nama":"SATRIO WAHYU AJI"},{"nosis":"0199","nama":"AHMAD MILDANIL AKHYAR"},{"nosis":"0200","nama":"RONALD ACHMAD EFFENDY"},{"nosis":"0201","nama":"RIDHO BAGUS UTOMO"},{"nosis":"0202","nama":"RIDHO KAMAL ATMAJA"},{"nosis":"0203","nama":"HENRY PRAYUDHA PUTRA"},{"nosis":"0204","nama":"NANDO KUSUMA WARIH"},{"nosis":"0205","nama":"ILHAM ALDI PRATAMA , S.Kep.,Ns"},{"nosis":"0206","nama":"RIZKI KURNIAWAN"},{"nosis":"0207","nama":"MUHAMMAD FAIZ AL DZIKRI"},{"nosis":"0208","nama":"JOGUES DOVI SANTOSO"},{"nosis":"0209","nama":"HANDI DWI YULIYANTO"},{"nosis":"0210","nama":"VITO NUR ALAMSYAH"},{"nosis":"0211","nama":"MUHAMMAD ILHAM AKBAR"},{"nosis":"0212","nama":"AHMAD FALIQ GIBRAN AL RAMADHAN SYARIFUDIN"},{"nosis":"0213","nama":"ALAN HAFIDH ZULFIAN"},{"nosis":"0214","nama":"ARGA PRABASWARA"},{"nosis":"0215","nama":"YEDICA DHIMAS CHRISTIAWAN"},{"nosis":"0216","nama":"MUHAMMAD IKHSAN SAPUTRA"},{"nosis":"0217","nama":"ERLANGGA YANAVISA, A.Md. Kep."},{"nosis":"0218","nama":"IMANUEL YEFTA GIRIWARA"},{"nosis":"0219","nama":"MUHAMMAD HAMID BAIHAQI"},{"nosis":"0220","nama":"MAHENDRA FADEL PRATAMA"},{"nosis":"0221","nama":"RAYHAN WINAR SYAHPUTRA"},{"nosis":"0222","nama":"RADEN ZAKI ADIS BOWOLAKSONO"},{"nosis":"0223","nama":"DHEWO TATA KURNIAWAN"},{"nosis":"0224","nama":"FAIQ ZIDNA ARJUNAJA"},{"nosis":"0225","nama":"RIEKO ARDHI APRILIANSYAH"},{"nosis":"0226","nama":"YOGA ADITAMA"},{"nosis":"0227","nama":"TAUFIQ HIDAYAT"},{"nosis":"0228","nama":"WILLY KUSUMA"}],"skip":[],"fail":[]}}	2025-10-14 17:16:39.180329
\.


--
-- Data for Name: bk; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bk (id, siswa_id, judul, tanggal, file_path, created_at) FROM stdin;
\.


--
-- Data for Name: jasmani_polda; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jasmani_polda (id, siswa_id, no_panda, nama, jenis_kelamin, jalur_seleksi, angkatan, tb_cm, bb_kg, ratio_index, somato_type, klasifikasi_tipe_tubuh, nilai_tipe_tubuh, nilai_kelainan, nilai_terkecil, nilai_anthro, antro, antro_text, pencapaian_nbl, renang, renang_x20, kesamaptaan_hga, kesamaptaan_nga, pull_up_hgb1, pull_up_ngb1, sit_up_hgb2, sit_up_ngb2, push_up_hgb3, push_up_ngb3, shuttle_run_hgb4, shuttle_run_ngb4, nilai_b, na_a_b, samapta_x80, nilai_akhir, ktgr, ket, catatan, sumber_file, sheet_name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: jasmani_spn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jasmani_spn (id, siswa_id, nosis, lari_12_menit_ts, lari_12_menit_rs, sit_up_ts, sit_up_rs, shuttle_run_ts, shuttle_run_rs, push_up_ts, push_up_rs, pull_up_ts, pull_up_rs, tb_cm, bb_kg, nilai_akhir, keterangan, tahap, sumber_file, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mapel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mapel (id, siswa_id, mapel, nilai, semester, pertemuan, catatan, meta, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mental; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mental (id, siswa_id, minggu_ke, nilai, catatan, meta, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pelanggaran; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pelanggaran (id, siswa_id, judul, tanggal, file_path, created_at) FROM stdin;
\.


--
-- Data for Name: prestasi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prestasi (id, siswa_id, judul, tingkat, deskripsi, file_path, tanggal, created_at) FROM stdin;
\.


--
-- Data for Name: riwayat_kesehatan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.riwayat_kesehatan (id, siswa_id, judul, deskripsi, file_path, tanggal, created_at) FROM stdin;
\.


--
-- Data for Name: siswa; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.siswa (id, nosis, nama, nik, foto, file_ktp, alamat, tempat_lahir, tanggal_lahir, umur, agama, jenis_kelamin, email, no_hp, dikum_akhir, jurusan, jenis_pendidikan, tb, bb, gol_darah, no_bpjs, sim_yang_dimiliki, no_hp_keluarga, nama_ayah_kandung, nama_ibu_kandung, pekerjaan_ayah_kandung, pekerjaan_ibu_kandung, asal_polda, asal_polres, kelompok_angkatan, diktuk_awal, tahun_diktuk, personel, ukuran_pakaian, ukuran_celana, ukuran_sepatu, ukuran_tutup_kepala, jenis_rekrutmen, batalion, ton, created_at, updated_at) FROM stdin;
1	0001	FHARIZ INDRAWAN AFRIANTO	300	\N	https://drive.google.com/open?id=1jfWQ4uv_3gAHgbKM3H299GkCKWni_IMR	TEGALSARI BARAT IV RT 003 RW 012 KEL. TEGALSARI KEC. CANDISARI SEMARANG	SALATIGA	38362	\N	ISLAM	LAKI-LAKI	fharizindra@gmail.com	089612956719	SMA	IPS	DIKTUK	178	74	B	0001194746916	SIM C	081226767831	WALIDI	SRI INDAYATI	BURUH	PNS	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	45	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
2	0002	YANUARTA ALDHI PRASETYA	301	\N	https://drive.google.com/open?id=1PJlN9oJdRyvre0vFh6o-1142FIqkhsAd	JETIS RT 001 RW 009 KEL.BLIMBING KEC.GATAK KAB.SUKOHARJO	SUKOHARJO	38724	\N	ISLAM	LAKI-LAKI	yanuartaap@gmail.com	085940765448	SMA	IPA	DIKTUK	178	72	O	0001097972796	SIM C	081329664388	SUWAHANA	SUSANTI	PURNAWIRAWAN TNI/POLRI	WIRASWASTA	POLDA JAWA TENGAH	POLRES SUKOHARJO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	44	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
3	0003	RAFA ESKA DHINATA	302	\N	https://drive.google.com/open?id=1Pd4iVYsOHLRmeBDaTl-dOLFF4MWpUMnR	DK.PASINGGAHAN RT 5 RW 2 DS.SUGIHREJO KEC.GABUS KAB. PATI  JAWA TENGAH	PATI	38893	\N	ISLAM	LAKI-LAKI	rafaeskadhinata32@gmail.com	085700538172	SMA	SMA	DIKTUK	176	68	A	0000091683371	SIM C	081327618797	SUWASIS	JUHARSIH	PNS	PNS	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	42	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
4	0004	ALFINDRA KHANSA	303	\N	https://drive.google.com/open?id=1dt7G8cRruxnfHtF0RGgTNfZQz9RHnzMQ	KADISOBO LL RT 01/ RW 03,TRIMULYO,SLEMAN,SLEMAN,DIY	SLEMAN	38514	\N	ISLAM	LAKI-LAKI	alfindrakhansa77@gmail.com	085759235629	SMA	SMA IPA	DIKTUK	173	65	O	0000096499899	SIM C	081215548884	MUHAMMAD DARBAN,S.H.,M.H	ZAZIM HENY ROKHMAWATI	POLRI	PNS	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	41	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
5	0005	FIKHRAM ARDYAN NUGRAHA	304	\N	https://drive.google.com/open?id=1r34yA5uTeWYJ1gk5auOF6FQL6pBeuQWc	CEMPAKA INDAH, RT/RW 13/01, DESA RANDUSARI, KEC.TERAS, KAB.BOYOLALI	SUKOHARJO	38795	\N	ISLAM	LAKI-LAKI	fikhramnugraha@gmail.com	088238270627	SMA	IPA	DIKTUK	173	64	O	0002225003984	SIM C	082136010480	EDY TRI NUGROHO	TRI SUYATMI	SWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES BOYOLALI	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
6	0006	ANFA MAILAN PRATAMA	305	\N	https://drive.google.com/open?id=15rihUOXsOYz9qnaSKW436sQbBl9SUlQ9	DESA GROBOG WETAN RT 4 RW 3 KECAMATAN PANGKAH KABUPATEN TEGAL	TEGAL	38857	\N	ISLAM	LAKI-LAKI	anfamailan1234@gmail.com	082135599378	MA	IPS	DIKTUK	172	59	BELUM MENGETAHUI	0002890408397	SIM C	082324308012	EKO SANTOSO	NUR ASIAH	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES TEGAL	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	42	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
7	0007	HASBIAN AJI WIDATAMA	306	\N	https://drive.google.com/open?id=1gLiijOQ7wcSmP8qEsEF6IW2ODX7FmPcd	DUSUN SIDANEGARA, RT 02/RW 02 DESA SIDANEGARA, KECAMATAN KEDUNGREJA, KABUPATEN CILACAP, PROVINSI JAWA TENGAH	CILACAP	39290	\N	ISLAM	LAKI-LAKI	hasbianaji27@gmail.com	088985872057	SMA	SMA	DIKTUK	170	59	B	0001265301066	SIM C	085227325708	TARSO WIDODO	SRI MUNTATI	TNI	WIRASWASTA	POLDA JAWA TENGAH	POLRESTA CILACAP	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	43	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
8	0008	RAVY GATRA ARDAVA	307	\N	https://drive.google.com/open?id=1Y5DbLFPkhWr2V0T3lGFqILSpsLYhxhxd	TASIKMADU, RT 011/RW 003, KEPUTRAN, KEMALANG, KLATEN	KLATEN	38765	\N	ISLAM	LAKI-LAKI	davaravyputra381@gmail.com	081392620318	SMK	TEKNIK MANAJEMEN DAN PERAWATAN OTOMOTIF	DIKTUK	167	63	A	0001965065995	SIM C	087839815733	TRIYONO	HAPPY ANDRIYANI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	42	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
9	0009	FAIZAL FIRMAN GHANI	308	\N	https://drive.google.com/open?id=101l-gv8L9IW3BncEV0r5B3WnpIJ200Mr	BABAD RT 02,NGARUM,NGRAMPAL, SRAGEN	SRAGEN	38699	\N	ISLAM	LAKI-LAKI	faizalfirmanghani0@gmail.com	082135367363	MA	IPA	DIKTUK	166	60	A	0000090697432	SIM C	081329701666	SADONO NUR UTOMO	TYAS SUSILOWATI	POLRI	PNS	POLDA JAWA TENGAH	POLRES SRAGEN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	41	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
10	0010	RICKY FIRMANSYAH	309	\N	https://drive.google.com/open?id=19tinmAvF-YI6GofilwsA_JlmMdkMAv8V	JALAN MANGGA DALAM SELATAN RT. 007 RW. 002\nKEL. SRONDOL WETAN, KEC. BANYUMANIK, KOTA SEMARANG	SEMARANG	39064	\N	KATHOLIK	LAKI-LAKI	rickyfirmansyah521@gmail.com	081575004452	SMA	SMA	DIKTUK	178	69	O	0002256082468	SIM C	081575004451	THOMAS EKO BINTORO	IVA KRISNAWATI	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	45	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
11	0011	MARIO SETIAWAN, S.M.	310	\N	https://drive.google.com/open?id=1NT1FtOsia3j6NibWq6RRKgYSyJJoBZzR	SAPEN GK I/627 RT 24 RW 07 DEMANGAN, GONDOKUSUMAN, YOGYAKARTA	YOGYAKARTA	37337	\N	KRISTEN	LAKI-LAKI	mmariosetiawan22@gmail.com	0895352985967	S1	MANAJEMEN	DIKTUK	178	67	B	0001401901209	SIM C	082221341541	HERMAWAN HARDIJANTO	TRI NURHAYATI	SWASTA	SWASTA	POLDA DIY	POLRESTA YOGYAKARTA	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	44	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
12	0012	DHIKA PUTRA AZIZ TARUNA	311	\N	https://drive.google.com/open?id=1WBEEpuuVC9LzWiJNRXG4RzqearLRsIrQ	GABUSAN,RT 07,TIMBULHARJO,SEWON,BANTUL	BANTUL	38901	\N	ISLAM	LAKI-LAKI	dikaputra2471@gmail.com	087830389709	SMA	IPA	DIKTUK	175	59	B	0001100999788	SIM C	087715450048	DWI PURWANTO	KAWILARANG	POLRI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	29	41	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
13	0013	RIDWAN BEKTI SUWITO	312	\N	https://drive.google.com/open?id=1b_xncAOhUjGv9O4ccVrFwIp1oL6Af0j3	DUKUHREJO RT 02/RW 03, BAYAN, PURWOREJO	PURWOREJO	38773	\N	ISLAM	LAKI-LAKI	rdwnbekti@gmail.com	081559999326	SMA	IPA	DIKTUK	173	63	A	0002088673828	SIM C	08159907510	ALM. SUSANTA	PURANTI INVISTYO KUMARASARI	TIDAK BEKERJA	PEGAWAI PEMERINTAH PUSAT ATAU DAERAH NON PNS	POLDA JAWA TENGAH	POLRES PURWOREJO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	42	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
14	0014	FIRDAN WIBY PRADANA	313	\N	https://drive.google.com/open?id=1Jz8cH1sZUL4lV7D3Tkor_AzCj1pzeQDu	DS. GUNUNGPANTI RT 02 RW 02 KEC.WINONG KAB.PATI JAWA TENGAH	PATI	38392	\N	ISLAM	LAKI-LAKI	firdanpradana123@gmail.com	085292336640	SMA	IPA	DIKTUK	173	63	B	0000093198036	SIM C	081225669380	RONNY MUNDARTO	ISTY RAHAYU	PNS	PNS	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
15	0015	MALIK ROHMANA PUTRA	314	\N	https://drive.google.com/open?id=1e4VSf9sNlkFIy-q3GvN3omyEkEpZ9gBT	DUSUN GENDINGAN,RT03/RW11,DESA DEPOK,KECAMATAN TOROH,KABUPATEN GROBOGAN	GROBOGAN	38281	\N	ISLAM	LAKI-LAKI	malikrohmana@gmail.com	081229669128	SMA	IPA	DIKTUK	171	64	B	0001818896051	SIM C	081226456355	DULROHMAN	ENI TRIANA	PNS	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
16	0016	EXCEL KEVIN ARDANA	315	\N	https://drive.google.com/open?id=1BprIs7-Cosd-vcvSM_lWUB7lTjDPpE_2	GEDANGANAK RT 2 RW 9 KELURAHAN GEDANGANAK KECAMATAN UNGARAN TIMUR KABUPATEN SEMARANG	GROBOGAN	39121	\N	ISLAM	LAKI-LAKI	excelkevinardana123@gmail.com	081617249398	SMA	SMA	DIKTUK	168	63	O	0001839980259	SIM C	085729314214	BAKHOH	NINIK LINDAYANI	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	42	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
17	0017	ANDIKA SAPUTRA	316	\N	https://drive.google.com/open?id=1pDcehx5kn0Iq2oErVytmYbl6EfQRuy3v	WONOKROMO, RT/RW 001/004, KECAMATAN MOJOTENGAH, KABUPATEN WONOSOBO, JAWA TENGAH.	WONOSOBO	39017	\N	ISLAM	LAKI-LAKI	andikasaputra271006@gmail.com	085953897986	SMA	SMA	DIKTUK	166	59	A	0003645369382	SIM C	081328233766	MUSRIFUN	ROJAMIYATUN	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES WONOSOBO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	41	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
18	0018	SATRIO GADING MUKTI	317	\N	https://drive.google.com/open?id=1G9AnrO4rya_5HwbCG6aSzkx1-L-4Glh-	RANDUSONGO RT 01/RW 06, DONOKERTO, TURI, SLEMAN, YOGYAKARTA	SURABAYA	38448	\N	ISLAM	LAKI-LAKI	satriogadingm06@gmail.com	0895421304617	SMA	IPA	DIKTUK	178	65	O	0001873605273	SIM C	08993431000	SUROSO	ERMIATI	PETANI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	30	42	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
19	0019	MAULANA ZAKI WARDHANA	318	\N	https://drive.google.com/open?id=1awJaAJVrIZgzBFeL6kzXQF3MC0EFRH4Q	GG. ANYER RT. 001 RW. 009 CEPU KEC. CEPU KAB. BLORA	SUKOHARJO	38605	\N	ISLAM	LAKI-LAKI	maulanazakiyuza@gmail.com	082322704461	SMA	IPS	DIKTUK	176	69	BELUM MENGETAHUI	0001269281147	SIM C	082137628493	ALI WAHYUDI HARTA	GALUH SARASWATI	TNI	PNS	POLDA JAWA TENGAH	POLRES BLORA	55	DIKTUKBA POLRI	2025	TIDAK	15.5	30	44	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
20	0020	OVI FADILLAH KURNIAWAN	319	\N	https://drive.google.com/open?id=1ruquzS4PYYmhBq1b0CxuUtf1DH8T4Z1O	DUSUN NUSADADI NO. 979 RT. 04 RW. 06 DESA NUSAWUNGU KEC. NUSAWUNGU KAB. CILACAP	CILACAP	39045	\N	ISLAM	LAKI-LAKI	ovifadillahkurniawan24@gmail.com	085726579366	SMK	TEKNIK KENDARAAN RINGAN	DIKTUK	174	68	BELUM MENGETAHUI	0002035095884	TIDAK PUNYA SIM	085801333905	AKHMAD FAUZI	MUSLIHATUN	PETANI	PETANI	POLDA JAWA TENGAH	POLRESTA CILACAP	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
21	0021	MUHAMAD REZA ALFIAN MUZAKI	320	\N	https://drive.google.com/open?id=10btxF91U6d38fjHdC6fXkLwl_WlMx0Ro	KARANG PADANG RT 01 RW 03, KEL. KECANDRAN, KEC. SIDOMUKTI, KOTA SALATIGA, JAWA TENGAH, 50723	SALATIGA	38014	\N	ISLAM	LAKI-LAKI	rezaalviaan28@gmail.com	083867056701	SMA	MATEMATIKA DAN IPA	DIKTUK	173	65	B	0001391491866	SIM C	081392830550	SUPRIADI	PUJI RETNOWATI	SWASTA	LAIN-LAIN	POLDA JAWA TENGAH	POLRES SALATIGA	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	43	55	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
22	0022	RAYI PRAMUKTI	321	\N	https://drive.google.com/open?id=1f6tF6KlGXrvLkZ5JIT-1v9U0yRZCv_4i	KARANGGAYAM D.K KARANGGAYAM	BANTUL	38238	\N	ISLAM	LAKI-LAKI	ray.reeynew@gmail.com	088983821756	SMK	TEKNIK KENDARAAN RINGAN OTOMOTIF	DIKTUK	172	56	B	0001279063923	SIM C	081392313277	TRI PRAMUNTORO	MURYANTI	BURUH	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	43	57	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
23	0023	RIFQI ARDIAN ALFAREZA	322	\N	https://drive.google.com/open?id=1HaSzJCFFf9HH284FzYk17X0W6b8VfAEP	DUSUN KRAJAN RT02/RW01\nDESA KALIGADING, KECAMATAN BOJA, KABUPATEN KENDAL, JAWA TENGAH	KAB. KENDAL	38570	\N	ISLAM	LAKI-LAKI	tidarrastafara@gmail.com	082226002503	SMA	SMA	DIKTUK	170	64	O	0000166151046	TIDAK PUNYA SIM	081326693616	SIRNO MARGOLAYU	SRI INDAH PURWANINGSIH	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES KENDAL	55	DIKTUKBA POLRI	2025	TIDAK	15	31	43	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
24	0024	BRYAN ADAM MAIFA EKA PUTRA	323	\N	https://drive.google.com/open?id=1XenxUapu3ei7Tg21DQzvCSqGI7QF5GWq	NGONDEL KULON RT 1 RW 5 KRAMBILSAWIT SAPTOSARI GUNUNGKIDUL YOGYAKARTA	GUNUNGKIDUL	38506	\N	ISLAM	LAKI-LAKI	brayyadm@gmail.com	082325601489	SMA	IPA	DIKTUK	168	62	B	0001369965093	SIM C	085311393003	EKO IBNU MURWANTO	SURTI HANDAYANI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	43	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
25	0025	ALFIAN RAFI' SUSILA PUTRA	324	\N	https://drive.google.com/open?id=1-Ojd5LrpHjDdSFe4KDDxreKKsiWCFhNA	RT 2 RW 15 KABUNAN WIDODOMARTANI NGEMPLAK SLEMAN DAERAH ISTIMEWA YOGYAKARTA	SLEMAN	38769	\N	ISLAM	LAKI-LAKI	rafialfian441@gmail.com	089527113638	SMK	TEKNIK KENDARAAN RINGAN OTOMOTIF	DIKTUK	167	59	O	0001525405825	SIM C	085741191640	AGUS SUSILA HANDAKA PUTRA	TURASMINI	PETANI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	43	56	BINTARA BRIMOB	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
26	0026	QUILLA DWI NAUVAL	325	\N	https://drive.google.com/open?id=1KfKGmgGhipFYcAS0DROXvrDv8FxvuU_c	PULOSARI RT03/RW02, KARANGTENGAH, DEMAK, JAWATENGAH	DEMAK	39406	\N	ISLAM	LAKI-LAKI	quilladwinauval@gmail.com	085220987219	SMA	SMA	DIKTUK	165	60	BELUM MENGETAHUI	0001182815717	SIM C	088980957363	SUGIARTO	SUMI RIYANTI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	42	56	PTU (BINTARA TUGAS UMUM)	1	A1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
27	0027	DIMAS ARYAGUNA RAMADHAN	326	\N	https://drive.google.com/open?id=13nfTYKUPHAyTRSc8gDoqYp8BmtZfdEfe	DALEN RT/RW 53/26 ,KARANGSEWU,GALUR,KULON PROGO,DIY	KULON PROGO	39006	\N	ISLAM	LAKI-LAKI	dimasaryagunar@gmail.com	08895960171	SMA	IPA	DIKTUK	181	77	A	0002501560067	SIM C	081578571333	ALM.ARINTA NUGRAHA	HARDANI	TIDAK BEKERJA	WIRASWASTA	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	43	57	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
28	0028	BRYANDIKA KRISNA AJI	327	\N	https://drive.google.com/open?id=1czRVGgJnXAnNEL6b9ZxYaWpOzbkqitU_	DUSUN NGIJINGAN, RT.03/ RW.01, DESA CANDIMULYO, KECAMATAN KEDU, KABUPATEN TEMANGGUNG	TEMANGGUNG	38359	\N	ISLAM	LAKI-LAKI	bryandika1933@gmail.com	085700145325	SMA	IPS	DIKTUK	177	63	O	0002199806188	SIM C	081227958856	IGN.KRISNA ARIYANTO	NUR CHAYATI	WIRASWASTA	LAIN-LAIN	POLDA JAWA TENGAH	POLRES TEMANGGUNG	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	56	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
29	0029	FADHIL HERMAWAN	328	\N	https://drive.google.com/open?id=16YHMB0IweYUTXBS5MmOT1txi-SOPjOjS	SINGOSAREN WB 2/750 RT/RW 001/001 KELURAHAN WIROBRAJAN KECAMATAN WIROBRAJAN YOGYAKARTA PROVINSI DIY	YOGYAKARTA	39236	\N	ISLAM	LAKI-LAKI	fadhilhermawan95@gmail.com	085944600545	SMA	SMA	DIKTUK	174	62	O	0000205288413	SIM C	082137054967	HERJANI SRI WALUYO	ISNARSIAM	PENSIUNAN PNS	LAIN-LAIN	POLDA DIY	POLRESTA YOGYAKARTA	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	57	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
30	0030	MUHAMMAD AULIA RAMADAN, S.H.	329	\N	https://drive.google.com/open?id=1u3sxP3Cl3yao8hRXZHDuPs0cyq09Wk3W	JL. JANTI, NO. 121, KARANGJAMBE, RT. 05, BANGUNTAPAN, BANGUNTAPAN, BANTUL	METRO	36858	\N	ISLAM	LAKI-LAKI	auliafanzant@gmail.com	082237680539	S1	SARJANA HUKUM	DIKTUK	172	73	B	0001193291335	SIM A	085799379554	ALM. EKO UTOMO	SUPRIYATI	TIDAK BEKERJA	SWASTA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	45	57	BAKOMSUS (BINTARA KOMPETENSI KHUSUS)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
31	0031	RIFQI DHARMA SAPUTRA	330	\N	https://drive.google.com/open?id=1mWjaCAlqOMX3NnEOiUqcve-o5_gdnG-C	DESA JATIMULYO RT 001/RW 003, KEC.ALIAN ,KAB.KEBUMEN	KEBUMEN	38349	\N	ISLAM	LAKI-LAKI	rifqidharmasaputra04@gmail.com	82323875522	SMA	SMA JURUSAN BAHASA	DIKTUK	171	70	O	0001735379076	SIM C	085141312535	NUR CHAMID	NILUH GEDE PERTIWI	SWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KEBUMEN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	42	57	BINTARA BRIMOB	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
32	0032	PRADIVTA SURYAWIBOWO	331	\N	https://drive.google.com/open?id=1s2GhtT6-hmeoDEjqk70DCX_jviPMapgK	DS. BUNGASREJO RT. 03 RW. 01 KEC. JAKENAN KAB. PATI	PATI	39178	\N	ISLAM	LAKI-LAKI	pradivtasuryawibowo166@gmail.com	85166973655	SMA	SMA	DIKTUK	169	59	B	0001267790073	TIDAK PUNYA SIM	081325524025	WIBOWO	DEWI SURYANINGTIAS	POLRI	PNS	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
33	0033	SHEVA ALDITYA GUSTI SAPUTRA	332	\N	https://drive.google.com/open?id=1oelR3znm3o5i8Mvg2YIFbUuxZBW1HQhE	JALAN. KH AGUS SALIM RT 08 / RW 02 KEL.KUDAILE KEC.SLAWI KAB.TEGAL JAWA TENGAH	TEGAL	38908	\N	ISLAM	LAKI-LAKI	shevaalditya@gmail.com	085185029174	SMA	IPA	DIKTUK	167	60	O	0001272365796	SIM C	081575557333	AGUS HARI PAMUNGKAS	DAM RISTINA	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES TEGAL	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
34	0034	JEREMIA BICCAR PURBA	333	\N	https://drive.google.com/open?id=1JF7aunIUpT0K6EzCCNWXd-dwXGpTCw5n	BANCARKEMBAR RT 003/007 PURWOKERTO UTARA	PURWOKERTO,BANYUMAS	38922	\N	KRISTEN	LAKI-LAKI	jeremipurba24@gmail.com	085210302039	SMA	MIPA	DIKTUK	167	64	O	0002205113297	TIDAK PUNYA SIM	081339794626	ZEPLIN PURBA	SRI HARTINI	SWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA BANYUMAS	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
35	0035	HADZA MIN FADLI ROBBI	334	\N	https://drive.google.com/open?id=1xCPix-L-QL3tN2KgKhm3Ou6hA5-V26GR	DESA PURWOKERTO RT 003 RW 002 KEC. BRANGSONG KAB. KENDAL	KENDAL	39303	\N	ISLAM	LAKI-LAKI	hadzaminfadlirobbi77@gmail.com	082334677820	SMA	SMA	DIKTUK	166	64	B	0001302212439	TIDAK PUNYA SIM	08122506600	MUHAMMAD AL AMIN	MASKANAH	PEGAWAI PEMERINTAH PUSAT ATAU DAERAH NON PNS	PEGAWAI PEMERINTAH PUSAT ATAU DAERAH NON PNS	POLDA JAWA TENGAH	POLRES KENDAL	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
36	0036	ARYA GILANG PRADANA	335	\N	https://drive.google.com/open?id=1ln7Ypn_fzk6BaCemDcIAQ3bdtbM2UQ3w	DS.BERBAK RT 006,RW 001,KEC.NGAWEN, KAB.BLORA	BLORA	39111	\N	ISLAM	LAKI-LAKI	aryagilang290107@gmail.com	085213922749	SMA	SMA IPA	DIKTUK	178	64	O	0001532179776	SIM C	082242695629	HERI SUSANTO	EMIKA DAMAYANTI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES BLORA	55	DIKTUKBA POLRI	2025	TIDAK	15	31	43	54	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
37	0037	MUHAMMAD GILANG PRATAMA	336	\N	https://drive.google.com/open?id=1s4zkBGScrUJHRkdmCGv580GyaEXin31N	DUSUN JAMBON RT 001/RW 003,DESA KEROKAN,KECAMATAN TLOGOMULYO,KABUPATEN TEMANGGUNG	KABUPATEN TEMANGGUNG	39225	\N	ISLAM	LAKI-LAKI	pratamamuhammad633@gmail.com	081235442753	SMA	SMA	DIKTUK	175	65	O	0001293105699	SIM A	085290920125	PRATOMO KUSTIAWAN	SITI YUROBANAH	POLRI	PNS	POLDA JAWA TENGAH	POLRES TEMANGGUNG	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	59	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
38	0038	STEFANUS TRI WAHYU PRATAMA, S.H.	337	\N	https://drive.google.com/open?id=11I0ckd6MGofRYhiCEVscJjufuqXlQyLc	RT 28 RW 06 DUSUN PRANGGEN, DESA PLUMBON, KECAMATAN SURUH, KABUPATEN SEMARANG, JAWA TENGAH	SALATIGA	36492	\N	ISLAM	LAKI-LAKI	stefanustriwahyu28@gmail.com	088221630312	S1	HUKUM / ILMU HUKUM	DIKTUK	174	73	O	0000168024688	SIM A	0882006236406	RAMELI	CHRISTINA ENDANG SUSILAWATI	PURNAWIRAWAN TNI/POLRI	PENSIUNAN PNS	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	33	45	57	BAKOMSUS (BINTARA KOMPETENSI KHUSUS)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
39	0039	RAMADHAN LINANGKUNG AJI	338	\N	https://drive.google.com/open?id=1TTWZysZLC1cb39uOStTDEsnLBad-o6Cs	BERCAK BULU,  RT08/RW0025, JOGOTIRTO, BERBAH, SLEMAN, DAERAH ISTIMEWA YOGYAKARTA	YOGYAKARTA	38649	\N	ISLAM	LAKI-LAKI	ramadhanlinangkungaji@gmail.com	0895365231841	SMA	IPS	DIKTUK	171	70	B	0001269263632	SIM C	087866808980	SUPRAPTO	SURASMI	WIRASWASTA	WIRASWASTA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	57	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
40	0040	KELVIN YUSUF ALFIAN PUTRA	339	\N	https://drive.google.com/open?id=1MNVei9LfOLazs5PV1Va-3STCquqwyhrT	MAYUNGAN, RT33/RW10, MAYUNGAN, NGAWEN, KLATEN	KLATEN	38517	\N	ISLAM	LAKI-LAKI	kelvinyusuf06@gmail.com	089503145753	SMA	SMA MIPA	DIKTUK	170	68	B	0000087572981	SIM C	085647312273	HERU HERJIMAN FARIYANTO	SITI ROKHANI	PNS	PNS	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	56	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
41	0041	MUH HELGA WAHYU ARDIAN	340	\N	https://drive.google.com/open?id=1y9PemjK0YSefMoawe2EGeSacv0UjZpx1	JATI RT01/RW02, SAMBI, SAMBI, BOYOLALI, JAWA TENGAH	BOYOLALI	38907	\N	ISLAM	LAKI-LAKI	ardyangans76@gmail.com	085712507017	SMA	SMA	DIKTUK	168	63	O	0001097255362	SIM C	081326872530	ANTOK WAHYUDI	KUSRINI	POLRI	LAIN-LAIN	POLDA JAWA TENGAH	POLRES BOYOLALI	55	DIKTUKBA POLRI	2025	TIDAK	15	30	43	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
42	0042	MAHADEVA BAGUS RADITYA KUSUMA NAGARA	341	\N	https://drive.google.com/open?id=10fAuRGgqcMXOPH3tXI946tM49nkQ6AxH	DESA SENENAN RT 07 RW 03 KECAMATAN TAHUNAN KABUPATEN JEPARA	JEPARA	39030	\N	ISLAM	LAKI-LAKI	raditbagus973@gmail.com	089674884100	SMA	SMA IPA	DIKTUK	167	60	O	0000163726604	SIM C	081329077399	DARYANTO	PI'AH	POLRI	PNS	POLDA JAWA TENGAH	POLRES JEPARA	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	55	BINTARA BRIMOB	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
43	0043	MUHAMMAD ALDHIYA KAFI	342	\N	https://drive.google.com/open?id=1jsLcqUzg0rrh7dd6XsgKUztIGiinzRzM	GERSAN RT.03 RW.10 TRANGSAN GATAK SUKOHARJO	SUKOHARJO	38613	\N	ISLAM	LAKI-LAKI	muh.aldhiya@gmail.com	0895325937373	SMA	IPA	DIKTUK	177	69	B	0000203804717	SIM C	08112632837	KIRYONO	MARKAMSIH	PNS	PNS	POLDA JAWA TENGAH	POLRES SUKOHARJO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	34	44	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
44	0044	KAVINDRA RAFANI AHMAD	343	\N	https://drive.google.com/open?id=1CXYA5GFEjmCPxM71_Q3lJYA8Dce3Kvr9	PATUKAN RT 008 RW 022 AMBARKETAWANG GAMPING SLEMAN DIY	SLEMAN	39164	\N	ISLAM	LAKI-LAKI	akavindrarafani@gmail.com	08995241465	SMA	IPS	DIKTUK	174	73	O	0003645345036	SIM C	082229774715	AHMAD SOFYAN HADI	DINA RACHMAWATI	SWASTA	WIRASWASTA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	44	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
45	0045	RIFKY FERDIAN SAPUTRA	344	\N	https://drive.google.com/open?id=1X6HG4YlZRJIMeq4Notjqzgvt06mztnLv	TEGALLAYANG X, RT 06, CATURHARJO, PANDAK, BANTUL, D.I.YOGYAKARTA	KARANGANYAR	38316	\N	ISLAM	LAKI-LAKI	rifkyferdian28@gmail.com	08156555486	SMA	IPS	DIKTUK	173	67	B	0001429082201	SIM C	08976853621	ALM SUSANTO	YUNI RAHAYU	POLRI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
46	0046	NAZARUL FAIZ	345	\N	https://drive.google.com/open?id=1d_hymWhfCW8dO76faj88ELDGYuL0V199	TURIP, RT 23 RW 10, NGESTIHARJO, WATES, KULON PROGO, DIY	PURWOREJO	38401	\N	ISLAM	LAKI-LAKI	nazarulfaiz48@gmail.com	088221520929	SMK	TEKNIK KOMPUTER DAN JARINGAN	DIKTUK	171	64	A	0003686721322	SIM A	08568829929	AKIR RISWANTO	SUKIJAH	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
47	0047	MUHAMMAD MUJAHIDUR ROHMAN	346	\N	https://drive.google.com/open?id=1yGJd8nx4br2KATezokQZRYb272bwTM_6	DUSUN KRAJAN II RT07/RW02 DESA KALANG LUNDO KECAMATAN NGARINGAN KABUPATEN GROBOGAN	GROBOGAN	39293	\N	ISLAM	LAKI-LAKI	hidurrohman5@gmail.com	0882006828457	SMA	SMA	DIKTUK	170	70	BELUM MENGETAHUI	0002062836944	SIM C	08224219570	NAHROWI	SRI PATMOWATI	LAIN-LAIN	LAIN-LAIN	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	42	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
48	0048	YOSA REGA ANUGRAH	347	\N	https://drive.google.com/open?id=1CoaLDk35ed322-8IVCapf9Vi638_kuOe	MARGOASRI RT.36 RW.09, PURO, KARANGMALANG, SRAGEN	SRAGEN 18 DESEMBER 2006	39069	\N	ISLAM	LAKI-LAKI	regaanugrah48@gmail.com	085868382793	MA	IPA	DIKTUK	168	62	O	0001429410699	SIM C	081361748437	HARYOTO	DHENI HAPSARI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES SRAGEN	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	55	BINTARA BRIMOB	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
49	0049	FANDHANU WIGAYUNASA	348	\N	https://drive.google.com/open?id=1UvMzxRceaOiyzhRj83YY5aRXIU5qZVGT	DESA RAJI, RT 04, RW 01, KECAMATAN DEMAK, KABUPATEN DEMAK, JAWA TENGAH	DEMAK	38384	\N	ISLAM	LAKI-LAKI	dhanwigayu@gmail.com	082325862001	SMA	IPA	DIKTUK	168	63	O	0003553772859	SIM C	08127741318	ARIS MULYADI	WIWIK INDASAH	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15	30	43	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
50	0050	ARDIANSYAH	349	\N	https://drive.google.com/open?id=1jJ-m0tIziLracz8viEJKSEmE_UwANecB	DESA PUTAT GEDE RT01 RW01 KECAMATAN NGAMPEL KABUPATEN KENDAL PROVINSI JAWA TENGAH	KENDAL	39364	\N	ISLAM	LAKI-LAKI	ardiiready@gmail.com	08814183669	SMA	SMA	DIKTUK	166	56	O	0003631831345	TIDAK PUNYA SIM	081393128459	ALM MAHFUD	HARIATI	LAIN-LAIN	PETANI	POLDA JAWA TENGAH	POLRES KENDAL	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
51	0051	SEPTA ZUHDI WIBOWO	350	\N	https://drive.google.com/open?id=1PU7-kFQc1d27FnDBFpVB0tcyFCRV9RlB	KEDUNGPOH TENGAH RT 03/ RW 04, KEDUNGPOH, NGLIPAR, GUNUNGKIDUL, YOGYAKARTA	GUNUNGKIDUL	38961	\N	ISLAM	LAKI-LAKI	lwmseptabowo26@gmail.com	089518213781	SMA	SMA	DIKTUK	166	60	B	0002284298302	SIM C	089649495877	MUTRISNA	HERNING SUWASTI	PENSIUNAN PNS	PNS	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	43	55	PTU (BINTARA TUGAS UMUM)	1	A2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
52	0052	SHIDIQ LANDUNG RIHWATOMI	351	\N	https://drive.google.com/open?id=1FjuON1aGJTwwaJobQRkOu5xubM5VIsLK	DUKUH GONDANGAN RT 9/RW 2 DESA TULIS KECAMATAN TULIS KABUPATEN BATANG JAWA TENGAH	BATANG	38166	\N	ISLAM	LAKI-LAKI	shiidiqq2864@gmail.com	0895326250503	MA	IPA	DIKTUK	177	70	AB	0001630578554	SIM A	085867037660	EDHY WALUYO	WURI HANDAYANI	SWASTA	PNS	POLDA JAWA TENGAH	POLRES BATANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	43	59	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
53	0053	ILHAM SYAHRUL FAIS	352	\N	https://drive.google.com/open?id=1VxWPQbclBD8pU_kF1NsaHCIna7t1ffck	DESA SUGIHARJO DUKUH GILIS RT 2 RW 3 KECAMATAN PATI KABUPATEN PATI JAWA TENGAH	PATI	38870	\N	ISLAM	LAKI-LAKI	ilhamsyahrulfais03@gmail.com	087854026432	SMK	MESIN	DIKTUK	175	61	O	0002449556379	SIM C	081226316038	ALM LASPIN	LASMIATI	TIDAK BEKERJA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	43	57	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
54	0054	MUHAMMAD FITRA JAFAR	353	\N	https://drive.google.com/open?id=1Spmb8LUrTzq562BvxbXswU0WLJ24W6Bg	JAGOAN 1 NO.436 RT004/RW005, KEL.JURANGOMBO UTARA, KEC. MAGELANG SELATAN, KOTA MAGELANG, JAWA TENGAH	MAGELANG	38305	\N	ISLAM	LAKI-LAKI	fitrajafar14@gmail.com	081326099563	SMA	BAHASA	DIKTUK	172	58	B	0001106442617	SIM C	085294724289	MUHAMMAD JAFAR	SANITA INDAH SURYANI	TNI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES MAGELANG KOTA	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	43	56	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
55	0055	MUHAMMAD FARHAN	354	\N	https://drive.google.com/open?id=1AFbweH4PoMOiS_w0PxdbvZ3oKH8XhokQ	DUKUH IV RT 02 RW 08, SIDOMOYO, GODEAN, SLEMAN	SLEMAN	38757	\N	ISLAM	LAKI-LAKI	muhammadfarhan080604@gmail.com	083840904413	SMA	IPS	DIKTUK	172	62	O	0000655313321	TIDAK PUNYA SIM	081227267003	JUMAKIR	SETIAWATI	WIRASWASTA	BURUH	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	42	54	BINTARA BRIMOB	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
56	0056	CANDRA BAKTI UTAMA	355	\N	https://drive.google.com/open?id=1xOQhE2m05YFtt-kSm16ltUHYh5ZfdS7i	DUKUHAN RT 001/RW 012 BANYUANYAR KEC.BANJARSARI SURAKARTA	SURAKARTA	38386	\N	ISLAM	LAKI-LAKI	bakticandra804@gmail.com	081246032779	SMA	SMA JURUSAN IPA	DIKTUK	171	60	O	0001874600458	SIM C	082313988298	BUDI SUTANTO	AMINI	PENSIUNAN PNS	PNS	POLDA JAWA TENGAH	POLRESTA SURAKARTA	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	56	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
57	0057	AHMAD SAUMIN FUADI	356	\N	https://drive.google.com/open?id=1r-p6JUvgoWt-vbUjLH5omdT8abL2T7aU	TEGAL BUGELAN RT.011/RW.004, KEBONDALEM LOR, PRAMBANAN, KLATEN	LAMONGAN	39076	\N	ISLAM	LAKI-LAKI	hallofuadsaomin2018@gmail.com	085640272920	SMA	KURIKULUM MERDEKA	DIKTUK	170	56	O	0001020733277	SIM C	085875643848	MUJTAHID	ZUYYINATIN	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	42	56	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
58	0058	MUHAMMAD KHARIS IRFANI	357	\N	https://drive.google.com/open?id=1zDpgsAdehOWyS7thjbDF9f-xd1KVk5k6	LONING JURANG,RT.003/RW.001, KECAMATAN KEMIRI, KABUPATEN PURWOREJO	PURWOREJO	38937	\N	ISLAM	LAKI-LAKI	irfanikharis@gmail.com	085189008595	SMK	TEKNIK INSTALASI TENAGA LISTRIK	DIKTUK	168	66	O	0002266495446	SIM C	082220579954	MUSTOFA	MARYATULKIPTIYAH	PETANI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES PURWOREJO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	43	56	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
59	0059	SHENDY NAFISA ARCELLO	358	\N	https://drive.google.com/open?id=1cU1m6yPyA-4SZZgW-5naUB-NxG_XAwxI	TEMULUS DS TEMULUA RT5/RW2 KEC.RANDUBLATUNG KAB.BLORA	BLORA	38855	\N	ISLAM	LAKI-LAKI	shendynafisa18@gmail.com	088216571466	SMK	TEKNIK KENDARAAN RINGAN OTOMOTIF	DIKTUK	168	67	BELUM MENGETAHUI	0001848759502	SIM C	082375911264	SUTIKNO	SUWARTI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES BLORA	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	57	BINTARA BRIMOB	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
60	0060	ARIFKI YUDA PUTRATAMA	359	\N	https://drive.google.com/open?id=10UxR8NVeEfWkIPO4cjp2vxcpDxrFUtm_	DESA JAMBEARUM RT 004 RW 004 KECAMATAN PATEBON KABUPATEN KENDAL	KENDAL	38656	\N	ISLAM	LAKI-LAKI	yuda88164@gmail.com	087856861355	SMA	IPA	DIKTUK	167	57	B	0001270854707	SIM C	089526995393	MUKHAMAD MAS'UD	SITI MARDIYAH	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KENDAL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	43	57	BINTARA BRIMOB	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
61	0061	ZULFA RIFAI PUTRA	360	\N	https://drive.google.com/open?id=11uLRdKzB8EsE_flchbJ50dUNQTeApni3	CUPUWATU 2 RT 006 RW 002, PURWOMARTANI, KALASAN, SLEMAN, DAERAH ISTIMEWA YOGYAKARTA	YOGYAKARTA	38838	\N	ISLAM	LAKI-LAKI	zulfarifaip@gmail.com	081229974413	SMA	SMA IPS	DIKTUK	175	63	O	0001100640936	SIM C	081228360645	MADIYANTO	LISA HERLINA ROHMAWATI	POLRI	POLRI	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	43	58	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
62	0062	FANDRA ANIS DESADMA	361	\N	https://drive.google.com/open?id=1JzF3SeeFZbK7rG1l3-vDO3aNNCjahb8u	GANTALAN RT003/RW001MINOMARTANI NGAGLIK SLEMAN YOGYAKARTA	SLEMAN	38695	\N	ISLAM	LAKI-LAKI	pandoet135@gmail.com	0895379018423	SMK	TEKNIK BISNIS SEPEDA MOTOR	DIKTUK	175	60	O	0001319161274	SIM C	089604278887	ANTONI	ISMI DWI ASTUTI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	58	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
79	0079	FACHRI AGUNG GINANJAR	378	\N	https://drive.google.com/open?id=1x8QgftwKBrugvBQR8acnPNoQrypkHxJF	PEDARAN RT 02 RW 03, SUMBERAGUNG, MOYUDAN, SLEMAN, YOGYAKARTA	SLEMAN	38944	\N	ISLAM	LAKI-LAKI	agungginanjar022@gmail.com	081325106078	SMA	IPA	DIKTUK	177	72	O	0001089084014	SIM C	088229892899	ALM ARY HARYONO	ISTI PRASETYAWATI	TIDAK BEKERJA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	34	45	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
63	0063	YEREMIA SHALLOM PRASANDA, S.I.P.	362	\N	https://drive.google.com/open?id=1uY_3d9RE2GQ2E_h69QJrWE6skRuETyP2	MANGKUYUDAN MJ 3/315 RT 017 RW 005 KELURAHAN MANTRIJERON KECAMATAN MANTRIJERON KOTA YOGYAKARTA	YOGYAKARTA	37620	\N	KRISTEN	LAKI-LAKI	yerishallom3061@gmail.com	085716278641	S1	ILMU PEMERINTAHAN	DIKTUK	172	57	O	0002039341858	SIM C	085713394417	SIGIT HERU PRASETYO	HANDAYANINGSIH	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRESTA YOGYAKARTA	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	43	58	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
64	0064	MUHAMMAD NARENDRA LIQAULLAH	363	\N	https://drive.google.com/open?id=1jGRqgFgZfZblC9Evj_BebsgJgeMu0N20	DESA KREYO RT 023 RW 003 KECAMATAN RANDUDONGKAL KABUPATEN PEMALANG	PEMALANG	38936	\N	ISLAM	LAKI-LAKI	mnarendraliqaullah26@gmail.com	081944236712	SMA	IPA	DIKTUK	171	64	A	0001078815341	SIM C	08156933763	ISKANDAR	EKO HENI WIJAYANTI	PNS	PNS	POLDA JAWA TENGAH	POLRES PEMALANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	42	57	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
65	0065	CHASKA VENO ZUHARA	364	\N	https://drive.google.com/open?id=1T3dldacfwc6G3y1sWyO6Wmj8mgbRU2Lt	DSN KALIREJO RT006/RW001 DESA KALIREJO KECAMATAN WIROSARI	GROBOGAN	38412	\N	ISLAM	LAKI-LAKI	caskavenozuara@gmail.com	082137508162	SMA	IPA	DIKTUK	171	61	O	0001439061524	SIM C	082223764779	HERU PRAMONO	KASMINI	SUPIR	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	56	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
66	0066	BANGGA FAHRIANTO	365	\N	https://drive.google.com/open?id=1N-4x4EUwFKjExOn_Nu2EeWs4rxbrpYbR	BANTERAN RT 02/01, KECAMATAN WANGON, KABUPATEN BANYUMAS	BANYUMAS	39184	\N	ISLAM	LAKI-LAKI	banggafahrianto@gmail.com	088239049879	SMA	SMA	DIKTUK	169	63	BELUM MENGETAHUI	0001097636411	SIM C	08156604793	TARTO	ELIS WINARSIH	POLRI	SWASTA	POLDA JAWA TENGAH	POLRESTA BANYUMAS	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	56	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
67	0067	LINTANG SAKTI ERLANGGA	366	\N	https://drive.google.com/open?id=1AAcnDy-rRmuvd2yE2alBDKPllntd-awt	JL KYAI MOJO CEPERSARI RT 03 RW 05, SRONDOL KULON, BANYUMANIK, KOTA SEMARANG	GROBOGAN	38833	\N	ISLAM	LAKI-LAKI	eerlang17@gmail.com	085771477661	SMA	MIPA	DIKTUK	168	60	BELUM MENGETAHUI	0002747122288	SIM C	082311152291	SUHARTONO	TITIS TRI SRI RAHAYU	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	14	32	42	55	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
68	0068	AKBAR TRISDAR ANUGRAH FIRDAUS	367	\N	https://drive.google.com/open?id=1RRuyz35Zc-fqjWwz64vMjjSFbjKQ44ia	GODEGAN RT001/RW001, KRAGILAN, GEMOLONG, SRAGEN	SRAGEN	39165	\N	ISLAM	LAKI-LAKI	akbartrisdar123@gmail.com	082140463301	SMA	IPS	DIKTUK	175	68	O	0001892623397	SIM A	082192893967	SUPRAPTO	DARMINI	PENSIUNAN PNS	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES SRAGEN	55	DIKTUKBA POLRI	2025	TIDAK	15	33	44	57	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
69	0069	EKA NOSA AJI WIRAYUDA	368	\N	https://drive.google.com/open?id=1ujqpbxEo6BhS5eCT2YWt_Y-XQtN-VyJ4	KALIPENTUNG RT01/RW16, KALITIRTO, BERBAH, SLEMAN, YOGYAKARTA	SLEMAN	38430	\N	ISLAM	LAKI-LAKI	wirayuda190305@gmail.com	088227627452	SMA	IPA	DIKTUK	175	64	O	0001100641656	SIM C	081227044212	WIRATNO	EKSA AGUS SETYANINGRUM	POLRI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	41	58	BINTARA BRIMOB	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
70	0070	MUHAMMAD AQMAL ZAKY MUBAROK	369	\N	https://drive.google.com/open?id=1VjNfYK-PHvC6vlyrhXkKL8dyDUgGopze	DS. DEMPET, DKH. BOTOSIMAN, RT/RW 05/06, KAB. DEMAK, KEC DEMPET	DEMAK	38801	\N	ISLAM	LAKI-LAKI	aqmalzaky111@gmail.com	087784483362	SMA	IPA	DIKTUK	171	63	BELUM MENGETAHUI	0001891165239	SIM C	085727035282	JAMAL KHOSIM	SUPARNI	PETANI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15	32	45	57	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
71	0071	AWANG EKA SEFANASTA	370	\N	https://drive.google.com/open?id=1NPSjKanYCkRucCqdykbmMbdf49_S8KeI	AWANG EKA SEFANASTA	PATI	38962	\N	ISLAM	LAKI-LAKI	awangeka2006@gmail.com	085602478653	MA	IPA	DIKTUK	171	65	A	0003342957219	SIM C	081326360493	JASMANI	SRI LESTARI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	42	57	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
72	0072	LUCIO SAPUTRA NOFA HASAN	371	\N	https://drive.google.com/open?id=1L_mPw2spc1Y23NtCbMcTqtc0APKYlxB4	JALAN PASAR HEWAN RT 01 RW 01 DESA BANDUNGREJO, KECAMATAN MRANGGEN, KABUPATEN DEMAK	DEMAK	39387	\N	ISLAM	LAKI-LAKI	lucionofaah@gmail.com	0895622186815	SMA	SMA	DIKTUK	170	56	O	0002579088328	SIM C	085700343212	NUR ACHSAN	SURANTI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	55	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
73	0073	FA'IZ RYAN AJIE PRANATA	372	\N	https://drive.google.com/open?id=1E56YggqD4Oa6FMLaSM5Zg23Pc6FCwmU7	WONOSARI 001/005, URUTSEWU, AMPEL, BOYOLALI, JAWA TENGAH	BOYOLALI	38553	\N	ISLAM	LAKI-LAKI	faizryan2025@gmail.com	081225860938	MA	IPA	DIKTUK	168	54	BELUM MENGETAHUI	0001097193756	SIM C	08814188615	BUDI RIYANTO	PUTHUT SUGIYARTI	POLRI	WIRASWASTA	POLDA JAWA TENGAH	POLRES BOYOLALI	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	42	55	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
74	0074	ANUNG NUGRAHANTO YUDHITO	373	\N	https://drive.google.com/open?id=16k1djCVQ3E9zibqlHodhKiIHXYTMfODP	SEGONDANG RT 002/007 GIRIMULYO NGARGOYOSO KARANGANYAR	KARANGANYAR	38743	\N	ISLAM	LAKI-LAKI	anungnugrahanto7@gmail.com	082324417779	SMA	IPA	DIKTUK	168	63	AB	0002300017511	SIM C	081329371371	SRI HANTO	ARY WIDYHASTUTIK	PNS	PNS	POLDA JAWA TENGAH	POLRES KARANGANYAR	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	43	54	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
75	0075	HERDYN PRATAMA OGANSAH	374	\N	https://drive.google.com/open?id=18Ooplvqhh_ETjtosMKc2MZaXfHhPqD95	KEC.UNGARAN TIMUR,KEL . SIDOMULYO,MUNENG,RT 01/RW 02	KAB.SEMARANG	38480	\N	ISLAM	LAKI-LAKI	herdynpratama8@gmail.com	082314976920	SMA	IPA	DIKTUK	166	55	O	0000172191936	SIM C	085289683734	HERWAN	DYAH EKO NURHAYATI	PNS	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	43	54	BINTARA BRIMOB	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
76	0076	ALFIAN FERDIANSAH	375	\N	https://drive.google.com/open?id=15tBnl2YdSZD-nf8CM6exJTLkn5jlxTyA	PLEMPUKAN RT027/RW014, SINDUTAN, TEMON, KULON PROGO, DAERAH ISTIMEWA YOGYAKARTA	KULON PROGO	38223	\N	ISLAM	LAKI-LAKI	alfferdiansah@gmail.com	83870361617	SMA	IPS	DIKTUK	166	50	BELUM MENGETAHUI	0001100997415	SIM C	085865345553	ERWANTO	TASMIATUN	POLRI	WIRASWASTA	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	14	30	41	54	PTU (BINTARA TUGAS UMUM)	1	A3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
77	0077	RIZKY ADITYA	376	\N	https://drive.google.com/open?id=1M-skIyUBd_BKMmSoebgd8_7Uye6Fm-CO	PAJANGAN, RT 002 RW 033, SUMBERAGUNG, MOYUDAN, SLEMAN	BANJARMASIN	38450	\N	ISLAM	LAKI-LAKI	makanbang299@gmail.com	085803771025	SMA	IPA	DIKTUK	182	75	BELUM MENGETAHUI	0001098832522	SIM C	085801007734	PUJI SANTOSA	WINARNI	POLRI	POLRI	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	45	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
78	0078	SATRIYA BAYU PRANATA	377	\N	https://drive.google.com/open?id=1cwWPVp2kxe7gw01oV0aWeARPJUNGFmu4	DESA PEDAWANG RT 7/ RW 1, KECAMATAN BAE, KABUPATEN KUDUS	KUDUS	38777	\N	ISLAM	LAKI-LAKI	satriyaabayu1@gmail.com	0895423320107	SMA	IPA	DIKTUK	179	70	O	0002578271477	SIM C	082136269671	NELES	SITI RAHAYU	SUPIR	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KUDUS	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	44	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
80	0080	RIO PANGESTU	379	\N	https://drive.google.com/open?id=1u6_4FK5z9ZIG0T1WP22m6fbPokN5pO_I	KALAKIJO RT 05, GUWOSARI, PAJANGAN, BANTUL, YOGYAKARTA	BANTUL	38651	\N	ISLAM	LAKI-LAKI	riopangestu261005@gmail.com	082147559737	SMA	IPA	DIKTUK	175	68	AB	0001034708499	SIM C	085727551022	SUYATNO	SEMI	PETANI	WIRASWASTA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	43	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
81	0081	APRILIADE JUMADIL SATMOKO	380	\N	https://drive.google.com/open?id=1VZVWRW6pLDmir8O1I9FUbILCKnOsz1Tm	ASRAMA POLRES BANTUL DK.BADEGAN RT 013	MAKASSAR	38443	\N	ISLAM	LAKI-LAKI	adeeesatmoko@gmail.com	08985837648	SMA	IPS	DIKTUK	173	63	B	0001100864744	SIM C	082137579952	EDI SATMOKO	HARDINA	POLRI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	30	43	55	BINTARA BRIMOB	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
82	0082	ODWEEN FERDIANSYAH	381	\N	https://drive.google.com/open?id=10wCMSNAAXzFjErL2vCFsOA1SGKoEnyR6	JL.SINAR ASIH III/968-A, RT:006 RW:008 KEL: KEDUNGMUNDU, KEC: TEMBALANG,  KOTA: SEMARANG, PROVINSI: JAWA TENGAH	KOTA SEMARANG	38805	\N	ISLAM	LAKI-LAKI	odweenf@gmail.com	081325700595	SMA	SMA	DIKTUK	171	67	B	0000084839253	SIM C	082221666099	ALM.AGUS JUMADI	ENDAH PRASTIWININGSIH	LAIN-LAIN	PNS	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
83	0083	MUHAMMAD ABDUL AZIS	382	\N	https://drive.google.com/open?id=1WC5Qm9azgO1hQQL2Evt37DTmbovkbuw9	JEPONAN RT01 RW02 ,MANGGUNG, NGEMPLAK, BOYOLALI	BOYOLALI	38751	\N	ISLAM	LAKI-LAKI	muhammadabdulazisa19@gmail.com	088980255192	SMA	IPA	DIKTUK	171	62	BELUM MENGETAHUI	0003533147998	SIM C	085228777630	SURATMAN	SALAMI (ALM)	BURUH	BURUH	POLDA JAWA TENGAH	POLRES BOYOLALI	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
84	0084	ARTHUR LANDHAM PUTRA MAULANA	383	\N	https://drive.google.com/open?id=1HbaNATAd4dVRXSJLzNJNd_JFSyKhvnL0	PERUM KORPRI C-16 UNGARAN RT 01/RW 07,KELURAHAN GEDANGANAK, KECAMATAN UNGARAN TIMUR	KABUPATEN SEMARANG	39022	\N	ISLAM	LAKI-LAKI	landhamarthur@gmal.com	089630578792	SMA	KURIKULUM MERDEKA	DIKTUK	167	64	O	0001097211947	SIM C	089530000040	MAHYA MAULANA AHMAD	ANA ASTUTI	POLRI	WIRASWASTA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
85	0085	FATTAN DESTA ABINAWA	384	\N	https://drive.google.com/open?id=1PsFBUEJghT7sOCnk0HCFYJ-HaqwBsC7f	JERUK RT 06 RW 10, KEPEK, WONOSARI, GUNUNGKIDUL	KABUPATEN GUNUNGKIDUL	38696	\N	ISLAM	LAKI-LAKI	fattandestadesta@gmail.com	08882489237	SMA	SMA	DIKTUK	166	63	O	0002903205082	SIM C	085182633765	SUMANTO	HARTINI	BURUH	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	55	BINTARA POLAIR	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
86	0086	TEGAR MAHYA JAWWAD	385	\N	https://drive.google.com/open?id=1ym2rnldzpipac0P4vNtPB8Q7mluh2MQM	RAJEKWESI RT:03 RW:02 KECAMATAN MAYONG KABUPATEN JEPARA	JEPARA	1/13/0007	\N	ISLAM	LAKI-LAKI	tegarmahya13@gmail.com	082136990823	SMA	SMA	DIKTUK	179	66	A	0001788644586	SIM C	081325745670	AGUS HERMANTO	YUANA ANDRIYANI	SWASTA	PNS	POLDA JAWA TENGAH	POLRES JEPARA	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	42	54	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
87	0087	BINTANG FAREZA YUDHA WIBOWO	386	\N	https://drive.google.com/open?id=17jog9tm_8Xq0CaLJHrGZHPscKKFypbgm	GUMULAN RT 2 RW 1 KEC. KLATEN TENGAH,KAB.KLATEN / 57417	KLATEN	38647	\N	ISLAM	LAKI-LAKI	bintangfhareza@gmail.com	081391575440	SMA	MIPA	DIKTUK	177	71	A	0003006251065	SIM C	081548372911	TOPO WIBOWO	IKA WIDYANINGRUM	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	44	56	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
88	0088	RAIHAN RAFI MAHENDRA	387	\N	https://drive.google.com/open?id=10RocR6Gcinm5R0gQjKZxNsM-sbLlH26m	JL PANUNGGULAN NO 226 RT04 RW 01 PATI WETAN	PATI	38500	\N	ISLAM	LAKI-LAKI	raihanrafi1902@gmail.com	08812412886	SMA	IPS	DIKTUK	176	73	BELUM MENGETAHUI	0002250021745	SIM C	081558681729	SUNARYONO	SUTIAH	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	44	56	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
89	0089	ADRIANSYAH ATHO’ULLAH PRATAMA	388	\N	https://drive.google.com/open?id=19xqIqyGjod7mwLsMHEblsW6EZRZ3Soxz	DESA MENGORI RT/02 RW/02 KECAMATAN PEMALANG KABUPATEN PEMALANG	PEMALANG	38391	\N	ISLAM	LAKI-LAKI	adriansyahathoullahpratama@gmail.com	087736795398	SMA	IPA	DIKTUK	173	62	AB	0001291618901	SIM C	0819800401	MOKHAMAD MURDIYAT	OKTAFIYANTI	POLRI	PNS	POLDA JAWA TENGAH	POLRES PEMALANG	55	DIKTUKBA POLRI	2025	TIDAK	15	33	44	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
90	0090	DAMAR WIBISONO HARJO MARJONO	389	\N	https://drive.google.com/open?id=1ypOOp5EPfuMBnPaGco0bFW_m_v-jlsHn	TEGALSARI RT 003 RW 009, KEBONAGUNG, BANDONGAN, MAGELANG	MAGELANG	39199	\N	ISLAM	LAKI-LAKI	damarwibisonohm@gmail.com	085798840196	SMA	SMA	DIKTUK	172	68	O	0001081597116	SIM C	085865028003	MARJONO	YUDIAN RIMA PURWANIS	PURNAWIRAWAN TNI/POLRI	PNS	POLDA JAWA TENGAH	POLRESTA MAGELANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	43	57	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
91	0091	RISAL AL AKBAR	390	\N	https://drive.google.com/open?id=1b9MjOnzeZLF2Rc5LsWBrw5trEI0NjYxt	SURUH KALONG RT006 RW007, PANDEYAN, TASIKMADU, KARANGANYAR, JAWA TENGAH	KARANGANYAR	39012	\N	ISLAM	LAKI-LAKI	radenalakbar@gmail.com	082264466919	SMA	SMA	DIKTUK	171	62	O	0001823395983	TIDAK PUNYA SIM	085647960405	ANTON DWI HARYANTO	ENDANG KRISTUTI	WIRASWASTA	SWASTA	POLDA JAWA TENGAH	POLRES KARANGANYAR	55	DIKTUKBA POLRI	2025	TIDAK	14.5	33	43	54	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
92	0092	HELMY SHAFAN FADHIL	391	\N	https://drive.google.com/open?id=1WZuFoYeEpjr_zDEsR9odzagDGbeqxD3s	SRIBIT ,RT 02 ,RW 11 ,SENDANGTIRTO ,BERBAH SLEMAN ,DAERAH ISTIMEWA YOGYAKARTA	SLEMAN	38794	\N	ISLAM	LAKI-LAKI	helmyshafanfadhil@gmail.com	088215194660	SMA	SMA(IPA)	DIKTUK	168	59	B	0001160885744	SIM C	088239625539	TRI SUSANTO	NOVI WIDYANINGTYAS	WIRASWASTA	PNS	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	41	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
93	0093	FAHRI AGUS PRASETYO	392	\N	https://drive.google.com/open?id=1O3GDr_tks_LF952IEVkyoP4cp59GsEJe	DESA BUNIAYU RT 01/RW 04, KECAMATAN TAMBAK, KABUPATEN BANYUMAS	BEKASI	39128	\N	ISLAM	LAKI-LAKI	fahriagusprasetyo321@gmail.com	082136113754	SMA	SMA	DIKTUK	166	55	B	0002696575072	SIM C	081327119184	AGUS MARYANTO	ALMH. SITI SOLIKHATUN	SWASTA	LAIN-LAIN	POLDA JAWA TENGAH	POLRESTA BANYUMAS	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	42	54	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
94	0094	JOGAS DIVO NUGROHO	393	\N	https://drive.google.com/open?id=1QUbgKyawzJbHt1tkeFzet3fLSHFfMCHm	GOLONGAN, RT:004, RW:001, DESA JATIROTO, KECAMATAN BUAYAN, KABUPATEN KEBUMEN, JAWA TENGAH	CILACAP	38373	\N	ISLAM	LAKI-LAKI	jogasdivo21@gmail.com	089630300588	SMA	MIPA	DIKTUK	179	68	B	0001097164743	SIM C	0895336410757	SUGANDI NUGROHO	EVA MARIANE DA SILVA	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KEBUMEN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	45	56	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
95	0095	KELVIN PRATIKTO, S.Akun.	394	\N	https://drive.google.com/open?id=1zWsbyL1UIzYWMH6DFOwjlSlSTa_gJGII	RT 01,RT 04, DSN SEMPU, DS NGAMBARSARI, KEC KARANGTENGAH, KAB WONOGIRI, JAWA TENGAH	BREBES	37854	\N	ISLAM	LAKI-LAKI	kelvingood456@gmail.com	083117346451	S1	AKUNTANSI SYARIAH	DIKTUK	178	64	B	0000565890928	SIM C	082211589215	ALM D.KIRNO	SUMI	LAIN-LAIN	BURUH	POLDA JAWA TENGAH	POLRES WONOGIRI	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	56	BAKOMSUS (BINTARA KOMPETENSI KHUSUS)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
96	0096	ATTARIQ DEWA CANNAVARO, S.H.	395	\N	https://drive.google.com/open?id=11nm-DKK9hCixa33ZjCOpGHtX0zN6iPM-	DUSUN TEMON RT 002/RW 001, DESA TEMOM, KECAMATAN BRATI, KABUPATEN GROBOGAN, JAWA TENGAH	GROBOGAN	36476	\N	ISLAM	LAKI-LAKI	attariq1299@gmail.com	085798017654	S1	ILMU HUKUM	DIKTUK	175	73	O	0002259250738	SIM C	085741395877	EDY SHOLEKAN	TRI WAHYUNI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	42	55	BAKOMSUS (BINTARA KOMPETENSI KHUSUS)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
97	0097	MUHAMMAD IBNU DWI ANDIKA	396	\N	https://drive.google.com/open?id=1QVHHXEMwBE1J5nDbBvDN8yIeiLA2mPcJ	GEDONGAN TRIRENGGO BANTUL RT 01	BANTUL	37781	\N	ISLAM	LAKI-LAKI	ibnuandika77@gmail.com	082221359239	SMA	IPS	DIKTUK	173	60	O	0000648531652	SIM C	087838316171	TUKIMAN	TITIK SENDARI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	55	BINTARA BRIMOB	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
98	0098	ARGASOKA RIZKY YUDISTIRA SUTOMO	397	\N	https://drive.google.com/open?id=1KU0W4IgHpNnHpaA39znaofBxaCUFv_6D	JL.BABAKAN RT 020/RW 002 DESA JEPARA KULON KECAMATAN BINANGUN KABUPATEN CILACAP	KABUPATEN CILACAP	39302	\N	ISLAM	LAKI-LAKI	argasokariski@gmail.com	081225286815	SMA	SMA	DIKTUK	172	59	O	0001097251457	SIM C	081240867007	BAMBANG SUTOMO	SUMARTI	POLRI	PNS	POLDA JAWA TENGAH	POLRESTA CILACAP	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	41	54	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
99	0099	FAIZAL AFIF INDYARTO	398	\N	https://drive.google.com/open?id=1POqQJPn6hV4vVensAxyu9bZXnKw0joXB	KEDUNGUTER RT 02/01 KEC. KARANGTENGAHKAH KAB. DEMAK	DEMAK	38840	\N	ISLAM	LAKI-LAKI	faisalafifindiarto@gmail.com	083146663448	SMA	IPS	DIKTUK	171	61	B	0001098660532	SIM C	081352318920	SUPARTO	KOILIN	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
100	0100	NIKI CHANDIKA PRATAMA	399	\N	https://drive.google.com/open?id=1Qv91CH-c1spgQRVv_I0tv8zsszETzkBH	WINONG RT01 RW03 DESA BALEROMO KECAMATAN DEMPET KABUPATEN DEMAK	DEMAK	38733	\N	ISLAM	LAKI-LAKI	nikichandika7@gmail.com	08818595750	SMK	TBSM (TEKNIK DAN BISNIS SEPEDA MOTOR)	DIKTUK	166	57	O	0003232443003	SIM C	085338225526	ISKANDAR	SULISTYA FITASARI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	42	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
101	0101	HABIL JUNIAR RAHMAN	400	\N	https://drive.google.com/open?id=1wNG0jQQ7vTnlnlx08w6AgCaJDd0M07nJ	JL.TAMAN MAKAM PAHLAWAN RT001/RW001 KEL.TEMPELAN KEC.BLORA KAB.BLORA	BLORA	38501	\N	ISLAM	LAKI-LAKI	habiljuniar1@gmail.com	081232588305	SMA	IPS	DIKTUK	166	57	A	0003534642178	SIM C	081235555805	SUMARNO	MARIANI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES BLORA	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	41	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
102	0102	MUHAMMAD AMIRUL HIDAYAT	401	\N	https://drive.google.com/open?id=1MLWaZ0AwkozYwWdFrbGBXKTjN4XeeYsV	TEMENGGUNGAN RT 10/03 PANJANG KECAMATAN AMBARAWA	KABUPATEN SEMARANG	39077	\N	ISLAM	LAKI-LAKI	sipitwikyah0205@gmail.com	085727478236	SMA	SMA	DIKTUK	166	63	B	0001264749816	SIM C	085601533179	SAIKIN	DWI DIAH PUSPITA SARI	TNI	SWASTA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	31	41	55	PTU (BINTARA TUGAS UMUM)	1	B1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
103	0103	MUHAMMAD GALUH SAPUTRO	402	\N	https://drive.google.com/open?id=15x-AGQQkCMyOfFIQ7jpGJ6WK3RAgex4H	DUSUN DEPOK SELATAN RT 004/ RW 002, DEPOK, TOROH, GROBOGAN, JAWA TENGAH	GROBOGAN	38540	\N	ISLAM	LAKI-LAKI	patrickcrab1234@gmail.com	081469730759	SMA	IPA	DIKTUK	178	69	A	0002214709301	SIM C	085848924732	JOKO MULYONO	DWI RETNONINGSIH	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
104	0104	ANDREA RADJA ZACKY AFRIALDY	403	\N	https://drive.google.com/open?id=1I-PogwNDIsmsGP6HJ3BRWTCEVn7gD7XM	JL.GUNUNG LAWU NO 80A RT 04 RW 01 KELURAHAN TEMPELAN KECAMATAN BLORA KABUPATEN BLORA	BLORA	38482	\N	ISLAM	LAKI-LAKI	andrearadjazackyafrialdy@gmail.com	085647788806	SMA	IPS	DIKTUK	175	72	B	0003121600803	SIM C	0895383008304	TEGUH YULIANTO	NUR ROHMAWATI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES BLORA	55	DIKTUKBA POLRI	2025	TIDAK	15	33	44	57	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
105	0105	MUHAMMAD AFFAN ARDIANSYAH	404	\N	https://drive.google.com/open?id=1tuDJzuYgvu4-KoDznxos0jk48Gy0OEjP	ASRAMA BRIMOB PASADENA, RT 11 RW 04, KELURAHAN BAMBANKEREP, KECAMATAN NGALIYAN	KOTA SEMARANG	38735	\N	ISLAM	LAKI-LAKI	affanardiansyah99@gmail.com	085700438568	SMA	IPS	DIKTUK	174	64	A	0001268754851	SIM C	085225139236	HERRY RUSIARDI ANTOKO	KORI YUNANI	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	33	44	56	BINTARA BRIMOB	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
106	0106	YILDIREY HAIKAL FADHLI	405	\N	https://drive.google.com/open?id=1RLegAMo7bZ0mrAVjrnX799EGxeIbQYQT	DESA SOMOSARI RT 06 RW 01 KECAMATAN BATEALIT KABUPATEN JEPARA	JEPARA	38621	\N	ISLAM	LAKI-LAKI	haikalfadhli2266@gmail.com	087848133566	SMA	IPS	DIKTUK	172	63	B	0001967276079	SIM C	081326150313	JOKO SUHAJI	SEPTI SUSRIYANI	POLRI	PNS	POLDA JAWA TENGAH	POLRES JEPARA	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
107	0107	HANIF IMAM MUZAKI	406	\N	https://drive.google.com/open?id=17DufHCDr3858-SyUdka8H3LQqKK4-qix	DESA KETUNGGENG, DUSUN KETUNGGENG, RT 08, RW 08 , KECAMATAN DUKUN KABUPATEN MAGELANG	BANYUMAS	39027	\N	ISLAM	LAKI-LAKI	hanifimammuzaki@gmail.com	083898120616	SMA	SMA	DIKTUK	171	68	B	0001107168434	SIM C	081326994599	MUHAMAT HUFRON	BUDI DWI ASTUTI	TNI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA MAGELANG	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	55	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
108	0108	JULIANDA IVAN BHAYANGKARA	407	\N	https://drive.google.com/open?id=1AIJLxO_9nFllYv2iKS3HGVzUoV0DdRd0	PERUM GRIYA WINONG ASRI NO.7 RT 10 RW 04 KEC.PATI KAB.PATI	PATI	38537	\N	ISLAM	LAKI-LAKI	juliandaivan1@gmail.com	081299958060	SMA	IPA	DIKTUK	170	60	BELUM MENGETAHUI	0001098174745	SIM A	085327453006	ANDRI YULIANTO	ATIK PURWATININGSIH	POLRI	PNS	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15	32	41	54	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
109	0109	RADEN BAGUS ABDULLAH ASWIN SULA	408	\N	https://drive.google.com/open?id=1K8ZFDx6kVkA4rYdppO4ipKlWzoBlc6uh	SANGKRETAN RT30/RW14, GLAGAH, TEMON, KULON PROGO, DAERAH ISTIMEWA YOGYAKARTA	KULON PROGO	38921	\N	ISLAM	LAKI-LAKI	aswinsula@gmail.com	082135174849	SMA	SMA (MIPA)	DIKTUK	168	57	O	0001082083004	SIM C	085875900090	BAMBANG HANGGARA PRANA	SURTI SATITI	PENSIUNAN PNS	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	41	54	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
110	0110	BAYU SATRIO RAMADANI	409	\N	https://drive.google.com/open?id=1W_I69dvlkblNBkNjAxr0eEhRz9jFgFKW	KLUMPIT RT03 RW03,KLUMPIT,KARANGGEDE,BOYOLALI	BOYOLALI	39338	\N	ISLAM	LAKI-LAKI	adnaniibrahim7@gmail.com	081575445057	SMA	SMA	DIKTUK	168	59	BELUM MENGETAHUI	0001873681288	SIM C	081910225433	PAENO	ALM.CARSEM	WIRASWASTA	LAIN-LAIN	POLDA JAWA TENGAH	POLRES BOYOLALI	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	42	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
111	0111	HAIDAR RAYA GINARI PUTRA	410	\N	https://drive.google.com/open?id=1jRytDc_wXOWKFARA16Z3D8xExaieJqMq	PERUMAHAN DEWANDARU BLOK G-19 RT 004 RW 002, DESA KARANGRAU, KECAMATAN SOKARAJA	BANJARNEGARA	39129	\N	ISLAM	LAKI-LAKI	haidarraya08@gmail.com	085712958529	SMA	SMA IPA	DIKTUK	167	56	O	0000204423671	TIDAK PUNYA SIM	081391449793	SUGINO	URIP TRIWIJAYANTI	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRESTA BANYUMAS	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	42	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
112	0112	YOGI SAKTI WAHYUDI	411	\N	https://drive.google.com/open?id=1bXE6yW6rkAbPGrYw_4hozICYOvmwfxFu	MRISEN GENENG RT07 PANGGUNGHARJO SEWON BANTUL DAERAH ISTIMEWA YOGYAKARTA	BANTUL	38626	\N	ISLAM	LAKI-LAKI	saktiwahyudi10@gmail.com	081326863053	SMA	IPA	DIKTUK	175	68	O	0003582275872	SIM C	0882006944608	ALM SUBAGYO	MARGIYATI	LAIN-LAIN	SWASTA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	32	45	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
113	0113	M. RIZAL WAHYU PRASETYO	412	\N	https://drive.google.com/open?id=1jC7ENMsYQa7xDJaRZZC17DSVBlylcdZI	JABUNG RT 04/RW 39,PANDOWOHARJO,SLEMAN,SLEMAN,D.I YOGYAKARTA	MALANG	38573	\N	ISLAM	LAKI-LAKI	inirizalpunya@gmail.com	081949848789	SMA	IPA	DIKTUK	174	65	BELUM MENGETAHUI	0003012884368	SIM C	08194116309	PURWANTO	WINARSIH	WIRASWASTA	WIRASWASTA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
114	0114	FAWWAZ IZZAN TSAQIF	413	\N	https://drive.google.com/open?id=1320hwADTxnbdFBACoAHXgxpOVtiPrV_X	BANGKEREP RT 01 RW 02 DESA CANDIRENGGO KECAMATAN AYAH KABUPATEN KEBUMEN	KEBUMEN	38897	\N	ISLAM	LAKI-LAKI	fawwas.izzan@gmail.com	082324833156	SMA	MIPA	DIKTUK	173	64	O	0001097250164	SIM C	08156877372	FAWWAZ IZZAN TSAQIF	SITI MAFTUKHAH	POLRI	SWASTA	POLDA JAWA TENGAH	POLRES KEBUMEN	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	55	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
115	0115	ERICH NAUFAL HANIF NUGROHO	414	\N	https://drive.google.com/open?id=1Eqx2ok8Fe3dKpZUwWtgYy3soJUgOqC0l	PERUM BOLON PERMAI 2 NO 38 RT03/04 DESA BOLON KECAMATAN COLOMADU JAWA TENGAH	KARANGANYAR	38839	\N	ISLAM	LAKI-LAKI	erichnaufalhanifnugroho@gmail.com	085134551149	SMA	IPS	DIKTUK	172	60	BELUM MENGETAHUI	0001292103584	SIM C	08122587378	HERY FAJAR NUGROHO	TITIK SRI WAHYUNI	TNI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KARANGANYAR	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
116	0116	ZHAKARIA FADHILLA ADHI	415	\N	https://drive.google.com/open?id=1CuVwAlKlzAPs_RQh9PzfsrL4SYj7Qd9u	KEDUNGKLEPU RT001/RW002 KARANGLOR MANYARAN WONOGIRI	WONOGIRI	38861	\N	ISLAM	LAKI-LAKI	insyafbung@gmail.com	085700613258	SMA	IPA	DIKTUK	171	70	AB	0002064157569	SIM C	082220732122	SUMARDI	ENI SUSILOWATI	PEGAWAI PEMERINTAH PUSAT ATAU DAERAH NON PNS	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES WONOGIRI	55	DIKTUKBA POLRI	2025	TIDAK	15	34	44	57	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
117	0117	AKFAL ENGGA KUSUMAH	416	\N	https://drive.google.com/open?id=1UKAP4lRHEz2fzlZcbocsU2st2DsygFI2	KARANG RT02, TIRTOHARGO, KRETEK, BANTUL, YOGYAKARTA	BANTUL	38253	\N	ISLAM	LAKI-LAKI	akfalengga3@gmail.com	081327859110	SMA	IPS	DIKTUK	169	59	BELUM MENGETAHUI	0001696652223	SIM C	089672218497	SUWARJA	RIYANI	PETANI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	41	54	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
118	0118	RIEFKY ANDRI WIBOWO	417	\N	https://drive.google.com/open?id=16QCN-kRT99EP-KdhvbDMXkwtG-B13V3A	BALEKAMBANG RT02/RW03,KECAMATAN BAWEN,KABUPATEN SEMARANG,JAWA TENGAH	KABUPATEN SEMARANG	38255	\N	ISLAM	LAKI-LAKI	rifki0330@gmail.com	0895423463640	SMA	IPA	DIKTUK	166	60	O	0001181391772	SIM C	085641060624	EKO WINARSO	SITI FATIMAH	BURUH	SWASTA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	57	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
119	0119	SEENDI FADHILATUL MUNNA	418	\N	https://drive.google.com/open?id=1VXLJ7N5_LTe8_O9_zdjOEwsOyx0lO4kA	DESA TEMULUS RT02/RW04 KECAMATAN MEJOBO KABUPATEN KUDUS PROVINSI JAWA TENGAH	KUDUS	38255	\N	ISLAM	LAKI-LAKI	sendimuna270@gmail.com	087777093889	SMK	TITL (TEKNIK INSTALASI TENAGA LISTRIK)	DIKTUK	175	70	O	0001533220762	SIM A	087720397554	SUPANGAT	NOR YANTI	WIRASWASTA	SWASTA	POLDA JAWA TENGAH	POLRES KUDUS	55	DIKTUKBA POLRI	2025	TIDAK	15.5	34	43	57	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
120	0120	DITO AKHMAD FAISAL	419	\N	https://drive.google.com/open?id=1gj88Am5o_Dsq8h3bZSeKdnLA1iuzRmII	DESA KEBANDUNGAN RT 03 RW 02 KECAMATAN BODEH KABUPATEN PEMALANG	PEMALANG	38769	\N	ISLAM	LAKI-LAKI	ditoafaisal123@gmail.com	085227894433	SMA	IPS	DIKTUK	173	67	O	0003118689898	SIM C	08121523463	KISTANTO	WIDYASTUTI	PNS	PNS	POLDA JAWA TENGAH	POLRES PEMALANG	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
121	0121	EKA PRASTYA WIBOWO	420	\N	https://drive.google.com/open?id=1ZwHKfB-_0dLDqM4MYkUlwFE9FcJA4-qv	SIWEDEN RT 04 RW 05 CANDIREJO UNGARAN BARAT	KABUPATEN SEMARANG	38143	\N	ISLAM	LAKI-LAKI	ekawibiwo2004@gmail.com	088232414581	SMA	IPS	DIKTUK	173	74	O	0002297470599	SIM C	083862913797	SURYADI	ARIH WINARNI	SWASTA	SWASTA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	34	44	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
122	0122	AFRIZAL REDY BRILIANSYACH	421	\N	https://drive.google.com/open?id=11C23A8u3TlITUeSSQwStr2H--4OVsimx	BANGSAN RT04,PLEMBUTAN,CANDEN,JETIS,BANTUL	BANTUL	38670	\N	ISLAM	LAKI-LAKI	afrizalredy03@gmail.com	089530715715	SMK	SMK	DIKTUK	172	62	B	0001100638888	SIM C	085292790636	EDI SARWOKO	RETNO KADARWATI	POLRI	WIRASWASTA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
123	0123	ADHADE QUMARAN BEKTI	422	\N	https://drive.google.com/open?id=1ZjBOj1MdcxROEbq_LUoYVMMzIZobFnSl	GROJOGAN RT23 RW 08 TASKOMBANG MANISRENGGO KLATEN	KLATEN	39435	\N	ISLAM	LAKI-LAKI	adhade044@gmail.com	085713131095	SMA	IPA	DIKTUK	170	64	BELUM MENGETAHUI	0001873558901	TIDAK PUNYA SIM	085866393504	MUHAMAD ALI	SRI LESTARI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
124	0124	RAFI TEGAR PAMBUDI	423	\N	https://drive.google.com/open?id=18ogHk7HtxAZJljuwfqCcShNZbu7caaGo	BANDUNGMULYO RT7 RW2 DESA BANDUNGREJO	DEMAK	38734	\N	ISLAM	LAKI-LAKI	rafitegar303@gmail.com	08561389259	SMA	SMA	DIKTUK	170	60	BELUM MENGETAHUI	0001880675594	SIM C	082243760955	ALM.GUNAWAN	SRI HARTINI	LAIN-LAIN	PEGAWAI PEMERINTAH PUSAT ATAU DAERAH NON PNS	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	41	54	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
125	0125	GENTHUR RAHMADHANI	424	\N	https://drive.google.com/open?id=1nahuRl0gfD7L1dFwxM9q6Tj7koBoiceC	BANARAN IX,RT046,RW009,BANARAN,PLAYEN,\nGUNUNGKIDUL	GUNUNGKIDUL	38786	\N	ISLAM	LAKI-LAKI	genthurrahmadhani99@gmail.com	085700382425	SMA	SMA	DIKTUK	168	70	O	0000654510881	SIM C	085328466990	SUMANTA	TUWIS SRIYANTI	PETANI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	33	44	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
126	0126	MUHAMMAD DZAKY	425	\N	https://drive.google.com/open?id=1FVQuj0FV9ZcE_rIALTY1vh7w6We1ojai	KRAPYAK RT 10/RW 21, TRIHARJO, SLEMAN, SLEMAN, DIY (55514)	KAB. MAGELANG	38142	\N	ISLAM	LAKI-LAKI	muhdzaky74@gmail.com	085870459122	SMA	IPS	DIKTUK	168	60	B	0001393416459	SIM C	081392452345	ENDRO PURWONO	SITI MUFLIKAH	PNS	WIRASWASTA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	56	BINTARA BRIMOB	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
127	0127	ALFAN FAWAS ILYASA	426	\N	https://drive.google.com/open?id=1RY-Ll8Zv7oft_Rsvo6b5UON-I1YZgcm_	RT 001/RW 001 DESA KEDUNGKAMAL, KECAMATAN GRABAG, KABUPATEN PURWOREJO	KABUPATEN PURWOREJO	39107	\N	ISLAM	LAKI-LAKI	alfanilyasa07@gmail.com	0895336740112	SMA	SMA	DIKTUK	166	62	O	0001273075367	SIM C	085292821462	PARYOTO	RINI ASTUTI	PNS	PNS	POLDA JAWA TENGAH	POLRES PURWOREJO	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	56	PTU (BINTARA TUGAS UMUM)	1	B2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
128	0128	SUSILO WAHYU ADI PRATAMA	427	\N	https://drive.google.com/open?id=1oy0HDfSWBKetSm4aDboqTrAjeEp5Olgo	PERUM PELITA ASRI 05/01 DESA DEREKAN, KEC. PRINGAPUS, KAB. SEMARANG	KAB. SEMARANG	38168	\N	ISLAM	LAKI-LAKI	aditertamvan32@gmail.com	083878385609	SMA	MIPA	DIKTUK	178	77	B	0001530757315	SIM C	083108775421	WAHYONO	SUSILOWATI	SWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	16	34	43	57	BINTARA BRIMOB	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
129	0129	ALFARIZA ERDIANTO	428	\N	https://drive.google.com/open?id=17ptv5V423msL67CMETf5aUC06y_5Jf0n	KARANG WIDORO 2/2 GUCI, GODONG, GROBOGAN	GROBOGAN	38040	\N	ISLAM	LAKI-LAKI	alfarizaerdianto214@gmail.com	081548418755	SMK	TEKNIK KONSTRUKSI GEDUNG, SANITASI DAN PERAWATAN	DIKTUK	177	76	BELUM MENGETAHUI	0002251340673	SIM C	081229212978	SAFIUDDIN	ERNA AGUSTINI	WIRASWASTA	LAIN-LAIN	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
130	0130	NUNO ELLANG SAMUDRA	429	\N	https://drive.google.com/open?id=1UjZbmXZuQoKZ1eNq7tTt2j6a72_h0pdM	JLN.GATOT SUBROTO NO 75 KAUMAN BLORA	BLORA	38770	\N	ISLAM	LAKI-LAKI	nunoellang3@gmail.com	085182343279	SMA	IPS	DIKTUK	173	65	O	0001895077596	SIM C	081327578922	SISWANTO	SUSILANINGSIH	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES BLORA	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
131	0131	FIRMAN RIZKI PEBRIYANTO	430	\N	https://drive.google.com/open?id=17RWKK_woZ8DAnAmCSg8FyJyHhZ9_Yhmn	PERUM KADIPIRO BARU JL.BIMA SENA NO. 06 RT 004 RW 010 ,KEL. BEJEN, KEC. KARANGANYAR JAWA TENGAH	KARANGANYAR	38390	\N	ISLAM	LAKI-LAKI	firmanrizkip07@gmail.com	082123565040	SMA	IPA	DIKTUK	173	60	BELUM MENGETAHUI	0001109552837	SIM C	085329337321	WARDIYO	RISANTI HARYATI	PURNAWIRAWAN TNI/POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KARANGANYAR	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	44	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
132	0132	FITRORIC QUMAR HIDAYAT	431	\N	https://drive.google.com/open?id=1S3o2DZnST9B1YPQBgTyC-sePpBLzw94O	JL.TURONGGO SARI III GANDOK RT08 RW63,CONDONG CATUR,SLEMAN,YOGYAKARTA	PASURUAN	38034	\N	ISLAM	LAKI-LAKI	fitroricqh@gmail.com	085735566554	SMA	IPA	DIKTUK	171	55	O	0001326560062	SIM C	081334748493	KAMARUDDIN ARIF SULAIMAN	YULI ASTUTIK	PURNAWIRAWAN TNI/POLRI	SWASTA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	\N	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
133	0133	MUHAMMAD NUR WAHID, S.E.	432	\N	https://drive.google.com/open?id=1uuCMXw577510vZYEQuE6WJwyKnZnpiz4	PETEKEYAN RT 20/RW 04, TAHUNAN, JEPARA	JEPARA	37437	\N	ISLAM	LAKI-LAKI	wahidnur1019@gmail.com	082335974955	S1	EKONOMI PEMBANGUNAN	DIKTUK	169	58	B	0002873978054	SIM C	082135869391	SUCIPTO	UMU KHULSUM	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES JEPARA	55	DIKTUKBA POLRI	2025	TIDAK	14.5	29	42	55	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
134	0134	MUHAMMAD SYAFIQ AVICENA	433	\N	https://drive.google.com/open?id=1A4BVCRw6EZb2X4OCzWPKbjUlLdwms9c6	CANDI RT 07 SRIHARDONO PUNDONG BANTUL	BANTUL	38847	\N	ISLAM	LAKI-LAKI	syafiqqqav@gmail.com	088707068487	SMA	IPS	DIKTUK	168	62	O	0001303282877	SIM C	081904009171	RIYANTA	AMIK ISNAWATI	PNS	PNS	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	31	44	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
135	0135	RIVAI GAGAH PRAMANA	434	\N	https://drive.google.com/open?id=1dK99AdGZkCFAr1lCpus2PNqlQDJh0VMv	BANDINGAN, RT.24 RW.11, KEC.KEJOBONG, KAB.PURBALINGGA, PROV. JAWA TENGAH	PURBALINGGA	38846	\N	ISLAM	LAKI-LAKI	rivaigagah11@gmail.com	085849045094	SMA	IPS	DIKTUK	166	60	A	0000082892902	SIM C	085747566473	ARIF BUDIMAN	WIWIT HELIMAWATI NINGSIH	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES PURBALINGGA	55	DIKTUKBA POLRI	2025	TIDAK	14	30	41	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
136	0136	ANDHYKA YUSUF KRISNA	435	\N	https://drive.google.com/open?id=1NQwI0nENGOnSFVYZpdMrNfOqZ0DTEIhD	CERME, RT 08/ RW 02, CERME, JUWANGI, BOYOLALI	BOYOLALI	38159	\N	ISLAM	LAKI-LAKI	andhykayusufk@gmail.com	083821154090	SMK	AKUNTANSI	DIKTUK	165	64	A	0002115383027	SIM C	082323537110	INDARTONO (ALM)	SUKAMTI	TIDAK BEKERJA	LAIN-LAIN	POLDA JAWA TENGAH	POLRES BOYOLALI	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	41	56	BAKOMSUS (BINTARA KOMPETENSI KHUSUS)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
137	0137	GIGIH ADHIYODHA	436	\N	https://drive.google.com/open?id=1Z7M8fY2lJj2DQk0zEAJxpvgyI7BvZwzs	JETAK RT01 RW28 SENDANGTIRTO BERBAH SLEMAN D.I.YOGYAKARTA	SLEMAN	38753	\N	ISLAM	LAKI-LAKI	gigihadhi050206@gmail.com	087742043568	SMA	SMA (IPA)	DIKTUK	178	64	O	0000209577216	SIM C	087738072650	WARDAYA	RINI ADMIWATI	WIRASWASTA	PNS	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	43	58	REKPRO (REKRUTMEN PROAKTIF)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
138	0138	RANDIKA DAVA PUTRA DEFRIAN	437	\N	https://drive.google.com/open?id=1CH_A4gCLUXRNAQJLWPO0rCZv5vQzgULP	DSN.GUNDIK RT01/RW02 KELURAHAN LEDOKDAWAN,KECAMATAN GEYER,KABUPATEN GROBOGAN,JAWA TENGAH 58172	GROBOGAN	38550	\N	ISLAM	LAKI-LAKI	randikadavaputradefrian@gmail.com	085198494981	SMA	IPA	DIKTUK	176	70	AB	0001884777636	SIM C	081227038673	AGUS FITRIANTO	RIKA DEWI SUKMAWATI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
139	0139	CHRISTIAN RAFAEL MAHENDRA PASHA	438	\N	https://drive.google.com/open?id=1IHSPrIs-Ayu4Iq50eHHKiLhminGlCr24	RT 004 / RW 02 TEGALSARI, NANGSRI, MANISRENGGO, KLATEN	KLATEN	38997	\N	KATHOLIK	LAKI-LAKI	christianpasha3@gmail.com	081229056077	SMA	KURIKULUM MERDEKA	DIKTUK	173	67	O	0001371996674	SIM C	081393309436	ANTON SUGITO	ESTER SRI WIDAYATI	SWASTA	LAIN-LAIN	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	15	30	43	56	BINTARA BRIMOB	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
140	0140	MUHAMMAD ALVIN HIDAYAT	439	\N	https://drive.google.com/open?id=1pGHnv6ffPOBg4KnJh2j8nJDlcX-GJE8z	DESA REJOSARI RT01/01,KARANGAWEN,DEMAK. KODE POS 59566	GROBOGAN	38674	\N	ISLAM	LAKI-LAKI	alvinhidayatt1811@gmail.com	085165657354	SMA	IPA	DIKTUK	171	58	AB	0002008713238	SIM C	082133771531	MULYONO	MASDAROH	TIDAK BEKERJA	WIRASWASTA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
141	0141	FAJAR PUTRA ARVIANTO	440	\N	https://drive.google.com/open?id=1pEVzc_CPEOtVbfRkVDhqdK-ba-cHFNI2	NGIRENG-IRENG RT 01, SIDOMULYO, BAMBANGLIPURO,BANTUL	SLEMAN	38702	\N	ISLAM	LAKI-LAKI	arviantoanto9@gmail.com	083841080813	SMA	SMA IPA	DIKTUK	171	64	O	0001108073463	SIM C	083147772834	WIDAYADI	EVI SRI HARTATIK	TNI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	31	43	54	BINTARA POLAIR	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
142	0142	MUHAMMAD FAISAL NURRAHMAN	441	\N	https://drive.google.com/open?id=1-Ru43nsGDkyyQoouTEJviklJvlUTiNdH	DESA KAMPIL, RT 016/004, KECAMATAN WIRADESA, KABUPATEN PEKALONGAN	PEKALONGAN	38740	\N	ISLAM	LAKI-LAKI	muhfaisalnurrahman583@gmail.com	082314995060	SMA	IPA	DIKTUK	168	61	O	0001381245344	SIM C	085876875687	SURATMO	MARJINAH	PENSIUNAN PNS	PENSIUNAN PNS	POLDA JAWA TENGAH	POLRES PEKALONGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	55	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
143	0143	HAIDAR FATHIN FAKHRISANI	442	\N	https://drive.google.com/open?id=1hYGaLw3g0gp0fSph2YQYy1kJJwXffzrj	KEMRONCONG RT.04/RW.04, SRATI, AYAH, KEBUMEN	KEBUMEN	38898	\N	ISLAM	LAKI-LAKI	haidaralkiren@gmail.com	081228279155	SMA	IPA	DIKTUK	166	59	O	0000198644117	SIM C	085869333501	ROBINGUN	SRI SUKARNI	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES KEBUMEN	55	DIKTUKBA POLRI	2025	TIDAK	14	30	42	57	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
144	0144	TINO TEGAR WICAKSANA	443	\N	https://drive.google.com/open?id=1sgosaP57jDrqwDaJSEbuz_takaFZQRuB	NANGGULAN,RT52 RW19, JATUSARONO,	KULON PROGO	39231	\N	ISLAM	LAKI-LAKI	tinotegarwicaksana@gmail.com	085718260611	SMA	MIPA	DIKTUK	178	64	AB	0000095387601	SIM A	081328027574	SARONO	PURWANTI	PENSIUNAN PNS	PNS	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	43	58	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
145	0145	ENDRA ORVALA HUGA SAPUTRA	444	\N	https://drive.google.com/open?id=1rXafjip0noRcNaxatK3r1jhIgMsiKeoD	SELANG 4,RT 001/RW 004,SELANG WONOSARI GUNUNGKIDUL	GUNUNGKIDUL	38538	\N	ISLAM	LAKI-LAKI	endraorvala11@gmail.com	087812501476	SMK	TEKNIK KETENAGALISTRIKAN	DIKTUK	174	67	AB	0003756900701	SIM C	087839050202	MUJIONO	PUJI ASTUTI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	15	33	44	58	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
146	0146	MUHAMAD RIFKY RYZAL RAMADHANI	445	\N	https://drive.google.com/open?id=1O2wwMFmLVxLFmnYNZkNlrcyR8K0XHSBe	PERUM DAWUNG PERMAI, RT05 RW08, KEL BANJARNEGORO, KEC MERTOYUDAN, KAB MAGELANG	MAGELANG	38985	\N	ISLAM	LAKI-LAKI	rifkyryzal@gmail.com	089527139209	SMA	IPA	DIKTUK	173	66	O	0001107875485	SIM C	081229455139	MUHAMAD SOLICHIN	NUNIK HASTHARIYANTI	TNI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA MAGELANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	44	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
147	0147	DAMAR AJI PRIMANDARU	446	\N	https://drive.google.com/open?id=1jwq3LYldRmni71l8CCQMvmVCblCHB9Fu	JOGAHAN RT 28 RW 13 BUMIREJO,LENDAH,KULONPROGO,DAERAH ISTIMEWA YOGYAKARTA	KULONPROGO	38602	\N	ISLAM	LAKI-LAKI	damarajiprimandaru@gmail.com	088980364913	SMA	IPA	DIKTUK	171	57	O	0000210922648	SIM C	081804222312	SUPRIHANA	RR.SITI HARTINI	PENSIUNAN PNS	LAIN-LAIN	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
148	0148	SATYA HAPRABU PRANATA	447	\N	https://drive.google.com/open?id=11WgCjeEIfCwqJN-Y8AwAMZ48BeCSrnMW	JL. BRAWIJAYA III RT 006 RW 002 LANGENSARI UNGARAN BARAT KAB SEMARANG JAWA TENGAH 50518	KAB SEMARANG	39119	\N	ISLAM	LAKI-LAKI	satyafl125rcd@gmail.com	0895811165500	SMA	IPS	DIKTUK	169	61	B	0001299525726	SIM C	0895383147470	CIPTO PRANOTO	YAYUK MINARSIH	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	44	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
149	0149	DAVIN RADINKA MAULANA SETYANTO	448	\N	https://drive.google.com/open?id=13n2xD4QZQDDvrFlXWO66Ea4Gn6SFvocA	PERUM DURENAN INDAH BLOK O NO 10/12 RT 03 RW 06 KEL. MANGUNHARJO KEC.TEMBALANG KOTA SEMARANG	SEMARANG	38621	\N	ISLAM	LAKI-LAKI	davinrms@gmail.com	081239744411	SMA	IPA	DIKTUK	168	65	A	0001302260411	SIM C	08122815947	SUYAMTO	YAYUK SETYANINGSIH	POLRI	PNS	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	31	43	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
150	0150	DIKI KURNIAWAN	449	\N	https://drive.google.com/open?id=13DnniHODNMjE7UBHa-ACTPLWF_Q92Nhq	SORONANGGAN RT 01, PANJANGREJO, PUNDONG, BANTUL, YOGYAKARTA	BANTUL	37860	\N	ISLAM	LAKI-LAKI	dikik7726@gmail.com	0882003111203	SMA	ILMU PENGETAHUAN SOSIAL	DIKTUK	167	72	O	0000647773762	SIM C	089606954588	BASORI	SITI NAKIYAH	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	56	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
151	0151	RAISSA ANDHIKA WIDODO	450	\N	https://drive.google.com/open?id=19rc7a4T9qwzaqjdNMe4fXucAURATI83R	KRAMAT BESAR 365, RT 07 RW 04, KEL.KRAMAT, KEC.KOTA, KAB.KUDUS	KUDUS	38473	\N	ISLAM	LAKI-LAKI	andhikaiwidedi@gmail.com	085643330107	SMA	IPA	DIKTUK	166	63	B	0003340456828	SIM C	085716449999	TRI MARYONO EDI WIDODO	FAZAR MUZDALIFAH	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES KUDUS	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	57	PTU (BINTARA TUGAS UMUM)	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
152	0152	RIFKI FAJAR ASSHIDIQ	451	\N	https://drive.google.com/open?id=15GX5U1wDh3gxjHqaVE1MtZ9JCTDmFSjp	ASRAMA BRIMOB PATI RT 01 RW 01 DESA NGARUS, KEC.PATI, KAB.PATI.	PATI	38792	\N	ISLAM	LAKI-LAKI	sodiqunnn.86@gmail.com	085179514460	SMA	MIPA	DIKTUK	165	62	B	0001268278558	SIM C	081232186567	ABDUL MUNIP	YANUARUM SETYOWATI	POLRI	PNS	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	56	BINTARA BRIMOB	1	B3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
153	0153	SALMA ARDIANSYAH	452	\N	https://drive.google.com/open?id=1EI0PPWEqY8r9FjGRhqxq4aqNz3lO6d6q	SIDOMULYO RT48 RW14 SRAGEN WETAN, SRAGEN, JAWA TENGAH	SRAGEN	38517	\N	ISLAM	LAKI-LAKI	salmaardiansyah38@gmail.com	089670029494	SMA	SMA	DIKTUK	178	65	O	0000202981792	SIM C	081548487430	SRI MARGONO	SUMARSIH	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES SRAGEN	55	DIKTUKBA POLRI	2025	TIDAK	16	33	44	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
154	0154	AQSAL KAYLA NANDA	453	\N	https://drive.google.com/open?id=1ET8VTbJo7ts4duBqbF9EG_XauTxm7msD	KALIMENUR RT 05/RW 03, SUKORENO, SENTOLO, KULON PROGO, DIY	YOGYAKARTA	38426	\N	ISLAM	LAKI-LAKI	aqsalnanda@gmail.com	088226312114	SMA	IPA	DIKTUK	176	70	A	0003520501457	SIM C	087744420868	SUNARJA	RIDA KRISHIDAJATDJATI	PETANI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	45	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
155	0155	KHOIRUL ASHFA RIFA'I	454	\N	https://drive.google.com/open?id=1BlqbvtUrVFnSaGsJR4vOdXnESuxAP74o	DESA TERJAN RT02/RW01, KECAMATAN KRAGAN, KABUPATEN REMBANG	REMBANG	38264	\N	ISLAM	LAKI-LAKI	khashrif2004@gmail.com	081229226366	SMA	MIPA	DIKTUK	174	66	A	0000173593225	SIM C	081329237830	ABDUL HADI	SETYA NOVIARSIH	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES REMBANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	43	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
156	0156	DHAMAR ADHAM DWI PRASETYA	455	\N	https://drive.google.com/open?id=1y74hMJnBlsicU-MKByVtM9XN0f7l3Nuc	SUMBERJO RT 004 RW 008, NGALANG, GEDANGSARI, GUNUNGKIDUL, DAERAH ISTIMEWA YOGYAKARTA	GUNUNGKIDUL	38437	\N	ISLAM	LAKI-LAKI	dhamaradham5@gmail.com	0882007979813	SMK	TEKNIK PEMESINAN	DIKTUK	171	61	A	0000653746421	SIM C	088225303147	PARSANTO	SUMINTEN	PETANI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	55	BINTARA BRIMOB	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
157	0157	IDFI ARDI ARIYA KUSUMA, S.Kep., Ns.	456	\N	https://drive.google.com/open?id=1uoRYq3HpRCKNxy4cvNTfIJR55j1mQrdG	TARAMAN SIDOARJO SRAGEN	SRAGEN	36179	\N	ISLAM	LAKI-LAKI	fbiardi09@gmail.com	082135599812	S1	S1 KEPERAWATAN	DIKTUK	169	71	AB	0000077130696	SIM A	085725380791	SUKARDI	SUPARMI	PETANI	PNS	POLDA JAWA TENGAH	POLRESTA SURAKARTA	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	43	55	BAKOMSUS (BINTARA KOMPETENSI KHUSUS)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
158	0158	FIKRI RIZA ANDHIKA	457	\N	https://drive.google.com/open?id=1sVAoU07izDmYgD0dGn7eBPQENUHgOE2H	KLAGARAN SORONANDAN RT01 RW 36 SENDANGREJO MINGGIR SLEMAN	SLEMAN	38755	\N	ISLAM	LAKI-LAKI	fikririza79@gmail.com	085727117773	SMA	IPA	DIKTUK	169	57	BELUM MENGETAHUI	0000094143249	SIM C	081328823517	SUHARISMAN	SRI WAHYUNIGSIH	PNS	PNS	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	42	54	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
159	0159	ANUGRAH ANNAS SETIADI	458	\N	https://drive.google.com/open?id=11S88Hi8XfxCt9ouYwN4adNRaxz8l2gKY	KALAPACUNG RT 01 RW 03, BOBOTSARI, PURBALINGGA, JAWA TENGAH	PURBALINGGA	38595	\N	ISLAM	LAKI-LAKI	anugrahannaspend08@gmail.com	085227891037	SMA	IPA	DIKTUK	167	66	AB	0001108085264	SIM C	081339322316	NANANG SETIADI	ELIDA ERAWATI	TNI	PNS	POLDA JAWA TENGAH	POLRES PURBALINGGA	55	DIKTUKBA POLRI	2025	TIDAK	15	34	42	56	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
160	0160	BOY TIKO SEIKA YAHARI	459	\N	https://drive.google.com/open?id=1AksLyagqIJc7wY7gJ0n2tc-nO4ypudy1	JL. KUDUS NO. 126 RT 009 RW 009 KEL. BINTORO KEC. DEMAK, KAB. DEMAK	SEMARANG	39042	\N	ISLAM	LAKI-LAKI	boytiko2006@gmail.com	081338130507	SMA	IPA	DIKTUK	167	66	AB	0001097057261	SIM C	081326666467	EKO ARIS SUSANTO	SULISTIAWATI	POLRI	WIRASWASTA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	14.5	33	43	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
161	0161	ANDRA RIZQI PRADIPTA	460	\N	https://drive.google.com/open?id=1d09AsgjZMjkuZAondnKY_xqAWPJFuAyw	KALINONGKO RT013/RW007, KEDUNGSARI, PENGASIH, KULON PROGO	KULON PROGO	38525	\N	ISLAM	LAKI-LAKI	andrarisky940@gmail.com	081229946923	SMA	IPS	DIKTUK	165	55	A	0002766174906	SIM C	085228378830	AZIS RISDIANTO	ENI RAHAYU	SWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	14.5	29	41	54	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
162	0162	YUDI DWI PRASTYO	461	\N	https://drive.google.com/open?id=12KzG8o7pxYNovicG2_RVPUi3_5Hs1L2-	DUSUN PANGKALAN;RT 07 /RW 03; KEC.NGARINGAN	GROBOGAN	39148	\N	ISLAM	LAKI-LAKI	yudidwiprastyo07@gmail.com	089531338731	SMA	SMA	DIKTUK	177	68	A	0003645118304	SIM C	089525762595	PRATCOYO	GIYARTIK	PETANI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	33	44	56	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
163	0163	RACHEL MERDHITIYA PRADANA	462	\N	https://drive.google.com/open?id=1V1y0JuyVyoexSHzAaGvqrnVrz6geG1ri	RT 06 RW 05,DESA TULAKAN,KECAMATAN DONOROJO,KABUPATEN JEPARA,PROVINSI JAWA TENGAH	JEPARA	39280	\N	ISLAM	LAKI-LAKI	rachelpradana17@gmail.com	082329285187	SMA	IPA	DIKTUK	175	64	AB	0001872425338	TIDAK PUNYA SIM	082334678428	WARDONO	SITI KHOSIYAH	PETANI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES JEPARA	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
164	0164	ZIIDAN FAHIM ALVADY	463	\N	https://drive.google.com/open?id=1D_zXkuMAB0a-C6bIxiV2b4DVmpIHW3tF	ASRAMA BRIMOB RT/RW : 005/000, TAMANAN, BANGUNTAPAN, BANTUL, DAERAH ISTIMEWA YOGYAKARTA	JEMBER	38434	\N	ISLAM	LAKI-LAKI	zidanalvady538@gmail.com	085695127253	MA	IPA	DIKTUK	173	57	O	0001100636908	SIM C	08122682288	SALFANUS AHMAD ALIF	DYAH AMILATUL HABIBAH	POLRI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15.5	31	42	54	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
165	0165	MUHAMMAD IRSYAD FAHMI TUMANGGOR	464	\N	https://drive.google.com/open?id=13L1qQd6vomTTIVOSTeGKISabRqPulnvX	KOMPLEK AKPOL BLOK K 13 RT 005/006 KEL GAJAHMUNGKUR KEC GAJAHMUNGKUR KOTA SEMARANG	KAB. SEMARANG	38740	\N	ISLAM	LAKI-LAKI	makemepist@gmail.com	082245844098	SMA	MIPA	DIKTUK	170	62	AB	0001267237067	SIM C	081278429936	ALM. PRAPTO TUMANGGOR	KHRIS DIANA SUSANTI	TIDAK BEKERJA	PNS	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	31	43	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
166	0166	DIMAS ARDIANSAH	465	\N	https://drive.google.com/open?id=1U81rVhlcJgZXEDZUZT-T7hDwTenbl1-V	MRUNGGI RT 24 RW 13, SENDANGSARI, PENGASIH, KULON PROGO, YOGYAKARTA	KULON PROGO	38605	\N	ISLAM	LAKI-LAKI	jog.dimasardiansah@gmail.com	087741184808	SMA	IPA	DIKTUK	169	64	O	0000094319256	SIM C	081392090525	RATIMAN	SARMI	PENSIUNAN PNS	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES KULON PROGO	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	55	BINTARA BRIMOB	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
167	0167	WAHYU FEBRIATMOKO	466	\N	https://drive.google.com/open?id=1AUShacYqg32pR2N4x4wS8v5H2LhOdw3F	POMAHAN KRODAN, RT08 RW06, MAGUWOHARJO,DEPOK,SLEMAN,DIY	SLEMAN	38771	\N	ISLAM	LAKI-LAKI	wahyufebri1460@gmail.com	083849599759	SMA	IPA	DIKTUK	168	58	B	0000088089164	TIDAK PUNYA SIM	0895630394185	WAHYUDI	TITIK SANGATUN	PENSIUNAN PNS	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	41	54	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
168	0168	AHMAD ZULFIAN MUFTAH	467	\N	https://drive.google.com/open?id=1wOLRskGhLiu3dgRepBdQEzKUgxxmwQdz	DUKUH BIORO RT 007 RW 002 DESA MULYOHARJO KECAMATAN PATI KABUPATEN PATI	PATI	38636	\N	ISLAM	LAKI-LAKI	ahmadzulfian456@gmail.com	089524214433	SMA	IPA	DIKTUK	167	64	BELUM MENGETAHUI	0003581981177	SIM C	085290521184	AHMAD SAHLAN	SITI NAFISAH	PETANI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
169	0169	FALS MAULANA	468	\N	https://drive.google.com/open?id=1WdOTKNJE8KDAdSK9m9-gotVJoXGvM7UV	SADANG RT04 RW04 KECAMATAN JEKULO KABUPATEN KUDUS	KUDUS	38483	\N	ISLAM	LAKI-LAKI	palomaulana05@gmail.com	085701600165	SMA	IPS	DIKTUK	165	58	BELUM MENGETAHUI	0002431094591	TIDAK PUNYA SIM	085878401767	ALM HADISUPENO	HARTINI	TIDAK BEKERJA	LAIN-LAIN	POLDA JAWA TENGAH	POLRES KUDUS	55	DIKTUKBA POLRI	2025	TIDAK	15	30	42	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
170	0170	ALFARIZI ADAM FIRDAUS NARAYA	469	\N	https://drive.google.com/open?id=1344Nn16eyAXmMIOv_qfOymvn4IXBKYzu	TITANG, RT 001/RW 003, BUMIREJO, KECAMATAN KARANGAWEN, KABUPATEN DEMAK, JAWA TENGAH	DEMAK	39203	\N	ISLAM	LAKI-LAKI	alfarizi.adam9624@gmail.com	088983261823	SMK	TEKNIK OTOMASI INDUSTRI	DIKTUK	177	68	BELUM MENGETAHUI	0002008767813	SIM C	081546099320	SUGENG	AGNES TITIN YUNIAS	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	44	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
171	0171	MACHEL ABIROY	470	\N	https://drive.google.com/open?id=1BifyNlQdC5-jGpGNfniJOlqJxTzznAPX	DESA WIRADESA, RT 13 RW 03, KECAMATAN WIRADESA, KABUPATEN PEKALONGAN, JAWA TENGAH (51152)	JAKARTA	38571	\N	ISLAM	LAKI-LAKI	abiroymachel@gmail.com	081973712252	SMA	IPS	DIKTUK	174	68	AB	0003546099944	SIM C	085888860317	IMAM ZAENUDIN	NUR IZA	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES PEKALONGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
172	0172	MUHAMMAD HAIKAL HUDAYA	471	\N	https://drive.google.com/open?id=14WJ5K3VXFp5N3U9yoMvJM8BG9Jsmi3Ks	KERTO,RT09,PLERET, BANTUL	BANTUL	38489	\N	ISLAM	LAKI-LAKI	hhaikalhudaya@gmail.com	0882007165547	SMA	IPS	DIKTUK	172	68	B	0003580386232	SIM C	089525171900	ASROFI	AFIATUN	BURUH	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	34	43	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
173	0173	AJIMAS PUTRA PRATAMA	472	\N	https://drive.google.com/open?id=1g6-0jRjWDZni0AhrNgbTzPOYm7Z8R3j-	DK.WONOSARI RT 002 / RW 002, DS WONOSARI , KEC TRUCUK , KAB KLATEN , JAWA TENGAH	KLATEN	38158	\N	ISLAM	LAKI-LAKI	ajimasputra354@gmail.com	085875528825	SMA	IPS	DIKTUK	170	60	BELUM MENGETAHUI	0000557582872	SIM C	085700154117	JOKO SUDARMAJI	AGUNG HANDAYANINGRUM	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	54	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
174	0174	YOGA IRFAN SAPUTRA	473	\N	https://drive.google.com/open?id=1bgLI5uJFoq_OYmt1JqQ1Mt0JZWfDGHk6	JL.KAPTEN RUSDIAT RT 01/02 DANYANG, PURWODADI, GROBOGAN	GROBOGAN	38048	\N	ISLAM	LAKI-LAKI	yogairfan742@gmail.com	089630991722	SMA	IPA	DIKTUK	169	75	BELUM MENGETAHUI	0002757881013	SIM C	0895363687698	ALM. ABDUL HAMID	DWI MUGIYANTI	SUPIR	PETANI	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	34	44	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
175	0175	SATYA ADI WICAKSANA	474	\N	https://drive.google.com/open?id=1hvAKFdxYc1TAL-2sjSJhuGRClVm9K_6a	DUSUN WONOSARI RT004/RW021, GUNUNGPRING, MUNTILAN, MAGELANG, JAWA TENGAH	MAGELANG	38663	\N	ISLAM	LAKI-LAKI	satyawcks1@gmail.com	081229554214	SMA	IPA	DIKTUK	168	61	AB	0001837802158	SIM C	085292533135	WIDIYANTO	NURSIYAMI	WIRASWASTA	LAIN-LAIN	POLDA JAWA TENGAH	POLRESTA MAGELANG	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	42	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
176	0176	IRFAN FADHILA	475	\N	https://drive.google.com/open?id=1TSsxcAt4cH7gVHuS-BAjYVA_Ak-1t68u	BUGEL RT 02 RW 02 DESA MELES KECAMATAN ADIMULYO KABUPATEN KEBUMEN	KEBUMEN	38917	\N	ISLAM	LAKI-LAKI	irfanfadhila1976@gmail.com	0882006009133	SMK	TEKNIK KENDARAAN RINGAN DAN OTOMOTIF	DIKTUK	167	62	B	0001643267531	SIM C	081391682686	MOKHAMAD FATUKHAN	ROFINGAH	SWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KEBUMEN	55	DIKTUKBA POLRI	2025	TIDAK	15	31	41	56	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
177	0177	RADIKA KUSUMA ADI	476	\N	https://drive.google.com/open?id=1Gg1FEisW6dIg2AGuObal0P97dCAN1VH6	JL.URIP SUMOHARJO NO.31 RT02 RW 03 KEL SUSUKAN KEC UNGARAN TIMUR	KAB SEMARANG	38809	\N	ISLAM	LAKI-LAKI	radikakusumaadi006@gmail.com	085723699795	SMA	SMA	DIKTUK	166	50	BELUM MENGETAHUI	0001438777089	TIDAK PUNYA SIM	083838641000	ADY KURNIANTO	IRMA WULAN KUSUMA	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	41	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
178	0178	IZZA MAULANA RIFQI FAUZI	477	\N	https://drive.google.com/open?id=16MBaO7tOixY8oeZvBawyeLPp8OBavql-	SEWON RT. 02 TIMBULHARJO SEWON BANTUL	BANTUL	38649	\N	ISLAM	LAKI-LAKI	izzamaulanarifqifauzi24@gmail.com	085339212436	SMA	IPA	DIKTUK	166	62	O	0001100639327	SIM C	085100407185	IBNU WAKHID, S.H.	PUJI SETIYANI, AMK.	POLRI	SWASTA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	55	PTU (BINTARA TUGAS UMUM)	1	C1	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
179	0179	MUHAMMAD FAHDI RAMADHAN	478	\N	https://drive.google.com/open?id=15x0OF-keikcFPlYrsQ7aJJ8kfgBC4THy	PERUM KCVRI KAYULAWANG RT03 RW02 NO.39 KELURAHAN MUDAL, KECAMATAN PURWOREJO, KABUPATEN PURWOREJO.	PURWOREJO	38275	\N	ISLAM	LAKI-LAKI	fahdiramadhan12@gmail.com	085179794797	SMA	IPA	DIKTUK	180	70	O	0001272414598	SIM C	081275901951	RUDI HARIYO SANTOSO	ELIK WINDARTI	POLRI	WIRASWASTA	POLDA JAWA TENGAH	POLRES PURWOREJO	55	DIKTUKBA POLRI	2025	TIDAK	15.5	34	45	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
180	0180	SULTAN BIMA HUSNUL HAKIM	479	\N	https://drive.google.com/open?id=1pte3hiZB7563Cgibu7hwXeSBVyHtycgZ	PRAMPELAN KEC.SAYUNG KAB.DEMAK	DEMAK	39055	\N	ISLAM	LAKI-LAKI	sultanbima.23@gmail.com	083838283009	MA	IPA	DIKTUK	175	75	O	0003275229532	SIM C	085326483677	MASHUDI	MUTAHAROH	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15.5	35	44	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
181	0181	ANUN DWI YULIANTO, S.Tr.Ak.	480	\N	https://drive.google.com/open?id=1N7igkHv2yOPmQNqVJyc69ISNK5v48t1E	KWARASAN RT 04/RW 05, NOGOTIRTO, GAMPING, SLEMAN	SLEMAN	37467	\N	ISLAM	LAKI-LAKI	anun.yulianto30@gmail.com	082134620590	D4	AKUNTANSI	DIKTUK	173	72	B	0002749714233	SIM C	081904117492	JOKO SISWANTO	PARTILAH	BURUH	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15.5	35	44	57	BAKOMSUS (BINTARA KOMPETENSI KHUSUS)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
182	0182	ALVIN ROUUF SAPUTRO	481	\N	https://drive.google.com/open?id=128wRtk6kbMyYCdSn6xRttHlr3SFs1qJ8	GAMBIRSARI RT 04 RW 04 JOGLO BANJARSARI SURAKARTA JAWA TENGAH	PRAYA	38339	\N	ISLAM	LAKI-LAKI	alvinrouuf1@gmail.com	089649999832	SMA	IPA	DIKTUK	171	66	O	0001287435633	SIM C	08562844845	HERI RETNO SAPUTRO	ALVIN ROUUF SAPUTRO	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA SURAKARTA	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
183	0183	DAVID RAHMAT ENDRAWAN	482	\N	https://drive.google.com/open?id=1WICDZjHEcefpkPHpXgRvGsovibHIpivb	NOGOSARI RT 004 TRIRENGGO BANTUL BANTUL DAERAH ISTIMEWA YOGYAKARTA	BANTUL	38665	\N	ISLAM	LAKI-LAKI	davidrendrawann@gmail.com	081933993639	SMA	IPA	DIKTUK	172	63	B	0001101007394	SIM C	081325155381	ENDRO SARIYANTO	WAHYU WINDARYANTI	POLRI	SWASTA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
184	0184	DIMAS AKBAR SETYAWAN	483	\N	https://drive.google.com/open?id=1NZ-2vFp5STV-3Di3w8WlMy_tfOTQrlDX	CANDI RT 012, PLOSOREJO, GONDANG, SRAGEN	SRAGEN	39073	\N	ISLAM	LAKI-LAKI	akundim221206@gmail.com	088806480461	SMA	SMA	DIKTUK	170	63	O	0000076424501	SIM C	082322526288	SUNGARBI	NINIK RIYANTI	SWASTA	PNS	POLDA JAWA TENGAH	POLRES SRAGEN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	54	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
185	0185	YUDYANANDA RAFLI FIRDAUS	484	\N	https://drive.google.com/open?id=1RVp7vbvtr2dozqB47IOqWQyO-qZ4UBwi	SARIREJO 1, RT 02/ RW 01, SINGOSAREN, BANGUNTAPAN, BANTUL	YOGYAKARTA	38579	\N	ISLAM	LAKI-LAKI	yudyananda123@gmail.com	08812737677	SMA	IPA	DIKTUK	169	58	A	0001202570662	SIM C	085947604747	AM.YULIAWANTO	DYAH ARISANTI	TIDAK BEKERJA	SWASTA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	43	56	BINTARA BRIMOB	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
186	0186	EMMANUEL PETRA EVAN PRIANDIKA	485	\N	https://drive.google.com/open?id=1vB23CX6h9g0q2bH6msx8ESt4TFH-n8El	ASRAMA KEBONPOLO K.68,RT006/RW004,KEL.BANDARJO,KEC.UNGARAN BARAT	SEMARANG	38862	\N	KRISTEN	LAKI-LAKI	eevanpriandika@gmail.com	085712503588	SMA	IPA	DIKTUK	168	68	B	0001108351348	SIM C	085876328180	ALM.SUPRIADI	MURTI ANDRIYANI	LAIN-LAIN	LAIN-LAIN	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	57	BINTARA POLAIR	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
187	0187	WILDAN RIFKY FADHLUR RAHMAN	486	\N	https://drive.google.com/open?id=1mJN0E5TkqDMccMHZokP5v9e82EXKYtTd	GUYANGAN,RT 02/RW 02,PURWODESO,SRUWENG,KEBUMEN,JAWA TENGAH	KEBUMEN	39075	\N	ISLAM	LAKI-LAKI	wildanrahman101@gmail.com	083141102594	SMA	SMA KURIKULUM MERDEKA	DIKTUK	167	67	A	0000170768878	SIM C	08121590838	SIGIT BAHARIAWAN	ROCHMATUN NUFUS	PNS	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KEBUMEN	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	56	BINTARA POLAIR	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
188	0188	ACHMAD NASIR	487	\N	https://drive.google.com/open?id=1O7CggZR0Nh57X7DHym7zgj1p6PT5bjRH	RT 01/01  KURIPAN.KARANGGAWEN DEMAK .JAWA TENGAH	DEMAK	38519	\N	ISLAM	LAKI-LAKI	achmadnasir397@gmail.com	087829954512	SMA	IPA	DIKTUK	177	75	B	0002120017206	TIDAK PUNYA SIM	0895385016536	JAMBARI	ASIYAH(ALM)	SWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15	32	45	59	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
189	0189	BRILIAN HARI IMANULLAH	488	\N	https://drive.google.com/open?id=1iii4B1RwT5Iqab9al4tr_xVyRqbWOB2M	ASRAMA BRIMOB KALIBANGER RT 01 RW 13 KEL. SETONO KEC PEKALONGAN TIMUR	KENDAL	39132	\N	ISLAM	LAKI-LAKI	bili.imanullah@gmail.com	081328553055	SMA	SMA	DIKTUK	175	66	B	0001269044302	SIM C	0881391801949	HARIYANTO	LILIK NGARPIYAH	POLRI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES PEKALONGAN KOTA	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	58	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
190	0190	HAFIZ AQILA ALTHAF	489	\N	https://drive.google.com/open?id=1XqnDoKxQdLW2IEyHT4sVBRFD6c1O9Um8	ASRAMA BRIMOB SRONDOL WETAN	KABUPATEN SEMARANG	38544	\N	ISLAM	LAKI-LAKI	hafizaqila06@gmail.com	082135856390	SMA	IPA	DIKTUK	174	70	A	0001314987939	SIM C	081325687786	PURYANTO	DIAN WAHYUNINGSIH	POLRI	LAIN-LAIN	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	34	42	57	BINTARA BRIMOB	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
191	0191	VIGO DWI PRILY ANDREAN	490	\N	https://drive.google.com/open?id=1abkjuZv4ZYbEMy1aO3gWrM_CFWssRxGU	SAMBIREJO RT 001/RW 003 SEMANU, SEMANU, GUNUNGKIDUL,YOGYAKARTA	GUNUNGKIDUL	38364	\N	KRISTEN	LAKI-LAKI	vigodwiprilyandrean@gmail.com	083150766471	SMK	TBSM	DIKTUK	171	70	B	0002906469347	SIM C	081804243031	ANDREAS TRI WAHYADI	SUPRIHATIN MURYARININGSIH	LAIN-LAIN	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	58	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
192	0192	MUHAMMAD FURQON HABIBULLOH	491	\N	https://drive.google.com/open?id=1QAcHHH29wvB3Y3uDwM9L2cQNheoVf_iS	DESA KEDUNGASEM RT 03 RW 06 KECAMATAN SUMBER KABUPATEN REMBANG	REMBANG	38790	\N	ISLAM	LAKI-LAKI	furqonhabib73@gmail.com	082131313532	SMA	IPS	DIKTUK	171	65	O	0003569355731	SIM C	082323823953	SARWIANTO	SITI MURTI WAISSAH	PETANI	PETANI	POLDA JAWA TENGAH	POLRES REMBANG	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	56	BINTARA BRIMOB	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
193	0193	BIMA SAKTI	492	\N	https://drive.google.com/open?id=16xKfQQxnVidLWDXiOQCIBid3elZVEmkI	SURIREJO RT001 RW021,SUKOHARJO,NGAGLIK,SLEMAN	SLEMAN	38705	\N	ISLAM	LAKI-LAKI	19bimasakti12@gmail.com	085866442014	SMA	IPS	DIKTUK	171	59	O	0001100687139	SIM C	085865343969	SUBARNO	YANIS TANTI	POLRI	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	43	56	BINTARA BRIMOB	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
194	0194	AMUSA KHOIRUL RIDHOI	493	\N	https://drive.google.com/open?id=1oxXyMJ6IqGTPoPHM1oBkPd7jnMn3iK2J	DUSUN JIPANG RT/RW 002/002 DESA JIPANG KEC.PENAWANGAN KAB.GROBOGAN	GROBOGAN	39143	\N	ISLAM	LAKI-LAKI	khoirulamusa@gmail.com	085867803029	SMA	IPS	DIKTUK	167	55	BELUM MENGETAHUI	0001427629162	SIM C	082199690445	SUNARTO	MASRINI	PETANI	LAIN-LAIN	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	41	58	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
195	0195	DAFFA NORMA DHARMAWAN	494	\N	https://drive.google.com/open?id=1Ezv9WzKBxDKS5CuCnrmZZy5ipaivp5VX	PAGEDANGAN RT 011 RW 005, BOJONGSARI, PURBALINGGA	PURBALINGGA	38888	\N	ISLAM	LAKI-LAKI	daffandnorma20@gmail.com	081386128367	SMA	IPA	DIKTUK	176	66	B	0001160986465	SIM C	085385158123	AGUS SUPRAPTO	META NORMALITA	WIRASWASTA	SWASTA	POLDA JAWA TENGAH	POLRES PURBALINGGA	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
196	0196	PANDU HARIS PRADIPTA	495	\N	https://drive.google.com/open?id=1nUK2Dgiy18qAgC2xx4fENbMtafLFqw_y	JL KENANGA RT 04 / RW 02 KARANGPAKIS KEC.NUSAWUNGU KAB. CILACAP	CILACAP	39230	\N	ISLAM	LAKI-LAKI	panduharispradipta94@gmail.com	085799483196	SMA	KURIKULUM MERDEKA	DIKTUK	172	60	BELUM MENGETAHUI	0002445476152	SIM C	082141620881	HARYANTO	ARIS DAMAYANTI	PETANI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA CILACAP	55	DIKTUKBA POLRI	2025	TIDAK	15	32	44	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
197	0197	BIMA SATRIA NUGROHO	496	\N	https://drive.google.com/open?id=1_IBq-W9q_JSz7sTKTquhSnG8-p1fEjpI	JL. TAMAN WATULAWANG V, RT 09 - RW 08, KEL. GAJAHMUNGKUR, KEC. GAJAHMUNGKUR, KOTA SEMARANG	SEMARANG	38456	\N	ISLAM	LAKI-LAKI	nugrohobima601@gmail.com	0895636970212	SMA	IPS	DIKTUK	172	70	AB	0002921116105	SIM C	081542411116	MUNDI NUGROHO	ASIYAH	LAIN-LAIN	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	15.5	34	44	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
198	0198	SATRIO WAHYU AJI	497	\N	https://drive.google.com/open?id=1OM7QP6qzWEN_Gw8Wqa9DTncfaLW93ZiA	CEPER 003/049 WEDOMARTANI NGEMPLAK SLEMAN YOGYAKARTA	SLEMAN	38596	\N	ISLAM	LAKI-LAKI	satrioajiwahyu01@gmail.com	085934901226	MA	IPS	DIKTUK	171	62	BELUM MENGETAHUI	0002420155484	SIM C	089655073397	JUMAKIR	WARTINI	BURUH	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	43	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
199	0199	AHMAD MILDANIL AKHYAR	498	\N	https://drive.google.com/open?id=1N5n0oytmU45YctTZOcXWHlOCHXd7QUwe	DUSUN PULO RT.01/RW.04 DESA PUTAT KECAMATAN PURWODADI KABUPATEN GROBOGAN	GROBOGAN	38861	\N	ISLAM	LAKI-LAKI	ahmadmildanila@gmail.com	085659447540	MA	IPS	DIKTUK	171	70	BELUM MENGETAHUI	0003607422557	TIDAK PUNYA SIM	085742177154	MUSTAGHFIRIN	NAILI RIF`ANA	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	33	43	58	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
200	0200	RONALD ACHMAD EFFENDY	499	\N	https://drive.google.com/open?id=1nfFQcKJ5NGEWOO02vp-e4mHnIYckMuxV	KP.BENDAN RT09 / RW 04, KEL.PATI KIDUL, KEC PATI	PATI	38474	\N	ISLAM	LAKI-LAKI	pendipati168@gmail.com	088806659461	SMA	IPS	DIKTUK	169	65	O	0003587931066	SIM C	082327258090	RUMAIN	SRI RUKMINI	SWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
201	0201	RIDHO BAGUS UTOMO	500	\N	https://drive.google.com/open?id=1P_8GTidbC_aYxkKFaraYau8pNgQ4hm6T	ASRAMA KODIM 0723 KLATEN RT 003 RW 014 KARANGLO, KLATEN SELATAN, KLATEN	BANDUNG	38687	\N	ISLAM	LAKI-LAKI	ridhobaguss0105@gmail.com	082135446652	SMA	IPA	DIKTUK	167	63	BELUM MENGETAHUI	0001108210746	SIM C	081225011310	AGUS PONIMAN	SUYASMINI	TNI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	42	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
202	0202	RIDHO KAMAL ATMAJA	501	\N	https://drive.google.com/open?id=1GBbdiFdL90KwYQl1TURKP4T6BMitrfoa	MANDING SERUT RT.02 DK.KADIBESO SABDODADI BANTUL BANTUL DIY	BANTUL	38572	\N	ISLAM	LAKI-LAKI	kamalridho77@gmail.com	081391678355	SMA	IPA	DIKTUK	167	60	B	0001098121375	SIM C	082134783991	SUWANTO	NUGRAHANNY SYARIFAH	POLRI	SWASTA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	57	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
203	0203	HENRY PRAYUDHA PUTRA	502	\N	https://drive.google.com/open?id=1qNzJF-VBm88NePU2lYNmBpxu9-zCjop7	KEL MLATINOROWITO, RT 001, RW 004, MLATINOROWITO, KECAMATAN KOTA KUDUS, KABUPATEN KUDUS	KUDUS	38082	\N	ISLAM	LAKI-LAKI	henryputra03211@gmail.com	085799561178	SMA	IPS	DIKTUK	166	65	O	0001804924394	SIM C	082137115534	PRASETYO UTOMO	YUNI BUDIHARTI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES KUDUS	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	58	PTU (BINTARA TUGAS UMUM)	1	C2	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
204	0204	NANDO KUSUMA WARIH	503	\N	https://drive.google.com/open?id=1EhXKQMPnqRzylxw24RkVP073SxZGNoW2	TRIMULYO 1, RT 02 RW 01, KEPEK, WONOSARI, GUNUNGKIDUL, D.I.Y	GUNUNGKIDUL	39221	\N	ISLAM	LAKI-LAKI	kuswanando@gmail.com	081249654224	SMA	SMA	DIKTUK	181	45	B	0001314301634	SIM C	081392697441	SUMARNA	SRI NURHAYATI	POLRI	WIRASWASTA	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	15.5	35	45	57	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
205	0205	ILHAM ALDI PRATAMA , S.Kep.,Ns	504	\N	https://drive.google.com/open?id=1OnlnmzG0oKt_ZQ3FxLrzLxezWaGZpTsk	SEBAYU RT 01/ RW 39 TRIHARJO SLEMAN SLEMAN DIY	SLEMAN	36569	\N	ISLAM	LAKI-LAKI	ilhamaldhie@gmail.com	088216195011	S1	S1 KEPERAWATAN/NERS	DIKTUK	178	78	O	0000084180284	SIM C	0882005242331	BAMBANG BUDI SANTOSO	RAHMI WULANDARI	PNS	PNS	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	16	34	44	56	TENAGA KESEHATAN	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
206	0206	RIZKI KURNIAWAN	505	\N	https://drive.google.com/open?id=1IQ_g2aNDTQiJIajSmMW2muV2fuXgQixa	JL. BY PASS GG. DELIMA NO 05, RT 005/RW 015 KEL. BALUN, KEC. CEPU, KAB. BLORA JAWA TENGAH	BLORA	38376	\N	ISLAM	LAKI-LAKI	rizkimuza.244@gmail.com	082325099425	SMA	IPS	DIKTUK	174	80	O	0001873306721	SIM C	082139504828	ALM SUKISNO	SRIYATUN	LAIN-LAIN	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES BLORA	55	DIKTUKBA POLRI	2025	TIDAK	16	34	43	57	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
207	0207	MUHAMMAD FAIZ AL DZIKRI	506	\N	https://drive.google.com/open?id=1vA44pBGiE6tO8jcS88mZeyt4ECop_TAB	BEKELAN RT 003,RW 000,TIRTONIRMOLO,KASIHAN,BANTUL,DIY	BANTUL	39380	\N	ISLAM	LAKI-LAKI	mfaizaldzikri25@gmail.com	087835332064	SMA	SMA	DIKTUK	171	62	O	0002237872667	SIM C	087839302974	ISWANDI	NOVALIZA	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	31	44	55	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
208	0208	JOGUES DOVI SANTOSO	507	\N	https://drive.google.com/open?id=1lJCtGvSImXofpkZvxQKcN3-i6tb-6jaG	DONOSUTAN RT15 MOJOPURO, SUMBERLAWANG, SRAGEN	SRAGEN	38504	\N	KATHOLIK	LAKI-LAKI	doviofans101@gmail.com	0882003189640	SMA	IPA	DIKTUK	169	54	O	0003133795691	SIM C	081226145444	ALM.BUDI SANTOSO	LILIS DWI RAHAYU	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES SRAGEN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	42	55	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
209	0209	HANDI DWI YULIYANTO	508	\N	https://drive.google.com/open?id=1Mvx4UB6h6t9T6wVX-urptBy34ZgHQIYA	GELARAN RT13RW04, KARANG JOHO, KARANG DOWO, KLATEN	JAKARTA	38538	\N	ISLAM	LAKI-LAKI	handidwi210@gmail.com	085601842261	SMK	TEKNIK KOMPUTER DAN JARINGAN	DIKTUK	168	71	BELUM MENGETAHUI	0001854934367	SIM C	082220736288	PUJIYONO	SUYATI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES KLATEN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
210	0210	VITO NUR ALAMSYAH	509	\N	https://drive.google.com/open?id=1yNX5rTcOaGW7nhNarNBVZPiMmqt4SIKU	DESA DOROPAYUNG RT 06/ RW 02, KECAMATAN JUWANA, KABUPATEN PATI, PROVINSI JAWA TENGAH	PATI	39220	\N	ISLAM	LAKI-LAKI	vitoalamsyah2@gmail.com	082228057962	SMA	SMA	DIKTUK	167	53	BELUM MENGETAHUI	0002241010146	SIM C	089676387109	ALM WAHYUDI	RENI ANDAYANI	TIDAK BEKERJA	WIRASWASTA	POLDA JAWA TENGAH	POLRESTA PATI	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	43	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
211	0211	MUHAMMAD ILHAM AKBAR	510	\N	https://drive.google.com/open?id=17k_IL1QO8OhacLoKTAQ_j4FhDGnG4yZL	DESA TRIMULYO, RT 01/RT 01, KECAMATAN GUNTUR, KABUPATEN DEMAK, JAWA TENGAH(59565)	DEMAK	38597	\N	ISLAM	LAKI-LAKI	muhammadilhamakbar1945@gmail.com	085339181984	MA	IPS	DIKTUK	167	67	BELUM MENGETAHUI	0000598067111	SIM C	08122564926	DJAJADI SPDI	NUR AZIZAH SPD	PEGAWAI PEMERINTAH PUSAT ATAU DAERAH NON PNS	SWASTA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	15.5	32	43	57	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
212	0212	AHMAD FALIQ GIBRAN AL RAMADHAN SYARIFUDIN	511	\N	https://drive.google.com/open?id=1m2f6iUy10-3Fq3TOpmm_I7ZuHaUX15Ux	DSN TIMONGO, RT 02, RW 06, DS MONGGOT, KEC GEYER, KAB GROBOGAN, PROV JAWA TENGAH	GROBOGAN	38650	\N	ISLAM	LAKI-LAKI	ahmadfaliq251005@gmail.com	088216589124	SMK	TEKNIK KENDARAAN RINGAN OTOMOTIF	DIKTUK	167	62	BELUM MENGETAHUI	0001323636862	SIM C	081391944967	IRHAM SYARIFUDIN	TANTI TRIANAWATI	PEGAWAI PEMERINTAH PUSAT ATAU DAERAH NON PNS	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	15	32	42	55	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
213	0213	ALAN HAFIDH ZULFIAN	512	\N	https://drive.google.com/open?id=1y57sFqk66hCDRQCh5R9BDEO4DzQWuIYK	SONOMARTO,JATIREJO,RT1/1,SAWIT,BOYOLALI,JAWA TENGAH	BOYOLALI	39139	\N	ISLAM	LAKI-LAKI	hfdhzul@gmail.com	088976575605	SMA	SMA	DIKTUK	184	89	O	0002057158451	SIM C	085749725420	WAHYONO	KURNIA NUR CAHYANI	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES BOYOLALI	55	DIKTUKBA POLRI	2025	TIDAK	16	35	45	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
214	0214	ARGA PRABASWARA	513	\N	https://drive.google.com/open?id=1XHQyHwoeNKdEbbR6ql9KtfIPfUb0MF_8	SETRAN, MUDAL RT2RW1, PURWOREJO, JAWA TENGAH	PURWOREJO	39204	\N	ISLAM	LAKI-LAKI	prabaswararg@gmail.com	081539247705	SMA	SMA	DIKTUK	174	62	BELUM MENGETAHUI	0001900533205	SIM C	085321227722	ALM. ARI WIBOWO BUDI UNTORO	RAENY ALTIAN	TIDAK BEKERJA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES PURWOREJO	55	DIKTUKBA POLRI	2025	TIDAK	15	30	45	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
215	0215	YEDICA DHIMAS CHRISTIAWAN	514	\N	https://drive.google.com/open?id=1heT0KPv-ScntjzTT7xpP1WTX43Ldbv6m	BEGALON RT04 RW 04 PANULARAN,LAWEYAN,SURAKARTA,JAWA TENGAH	SURAKARTA	38454	\N	KRISTEN	LAKI-LAKI	yedicadhimas@gmail.com	085890749099	SMA	IPS	DIKTUK	172	65	AB	0001160903485	TIDAK PUNYA SIM	089654438203	KRISTIYAWAN DWI HARDIYANTO	CHRIS MIRATUN	LAIN-LAIN	SWASTA	POLDA JAWA TENGAH	POLRESTA SURAKARTA	55	DIKTUKBA POLRI	2025	TIDAK	15	33	42	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
216	0216	MUHAMMAD IKHSAN SAPUTRA	515	\N	https://drive.google.com/open?id=1oRu_qy3_pPZlKOGANJYpWLCPH4YChH4d	JL. PALEBON RAYA NO 28-A RT 3 RW 3 KECAMATAN PEDURUNGAN KELURAHAN PALEBON KOTA SEMARANG	SEMARANG	38726	\N	ISLAM	LAKI-LAKI	mikhsansaputraaa726@gmail.com	087773130378	SMK	TEKNIK OTOMOTIF	DIKTUK	171	59	B	0001185473182	SIM C	081391718619	HARIYADI	ALM. NUR MUSAFAAH	SWASTA	LAIN-LAIN	POLDA JAWA TENGAH	POLRESTABES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	43	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
217	0217	ERLANGGA YANAVISA, A.Md. Kep.	516	\N	https://drive.google.com/open?id=1WztAPndohVNNCV_8n4itzLbleRDqstNq	PLEMPENG RT32 RW15 MOJOREJO KECAMATAN KARANGMALANG	SRAGEN	37693	\N	ISLAM	LAKI-LAKI	afesgaming123@gmail.com	081392716183	D3	D3 KEPERAWATAN	DIKTUK	169	61	AB	0001798454722	SIM C	081225828589	JATMIKO	ENDANG HARYANI	PNS	PENSIUNAN PNS	POLDA JAWA TENGAH	POLRES SRAGEN	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	42	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
218	0218	IMANUEL YEFTA GIRIWARA	517	\N	https://drive.google.com/open?id=1Ztg6Z6sqCwpIBRqhdU4-KlmxBaEzYErz	BALI RT09/RW06 GIRISEKAR PANGGANG GUNUNGKIDUL D.I.YOGYAKARTA	GUNUNGKIUDL	38675	\N	KRISTEN	LAKI-LAKI	yeftaimanuel123@gmail.com	082327145817	SMA	IPA	DIKTUK	168	54	B	0001695362837	SIM C	085228423989	YUNANTA	IKA INDARWATI	WIRASWASTA	PNS	POLDA DIY	POLRES GUNUNG KIDUL	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	41	54	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
219	0219	MUHAMMAD HAMID BAIHAQI	518	\N	https://drive.google.com/open?id=1aDoGFWe1aAihXMfj8SQmI0SNZ60awwGt	BRUMBUNG RT05/RW02 KEC.MRANGGEN KAB.DEMAK	DEMAK	39050	\N	ISLAM	LAKI-LAKI	haqi9217@gmail.com	08895582736	SMA	KURIKULUM MERDEKA	DIKTUK	166	54	O	0002222986972	TIDAK PUNYA SIM	085292735188	IDRIS EFENDI	RUBAEAH	WIRASWASTA	WIRASWASTA	POLDA JAWA TENGAH	POLRES DEMAK	55	DIKTUKBA POLRI	2025	TIDAK	14.5	30	41	54	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
220	0220	MAHENDRA FADEL PRATAMA	519	\N	https://drive.google.com/open?id=1L8t3uSLtnIjlMTd_iMUC4WCf3KIXY0_m	DS BOLOH 1 RT 04 RW 04 KECAMATAN TOROH KABUPATEN GROBOGAN	BANYUMAS	38798	\N	ISLAM	LAKI-LAKI	mahendrapratama1312@gmail.com	083108511633	SMA	SMA	DIKTUK	180	75	B	0001089168118	SIM C	085325313066	WAWAN SUBALI	CUCUM IKROMAH BATAVIAH	PNS	PNS	POLDA JAWA TENGAH	POLRES GROBOGAN	55	DIKTUKBA POLRI	2025	TIDAK	16	33	44	57	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
221	0221	RAYHAN WINAR SYAHPUTRA	520	\N	https://drive.google.com/open?id=1xzbkOj3NpIvO9mcpyFM-YZibli85IhlZ	PETAMBAKAN RT02RW02, MADUKARA,BANJARNEGARA	BANJARNEGARA	38855	\N	ISLAM	LAKI-LAKI	rayhansyahputra1805@gmail.com	081390442745	MA	IPA	DIKTUK	174	67	O	0001098119586	SIM C	081327360034	TEGUH ADI WINARKO	YUYUK NOVRI SANTI	POLRI	POLRI	POLDA JAWA TENGAH	POLRES BANJARNEGARA	55	DIKTUKBA POLRI	2025	TIDAK	15	32	43	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
222	0222	RADEN ZAKI ADIS BOWOLAKSONO	521	\N	https://drive.google.com/open?id=1mIGZRSzz5Y5UvVvjOoOnCy6gsNt8yTcs	SINGOSAREN RT03, WUKIRSARI, IMOGIRI, BANTUL D I YOGYAKARTA	BANTUL	38695	\N	ISLAM	LAKI-LAKI	bowlaksono30@gmail.com	085780037823	SMA	IPA	DIKTUK	172	78	BELUM MENGETAHUI	0002490734597	SIM C	082322255051	FADDLY PURMASAKTI	HERMIKA DIAN LISTIANI	BURUH	LAIN-LAIN	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15	34	43	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
223	0223	DHEWO TATA KURNIAWAN	522	\N	https://drive.google.com/open?id=15qns3fSC4jGbuKcBREKBToq0NE_ozIRB	DSN.SERUT RT/RW.002/001, KELURAHAN.PAPRINGAN, KECAMATAN.KALIWUNGU	KABUPATEN MUKOMUKO	39151	\N	ISLAM	LAKI-LAKI	dhewo2007ok@gmail.com	082317421274	SMK	TEKNIK KENDARAAN RINGAN (TKR)	DIKTUK	169	60	BELUM MENGETAHUI	0002953430188	SIM C	082177011729	BUDIMAN	SUWARNI	PETANI	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES SEMARANG	55	DIKTUKBA POLRI	2025	TIDAK	14.5	32	41	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
224	0224	FAIQ ZIDNA ARJUNAJA	523	\N	https://drive.google.com/open?id=1ogtLVxUbKDqCdAQrwoO2hj5AY5TI-B0s	DUSUN NDASRI RT 01 RW 02 KECAMATAN RINGINARUM KABUPATEN KENDAL PROVINSI JAWA TENGAH	KENDAL	38797	\N	ISLAM	LAKI-LAKI	faiqzidna5@gmail.com	087883127942	SMK	REKAYASA PERANGKAT LUNAK	DIKTUK	169	62	A	0002076887698	TIDAK PUNYA SIM	085237372962	KAERODIN	SITI NUR KHAMIDAH	WIRASWASTA	PNS	POLDA JAWA TENGAH	POLRES KENDAL	55	DIKTUKBA POLRI	2025	TIDAK	15	31	43	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
225	0225	RIEKO ARDHI APRILIANSYAH	524	\N	https://drive.google.com/open?id=1YyFVKLorO0Odf-Gdf3Pf1yammh3taNNS	GANDOKAN RT 03 RW 06 KEL.KRANGGAN KEC.KRANGGAN KAB.TEMANGGUNG	TEMANGGUNG	38832	\N	ISLAM	LAKI-LAKI	ardirico57@gmail.com	082231203658	SMA	SMA	DIKTUK	167	57	A	0002759001772	SIM C	085325838778	PARIYANTO	EKO JUNI LESTARI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRES TEMANGGUNG	55	DIKTUKBA POLRI	2025	TIDAK	14.5	29	41	53	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
226	0226	YOGA ADITAMA	525	\N	https://drive.google.com/open?id=1J7e6CHjFptbev4jrbhMjLLvc7r8OJyEq	TEGALLAYANG 9 RT03 CATURHARJO PANDAK BANTUL	BANTUL	37898	\N	ISLAM	LAKI-LAKI	adiyogatama134@gmail.com	085799473929	SMA	IPA	DIKTUK	167	67	O	0000647734566	TIDAK PUNYA SIM	085163545556	SATUKI	MURYANTI	BURUH	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES BANTUL	55	DIKTUKBA POLRI	2025	TIDAK	15.5	34	42	56	BINTARA BRIMOB	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
227	0227	TAUFIQ HIDAYAT	526	\N	https://drive.google.com/open?id=1Ho2kWUG2RAd0zOUuK5G27VgHfvA3Jq1C	PATRAN RT001/RW014 SINDUADI MLATI SLEMAN	SLEMAN	38306	\N	ISLAM	LAKI-LAKI	tfhidayat1510@gmail.com	081227812826	SMA	IPA	DIKTUK	167	58	B	0002280206632	SIM C	081390396173	SUTARDI	SUPRAPTI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA DIY	POLRES SLEMAN	55	DIKTUKBA POLRI	2025	TIDAK	15	31	42	56	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
228	0228	WILLY KUSUMA	527	\N	https://drive.google.com/open?id=1PnYEhEMSe_TOw9qCMN1HzBr9paoKKlNm	JL.GERILYA RT.04 RW.10 DESA KARANGTENGAH KECAMATAN SAMPANG KABUPATEN CILACAP	CILACAP	39011	\N	ISLAM	LAKI-LAKI	willykusuma120@gmail.com	085786149927	SMA	SMA	DIKTUK	165	50	A	0002754723159	TIDAK PUNYA SIM	085878811556	SUWARYO	DARWATI	WIRASWASTA	MENGURUS RUMAH TANGGA	POLDA JAWA TENGAH	POLRESTA CILACAP	55	DIKTUKBA POLRI	2025	TIDAK	14.5	29	41	54	PTU (BINTARA TUGAS UMUM)	1	C3	2025-10-14 17:16:38.976203	2025-10-14 17:16:38.976203
\.


--
-- Data for Name: tes_semarang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tes_semarang (id, siswa_id, jenis_tes, parameter, skor, tanggal, created_at) FROM stdin;
\.


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, true);


--
-- Name: bk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bk_id_seq', 1, false);


--
-- Name: jasmani_polda_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jasmani_polda_id_seq', 1, false);


--
-- Name: jasmani_spn_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jasmani_spn_id_seq', 1, false);


--
-- Name: mapel_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mapel_id_seq', 1, false);


--
-- Name: mental_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mental_id_seq', 1, false);


--
-- Name: pelanggaran_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pelanggaran_id_seq', 1, false);


--
-- Name: prestasi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prestasi_id_seq', 1, false);


--
-- Name: riwayat_kesehatan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.riwayat_kesehatan_id_seq', 1, false);


--
-- Name: siswa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.siswa_id_seq', 228, true);


--
-- Name: tes_semarang_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tes_semarang_id_seq', 1, false);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bk bk_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bk
    ADD CONSTRAINT bk_pkey PRIMARY KEY (id);


--
-- Name: jasmani_polda jasmani_polda_no_panda_angkatan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jasmani_polda
    ADD CONSTRAINT jasmani_polda_no_panda_angkatan_key UNIQUE (no_panda, angkatan);


--
-- Name: jasmani_polda jasmani_polda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jasmani_polda
    ADD CONSTRAINT jasmani_polda_pkey PRIMARY KEY (id);


--
-- Name: jasmani_spn jasmani_spn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jasmani_spn
    ADD CONSTRAINT jasmani_spn_pkey PRIMARY KEY (id);


--
-- Name: jasmani_spn jasmani_spn_siswa_id_tahap_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jasmani_spn
    ADD CONSTRAINT jasmani_spn_siswa_id_tahap_key UNIQUE (siswa_id, tahap);


--
-- Name: mapel mapel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mapel
    ADD CONSTRAINT mapel_pkey PRIMARY KEY (id);


--
-- Name: mapel mapel_siswa_id_mapel_pertemuan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mapel
    ADD CONSTRAINT mapel_siswa_id_mapel_pertemuan_key UNIQUE (siswa_id, mapel, pertemuan);


--
-- Name: mental mental_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental
    ADD CONSTRAINT mental_pkey PRIMARY KEY (id);


--
-- Name: pelanggaran pelanggaran_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelanggaran
    ADD CONSTRAINT pelanggaran_pkey PRIMARY KEY (id);


--
-- Name: prestasi prestasi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestasi
    ADD CONSTRAINT prestasi_pkey PRIMARY KEY (id);


--
-- Name: riwayat_kesehatan riwayat_kesehatan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_kesehatan
    ADD CONSTRAINT riwayat_kesehatan_pkey PRIMARY KEY (id);


--
-- Name: siswa siswa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siswa
    ADD CONSTRAINT siswa_pkey PRIMARY KEY (id);


--
-- Name: tes_semarang tes_semarang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tes_semarang
    ADD CONSTRAINT tes_semarang_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_bk_siswa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bk_siswa ON public.bk USING btree (siswa_id);


--
-- Name: idx_jasmanispn_nosis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jasmanispn_nosis ON public.jasmani_spn USING btree (nosis);


--
-- Name: idx_jasmanispn_siswa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jasmanispn_siswa ON public.jasmani_spn USING btree (siswa_id);


--
-- Name: idx_jasmanispn_tahap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jasmanispn_tahap ON public.jasmani_spn USING btree (tahap);


--
-- Name: idx_jp_angkatan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jp_angkatan ON public.jasmani_polda USING btree (angkatan);


--
-- Name: idx_jp_nama_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jp_nama_lower ON public.jasmani_polda USING btree (lower(nama));


--
-- Name: idx_jp_nopanda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jp_nopanda ON public.jasmani_polda USING btree (no_panda);


--
-- Name: idx_mapel_siswa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mapel_siswa ON public.mapel USING btree (siswa_id);


--
-- Name: idx_mental_siswa_minggu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mental_siswa_minggu ON public.mental USING btree (siswa_id, minggu_ke);


--
-- Name: idx_pelanggaran_siswa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pelanggaran_siswa ON public.pelanggaran USING btree (siswa_id);


--
-- Name: idx_prestasi_siswa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prestasi_siswa ON public.prestasi USING btree (siswa_id);


--
-- Name: idx_riwayatkes_siswa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_riwayatkes_siswa ON public.riwayat_kesehatan USING btree (siswa_id);


--
-- Name: idx_siswa_nama_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_siswa_nama_lower ON public.siswa USING btree (lower(nama));


--
-- Name: idx_siswa_nosis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_siswa_nosis ON public.siswa USING btree (nosis);


--
-- Name: idx_tes_semarang_jenis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tes_semarang_jenis ON public.tes_semarang USING btree (jenis_tes);


--
-- Name: idx_tes_semarang_siswa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tes_semarang_siswa ON public.tes_semarang USING btree (siswa_id);


--
-- Name: uq_siswa_nik_notnull; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siswa_nik_notnull ON public.siswa USING btree (nik) WHERE (nik IS NOT NULL);


--
-- Name: jasmani_polda trg_jasmani_polda_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jasmani_polda_updated BEFORE UPDATE ON public.jasmani_polda FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: jasmani_spn trg_jasmanispn_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jasmanispn_updated BEFORE UPDATE ON public.jasmani_spn FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: mapel trg_mapel_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mapel_updated BEFORE UPDATE ON public.mapel FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: mental trg_mental_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mental_updated BEFORE UPDATE ON public.mental FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: siswa trg_siswa_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_siswa_updated BEFORE UPDATE ON public.siswa FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bk bk_siswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bk
    ADD CONSTRAINT bk_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id) ON DELETE CASCADE;


--
-- Name: jasmani_polda jasmani_polda_siswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jasmani_polda
    ADD CONSTRAINT jasmani_polda_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id) ON DELETE SET NULL;


--
-- Name: jasmani_spn jasmani_spn_siswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jasmani_spn
    ADD CONSTRAINT jasmani_spn_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id) ON DELETE SET NULL;


--
-- Name: mapel mapel_siswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mapel
    ADD CONSTRAINT mapel_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id) ON DELETE CASCADE;


--
-- Name: mental mental_siswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mental
    ADD CONSTRAINT mental_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id) ON DELETE CASCADE;


--
-- Name: pelanggaran pelanggaran_siswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelanggaran
    ADD CONSTRAINT pelanggaran_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id) ON DELETE CASCADE;


--
-- Name: prestasi prestasi_siswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestasi
    ADD CONSTRAINT prestasi_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id) ON DELETE CASCADE;


--
-- Name: riwayat_kesehatan riwayat_kesehatan_siswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_kesehatan
    ADD CONSTRAINT riwayat_kesehatan_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict aX9E2OsJzSOefXqhOfhK1Bw6cEaBChId0DwDWbpbYTxCGcFC6lVNmhelFrxwQ39

