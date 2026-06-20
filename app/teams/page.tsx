import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Page() {
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4 h-full">
              <div className="flex-1 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-muted/50" />
                <div className="rounded-xl bg-muted/50" />
                <div className="rounded-xl bg-muted/50" />
              </div>
              <div className="flex-1 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-muted/50" />
                <div className="rounded-xl bg-muted/50" />
                <div className="rounded-xl bg-muted/50" />
              </div>
              <div className="flex-1 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-muted/50" />
                <div className="rounded-xl bg-muted/50" />
                <div className="rounded-xl bg-muted/50" />
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
