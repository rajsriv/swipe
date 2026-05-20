export interface Student {
  id: string;
  rollNo: string;
  name: string;
  photo?: string;
  presentCount: number;
  totalDays: number;
}

export interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent';
  studentId: string;
  checkIn?: string;
}

export interface Batch {
  id: string;
  name: string;
  students: Student[];
  records: AttendanceRecord[];
}

export type ParseResult = 
  | { type: 'standard', students: Partial<Student>[] }
  | { 
      type: 'attendance', 
      monthStr: string, 
      students: Partial<Student>[], 
      dailyRecords: { rollNo: string, day: number, status: 'present' | 'absent' }[] 
    };
