import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronLeft, Upload, FileSpreadsheet, RefreshCw, X, Folder, Check, Undo2 } from 'lucide-react';
import { useAttendance } from './hooks/useAttendance';
import { parseExcel, exportBatchToExcel } from './lib/excel-utils';
import BatchCard from './components/BatchCard';
import AttendanceCard from './components/AttendanceCard';
import type { Student } from './lib/types';

function App() {
  const { batches, addBatch, deleteBatch, importStudents, clearStudents, markAttendance, undoLastRecord } = useAttendance();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'batch' | 'attendance'>('dashboard');
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [remainingStudentIds, setRemainingStudentIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const handleStartAttendance = () => {
    if (selectedBatch) {
      setRemainingStudentIds(selectedBatch.students.map(s => s.id));
      setView('attendance');
    }
  };

  const handleMarkAttendance = (studentId: string, status: 'present' | 'absent') => {
    markAttendance(selectedBatchId!, studentId, status);
    setRemainingStudentIds(prev => prev.filter(id => id !== studentId));
  };

  const handleUndo = () => {
    if (selectedBatch && selectedBatch.records.length > 0) {
      const lastRecord = selectedBatch.records[selectedBatch.records.length - 1];
      undoLastRecord(selectedBatchId!);
      // Put the student back to the front of the queue
      setRemainingStudentIds(prev => [lastRecord.studentId, ...prev]);
    }
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBatchName.trim()) {
      addBatch(newBatchName);
      setNewBatchName('');
      setIsAddingBatch(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedBatchId) {
      const students = await parseExcel(file);
      importStudents(selectedBatchId, students as Student[]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentStudent = selectedBatch?.students.find(s => s.id === remainingStudentIds[0]) || null;
  const currentStudentIndex = selectedBatch ? (selectedBatch.students.length - remainingStudentIds.length) : -1;


  return (
    <div className="min-h-screen text-white selection:bg-primary/30 pb-20">
      <div className="mesh-gradient" />
      
      {/* Floating Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-accent-pink/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-[40%] right-[15%] w-48 h-48 bg-accent-cyan/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-5s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {view !== 'dashboard' && (
              <button 
                onClick={() => setView(view === 'attendance' ? 'batch' : 'dashboard')}
                className="p-3 glass-panel rounded-2xl hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-light via-accent-cyan to-accent-pink bg-clip-text text-transparent">
                {view === 'dashboard' ? 'Swipe Attend' : selectedBatch?.name}
              </h1>
              {view === 'dashboard' && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary/60">System Online</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {view === 'dashboard' && (
              <button 
                onClick={() => setIsAddingBatch(true)}
                className="btn-primary flex items-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Plus size={20} className="group-hover:rotate-90 transition-transform relative z-10" />
                <span className="hidden sm:inline relative z-10">Assemble Batch</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {view === 'dashboard' && (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map(batch => (
              <BatchCard 
                key={batch.id} 
                batch={batch} 
                onSelect={(id) => { setSelectedBatchId(id); setView('batch'); }}
                onDelete={deleteBatch}
                onExport={exportBatchToExcel}
              />
            ))}
            {batches.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Folder className="opacity-50" size={40} />
                </div>
                <h2 className="text-xl font-bold mb-2">No Classes Yet</h2>
                <p className="text-slate-500">Click the + button to create your first batch.</p>
              </div>
            )}
          </div>
        )}

        {view === 'batch' && selectedBatch && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={handleStartAttendance}
                  disabled={selectedBatch.students.length === 0}
                  className="bg-primary text-white px-6 py-2 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  Start Attendance
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-2 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                >
                  <Upload size={18} />
                  Import XLSX
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".xlsx,.xls" 
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => clearStudents(selectedBatch.id)}
                  className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors"
                  title="Clear Data"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-2xl md:rounded-4xl overflow-hidden border border-white/10 shadow-glass">
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-12 bg-white/5 text-secondary text-[10px] font-bold uppercase tracking-[0.2em] px-8 py-6">
                <div className="col-span-5">Student Information</div>
                <div className="col-span-2">Roll Identifier</div>
                <div className="col-span-2 text-center">Status Summary</div>
                <div className="col-span-3 text-right">Attendance Vitality</div>
              </div>

              <div className="divide-y divide-white/5">
                {selectedBatch.students.map(student => (
                  <div key={student.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-0 items-center px-6 py-6 md:px-8 hover:bg-white/[0.02] transition-colors group">
                    {/* Student Info */}
                    <div className="col-span-1 md:col-span-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-accent-pink/20 flex items-center justify-center font-bold text-primary-light text-lg border border-white/5 group-hover:scale-105 transition-transform">
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block font-bold text-white text-base md:text-lg font-display tracking-tight truncate">{student.name}</span>
                        <span className="text-[9px] md:text-[10px] text-secondary/60 uppercase font-bold tracking-widest block md:hidden">Roll: {student.rollNo}</span>
                        <span className="hidden md:block text-[10px] text-secondary/60 uppercase font-bold tracking-widest">Active Member</span>
                      </div>
                    </div>

                    {/* Roll No (Desktop Only) */}
                    <div className="hidden md:block col-span-2 font-medium text-secondary">
                      <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/5">{student.rollNo}</span>
                    </div>

                    {/* Status Summary */}
                    <div className="col-span-1 md:col-span-2 flex md:block items-center justify-between md:text-center px-2 py-1 md:py-0 rounded-lg md:rounded-none bg-white/5 md:bg-transparent">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-secondary/40 md:hidden">Current Status</span>
                      <div className="flex items-center md:justify-center">
                        <span className="text-base md:text-lg font-bold text-primary-light font-display">{student.presentCount}</span>
                        <span className="text-secondary/40 mx-2 text-[10px] md:text-xs">OF</span>
                        <span className="text-base md:text-lg font-medium text-secondary/60 font-display">{student.totalDays}</span>
                      </div>
                    </div>

                    {/* Vitality (Progress or Percentage) */}
                    <div className="col-span-1 md:col-span-3">
                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-secondary/40 md:hidden">Attendance Vitality</span>
                        <div className="flex items-center gap-4">
                          <div className="hidden lg:block w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${student.totalDays > 0 ? (student.presentCount / student.totalDays) * 100 : 0}%` }}
                              className="h-full bg-gradient-to-r from-primary to-success" 
                            />
                          </div>
                          <span className="font-bold text-white font-display text-lg md:text-xl min-w-[3rem]">
                            {student.totalDays > 0 ? Math.round((student.presentCount / student.totalDays) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {selectedBatch.students.length === 0 && (
                  <div className="px-6 py-12 text-center text-secondary/50 font-medium">
                    No students imported. Please upload an Excel sheet.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {view === 'attendance' && selectedBatch && (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            {currentStudent ? (
              <div className="w-full flex flex-col items-center">
                <div className="mb-8 text-center">
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Marking Attendance</span>
                  <div className="text-lg font-bold text-slate-400 mt-1">
                    {currentStudentIndex + 1} of {selectedBatch.students.length}
                  </div>
                </div>
                <AttendanceCard 
                  student={currentStudent}
                  onSwipe={(dir) => handleMarkAttendance(currentStudent.id, dir === 'right' ? 'present' : 'absent')}
                  onUndo={handleUndo}
                  canUndo={selectedBatch.records.length > 0}
                />
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
                <p className="text-slate-500 mb-8">Attendance for all students has been marked.</p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setView('batch')}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    View Report
                  </button>
                  <button 
                    onClick={handleUndo}
                    className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-3 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                  >
                    <Undo2 size={20} />
                    Undo Last
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Download Menu (Simple version) */}
      {view === 'batch' && selectedBatch && selectedBatch.students.length > 0 && (
        <button
          onClick={() => exportBatchToExcel(selectedBatch)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-success text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50 group"
          title="Download Report"
        >
          <FileSpreadsheet />
          <div className="absolute right-full mr-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Download Report
          </div>
        </button>
      )}

      {/* Add Batch Modal */}
      {isAddingBatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-xl" 
            onClick={() => setIsAddingBatch(false)} 
          />
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleAddBatch}
            className="relative glass-card rounded-5xl p-10 w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 blur-[80px] -mr-20 -mt-20" />
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-3xl font-bold font-display">New Class</h2>
              <button 
                type="button"
                onClick={() => setIsAddingBatch(false)}
                className="p-3 glass-panel rounded-2xl hover:bg-white/10 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-3 ml-1">Class Nomenclature</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. Advanced Physics — Grade 12"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-lg font-medium placeholder:text-secondary/30"
                />
              </div>
              <button 
                type="submit"
                className="btn-primary w-full py-5 text-lg"
              >
                Assemble Batch
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}

export default App;
