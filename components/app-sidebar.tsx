"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
// import { NavProjects } from "@/components/nav-projects"
// import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { TerminalSquareIcon, BotIcon, TerminalIcon, DatabaseIcon } from "lucide-react"
const data = {
  navMain: [
    {
      title: "Draflist",
      url: "#",
      icon: <TerminalSquareIcon />,
      isActive: true,
      items: [
        // {
        //   title: "History",
        //   url: "#",
        // },
        // {
        //   title: "Starred",
        //   url: "#",
        // },
        // {
        //   title: "Settings",
        //   url: "#",
        // },
      ],
    },
    {
      title: "Teams",
      url: "#",
      icon: <BotIcon />,
      items: [],
    },
    {
      title: "Import",
      url: "/import",
      icon: <DatabaseIcon />,
      items: [],
    },
  ],
  navSecondary: [
    // {
    //   title: "Support",
    //   url: "#",
    //   icon: (
    //     <LifeBuoyIcon
    //     />
    //   ),
    // },
    // {
    //   title: "Feedback",
    //   url: "#",
    //   icon: (
    //     <SendIcon
    //     />
    //   ),
    // },
  ],
  projects: [
    // {
    //   name: "Design Engineering",
    //   url: "#",
    //   icon: (
    //     <FrameIcon
    //     />
    //   ),
    // },
    // {
    //   name: "Sales & Marketing",
    //   url: "#",
    //   icon: (
    //     <PieChartIcon
    //     />
    //   ),
    // },
    // {
    //   name: "Travel",
    //   url: "#",
    //   icon: (
    //     <MapIcon
    //     />
    //   ),
    // },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TerminalIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Draft Day</span>
                  {/* <span className="truncate text-xs">Enterprise</span> */}
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
