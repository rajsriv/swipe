import { useState, useEffect } from 'react';
import type { Batch, Student, AttendanceRecord, ParseResult } from '../lib/types';

export const useAttendance = () => {
  const [batches, setBatches] = useState<Batch[]>(() => {
    const saved = localStorage.getItem('attendance_batches');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('attendance_batches', JSON.stringify(batches));
  }, [batches]);

  const addBatch = (name: string) => {
    const newBatch: Batch = {
      id: crypto.randomUUID(),
      name,
      students: [],
      records: [],
    };
    setBatches([...batches, newBatch]);
  };

  const deleteBatch = (id: string) => {
    setBatches(batches.filter(b => b.id !== id));
  };

  const importStudents = (batchId: string, students: Student[]) => {
    setBatches(batches.map(b => 
      b.id === batchId ? { ...b, students: [...b.students, ...students] } : b
    ));
  };

  const syncBatchData = (batchId: string, parsedData: ParseResult) => {
    setBatches(batches.map(b => {
      if (b.id !== batchId) return b;

      const existingStudentsMap = new Map(b.students.map(s => [s.rollNo, s]));
      
      const newStudents: Student[] = parsedData.students.map(parsedS => {
        const existing = existingStudentsMap.get(parsedS.rollNo as string);
        if (existing) {
          return {
            ...existing,
            name: parsedS.name as string,
            presentCount: parsedData.type === 'standard' ? (parsedS.presentCount ?? existing.presentCount) : existing.presentCount,
            totalDays: parsedData.type === 'standard' ? (parsedS.totalDays ?? existing.totalDays) : existing.totalDays,
          };
        } else {
          return parsedS as Student;
        }
      });

      if (parsedData.type === 'standard') {
        return { ...b, students: newStudents };
      } else {
        const monthDate = new Date(parsedData.monthStr);
        let year = monthDate.getFullYear();
        let month = monthDate.getMonth();

        if (isNaN(monthDate.getTime())) {
          console.warn("Invalid month string in import: ", parsedData.monthStr, "- Using fallback extraction.");
          const match = parsedData.monthStr.match(/(\d{4})/);
          year = match ? parseInt(match[1], 10) : new Date().getFullYear();
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const mStr = parsedData.monthStr.toLowerCase();
          const foundMonth = months.findIndex(m => mStr.includes(m));
          month = foundMonth !== -1 ? foundMonth : new Date().getMonth();
        }

        let updatedRecords = b.records.filter(r => {
          const rDate = new Date(r.date);
          return !(rDate.getFullYear() === year && rDate.getMonth() === month);
        });

        const importedRecords = parsedData.dailyRecords.map(dr => {
          const student = newStudents.find(s => s.rollNo === dr.rollNo);
          if (!student) return null;
          
          const date = new Date(year, month, dr.day);
          return {
            date: date.toISOString(),
            status: dr.status,
            studentId: student.id,
            checkIn: '09:00 AM'
          };
        }).filter(Boolean) as AttendanceRecord[];

        updatedRecords = [...updatedRecords, ...importedRecords];

        const finalStudents = newStudents.map(s => {
          const sRecords = updatedRecords.filter(r => r.studentId === s.id);
          const presentCount = sRecords.filter(r => r.status === 'present').length;
          const totalDays = sRecords.length;
          return { ...s, presentCount, totalDays };
        });

        return { ...b, students: finalStudents, records: updatedRecords };
      }
    }));
  };

  const clearStudents = (batchId: string) => {
    setBatches(batches.map(b => 
      b.id === batchId ? { ...b, students: [], records: [] } : b
    ));
  };

  const markAttendance = (batchId: string, studentId: string, status: 'present' | 'absent' | 'pending', customDate?: string) => {
    setBatches(batches.map(b => {
      if (b.id !== batchId) return b;

      const now = customDate ? (() => {
        const [y, m, d] = customDate.split('-');
        return new Date(Number(y), Number(m) - 1, Number(d));
      })() : new Date();
      const today = now.toDateString();
      const existingRecordIndex = b.records.findIndex(r => 
        r.studentId === studentId && new Date(r.date).toDateString() === today
      );

      const updatedStudents = b.students.map(s => {
        if (s.id !== studentId) return s;

        let presentChange = 0;
        let dayChange = 0;

        if (status === 'pending') {
          if (existingRecordIndex !== -1) {
            const oldStatus = b.records[existingRecordIndex].status;
            presentChange = oldStatus === 'present' ? -1 : 0;
            dayChange = -1;
          }
        } else {
          if (existingRecordIndex !== -1) {
            // Update existing record logic
            const oldStatus = b.records[existingRecordIndex].status;
            if (oldStatus !== status) {
              presentChange = status === 'present' ? 1 : -1;
            }
            dayChange = 0; // Already counted this day
          } else {
            // New record logic
            presentChange = status === 'present' ? 1 : 0;
            dayChange = 1;
          }
        }

        return {
          ...s,
          presentCount: Math.max(0, s.presentCount + presentChange),
          totalDays: Math.max(0, s.totalDays + dayChange)
        };
      });

      let updatedRecords = [...b.records];
      if (status === 'pending') {
        if (existingRecordIndex !== -1) {
          updatedRecords = updatedRecords.filter((_, idx) => idx !== existingRecordIndex);
        }
      } else {
        const checkIn = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const newRecord = {
          date: now.toISOString(),
          status,
          studentId,
          checkIn
        };

        if (existingRecordIndex !== -1) {
          updatedRecords[existingRecordIndex] = newRecord;
        } else {
          updatedRecords.push(newRecord);
        }
      }

      return {
        ...b,
        students: updatedStudents,
        records: updatedRecords
      };
    }));
  };

  const undoLastRecord = (batchId: string) => {
    setBatches(batches.map(b => {
      if (b.id !== batchId || b.records.length === 0) return b;

      const lastRecord = b.records[b.records.length - 1];
      const updatedStudents = b.students.map(s => {
        if (s.id !== lastRecord.studentId) return s;
        return {
          ...s,
          presentCount: Math.max(0, s.presentCount - (lastRecord.status === 'present' ? 1 : 0)),
          totalDays: Math.max(0, s.totalDays - 1)
        };
      });

      return {
        ...b,
        students: updatedStudents,
        records: b.records.slice(0, -1)
      };
    }));
  };

  const updateStudentPhoto = (batchId: string, studentId: string, photo: string) => {
    setBatches(batches.map(b => {
      if (b.id !== batchId) return b;
      return {
        ...b,
        students: b.students.map(s => 
          s.id === studentId ? { ...s, photo } : s
        )
      };
    }));
  };

  return {
    batches,
    addBatch,
    deleteBatch,
    importStudents,
    syncBatchData,
    clearStudents,
    markAttendance,
    undoLastRecord,
    updateStudentPhoto,
  };
};

