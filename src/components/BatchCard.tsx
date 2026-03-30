import React from 'react';
import { Folder, Trash2, Download, FileSpreadsheet } from 'lucide-react';
import type { Batch } from '../lib/types';

interface BatchCardProps {
  batch: Batch;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (batch: Batch) => void;
}

const BatchCard: React.FC<BatchCardProps> = ({ batch, onSelect, onDelete, onExport }) => {
  return (
    <div className="group relative glass-card rounded-4xl p-8 hover:bg-white/5 transition-all duration-500 flex flex-col gap-6 overflow-hidden cursor-pointer" onClick={() => onSelect(batch.id)}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/40 transition-colors" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 group-hover:rotate-6 transition-transform">
          <Folder size={32} />
        </div>
        <div className="flex gap-2 relative z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onExport(batch); }}
            className="p-3 glass-panel text-secondary hover:text-success active:scale-95 transition-all"
            title="Download Excel"
          >
            <Download size={20} />
          </button>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (window.confirm(`Are you sure you want to delete ${batch.name}?`)) {
                onDelete(batch.id); 
              }
            }}
            className="p-3 glass-panel text-secondary hover:text-danger active:scale-95 transition-all"
            title="Delete Batch"
          >
            <Trash2 size={20} />
          </button>
        </div>

      </div>

      <div className="relative z-10">
        <h3 className="text-2xl font-bold text-white mb-2 font-display">
          {batch.name}
        </h3>
        <div className="flex items-center gap-2 text-secondary text-sm font-medium">
          <div className="px-3 py-1 glass-panel rounded-full flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-primary" />
            <span>{batch.students.length} Students</span>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] text-secondary relative z-10">
        <span>Records Found</span>
        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md">{batch.records.length}</span>
      </div>
    </div>
  );
};

export default BatchCard;
