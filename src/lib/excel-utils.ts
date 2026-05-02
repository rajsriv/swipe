import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import type { Student, Batch } from './types';

/**
 * Parses an Excel file into a list of Students.
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

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameKeys = ['name', 'studentname', 'fullname', 'student', 'students', 'NAME', 'STUDENT NAME', 'FULL NAME', 'STUDENTS'];
        const rollKeys = ['rollno', 'rollnumber', 'enrollment', 'id', 'serialno', 'roll', 'ROLL NO', 'SERIAL NO'];
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
            // Handle falsy values like 0 properly, only fallback to index + 1 if undefined/null/empty string
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
 * Exports batch data to an Excel file.
 * Automatically handles Native (APK) sharing via Share API or Web download.
 */
export const exportBatchToExcel = async (batch: Batch) => {
  const dateStr = new Date().toLocaleDateString();
  const fileName = `${batch.name}_Report_${dateStr.replace(/\//g, '-')}.xlsx`;

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
  const wscols = [
    { wch: 15 }, { wch: 25 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

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
        title: 'Attendance Report',
        text: `Attendance report for ${batch.name} as of ${dateStr}`,
        url: savedFile.uri,
        dialogTitle: 'Save Attendance Report'
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


