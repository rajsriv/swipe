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

        const students: Partial<Student>[] = jsonData
          .filter(row => row && (row.Name || row.name || row['Roll No'] || row['roll no.']))
          .map((row, index) => {
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


