import { Calendar } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Add Button Area Mock */}
      <div className="flex justify-end">
        <div className="h-10 w-36 bg-white/5 rounded-xl border border-white/5" />
      </div>

      {/* Mock Table Card */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5 p-4 sm:p-6 flex flex-col gap-4">
        <div className="w-full overflow-x-auto rounded-xl">
          <table className="w-full border-collapse">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="w-9 py-3"><div className="h-4 w-4 bg-white/5 rounded mx-auto" /></th>
                <th className="py-3 px-2 border-r border-white/10"><div className="h-4 w-12 bg-white/5 rounded" /></th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <th key={i} className="px-4 py-3"><div className="h-4 w-16 bg-white/5 rounded ml-auto" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((rowIdx) => (
                <tr key={rowIdx} className="border-b border-white/5 bg-white/2">
                  <td className="py-4 text-center"><div className="h-4 w-4 bg-white/5 rounded mx-auto" /></td>
                  <td className="px-2 py-4 border-r border-white/10"><div className="h-4.5 w-14 bg-white/10 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-white/10 rounded ml-auto" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-white/5 rounded ml-auto" /></td>
                  <td className="px-4 py-4"><div className="h-4.5 w-20 bg-white/10 rounded ml-auto" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-white/5 rounded ml-auto" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-12 bg-white/5 rounded ml-auto" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-white/5 rounded ml-auto" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-12 bg-white/5 rounded ml-auto" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-12 bg-white/5 rounded ml-auto" /></td>
                  <td className="px-4 py-4 rounded-r-lg"><div className="h-4 w-12 bg-white/5 rounded ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
