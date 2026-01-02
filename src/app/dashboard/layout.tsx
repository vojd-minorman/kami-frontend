"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
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

function HeaderWrapper({ isPastHalfway, isScrolled }: { isPastHalfway: boolean; isScrolled: boolean }) {
  const { state, isMobile } = useSidebar()
  
  if (isPastHalfway) {
    // Pour le variant inset, le SidebarInset a un margin de 0.5rem (m-2)
    // On utilise les variables CSS du sidebar pour calculer la position
    return (
      <motion.header
        key="fixed-header"
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -64, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md"
        style={{
          left: isMobile 
            ? 0 
            : state === "collapsed"
            ? "calc(var(--sidebar-width-icon) + 0.5rem)"
            : "calc(var(--sidebar-width) + 0.5rem)",
          right: 0,
        }}
      >
        <HeaderContent />
      </motion.header>
    )
  }
  
  return (
    <motion.header
      key="normal-header"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
  const [isPastHalfway, setIsPastHalfway] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const scrollTop = contentRef.current.scrollTop
        const scrollHeight = contentRef.current.scrollHeight
        const clientHeight = contentRef.current.clientHeight
        const halfwayPoint = (scrollHeight - clientHeight) / 2
        
        setIsScrolled(scrollTop > 10)
        setIsPastHalfway(scrollTop > halfwayPoint)
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
      <SidebarInset className="flex flex-col min-h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          <HeaderWrapper isPastHalfway={isPastHalfway} isScrolled={isScrolled} />
        </AnimatePresence>
        <div 
          ref={contentRef}
          className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8 overflow-y-auto"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
