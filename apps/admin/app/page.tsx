import { HazardMap } from '../components/HazardMap';

export default function Page() {
  return (
    <main className="flex h-full flex-col">
      <header className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Bản đồ điểm cảnh báo</h1>
        <p className="text-sm text-slate-600">
          Di chuyển bản đồ để tải dữ liệu. Chấm tím là báo cáo cộng đồng (realtime).
        </p>
      </header>
      <div className="flex-1">
        <HazardMap />
      </div>
    </main>
  );
}
