const fs = require('fs');
const XLSX = require('xlsx');

function parseRealData(fileBuffer) {
  const data = new Uint8Array(fileBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log("firstCell:", rawData[0][0]);
  
  const firstCell = String(rawData[0]?.[0] || '');
  if (firstCell.startsWith('Attendance Register')) {
    const monthStrRow = String(rawData[1]?.[0] || '');
    const monthStr = monthStrRow.replace('Month:', '').trim();
    console.log("monthStr:", monthStr);
    
    const headers = rawData[2] || [];
    console.log("Headers:", headers);
    
    const dayColumns = [];
    headers.forEach((h, i) => {
      const num = parseInt(String(h), 10);
      if (!isNaN(num) && num >= 1 && num <= 31) {
        dayColumns.push({ colIndex: i, day: num });
      }
    });
    console.log("Day Columns Found:", dayColumns);
    
    const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameCol = headers.findIndex(h => normalize(h).includes('name'));
    const rollCol = headers.findIndex(h => normalize(h).includes('rollno'));
    console.log("NameCol:", nameCol, "RollCol:", rollCol);
    
    for (let i = 3; i < rawData.length; i++) {
      const row = rawData[i];
      console.log(`Row ${i}:`, row);
      
      const name = nameCol !== -1 ? String(row[nameCol] || '') : '';
      const rollNo = rollCol !== -1 ? String(row[rollCol] || '') : '';
            
      if (!name && !rollNo) continue; // Skip totally empty rows
      console.log("  Valid Student:", name, rollNo);

      dayColumns.forEach(({ colIndex, day }) => {
        const val = String(row[colIndex] || '').trim().toUpperCase();
        console.log(`    Day ${day}: val='${val}'`);
      });
    }
  }
}

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet([]);
const dayHeaders = ['1', '2', '3'];
const data = [
  { 'Sl.No.': 1, 'Roll no.': 'R1', 'Exam Roll No.': 'R1', 'Student Name': 'Alice', '1': 'P', '2': 'A', '3': '' }
];
XLSX.utils.sheet_add_aoa(worksheet, [
  [`Attendance Register, Test`],
  [`Month: May 2026`]
], { origin: 'A1' });
const header = ['Sl.No.', 'Roll no.', 'Exam Roll No.', 'Student Name', ...dayHeaders];
XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A3', header });

XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');

const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
parseRealData(buf);
