const XLSX = require('xlsx');

// 1. Generate the same excel format
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

// 2. Parse it exactly like App
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log("rawData length:", rawData.length);
console.log("Row 0:", rawData[0]);
console.log("Row 1:", rawData[1]);
console.log("Row 2 (headers):", rawData[2]);
console.log("Row 3 (data):", rawData[3]);

const firstCell = String(rawData[0]?.[0] || '');
console.log("Is Attendance Register?", firstCell.startsWith('Attendance Register'));
