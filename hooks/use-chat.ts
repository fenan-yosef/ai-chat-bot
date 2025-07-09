"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Message, ChatState } from "@/types/chat"
import { LocalStorageManager, type StoredChatSession } from "@/lib/local-storage"
import type { User as FirebaseUser } from "firebase/auth"

const DEFAULT_MESSAGE: Message = {
    id: "1",
    content:
        "Hello! I'm AURA, your intelligent AI assistant. I can help you with a wide variety of tasks and remember our conversations for a more personalized experience. How can I assist you today?",
    role: "assistant",
    timestamp: new Date(),
}

export function useChat(
    user: FirebaseUser | null,
    onSessionUpdate?: () => void,
    onSessionCreated?: (sessionId: string) => void,
) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // 👉 derive a stable primitive from searchParams
    const chatIdFromUrl = searchParams.get("chat") ?? null

    const [state, setState] = useState<ChatState>({
        messages: [DEFAULT_MESSAGE],
        isLoading: false,
        isTyping: false,
        currentSessionId: "",
        error: null,
    })

    // Handles initial session set-up and URL ↔ state synchronisation
    useEffect(() => {
        const initialSessionId =
            chatIdFromUrl ||
            sessionStorage.getItem("selectedChatId") ||
            LocalStorageManager.getCurrentSession() ||
            generateSessionId()

        // Clean up temp storage key
        sessionStorage.removeItem("selectedChatId")

        // If nothing actually changed, bail early to avoid loop
        if (initialSessionId === state.currentSessionId) return

        // Push sessionId into state
        setState((prev) => ({ ...prev, currentSessionId: initialSessionId }))

        // Persist the choice locally
        LocalStorageManager.saveCurrentSession(initialSessionId)

        // Ensure the browser URL reflects the session
        if (chatIdFromUrl !== initialSessionId) {
            const next = new URL(window.location.href)
            next.searchParams.set("chat", initialSessionId)
            window.history.replaceState({}, "", next.toString())
        }

        // Finally, load the messages for this session
        loadSession(initialSessionId)
    }, [chatIdFromUrl]) // ✅ runs only when the actual query param changes

    // Load session from local storage or Firestore
    const loadSession = useCallback(
        async (sessionId: string) => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }))

            try {
                // Try local storage first
                const localSession = LocalStorageManager.getChatSession(sessionId)
                if (localSession && localSession.messages.length > 1) {
                    setState((prev) => ({
                        ...prev,
                        messages: localSession.messages.map((msg) => ({
                            ...msg,
                            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                        })),
                        currentSessionId: sessionId,
                        isLoading: false,
                    }))
                    return
                }

                // If user is authenticated, try Firestore
                if (user) {
                    const response = await fetch(`/api/chat/history?sessionId=${sessionId}&userId=${user.uid}`)
                    if (response.ok) {
                        const data = await response.json()
                        if (data.messages && data.messages.length > 0) {
                            const messages = data.messages.map((msg: any) => ({
                                ...msg,
                                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                            }))
                            setState((prev) => ({
                                ...prev,
                                messages: [DEFAULT_MESSAGE, ...messages],
                                currentSessionId: sessionId,
                                isLoading: false,
                            }))
                            return
                        }
                    }
                }

                // Fallback to default
                setState((prev) => ({
                    ...prev,
                    messages: [DEFAULT_MESSAGE],
                    currentSessionId: sessionId,
                    isLoading: false,
                }))
            } catch (error) {
                console.error("Error loading session:", error)
                setState((prev) => ({
                    ...prev,
                    messages: [DEFAULT_MESSAGE],
                    currentSessionId: sessionId,
                    isLoading: false,
                    error: "Failed to load chat session",
                }))
            }
        },
        [user],
    )

    // Create new chat session
    const createNewChat = useCallback(() => {
        const newSessionId = generateSessionId()
        setState((prev) => ({
            ...prev,
            messages: [DEFAULT_MESSAGE],
            currentSessionId: newSessionId,
            error: null,
        }))
        LocalStorageManager.saveCurrentSession(newSessionId)

        // Update URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.set("chat", newSessionId)
        window.history.pushState({}, "", newUrl.toString())

        // Load the session
        loadSession(newSessionId)

        // Callback for immediate sidebar update
        onSessionCreated?.(newSessionId)
    }, [loadSession, onSessionCreated])

    // Select existing session
    const selectSession = useCallback(
        (sessionId: string) => {
            setState((prev) => ({ ...prev, currentSessionId: sessionId }))
            LocalStorageManager.saveCurrentSession(sessionId)

            // Update URL
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.set("chat", sessionId)
            window.history.pushState({}, "", newUrl.toString())

            // Load the session
            loadSession(sessionId)
        },
        [loadSession],
    )

    // Send message
    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || state.isLoading) return

            const userMessage: Message = {
                id: Date.now().toString(),
                content: content.trim(),
                role: "user",
                timestamp: new Date(),
                userId: user?.uid,
                sessionId: state.currentSessionId,
            }

            // Add user message immediately
            setState((prev) => ({
                ...prev,
                messages: [...prev.messages, userMessage],
                isLoading: true,
                isTyping: true,
                error: null,
            }))

            // Save to local storage immediately
            const updatedMessages = [...state.messages, userMessage]
            saveToLocalStorage(updatedMessages)

            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: content.trim(),
                        history: state.messages,
                        userId: user?.uid,
                        sessionId: state.currentSessionId,
                    }),
                })

                if (!response.ok) throw new Error("Failed to send message")

                const data = await response.json()

                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: data.response,
                    role: "assistant",
                    timestamp: new Date(),
                    userId: user?.uid,
                    sessionId: state.currentSessionId,
                }

                setState((prev) => ({
                    ...prev,
                    messages: [...prev.messages, assistantMessage],
                    isLoading: false,
                    isTyping: false,
                }))

                // Save complete conversation to local storage
                const finalMessages = [...updatedMessages, assistantMessage]
                saveToLocalStorage(finalMessages)

                // Save session metadata if this is the first user message
                if (state.messages.length === 1) {
                    await saveSessionMetadata(content.trim(), state.currentSessionId)
                    // Trigger sidebar refresh
                    onSessionUpdate?.()
                }
            } catch (error) {
                console.error("Error sending message:", error)
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: "I'm sorry, I encountered an error. Please try again.",
                    role: "assistant",
                    timestamp: new Date(),
                    userId: user?.uid,
                    sessionId: state.currentSessionId,
                }

                setState((prev) => ({
                    ...prev,
                    messages: [...prev.messages, errorMessage],
                    isLoading: false,
                    isTyping: false,
                    error: "Failed to send message",
                }))
            }
        },
        [state.messages, state.currentSessionId, state.isLoading, user, onSessionUpdate],
    )

    // Save session metadata
    const saveSessionMetadata = async (firstMessage: string, sessionId: string) => {
        if (!user) return

        const title = firstMessage.length > 50 ? firstMessage.substring(0, 50) + "..." : firstMessage

        try {
            await fetch("/api/chat/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    title,
                    lastMessage: firstMessage,
                    userId: user.uid,
                }),
            })
        } catch (error) {
            console.error("Error saving session metadata:", error)
        }
    }

    // Save to local storage
    const saveToLocalStorage = useCallback(
        (messages: Message[]) => {
            if (messages.length <= 1) return // Don't save if only default message

            const session: StoredChatSession = {
                id: state.currentSessionId,
                messages,
                title: getSessionTitle(messages),
                lastMessage: getLastUserMessage(messages),
                timestamp: new Date().toISOString(),
                isLocal: !user, // Mark as local if user is not authenticated
            }

            LocalStorageManager.saveChatSession(session)
        },
        [state.currentSessionId, user],
    )

    // Sync local sessions to Firestore after authentication
    const syncLocalSessions = useCallback(async () => {
        if (!user) return

        const localSessions = LocalStorageManager.getLocalSessionsForSync()
        if (localSessions.length === 0) return

        try {
            const response = await fetch("/api/chat/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessions: localSessions, userId: user.uid }),
            })

            if (response.ok) {
                const syncedSessionIds = localSessions.map((s) => s.id)
                LocalStorageManager.markSessionsAsSynced(syncedSessionIds)
            }
        } catch (error) {
            console.error("Error syncing local sessions:", error)
        }
    }, [user])

    // Sync when user authenticates
    useEffect(() => {
        if (user) {
            syncLocalSessions()
        }
    }, [user, syncLocalSessions])

    return {
        ...state,
        sendMessage,
        createNewChat,
        loadSession,
        selectSession,
    }
}

function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function getSessionTitle(messages: Message[]): string {
    const firstUserMessage = messages.find((m) => m.role === "user")
    if (!firstUserMessage) return "New Chat"

    const title = firstUserMessage.content.trim()
    return title.length > 50 ? title.substring(0, 50) + "..." : title
}

function getLastUserMessage(messages: Message[]): string {
    const userMessages = messages.filter((m) => m.role === "user")
    const lastMessage = userMessages[userMessages.length - 1]
    return lastMessage?.content.substring(0, 100) || "New conversation"
}
