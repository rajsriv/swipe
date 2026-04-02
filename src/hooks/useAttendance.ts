import { useState, useEffect } from 'react';
import type { Batch, Student } from '../lib/types';

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

  const clearStudents = (batchId: string) => {
    setBatches(batches.map(b => 
      b.id === batchId ? { ...b, students: [], records: [] } : b
    ));
  };

  const markAttendance = (batchId: string, studentId: string, status: 'present' | 'absent') => {
    setBatches(batches.map(b => {
      if (b.id !== batchId) return b;

      const updatedStudents = b.students.map(s => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          presentCount: s.presentCount + (status === 'present' ? 1 : 0),
          totalDays: s.totalDays + 1
        };
      });

      const newRecord = {
        date: new Date().toISOString(),
        status,
        studentId
      };

      return {
        ...b,
        students: updatedStudents,
        records: [...b.records, newRecord]
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
          presentCount: s.presentCount - (lastRecord.status === 'present' ? 1 : 0),
          totalDays: s.totalDays - 1
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
    clearStudents,
    markAttendance,
    undoLastRecord,
    updateStudentPhoto,
  };
};

