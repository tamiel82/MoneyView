import React from "react";

export default function HistoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8 pb-20 animate-in fade-in duration-300">
      <div className="space-y-6">
        {/* Tabs Skeleton */}
        <div className="flex p-1 space-x-1 bg-black/20 rounded-xl max-w-md mx-auto border border-white/5 h-12">
          <div className="flex-1 bg-white/5 rounded-lg animate-pulse"></div>
          <div className="flex-1 bg-transparent rounded-lg"></div>
        </div>

        {/* Table Skeleton */}
        <div className="w-full rounded-xl border border-white/10 bg-black/10 overflow-hidden">
          <div className="h-10 bg-white/5 border-b border-white/10"></div>
          <div className="divide-y divide-white/5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 flex items-center px-4">
                <div className="h-4 w-24 bg-white/5 rounded animate-pulse mr-8"></div>
                <div className="h-4 w-32 bg-white/5 rounded animate-pulse mr-auto"></div>
                <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
