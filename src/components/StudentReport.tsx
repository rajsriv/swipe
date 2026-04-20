import React, { useMemo, useState, useRef } from 'react';
import { Menu, Search, X, MoreVertical, Calendar, ChevronDown, BarChart3, ListChecks } from 'lucide-react';
import type { Batch, Student, AttendanceRecord } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentReportProps {
  batch: Batch;
  onBack: () => void;
}

const StudentReport: React.FC<StudentReportProps> = ({ batch }) => {
  const [reportMode, setReportMode] = useState<'daily' | 'overall'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const displayDate = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    }).replace(/ /g, '-');
  }, [selectedDate]);

  // Group students by first letter of name
  const groupedStudents = useMemo(() => {
    const groups: Record<string, Student[]> = {};
    const filteredStudents = batch.students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const sortedStudents = [...filteredStudents].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedStudents.forEach(student => {
      const firstLetter = student.name.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(student);
    });
    
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [batch.students, searchTerm]);

  // Get filtered records for the selected date
  const selectedDayRecords = useMemo(() => {
    const records: Record<string, AttendanceRecord> = {};
    const targetDateStr = new Date(selectedDate).toDateString();
    
    batch.records.forEach(record => {
      if (new Date(record.date).toDateString() === targetDateStr) {
        records[record.studentId] = record;
      }
    });
    return records;
  }, [batch.records, selectedDate]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] text-slate-800">
      {/* Main Header */}
      <header className="bg-[#1565c0] text-white px-4 h-16 flex items-center justify-between shadow-md z-20 transition-all duration-300">
        {!isSearchOpen ? (
          <>
            <div className="flex items-center gap-6">
              <Menu className="w-6 h-6 outline-none" />
              <h1 className="text-xl font-medium tracking-wide">Student Attendance</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Search students"
              >
                <Search className="w-6 h-6" />
              </button>
              <MoreVertical className="w-6 h-6" />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-4 bg-white/10 rounded-xl px-4 py-1">
            <Search className="w-5 h-5 text-white/70" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none text-white placeholder:text-white/60 focus:ring-0 text-lg py-1"
            />
            <button 
              onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      {/* Filter/Info Sub-header */}
      <div className="bg-[#1976d2] text-white px-0 h-14 flex items-center shadow-sm z-10">
        {/* Date Picker Button */}
        <div 
          onClick={() => dateInputRef.current?.showPicker()}
          className="flex-1 flex items-center justify-center border-r border-white/20 h-full px-4 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/80 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">{displayDate}</span>
            <ChevronDown className="w-3 h-3 text-white/80" />
            <input 
              type="date"
              ref={dateInputRef}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
            />
          </div>
        </div>
        
        {/* Report Mode Switcher */}
        <div className="flex-[1.5] flex items-center justify-around h-full">
          <button 
            onClick={() => setReportMode('daily')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all w-full h-full ${reportMode === 'daily' ? 'bg-white/10 border-b-4 border-white' : 'opacity-60'}`}
          >
            <ListChecks className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Daily</span>
          </button>
          <button 
            onClick={() => setReportMode('overall')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all w-full h-full ${reportMode === 'overall' ? 'bg-white/10 border-b-4 border-white' : 'opacity-60'}`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Overall</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center border-l border-white/20 h-full px-4">
          <span className="font-medium text-sm truncate">{batch.name}</span>
        </div>
      </div>

      {/* Student List */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={reportMode + selectedDate + searchTerm}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {groupedStudents.map(([letter, students]) => (
                <div key={letter} className="mb-4">
                  <div className="text-[#9e9e9e] font-bold text-xs mb-2 ml-1 uppercase tracking-widest">{letter}</div>
                  <div className="space-y-3">
                    {students.map((student) => {
                      const record = selectedDayRecords[student.id];
                      const isPresent = record?.status === 'present';
                      const isAbsent = record?.status === 'absent';
                      const percentage = student.totalDays > 0 ? Math.round((student.presentCount / student.totalDays) * 100) : 0;
                      
                      return (
                        <div 
                          key={student.id}
                          className="bg-white rounded-xl shadow-sm overflow-hidden flex items-stretch h-24 border border-slate-200/60"
                        >
                          {/* Avatar */}
                          <div className="flex items-center px-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                              {student.photo ? (
                                <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl uppercase">
                                  {student.name.charAt(0)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 flex flex-col justify-center py-2 pr-4">
                            <h3 className="text-lg font-bold text-[#212121] leading-tight mb-1 truncate">{student.name}</h3>
                            
                            {reportMode === 'daily' ? (
                              <div className="flex items-center gap-4 text-[#757575] text-sm">
                                <span className={`${isPresent ? 'text-[#00897b]' : isAbsent ? 'text-[#d32f2f]' : 'text-slate-400'} font-medium`}>
                                  {isPresent ? 'Checked In' : isAbsent ? 'Absent' : 'Pending'}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  <span>Tally: {student.presentCount} / {student.totalDays}</span>
                                  <span>{percentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    className={`h-full ${percentage > 75 ? 'bg-[#00897b]' : percentage > 50 ? 'bg-[#1e88e5]' : 'bg-[#d32f2f]'}`} 
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Status / Percentage Indicator */}
                          <div className={`w-20 flex items-center justify-center text-white font-bold text-xl transition-colors duration-300
                            ${reportMode === 'daily' 
                              ? (isPresent ? 'bg-[#00897b]' : isAbsent ? 'bg-[#d32f2f]' : 'bg-slate-100/50 text-slate-300 border-l border-slate-100')
                              : 'bg-slate-50 items-start pt-6 border-l border-slate-100'
                            }
                          `}>
                            {reportMode === 'daily' ? (
                              isPresent ? 'P' : isAbsent ? 'A' : '-'
                            ) : (
                              <span className="text-slate-800 text-lg">{percentage}%</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {groupedStudents.length === 0 && (
                <div className="py-20 text-center text-slate-400">
                  <Search size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No students found matching "{searchTerm}"</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default StudentReport;
