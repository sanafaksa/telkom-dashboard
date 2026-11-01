import XLSX from 'xlsx';


const handleUpload = async () => {
  if (onSuccess) onSuccess(result.preview);
  // NEW: parse the uploaded file
  const parsed = parseExcelFile(files[0]);
  // Pass parsed data back to parent if needed
  if (onSuccess) onSuccess(parsed);
};
export const parseExcelFile = (file) => {
  const workbook = XLSX.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Map headers to keys
  const headers = raw[0].map(h => h.toString().trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = raw.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  return { headers, rows };
};