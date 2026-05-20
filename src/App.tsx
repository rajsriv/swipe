import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, Upload, FileSpreadsheet, X, Folder, Check, Undo2, Menu as MenuIcon } from 'lucide-react';
import { useAttendance } from './hooks/useAttendance';
import { parseExcel, exportBatchToExcel, exportAttendanceSheetToExcel } from './lib/excel-utils';
import BatchCard from './components/BatchCard';
import AttendanceCard from './components/AttendanceCard';
import StudentReport from './components/StudentReport';


function App() {
  const { batches, addBatch, deleteBatch, syncBatchData, markAttendance, undoLastRecord, updateStudentPhoto } = useAttendance();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'batch' | 'attendance'>('dashboard');

  const navigate = (newView: 'dashboard' | 'batch' | 'attendance', batchId?: string) => {
    const targetBatchId = batchId || selectedBatchId;
    let hash = 'dashboard';
    if (newView === 'batch' && targetBatchId) hash = `batch-${targetBatchId}`;
    if (newView === 'attendance' && targetBatchId) hash = `attendance-${targetBatchId}`;
    window.location.hash = hash;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash || hash === 'dashboard') {
        setView('dashboard');
      } else if (hash.startsWith('batch-')) {
        setSelectedBatchId(hash.replace('batch-', ''));
        setView('batch');
      } else if (hash.startsWith('attendance-')) {
        setSelectedBatchId(hash.replace('attendance-', ''));
        setView('attendance');
      }
    };
    
    if (window.location.hash) {
      handleHashChange();
    } else {
      const lastView = localStorage.getItem('last_view') as any;
      const lastBatchId = localStorage.getItem('last_batch_id');
      navigate(lastView || 'dashboard', lastBatchId || undefined);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectedBatchId]);
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [exportTargetBatch, setExportTargetBatch] = useState<any>(null);
  const [swipeFlash, setSwipeFlash] = useState<'present' | 'absent' | null>(null);
  const [remainingStudentIds, setRemainingStudentIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('remaining_session_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence Effects
  useEffect(() => {
    if (selectedBatchId) localStorage.setItem('last_batch_id', selectedBatchId);
    else localStorage.removeItem('last_batch_id');
  }, [selectedBatchId]);

  useEffect(() => {
    localStorage.setItem('last_view', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('remaining_session_ids', JSON.stringify(remainingStudentIds));
  }, [remainingStudentIds]);

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const handleStartAttendance = () => {
    if (selectedBatch) {
      setRemainingStudentIds(selectedBatch.students.map(s => s.id));
      navigate('attendance');
    }
  };

  const handleMarkAttendance = (studentId: string, status: 'present' | 'absent') => {
    markAttendance(selectedBatchId!, studentId, status);
    setRemainingStudentIds(prev => prev.filter(id => id !== studentId));
    setSwipeFlash(status);
    setTimeout(() => setSwipeFlash(null), 300);
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
      const parsedData = await parseExcel(file);
      syncBatchData(selectedBatchId, parsedData);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentStudent = selectedBatch?.students.find(s => s.id === remainingStudentIds[0]) || null;
  const currentStudentIndex = selectedBatch ? (selectedBatch.students.length - remainingStudentIds.length) : -1;


  return (
    <div className="min-h-screen text-slate-800 selection:bg-primary/30 pb-20">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#f8fafc]">
        <div 
          className={`absolute inset-0 transition-colors duration-300 ${
            swipeFlash === 'present' ? 'bg-[#00897b]/20' : 
            swipeFlash === 'absent' ? 'bg-[#d32f2f]/20' : 'bg-transparent'
          }`}
        />
        <div className="absolute top-0 left-0 w-full h-64 bg-slate-100/50" />
      </div>

      {/* Header */}
      {view !== 'batch' && (
        <header className="sticky top-0 z-50 bg-[#1565c0] shadow-lg">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {view !== 'dashboard' && (
                <button 
                  onClick={() => navigate(view === 'attendance' ? 'batch' : 'dashboard')}
                  className="p-2 text-white/80 hover:text-white transition-all active:scale-95"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-white font-display tracking-tight">
                  {view === 'dashboard' ? 'Swipe Attend' : selectedBatch?.name}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {view === 'dashboard' && (
                <button 
                  onClick={() => setIsAddingBatch(true)}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-all"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {view === 'dashboard' && (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map(batch => (
              <BatchCard 
                key={batch.id} 
                batch={batch} 
                onSelect={(id) => navigate('batch', id)}
                onDelete={deleteBatch}
                onExport={(batch) => setExportTargetBatch(batch)}
              />
            ))}
            {batches.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Folder className="opacity-50" size={40} />
                </div>
                <h2 className="text-xl font-bold mb-2 text-slate-800">No Classes Yet</h2>
                <p className="text-slate-500">Click the + button to create your first batch.</p>
              </div>
            )}
          </div>
        )}

        {view === 'batch' && selectedBatch && (
          <div className="fixed inset-0 z-[60] bg-[#f0f2f5] overflow-hidden flex flex-col">
            <StudentReport 
              batch={selectedBatch} 
              onBack={() => navigate('dashboard')} 
              onUpdateAttendance={(studentId, status, dateStr) => markAttendance(selectedBatch.id, studentId, status, dateStr)}
            />
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".xlsx,.xls" 
            />

            {/* Combined Floating Hamburger Menu */}
            <FloatingActionMenu 
              onStart={handleStartAttendance}
              onImport={() => fileInputRef.current?.click()}
              onExport={() => setExportTargetBatch(selectedBatch)}
              onBack={() => navigate('dashboard')}
              isStartDisabled={selectedBatch.students.length === 0}
            />
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
                <div className="relative w-full max-w-[340px] aspect-[4/5] mb-28">
                  {/* Layered Under Card 2 (if 3 or more remaining) */}
                  {remainingStudentIds.length > 2 && (
                    <div className="absolute inset-0 bg-white/40 rounded-[40px] shadow-md border border-slate-200/40 scale-[0.92] translate-y-8 -rotate-2 z-0 pointer-events-none" />
                  )}

                  {/* Layered Under Card 1 (if 2 or more remaining) */}
                  {remainingStudentIds.length > 1 && (
                    <div className="absolute inset-0 bg-white/80 rounded-[40px] shadow-lg border border-slate-200/60 scale-[0.96] translate-y-4 rotate-1 z-10 pointer-events-none flex flex-col items-center justify-center p-8 opacity-90">
                      <div className="w-40 h-40 rounded-full bg-slate-50 border-4 border-white shadow-md flex items-center justify-center mb-8 overflow-hidden">
                        {selectedBatch.students.find(s => s.id === remainingStudentIds[1])?.photo ? (
                          <img src={selectedBatch.students.find(s => s.id === remainingStudentIds[1])?.photo} className="w-full h-full object-cover grayscale opacity-30" />
                        ) : (
                          <div className="text-6xl font-bold text-slate-200 font-display">
                            {selectedBatch.students.find(s => s.id === remainingStudentIds[1])?.name.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <h4 className="text-3xl font-bold text-slate-300 font-display truncate w-full text-center px-4">
                        {selectedBatch.students.find(s => s.id === remainingStudentIds[1])?.name || 'Next Student'}
                      </h4>
                      <p className="text-slate-300 font-bold tracking-[0.2em] uppercase text-[9px] mt-1">
                        ID: {selectedBatch.students.find(s => s.id === remainingStudentIds[1])?.rollNo || ''}
                      </p>
                    </div>
                  )}

                  {/* Main Swipable Card */}
                  <div className="absolute inset-0 z-20">
                    <AttendanceCard 
                      key={currentStudent.id}
                      student={currentStudent}
                      onSwipe={(dir) => handleMarkAttendance(currentStudent.id, dir === 'right' ? 'present' : 'absent')}
                      onUndo={handleUndo}
                      onUpdatePhoto={(photo) => updateStudentPhoto(selectedBatchId!, currentStudent.id, photo)}
                      canUndo={selectedBatch.records.length > 0}
                    />
                  </div>
                </div>

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
                    onClick={() => navigate('batch')}
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

      {/* Add Batch Modal */}
      {isAddingBatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={() => setIsAddingBatch(false)} 
          />
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleAddBatch}
            className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-bold text-slate-800">New Class</h2>
              <button 
                type="button"
                onClick={() => setIsAddingBatch(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Class Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. Grade 10 - Section A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-lg font-medium text-slate-800 placeholder:text-slate-300"
                />
              </div>
              <button 
                type="submit"
                className="btn-primary w-full py-5 text-lg shadow-lg"
              >
                Create Batch
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* Export Modal */}
      {exportTargetBatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={() => setExportTargetBatch(null)} 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-bold text-slate-800">Export Report</h2>
              <button 
                onClick={() => setExportTargetBatch(null)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4 relative z-10">
              <button 
                onClick={() => { exportBatchToExcel(exportTargetBatch); setExportTargetBatch(null); }}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Standard Sheet</h3>
                  <p className="text-sm text-slate-500">Summary with total sessions & vitality</p>
                </div>
              </button>

              <button 
                onClick={() => { exportAttendanceSheetToExcel(exportTargetBatch); setExportTargetBatch(null); }}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-success hover:bg-success/5 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Attendance Sheet</h3>
                  <p className="text-sm text-slate-500">Daily P/A breakdown separated by month</p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function FloatingActionMenu({ onStart, onImport, onExport, onBack, isStartDisabled }: { 
  onStart: () => void, 
  onImport: () => void, 
  onExport: () => void, 
  onBack: () => void,
  isStartDisabled: boolean 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: <Check size={20} />, label: 'Start Session', onClick: onStart, color: 'bg-blue-600', disabled: isStartDisabled },
    { icon: <Upload size={20} />, label: 'Import Data', onClick: onImport, color: 'bg-emerald-600' },
    { icon: <FileSpreadsheet size={20} />, label: 'Export Report', onClick: onExport, color: 'bg-amber-600' },
    { icon: <ChevronLeft size={20} />, label: 'Back', onClick: onBack, color: 'bg-slate-600' },
  ];

  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="flex flex-col items-end gap-3 mb-2"
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => { item.onClick(); setIsOpen(false); }}
                disabled={item.disabled}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-white shadow-lg transition-all active:scale-95 ${item.color} ${item.disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:brightness-110'}`}
              >
                <span className="font-bold text-sm whitespace-nowrap">{item.label}</span>
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20">
                  {item.icon}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 ${isOpen ? 'bg-slate-800 rotate-90' : 'bg-[#1565c0]'}`}
      >
        {isOpen ? <X className="text-white" size={32} /> : <MenuIcon className="text-white" size={32} />}
      </button>
    </div>
  );
}

export default App;
