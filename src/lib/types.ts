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
}

export interface Batch {
  id: string;
  name: string;
  students: Student[];
  records: AttendanceRecord[];
}
