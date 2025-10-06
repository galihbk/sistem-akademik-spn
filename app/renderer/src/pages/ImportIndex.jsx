export default function ImportIndex() {
  const go = (hash) => {
    window.location.hash = hash;
  };

  const excel = [
    {
      key: "siswa",
      label: "Import Data Siswa (Excel)",
      hash: "#/import/siswa",
    },
    {
      key: "mental",
      label: "Import Mental Kepribadian (Excel)",
      hash: "#/import/mental",
    },
    {
      key: "jasmani",
      label: "Import Jasmani (Excel)",
      hash: "#/import/jasmani",
    },
  ];

  const pdf = [
    { key: "bk", label: "Upload BK (PDF)", hash: "#/upload/bk" },
    {
      key: "pelanggaran",
      label: "Upload Pelanggaran (PDF)",
      hash: "#/upload/pelanggaran",
    },
  ];

  const manual = [
    {
      key: "prestasi",
      label: "Input Prestasi (Form)",
      hash: "#/input/prestasi",
    },
    {
      key: "riwayat_kesehatan",
      label: "Input Riwayat Kesehatan (Form)",
      hash: "#/input/riwayat-kesehatan",
    },
  ];

  const Section = ({ title, items }) => (
    <div className="card">
      <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
      <div className="import-grid" style={{ marginTop: 12 }}>
        {items.map((it) => (
          <button
            key={it.key}
            className="import-option"
            onClick={() => go(it.hash)}
          >
            <div style={{ fontWeight: 700 }}>{it.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid">
      <Section title="Import (Excel)" items={excel} />
      <Section title="Upload PDF" items={pdf} />
      <Section title="Input Manual (Form)" items={manual} />
    </div>
  );
}
