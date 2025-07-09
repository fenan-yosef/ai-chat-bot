import { type NextRequest, NextResponse } from "next/server"
import { FirestoreService } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
    try {
        const { sessions, userId } = await request.json()

        if (!userId || !Array.isArray(sessions)) {
            return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
        }

        const results = []

        for (const session of sessions) {
            try {
                // Save chat session
                await FirestoreService.saveChatSession({
                    id: session.id,
                    title: session.title,
                    lastMessage: session.lastMessage,
                    userId,
                    messageCount: session.messages.length,
                })

                // Save all messages in the session
                for (const message of session.messages) {
                    if (message.id !== "1") {
                        // Skip default message
                        await FirestoreService.saveMessage({
                            content: message.content,
                            role: message.role,
                            userId,
                            sessionId: session.id,
                            timestamp: new Date(message.timestamp),
                        })
                    }
                }

                results.push({ sessionId: session.id, success: true })
            } catch (error) {
                console.error(`Error syncing session ${session.id}:`, error)
                results.push({ sessionId: session.id, success: false, error: error instanceof Error ? error.message : "Unknown error" })
            }
        }

        return NextResponse.json({ results })
    } catch (error) {
        console.error("Error in sync API:", error)
        return NextResponse.json({ error: "Failed to sync sessions" }, { status: 500 })
    }
}
