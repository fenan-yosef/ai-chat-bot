import type { Message } from "@/types/chat"

const STORAGE_KEYS = {
    CHAT_HISTORY: "aura_chat_history",
    CURRENT_SESSION: "aura_current_session",
    USER_PREFERENCES: "aura_user_preferences",
} as const

export interface StoredChatSession {
    id: string
    messages: Message[]
    title: string
    lastMessage: string
    timestamp: string
    isLocal: boolean
}

export class LocalStorageManager {
    static isClient = typeof window !== "undefined"

    // Chat History Management
    static saveChatSession(session: StoredChatSession): void {
        if (!this.isClient) return

        try {
            const existingSessions = this.getChatSessions()
            const updatedSessions = existingSessions.filter((s) => s.id !== session.id)
            updatedSessions.unshift(session)

            // Keep only last 50 local sessions to prevent storage overflow
            const limitedSessions = updatedSessions.slice(0, 50)
            localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(limitedSessions))
        } catch (error) {
            console.error("Failed to save chat session to local storage:", error)
        }
    }

    static getChatSessions(): StoredChatSession[] {
        if (!this.isClient) return []

        try {
            const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY)
            return stored ? JSON.parse(stored) : []
        } catch (error) {
            console.error("Failed to load chat sessions from local storage:", error)
            return []
        }
    }

    static getChatSession(sessionId: string): StoredChatSession | null {
        const sessions = this.getChatSessions()
        return sessions.find((s) => s.id === sessionId) || null
    }

    static deleteChatSession(sessionId: string): void {
        if (!this.isClient) return

        try {
            const sessions = this.getChatSessions()
            const filteredSessions = sessions.filter((s) => s.id !== sessionId)
            localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(filteredSessions))
        } catch (error) {
            console.error("Failed to delete chat session from local storage:", error)
        }
    }

    // Current Session Management
    static saveCurrentSession(sessionId: string): void {
        if (!this.isClient) return
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, sessionId)
    }

    static getCurrentSession(): string | null {
        if (!this.isClient) return null
        return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION)
    }

    // Clear all local data (useful for logout)
    static clearAllData(): void {
        if (!this.isClient) return

        Object.values(STORAGE_KEYS).forEach((key) => {
            localStorage.removeItem(key)
        })
    }

    // Sync local sessions to Firestore after authentication
    static getLocalSessionsForSync(): StoredChatSession[] {
        return this.getChatSessions().filter((session) => session.isLocal)
    }

    // Mark sessions as synced (no longer local-only)
    static markSessionsAsSynced(sessionIds: string[]): void {
        if (!this.isClient) return

        try {
            const sessions = this.getChatSessions()
            const updatedSessions = sessions.map((session) => ({
                ...session,
                isLocal: sessionIds.includes(session.id) ? false : session.isLocal,
            }))

            localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(updatedSessions))
        } catch (error) {
            console.error("Failed to mark sessions as synced:", error)
        }
    }
}
