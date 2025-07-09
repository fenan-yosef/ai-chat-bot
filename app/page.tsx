"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { AuthDialog } from "@/components/auth-dialog"
import { MemorySettings } from "@/components/memory-settings"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatInput } from "@/components/chat/chat-input"
import { useChat } from "@/hooks/use-chat"
import { motion } from "framer-motion"

export default function ChatBot() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [input, setInput] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [refreshSidebar, setRefreshSidebar] = useState(0)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const chat = useChat(user, () => setRefreshSidebar((prev) => prev + 1))

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        // For reversed layout, scroll to top (which shows latest messages)
        scrollContainer.scrollTop = 0
      }
    }
  }, [chat.messages, chat.isTyping])

  // Auth state listener
  useEffect(() => {
    if (!auth) return

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
    })

    return unsubscribe
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    await chat.sendMessage(input)
    setInput("")
  }

  const handleSignOut = async () => {
    if (!auth) return
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleNewChat = () => {
    chat.createNewChat()
    setSidebarOpen(false)
  }

  const handleSelectSession = (sessionId: string) => {
    chat.selectSession(sessionId)
    setSidebarOpen(false)
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900" />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      {/* Sidebar */}
      <ChatSidebar
        user={user}
        currentSessionId={chat.currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        refreshTrigger={refreshSidebar}
      />

      <div className={`relative z-10 transition-all duration-300 ${sidebarOpen ? "lg:ml-80" : ""}`}>
        <div className="container mx-auto max-w-4xl h-screen flex flex-col p-4">
          <ChatHeader
            user={user}
            onSignOut={handleSignOut}
            onAuthDialogOpen={() => setAuthDialogOpen(true)}
            onMemoryDialogOpen={() => setMemoryDialogOpen(true)}
            onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          <ChatMessages ref={scrollAreaRef} messages={chat.messages} isTyping={chat.isTyping} />

          <ChatInput
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={handleSendMessage}
            disabled={chat.isLoading}
          />
        </div>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      <MemorySettings open={memoryDialogOpen} onOpenChange={setMemoryDialogOpen} userId={user?.uid || null} />
    </div>
  )
}
