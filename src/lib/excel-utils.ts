import * as XLSX from 'xlsx';
import type { Student, Batch } from './types';

/**
 * Parses an Excel file into a list of Students.
 * Handles variations in column names like 'Roll No', 'Name', 'Enrollment', etc.
 */
export const parseExcel = async (file: File): Promise<Partial<Student>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const students: Partial<Student>[] = jsonData
          .filter(row => row && (row.Name || row.name || row['Roll No'] || row['roll no.']))
          .map((row, index) => {
            // Flexible property lookup
            const findValue = (keys: string[]) => {
              const foundKey = Object.keys(row).find(k => 
                keys.some(key => k.toLowerCase().trim() === key.toLowerCase())
              );
              return foundKey ? row[foundKey] : undefined;
            };

            const name = findValue(['Name', 'Student Name', 'Full Name']) || 'Unknown Student';
            const rollNo = String(findValue(['Roll No', 'Roll Number', 'Enrollment', 'ID', 'Serial No']) || index + 1);
            const photo = findValue(['Photo', 'Avatar', 'Image', 'Profile']);

            return {
              id: crypto.randomUUID(),
              rollNo,
              name: String(name),
              photo: photo ? String(photo) : undefined,
              presentCount: 0,
              totalDays: 0,
            };
          });

        resolve(students);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Exports batch data to an Excel file with cumulative statistics.
 */
export const exportBatchToExcel = (batch: Batch) => {
  const dateStr = new Date().toLocaleDateString();
  
  const data = batch.students.map((student) => {
    const totalDays = student.totalDays;
    const presentCount = student.presentCount;
    const percentage = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(2) + '%' : '0%';

    return {
      'Roll No': student.rollNo,
      'Name': student.name,
      'Total Sessions': totalDays,
      'Present Count': presentCount,
      'Absent Count': totalDays - presentCount,
      'Attendance Vitality (%)': percentage,
      'Last Export Date': dateStr
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths for better readability
  const wscols = [
    { wch: 15 }, // Roll No
    { wch: 25 }, // Name
    { wch: 15 }, // Total Sessions
    { wch: 15 }, // Present
    { wch: 15 }, // Absent
    { wch: 20 }, // Vitality
    { wch: 20 }, // Date
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

  XLSX.writeFile(workbook, `${batch.name}_Report_${dateStr.replace(/\//g, '-')}.xlsx`);
};

