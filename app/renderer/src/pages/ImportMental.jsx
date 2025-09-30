// ImportMental.jsx (contoh pemakaian)
import ImportExcel from "../components/ImportExcel";
export default function ImportMental() {
  return (
    <ImportExcel
      endpoint="mental"
      title="Import Mental Kepribadian"
      requireAngkatan
    />
  );
}
