import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#070708]">
      {/* Sidebar — handles desktop (sticky aside) + mobile (top bar) */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#070708]">
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
