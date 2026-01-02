"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { UserNav } from "@/components/user-nav"
import { NotificationsNav } from "@/components/notification-nav"

function HeaderContent() {
  return (
    <>
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2 px-4">
        <NotificationsNav />
        <Separator orientation="vertical" className="h-6" />
        <UserNav />
      </div>
    </>
  )
}

function HeaderWrapper({ isScrolled }: { isScrolled: boolean }) {
  return (
    <motion.header
      key="header"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200 ease-linear ${
        isScrolled ? "shadow-md" : ""
      }`}
    >
      <HeaderContent />
    </motion.header>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const scrollTop = contentRef.current.scrollTop
        setIsScrolled(scrollTop > 10)
      }
    }

    const contentElement = contentRef.current
    if (contentElement) {
      contentElement.addEventListener("scroll", handleScroll)
      // Vérifier l'état initial
      handleScroll()
      return () => contentElement.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <SidebarProvider defaultOpen>
      
      <AppSidebar />
      <SidebarInset 
        ref={contentRef}
        className="flex flex-col h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <HeaderWrapper isScrolled={isScrolled} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
