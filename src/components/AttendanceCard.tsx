import React from 'react';
import { motion, useMotionValue, useTransform, useSpring, type PanInfo } from 'framer-motion';
import { Check, X, Undo2 } from 'lucide-react';
import type { Student } from '../lib/types';

interface AttendanceCardProps {
  student: Student;
  onSwipe: (direction: 'left' | 'right') => void;
  onUndo: () => void;
  canUndo: boolean;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ student, onSwipe, onUndo, canUndo }) => {
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const rotate = useTransform(springX, [-200, 200], [-25, 25]);
  const opacity = useTransform(springX, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const iconOpacityLeft = useTransform(springX, [-100, -50], [1, 0]);
  const iconOpacityRight = useTransform(springX, [50, 100], [0, 1]);
  const iconScaleLeft = useTransform(springX, [-150, -50], [1.5, 0.5]);
  const iconScaleRight = useTransform(springX, [50, 150], [0.5, 1.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 150 || info.velocity.x > 500) {
      onSwipe('right');
    } else if (info.offset.x < -150 || info.velocity.x < -500) {
      onSwipe('left');
    } else {
      x.set(0);
    }
  };

  return (
    <div className="relative w-full max-w-sm aspect-[3/4] perspective-1000">
      <motion.div
        style={{ x: springX, rotate, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.02 }}
        className="absolute inset-0 glass-card rounded-5xl flex flex-col items-center justify-center p-10 cursor-grab active:cursor-grabbing overflow-hidden group select-none"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent-pink/10 opacity-30" />
        
        {/* Profile Avatar with status ring */}
        <div className="relative mb-10">
          <motion.div 
            style={{ opacity: iconOpacityRight }}
            className="absolute inset-[-8px] rounded-full border-4 border-success/30 blur-sm"
          />
          <motion.div 
            style={{ opacity: iconOpacityLeft }}
            className="absolute inset-[-8px] rounded-full border-4 border-danger/30 blur-sm"
          />
          <div className="relative w-44 h-44 rounded-full overflow-hidden bg-white/5 flex items-center justify-center border-4 border-white/10 shadow-2xl transition-all duration-500 group-hover:border-white/20">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-6xl font-bold text-white/40 font-display">
                {student.name.charAt(0)}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
          </div>
        </div>
        
        <div className="text-center relative z-10 w-full">
          <h3 className="text-4xl font-bold text-white mb-2 font-display tracking-tight">{student.name}</h3>
          <p className="text-secondary font-bold tracking-[0.2em] uppercase text-[10px] mb-10 opacity-60">Indentifier: {student.rollNo}</p>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="glass-panel p-5 rounded-3xl text-center">
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/40 mb-1">Vitality</span>
              <span className="text-3xl font-bold text-primary-light font-display">
                {student.totalDays > 0 
                  ? `${((student.presentCount / student.totalDays) * 100).toFixed(0)}%`
                  : '—'}
              </span>
            </div>
            <div className="glass-panel p-5 rounded-3xl text-center">
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/40 mb-1">Tally</span>
              <span className="text-3xl font-bold text-white/80 font-display">{student.presentCount}</span>
            </div>
          </div>
        </div>

        {/* Swipe Overlays */}
        <motion.div 
          style={{ opacity: iconOpacityRight, scale: iconScaleRight }} 
          className="absolute top-10 right-10 text-success bg-success/10 p-4 rounded-full border border-success/20 pointer-events-none"
        >
          <Check size={48} strokeWidth={3} />
        </motion.div>
        <motion.div 
          style={{ opacity: iconOpacityLeft, scale: iconScaleLeft }} 
          className="absolute top-10 left-10 text-danger bg-danger/10 p-4 rounded-full border border-danger/20 pointer-events-none"
        >
          <X size={48} strokeWidth={3} />
        </motion.div>
      </motion.div>

      {/* Manual Action Buttons */}
      <div className="absolute -bottom-28 left-0 right-0 flex justify-center items-center gap-6">
        <button
          onClick={() => onSwipe('left')}
          className="w-20 h-20 rounded-full glass-panel shadow-2xl flex items-center justify-center text-danger hover:scale-110 active:scale-95 transition-all hover:bg-danger/20 hover:border-danger/30 group"
        >
          <X size={36} className="group-hover:rotate-12 transition-transform" />
        </button>
        
        {canUndo && (
          <button
            onClick={onUndo}
            className="w-16 h-16 rounded-full glass-panel shadow-xl flex items-center justify-center text-accent-orange hover:scale-110 active:scale-95 transition-all hover:bg-accent-orange/10 hover:border-accent-orange/30 group"
            title="Revert Action"
          >
            <Undo2 size={28} className="group-hover:-rotate-45 transition-transform" />
          </button>
        )}

        <button
          onClick={() => onSwipe('right')}
          className="w-20 h-20 rounded-full glass-panel shadow-2xl flex items-center justify-center text-success hover:scale-110 active:scale-95 transition-all hover:bg-success/20 hover:border-success/30 group"
        >
          <Check size={36} className="group-hover:-rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default AttendanceCard;
