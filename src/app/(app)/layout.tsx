import { AppNav } from "@/components/app-nav";
import { isDemoMode } from "@/lib/demo";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex-1">
      <AppNav />
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:ml-56 md:pb-8">
        {isDemoMode() && (
          <p
            role="status"
            className="tabular mb-4 border border-dashed px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Demo mode: dummy data, resets on server restart
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
