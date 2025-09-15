import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AdminNavbar } from "@/features/admin/components/admin-navbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgRole } = await auth();

  // Redirect if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // TODO: Add proper admin role checking
  // For now, check if user has admin/org_admin role
  const isAdmin = orgRole === "org:admin" || orgRole === "admin";
  
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      <div className="flex w-full h-full">
        <div className="fixed left-0 top-0 hidden lg:block lg:w-[264px] h-full overflow-y-auto">
          <AdminSidebar />
        </div>
        <div className="lg:pl-[264px] w-full">
          <div className="mx-auto max-w-screen-2xl h-full">
            <AdminNavbar />
            <main className="h-full py-8 px-6 flex flex-col">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}