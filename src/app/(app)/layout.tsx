import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex-1">
      <AppNav />
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:ml-56 md:pb-8">
        {children}
      </div>
    </div>
  );
}
