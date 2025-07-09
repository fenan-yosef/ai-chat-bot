"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, MessageSquare, Trash2, Moon, Sun, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "next-themes"
import type { User as FirebaseUser } from "firebase/auth"
import { LocalStorageManager } from "@/lib/local-storage"

interface ChatSession {
    id: string
    title: string
    lastMessage: string
    timestamp: Date
    userId: string
    isLocal?: boolean
}

interface ChatSidebarProps {
    user: FirebaseUser | null
    currentSessionId: string
    onNewChat: () => void
    onSelectSession: (sessionId: string) => void
    isOpen: boolean
    onToggle: () => void
    refreshTrigger?: number
}

export function ChatSidebar({
    user,
    currentSessionId,
    onNewChat,
    onSelectSession,
    isOpen,
    onToggle,
    refreshTrigger,
}: ChatSidebarProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { theme, setTheme } = useTheme()

    // Memoize loadSessions to prevent unnecessary re-renders
    const loadSessions = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            let allSessions: ChatSession[] = []

            // Always load local sessions first (faster)
            const localSessions = LocalStorageManager.getChatSessions()
            const localChatSessions: ChatSession[] = localSessions.map((session) => ({
                id: session.id,
                title: session.title,
                lastMessage: session.lastMessage,
                timestamp: new Date(session.timestamp),
                userId: user?.uid || "anonymous",
                isLocal: session.isLocal,
            }))

            allSessions = [...localChatSessions]

            // If user is authenticated, also load from Firestore (with error handling)
            if (user) {
                try {
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

                    const response = await fetch(`/api/chat/sessions?userId=${user.uid}`, {
                        signal: controller.signal,
                    })

                    clearTimeout(timeoutId)

                    if (response.ok) {
                        const data = await response.json()
                        const firestoreSessions: ChatSession[] = data.sessions.map((session: any) => ({
                            id: session.id,
                            title: session.title,
                            lastMessage: session.lastMessage,
                            timestamp: new Date(session.timestamp),
                            userId: session.userId,
                            isLocal: false,
                        }))

                        // Merge sessions, avoiding duplicates (Firestore takes precedence)
                        const sessionMap = new Map<string, ChatSession>()

                        // Add Firestore sessions first
                        firestoreSessions.forEach((session) => {
                            sessionMap.set(session.id, session)
                        })

                        // Add local sessions that aren't already in Firestore
                        localChatSessions.forEach((session) => {
                            if (!sessionMap.has(session.id)) {
                                sessionMap.set(session.id, session)
                            }
                        })

                        allSessions = Array.from(sessionMap.values())
                    } else {
                        console.warn("Failed to load Firestore sessions, using local only")
                        setError("Could not sync with cloud. Using local sessions only.")
                    }
                } catch (fetchError: any) {
                    console.warn("Error loading Firestore sessions:", fetchError.message)
                    setError("Cloud sync unavailable. Using local sessions only.")
                    // Continue with local sessions only
                }
            }

            // Sort by timestamp (most recent first)
            allSessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            setSessions(allSessions)
        } catch (error: any) {
            console.error("Error loading sessions:", error)
            setError("Failed to load chat sessions")
        } finally {
            setLoading(false)
        }
    }, [user])

    // Load sessions when user changes or component mounts
    useEffect(() => {
        loadSessions()
    }, [loadSessions])

    // Add after the existing useEffect for loadSessions
    useEffect(() => {
        if (user) {
            // Load user theme preference
            fetch(`/api/user/preferences?userId=${user.uid}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.preferences?.theme && data.preferences.theme !== theme) {
                        setTheme(data.preferences.theme)
                    }
                })
                .catch(console.error)
        }
    }, [user, setTheme])

    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            loadSessions()
        }
    }, [refreshTrigger, loadSessions])

    const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation()

        try {
            // Delete from local storage immediately
            LocalStorageManager.deleteChatSession(sessionId)

            // If user is authenticated, also try to delete from Firestore
            if (user) {
                try {
                    await fetch(`/api/chat/sessions/${sessionId}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.uid }),
                    })
                } catch (error) {
                    console.warn("Failed to delete from Firestore, but local deletion succeeded")
                }
            }

            // Update local state immediately
            setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        } catch (error) {
            console.error("Error deleting session:", error)
        }
    }

    const formatTime = (date: Date | string) => {
        const validDate = typeof date === "string" ? new Date(date) : date
        if (isNaN(validDate.getTime())) {
            return "Just now"
        }

        const now = new Date()
        const diff = now.getTime() - validDate.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))

        if (days === 0) return "Today"
        if (days === 1) return "Yesterday"
        if (days < 7) return `${days} days ago`
        return validDate.toLocaleDateString()
    }

    const handleThemeToggle = async () => {
        const newTheme = theme === "dark" ? "light" : "dark"
        setTheme(newTheme)

        if (user) {
            try {
                await fetch("/api/user/preferences", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: user.uid,
                        preferences: { theme: newTheme },
                    }),
                })
            } catch (error) {
                console.error("Failed to save theme preference:", error)
            }
        }
    }

    return (
        <>
            {/* Mobile overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={onToggle}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.div
                initial={{ x: -320 }}
                animate={{ x: isOpen ? 0 : -320 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col lg:translate-x-0"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">A</span>
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">AURA</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onToggle} className="lg:hidden">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <Button
                        onClick={onNewChat}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Chat
                    </Button>
                </div>

                {/* Chat History */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                        {error && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-4">Loading chats...</div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                No chats yet. Start a new conversation!
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <motion.div
                                    key={session.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`p-3 rounded-lg cursor-pointer group transition-colors ${currentSessionId === session.id
                                            ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`}
                                    onClick={() => onSelectSession(session.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                                <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">{session.title}</h3>
                                                {session.isLocal && (
                                                    <span className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 px-1 py-0.5 rounded">
                                                        Local
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.lastMessage}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatTime(session.timestamp)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => deleteSession(session.id, e)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" onClick={handleThemeToggle} className="w-full justify-start">
                        {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </Button>
                </div>
            </motion.div>
        </>
    )
}
