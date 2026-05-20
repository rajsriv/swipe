const fs = require('fs');

// We don't have access to the app's localStorage here easily, but we can simulate the logic.
const rawData = [
  ['Attendance Register, bsc'],
  ['Month: May 2026'],
  ['Sl.No.', 'Roll no.', 'Exam Roll No.', 'Student Name', '1', '2', '3'],
  [1, 'CS101', 'cs15', 'raj', 'P', 'A', 'P']
];

const firstCell = String(rawData[0]?.[0] || '');
if (firstCell.startsWith('Attendance Register')) {
  const monthStrRow = String(rawData[1]?.[0] || '');
  const monthStr = monthStrRow.replace('Month:', '').trim();
  console.log("Parsed monthStr:", monthStr);

  const headers = rawData[2] || [];
  const dayColumns = [];
  headers.forEach((h, i) => {
    const num = parseInt(String(h), 10);
    if (!isNaN(num) && num >= 1 && num <= 31) {
      dayColumns.push({ colIndex: i, day: num });
    }
  });
  console.log("Day columns:", dayColumns);

  const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameCol = headers.findIndex(h => normalize(h).includes('name'));
  const rollCol = headers.findIndex(h => normalize(h).includes('rollno'));
  
  const dailyRecords = [];
  
  for (let i = 3; i < rawData.length; i++) {
    const row = rawData[i];
    const name = nameCol !== -1 ? String(row[nameCol] || '') : '';
    const rollNo = rollCol !== -1 ? String(row[rollCol] || '') : '';
    
    if (!name && !rollNo) continue;
    
    const rollToUse = rollNo || `temp-${i}`;
    
    dayColumns.forEach(({ colIndex, day }) => {
      const val = String(row[colIndex] || '').trim().toUpperCase();
      if (val === 'P') {
        dailyRecords.push({ rollNo: rollToUse, day, status: 'present' });
      } else if (val === 'A') {
        dailyRecords.push({ rollNo: rollToUse, day, status: 'absent' });
      }
    });
  }
  console.log("Daily records:", dailyRecords);
  
  const monthDate = new Date(monthStr);
  console.log("Month Date:", monthDate, "isNaN?", isNaN(monthDate.getTime()));
  
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  
  const importedRecords = dailyRecords.map(dr => {
    // skip student lookup for mock
    const date = new Date(year, month, dr.day);
    return {
      date: date.toISOString(),
      status: dr.status,
      studentId: 'student123'
    };
  });
  console.log("Imported Records:", importedRecords);
}
