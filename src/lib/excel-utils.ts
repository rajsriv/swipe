import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import type { Student, Batch, ParseResult } from './types';

/**
 * Parses an Excel file into a list of Students.
 */
export const parseExcel = async (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rawData.length === 0) return resolve({ type: 'standard', students: [] });

        const firstCell = String(rawData[0]?.[0] || '');
        if (firstCell.includes('Attendance Register')) {
          const monthStrRow = String(rawData[1]?.[0] || '');
          const monthStr = monthStrRow.replace('Month:', '').trim();
          
          const headers = rawData[2] || [];
          
          const dayColumns: { colIndex: number, day: number }[] = [];
          headers.forEach((h, i) => {
            const num = parseInt(String(h), 10);
            if (!isNaN(num) && num >= 1 && num <= 31) {
              dayColumns.push({ colIndex: i, day: num });
            }
          });

          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          const nameCol = headers.findIndex(h => normalize(String(h)).includes('name'));
          const rollCol = headers.findIndex(h => normalize(String(h)).includes('rollno'));
          
          const students: Partial<Student>[] = [];
          const dailyRecords: { rollNo: string, day: number, status: 'present' | 'absent' }[] = [];

          for (let i = 3; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;
            
            const name = nameCol !== -1 ? String(row[nameCol] || '') : '';
            const rollNo = rollCol !== -1 ? String(row[rollCol] || '') : '';
            
            if (!name && !rollNo) continue; // Skip totally empty rows
            
            const rollToUse = rollNo || `temp-${i}`;
            students.push({
              id: crypto.randomUUID(),
              rollNo: rollToUse,
              name: name || 'Unknown Student',
              presentCount: 0,
              totalDays: 0,
            });

            dayColumns.forEach(({ colIndex, day }) => {
              const val = String(row[colIndex] || '').trim().toUpperCase();
              if (val === 'P') {
                dailyRecords.push({ rollNo: rollToUse, day, status: 'present' });
              } else if (val === 'A') {
                dailyRecords.push({ rollNo: rollToUse, day, status: 'absent' });
              }
            });
          }

          resolve({ type: 'attendance', monthStr, students, dailyRecords });
        } else {
          // Standard Format
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          const nameKeys = ['name', 'studentname', 'fullname', 'student', 'students'];
          const rollKeys = ['rollno', 'rollnumber', 'enrollment', 'id', 'serialno', 'roll'];
          const photoKeys = ['photo', 'avatar', 'image', 'profile'];
          const totalKeys = ['totalsessions', 'totaldays', 'total'];
          const presentKeys = ['presentcount', 'presentsessions', 'present'];

          const students: Partial<Student>[] = jsonData
            .filter(row => {
              if (!row) return false;
              const keys = Object.keys(row).map(normalize);
              return keys.some(k => nameKeys.includes(k)) || keys.some(k => rollKeys.includes(k));
            })
            .map((row, index) => {
              const findValue = (searchKeys: string[]) => {
                const foundKey = Object.keys(row).find(k => searchKeys.includes(normalize(k)));
                return foundKey ? row[foundKey] : undefined;
              };

              const name = findValue(nameKeys) || 'Unknown Student';
              const rawRollNo = findValue(rollKeys);
              const rollNo = String(rawRollNo !== undefined && rawRollNo !== null && rawRollNo !== '' ? rawRollNo : index + 1);
              const photo = findValue(photoKeys);
              const rawTotal = findValue(totalKeys);
              const rawPresent = findValue(presentKeys);

              return {
                id: crypto.randomUUID(),
                rollNo,
                name: String(name),
                photo: photo ? String(photo) : undefined,
                presentCount: rawPresent !== undefined ? parseInt(String(rawPresent), 10) || 0 : 0,
                totalDays: rawTotal !== undefined ? parseInt(String(rawTotal), 10) || 0 : 0,
              };
            });

          resolve({ type: 'standard', students });
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Exports batch data to an Excel file.
 * Automatically handles Native (APK) sharing via Share API or Web download.
 */
export const exportBatchToExcel = async (batch: Batch) => {
  const dateStr = new Date().toLocaleDateString();
  const fileName = `${batch.name}_Report_${dateStr.replace(/\//g, '-')}.xlsx`;

  const data = batch.students.map((student, index) => {
    return {
      'S.No.': index + 1,
      'Exams. Roll No.': student.rollNo,
      'NAME': student.name,
      'Lecture taken': student.totalDays,
      'Lecture Attended': student.presentCount
    };
  });

  const worksheet = XLSX.utils.json_to_sheet([]);
  
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['Department of Computer Science, Institute of Science, BHU'],
    [batch.name]
  ], { origin: 'A1' });

  XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A3' });

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // merge A1:E1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }  // merge A2:E2
  ];

  const wscols = [
    { wch: 8 },  // S.No.
    { wch: 20 }, // Exams. Roll No.
    { wch: 35 }, // NAME
    { wch: 15 }, // Lecture taken
    { wch: 18 }, // Lecture Attended
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

  await saveWorkbook(workbook, fileName, batch.name, dateStr, 'Attendance Report');
};

const saveWorkbook = async (workbook: XLSX.WorkBook, fileName: string, batchName: string, dateStr: string, title: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Generate the Excel binary data as a base64 string
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

      // Save the file to the device's temporary directory
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: wbout,
        directory: Directory.Cache
      });

      // Use the Share API to open the Android "Save/Share" menu
      await Share.share({
        title,
        text: `${title} for ${batchName} as of ${dateStr}`,
        url: savedFile.uri,
        dialogTitle: `Save ${title}`
      });
    } catch (error) {
      console.error('Error sharing file:', error);
      alert('Could not export report to device storage.');
    }
  } else {
    // Normal web download for browser/PWA
    XLSX.writeFile(workbook, fileName);
  }
};

export const exportAttendanceSheetToExcel = async (batch: Batch) => {
  const dateStr = new Date().toLocaleDateString();
  const fileName = `${batch.name}_AttendanceSheet_${dateStr.replace(/\//g, '-')}.xlsx`;

  // Group records by Month/Year
  const recordsByMonth = new Map<string, { year: number, month: number, records: typeof batch.records }>();
  
  batch.records.forEach(record => {
    const date = new Date(record.date);
    const monthStr = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!recordsByMonth.has(monthStr)) {
      recordsByMonth.set(monthStr, { year: date.getFullYear(), month: date.getMonth(), records: [] });
    }
    recordsByMonth.get(monthStr)!.records.push(record);
  });

  const workbook = XLSX.utils.book_new();

  if (recordsByMonth.size === 0) {
    // If no records, just create a blank sheet for the current month
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    recordsByMonth.set(currentMonth, { year: now.getFullYear(), month: now.getMonth(), records: [] });
  }

  recordsByMonth.forEach(({ year, month, records }, monthStr) => {
    // Get all days in this month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

    const data = batch.students.map((student, index) => {
      const row: any = {
        'Sl.No.': index + 1,
        'Roll no.': student.rollNo,
        'Exam Roll No.': student.rollNo,
        'Student Name': student.name,
      };

      const studentRecords = records.filter(r => r.studentId === student.id);

      dayHeaders.forEach((dayStr) => {
        const day = parseInt(dayStr, 10);
        const record = studentRecords.find(r => {
          const rDate = new Date(r.date);
          return rDate.getFullYear() === year && rDate.getMonth() === month && rDate.getDate() === day;
        });
        row[dayStr] = record ? (record.status === 'present' ? 'P' : 'A') : '';
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet([]);
    
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`Attendance Register, ${batch.name}`],
      [`Month: ${monthStr}`]
    ], { origin: 'A1' });

    const header = ['Sl.No.', 'Roll no.', 'Exam Roll No.', 'Student Name', ...dayHeaders];
    XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A3', header });

    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 + dayHeaders.length } }, // merge A1 to end
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 + dayHeaders.length } }  // merge A2 to end
    ];

    const wscols = [
      { wch: 6 },  // Sl.No.
      { wch: 15 }, // Roll no.
      { wch: 15 }, // Exam Roll No.
      { wch: 30 }, // Student Name
    ];
    // Add small columns for each day
    dayHeaders.forEach(() => wscols.push({ wch: 4 }));
    worksheet['!cols'] = wscols;

    const safeSheetName = monthStr.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  });

  await saveWorkbook(workbook, fileName, batch.name, dateStr, 'Attendance Sheet');
};


