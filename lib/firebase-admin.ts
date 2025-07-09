import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

let adminApp: App

if (!getApps().length) {
    adminApp = initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    })
} else {
    adminApp = getApps()[0]
}

export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)

// Server-side utilities for Firestore operations
export class FirestoreService {
    // Messages
    static async saveMessage(message: any) {
        try {
            const docRef = await adminDb.collection("messages").add({
                ...message,
                timestamp: new Date(),
            })
            return { success: true, id: docRef.id }
        } catch (error: any) {
            console.error("Error saving message:", error)
            return { success: false, error: error.message }
        }
    }

    static async getUserMessages(userId: string, sessionId?: string) {
        try {
            let query = adminDb.collection("messages").where("userId", "==", userId)

            if (sessionId) {
                query = query.where("sessionId", "==", sessionId)
            }

            const snapshot = await query.orderBy("timestamp", "asc").get()
            const messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return { success: true, messages }
        } catch (error: any) {
            console.error("Error fetching messages:", error)
            return { success: false, error: error.message, messages: [] }
        }
    }

    // Chat Sessions
    static async saveChatSession(session: any) {
        try {
            await adminDb
                .collection("chatSessions")
                .doc(session.id)
                .set({
                    ...session,
                    timestamp: new Date(),
                })
            return { success: true }
        } catch (error: any) {
            console.error("Error saving chat session:", error)
            return { success: false, error: error.message }
        }
    }

    static async getUserChatSessions(userId: string) {
        try {
            const snapshot = await adminDb
                .collection("chatSessions")
                .where("userId", "==", userId)
                .orderBy("timestamp", "desc")
                .limit(100)
                .get()

            const sessions = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))

            return { success: true, sessions }
        } catch (error: any) {
            console.error("Error fetching chat sessions:", error)
            return { success: false, error: error.message, sessions: [] }
        }
    }

    // Memory Management
    static async saveUserMemory(userId: string, memory: any) {
        try {
            await adminDb.collection("userMemories").doc(userId).set(memory)
            return { success: true }
        } catch (error: any) {
            console.error("Error saving user memory:", error)
            return { success: false, error: error.message }
        }
    }

    static async getUserMemory(userId: string) {
        try {
            const doc = await adminDb.collection("userMemories").doc(userId).get()
            if (doc.exists) {
                return { success: true, memory: doc.data() }
            }
            return { success: true, memory: null }
        } catch (error: any) {
            console.error("Error fetching user memory:", error)
            return { success: false, error: error.message, memory: null }
        }
    }

    // Delete operations
    static async deleteUserMemory(userId: string) {
        try {
            await adminDb.collection("userMemories").doc(userId).delete()
            return { success: true }
        } catch (error: any) {
            console.error("Error deleting user memory:", error)
            return { success: false, error: error.message }
        }
    }

    static async deleteChatSession(sessionId: string, userId: string) {
        try {
            // Delete the session document
            await adminDb.collection("chatSessions").doc(sessionId).delete()

            // Delete all messages in this session
            const messagesQuery = adminDb
                .collection("messages")
                .where("sessionId", "==", sessionId)
                .where("userId", "==", userId)

            const messagesSnapshot = await messagesQuery.get()
            const batch = adminDb.batch()

            messagesSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref)
            })

            await batch.commit()

            return { success: true }
        } catch (error: any) {
            console.error("Error deleting chat session:", error)
            return { success: false, error: error.message }
        }
    }

    // User Preferences
    static async saveUserPreferences(userId: string, preferences: any) {
        try {
            await adminDb
                .collection("userPreferences")
                .doc(userId)
                .set({
                    ...preferences,
                    lastUpdated: new Date(),
                })
            return { success: true }
        } catch (error: any) {
            console.error("Error saving user preferences:", error)
            return { success: false, error: error.message }
        }
    }

    static async getUserPreferences(userId: string) {
        try {
            const doc = await adminDb.collection("userPreferences").doc(userId).get()
            if (doc.exists) {
                return { success: true, preferences: doc.data() }
            }
            return { success: true, preferences: { theme: "system" } }
        } catch (error: any) {
            console.error("Error fetching user preferences:", error)
            return { success: false, error: error.message, preferences: { theme: "system" } }
        }
    }
}
