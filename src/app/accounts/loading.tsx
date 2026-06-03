import { Landmark } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Skeleton Page Title */}
      <div className="h-8 w-48 bg-white/5 rounded-xl border border-white/5" />

      {/* Render 3 Mock Account Cards */}
      {[1, 2, 3].map((cardIdx) => (
        <div 
          key={cardIdx} 
          className="glass-card rounded-2xl overflow-hidden border border-white/5 p-5 flex flex-col gap-6"
        >
          {/* Mock Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-white/20" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-32 bg-white/10 rounded-md" />
                <div className="h-3.5 w-20 bg-white/5 rounded-md" />
              </div>
            </div>
            <div className="h-9 w-24 bg-white/5 rounded-xl border border-white/5" />
          </div>

          {/* Mock Table Header (Hidden on Mobile) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b border-white/5">
            <div className="col-span-3"><div className="h-3 w-16 bg-white/5 rounded" /></div>
            <div className="col-span-2 text-right"><div className="h-3 w-12 bg-white/5 rounded ml-auto" /></div>
            <div className="col-span-2 text-right"><div className="h-3 w-16 bg-white/5 rounded ml-auto" /></div>
            <div className="col-span-3 text-right"><div className="h-3 w-20 bg-white/5 rounded ml-auto" /></div>
            <div className="col-span-2 text-right"><div className="h-3 w-12 bg-white/5 rounded ml-auto" /></div>
          </div>

          {/* Mock Rows */}
          <div className="space-y-4">
            {/* Sub-account Header */}
            <div className="h-4 w-40 bg-white/5 rounded border border-white/5" />
            
            {[1, 2].map((rowIdx) => (
              <div 
                key={rowIdx} 
                className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center p-4 rounded-xl bg-white/2 border border-white/5/5"
              >
                <div className="col-span-3 space-y-1.5 w-full">
                  <div className="h-4.5 w-3/4 bg-white/10 rounded" />
                  <div className="h-3 w-1/2 bg-white/5 rounded" />
                </div>
                <div className="col-span-2 w-full md:text-right">
                  <div className="h-4 w-12 bg-white/5 rounded md:ml-auto" />
                </div>
                <div className="col-span-2 w-full md:text-right">
                  <div className="h-4 w-16 bg-white/5 rounded md:ml-auto" />
                </div>
                <div className="col-span-3 w-full md:text-right space-y-1 md:items-end flex flex-col">
                  <div className="h-4.5 w-20 bg-white/10 rounded" />
                  <div className="h-3 w-16 bg-white/5 rounded" />
                </div>
                <div className="col-span-2 w-full md:text-right flex md:justify-end">
                  <div className="h-4 w-12 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
