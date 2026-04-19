import React from 'react';
import { motion, useMotionValue, useTransform, useSpring, type PanInfo } from 'framer-motion';
import { Check, X, Undo2, Camera } from 'lucide-react';
import { Camera as CapCamera, CameraResultType } from '@capacitor/camera';
import type { Student } from '../lib/types';

interface AttendanceCardProps {
  student: Student;
  onSwipe: (direction: 'left' | 'right') => void;
  onUndo: () => void;
  onUpdatePhoto: (photo: string) => void;
  canUndo: boolean;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ student, onSwipe, onUndo, onUpdatePhoto, canUndo }) => {
  const handleCapturePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (student.photo) {
      const confirmOverwrite = window.confirm("A photo already exists for this student. Do you want to retake it?");
      if (!confirmOverwrite) return;
    }

    try {
      const image = await CapCamera.getPhoto({
        quality: 50,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        width: 400
      });

      if (image.base64String) {
        onUpdatePhoto(`data:image/jpeg;base64,${image.base64String}`);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };


  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const rotate = useTransform(springX, [-200, 200], [-15, 15]);
  const opacity = useTransform(springX, [-250, -200, 0, 200, 250], [0, 1, 1, 1, 0]);
  
  const iconOpacityLeft = useTransform(springX, [-100, -50], [1, 0]);
  const iconOpacityRight = useTransform(springX, [50, 100], [0, 1]);
  const iconScaleLeft = useTransform(springX, [-150, -50], [1.2, 0.5]);
  const iconScaleRight = useTransform(springX, [50, 150], [0.5, 1.2]);

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
    <div className="relative w-full max-w-[340px] aspect-[4/5] perspective-1000">
      <motion.div
        style={{ x: springX, rotate, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.02 }}
        className="absolute inset-0 bg-white rounded-[40px] flex flex-col items-center justify-center p-8 cursor-grab active:cursor-grabbing overflow-hidden shadow-2xl border border-slate-100 group select-none"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        
        {/* Profile Avatar */}
        <div className="relative mb-8">
          <div className="relative w-40 h-40 rounded-full overflow-hidden bg-slate-50 flex items-center justify-center border-4 border-white shadow-lg transition-transform duration-500 group-hover:scale-105">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-6xl font-bold text-slate-200 font-display uppercase">
                {student.name.charAt(0)}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/5 to-transparent" />
          </div>

          <button
            onClick={handleCapturePhoto}
            className="absolute bottom-1 -right-1 w-11 h-11 rounded-2xl bg-[#1565c0] flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-lg z-30"
            title="Snap Photo"
          >
            <Camera size={18} />
          </button>
        </div>

        <div className="text-center relative z-10 w-full px-2">
          <h3 className="text-3xl font-bold text-slate-800 mb-1 font-display tracking-tight leading-tight">{student.name}</h3>
          <p className="text-slate-400 font-bold tracking-[0.2em] uppercase text-[9px] mb-8">ID: {student.rollNo}</p>
          
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
              <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">Vitality</span>
              <span className="text-2xl font-bold text-[#1565c0] font-display">
                {student.totalDays > 0 
                  ? `${((student.presentCount / student.totalDays) * 100).toFixed(0)}%`
                  : '—'}
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
              <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">Tally</span>
              <span className="text-2xl font-bold text-slate-700 font-display">{student.presentCount}</span>
            </div>
          </div>
        </div>

        {/* Swipe Overlays */}
        <motion.div 
          style={{ opacity: iconOpacityRight, scale: iconScaleRight }} 
          className="absolute top-8 right-8 text-[#00897b] bg-[#00897b]/10 p-3 rounded-full border border-[#00897b]/20 pointer-events-none"
        >
          <Check size={40} strokeWidth={3} />
        </motion.div>
        <motion.div 
          style={{ opacity: iconOpacityLeft, scale: iconScaleLeft }} 
          className="absolute top-8 left-8 text-[#d32f2f] bg-[#d32f2f]/10 p-3 rounded-full border border-[#d32f2f]/20 pointer-events-none"
        >
          <X size={40} strokeWidth={3} />
        </motion.div>
      </motion.div>

      {/* Action Buttons */}
      <div className="absolute -bottom-24 left-0 right-0 flex justify-center items-center gap-5">
        <button
          onClick={() => onSwipe('left')}
          className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center text-[#d32f2f] hover:scale-110 active:scale-95 transition-all border border-slate-100"
        >
          <X size={32} />
        </button>
        
        {canUndo && (
          <button
            onClick={onUndo}
            className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-orange-500 hover:scale-110 active:scale-95 transition-all border border-slate-100"
            title="Undo"
          >
            <Undo2 size={24} />
          </button>
        )}

        <button
          onClick={() => onSwipe('right')}
          className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center text-[#00897b] hover:scale-110 active:scale-95 transition-all border border-slate-100"
        >
          <Check size={32} />
        </button>
      </div>
    </div>
  );
};

export default AttendanceCard;
