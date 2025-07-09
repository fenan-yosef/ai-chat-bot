"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Sparkles, LogIn, LogOut, Brain } from "lucide-react"
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth"
import { collection, addDoc, query, orderBy, onSnapshot, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AuthDialog } from "@/components/auth-dialog"
import { MemorySettings } from "@/components/memory-settings"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  userId?: string
  sessionId?: string
}

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm Amharic AI, your personal assistant. I can remember our conversations to provide better, more personalized help. How can I assist you today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // User just logged in - migrate anonymous messages to user account
        await migrateAnonymousMessages(firebaseUser.uid)
        // Load user's chat history
        loadChatHistory(firebaseUser.uid)
      } else {
        // User logged out - show default message
        setMessages([
          {
            id: "1",
            content:
              "Hello! I'm Amharic AI, your personal assistant. I can remember our conversations to provide better, more personalized help. How can I assist you today?",
            role: "assistant",
            timestamp: new Date(),
          },
        ])
      }
    })

    return () => unsubscribe()
  }, [])

  const migrateAnonymousMessages = async (userId: string) => {
    // Update anonymous messages to be associated with the user
    const anonymousMessages = messages.filter((msg) => msg.id !== "1" && !msg.userId)

    for (const message of anonymousMessages) {
      try {
        await addDoc(collection(db, "messages"), {
          content: message.content,
          role: message.role,
          timestamp: message.timestamp,
          userId: userId,
          sessionId: sessionId,
        })
      } catch (error) {
        console.error("Error migrating message:", error)
      }
    }
  }

  const loadChatHistory = (userId: string) => {
    const q = query(collection(db, "messages"), where("userId", "==", userId), orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userMessages: Message[] = [
        {
          id: "1",
          content:
            "Hello! I'm Amharic AI, your personal assistant. I can remember our conversations to provide better, more personalized help. How can I assist you today?",
          role: "assistant",
          timestamp: new Date(),
        },
      ]

      snapshot.forEach((doc) => {
        const data = doc.data()
        userMessages.push({
          id: doc.id,
          content: data.content,
          role: data.role,
          timestamp: data.timestamp.toDate(),
          userId: data.userId,
          sessionId: data.sessionId,
        })
      })

      setMessages(userMessages)
    })

    return unsubscribe
  }

  const saveMessage = async (message: Message) => {
    if (user) {
      try {
        await addDoc(collection(db, "messages"), {
          content: message.content,
          role: message.role,
          timestamp: message.timestamp,
          userId: user.uid,
          sessionId: sessionId,
        })
      } catch (error) {
        console.error("Error saving message:", error)
      }
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
      userId: user?.uid,
      sessionId: sessionId,
    }

    setMessages((prev) => [...prev, userMessage])
    await saveMessage(userMessage)
    setInput("")
    setIsLoading(true)
    setIsTyping(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          history: messages,
          userId: user?.uid,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data = await response.json()

      setIsTyping(false)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
        userId: user?.uid,
        sessionId: sessionId,
      }

      setMessages((prev) => [...prev, assistantMessage])
      await saveMessage(assistantMessage)
    } catch (error) {
      console.error("Error sending message:", error)
      setIsTyping(false)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
        userId: user?.uid,
        sessionId: sessionId,
      }
      setMessages((prev) => [...prev, errorMessage])
      await saveMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto max-w-4xl h-screen flex flex-col p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between py-6"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Sparkles className="w-8 h-8 text-purple-600" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Amharic AI
              </h1>
              <p className="text-gray-600 dark:text-gray-300">Your Personal AI Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <Button onClick={() => setMemoryDialogOpen(true)} variant="outline" size="sm" className="mr-2">
                <Brain className="w-4 h-4 mr-2" />
                Memory
              </Button>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600 dark:text-gray-300">{user.displayName || user.email}</span>
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => setAuthDialogOpen(true)} variant="outline" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </motion.div>

        {/* Chat Messages */}
        <div className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full p-6">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex gap-4 mb-6 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="w-10 h-10 border-2 border-purple-200">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500">
                        <Bot className="w-5 h-5 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white ml-auto"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 opacity-70 ${
                        message.role === "user" ? "text-purple-100" : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </motion.div>

                  {message.role === "user" && (
                    <Avatar className="w-10 h-10 border-2 border-blue-200">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500">
                        <User className="w-5 h-5 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex gap-4 mb-6"
                >
                  <Avatar className="w-10 h-10 border-2 border-purple-200">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500">
                      <Bot className="w-5 h-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0.4 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Input Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={sendMessage}
          className="mt-4 flex gap-2"
        >
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="pr-12 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-white/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </motion.form>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      <MemorySettings open={memoryDialogOpen} onOpenChange={setMemoryDialogOpen} userId={user?.uid || null} />

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
