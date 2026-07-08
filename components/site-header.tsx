"use client"

import { SearchForm } from "@/components/search-form"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { PanelLeftIcon } from "lucide-react"
import Link from "next/link"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <PanelLeftIcon />
        </Button>
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <div className="flex gap-3">
          <Button variant={"secondary"} asChild>
            <Link href="/dashboard">Players</Link>
          </Button>
          <Button variant={"secondary"} asChild>
            <Link href="/teams">Teams</Link>
          </Button>
        </div>
        {/* <SearchForm className="w-full sm:ml-auto sm:w-auto" /> */}
      </div>
    </header>
  )
}
