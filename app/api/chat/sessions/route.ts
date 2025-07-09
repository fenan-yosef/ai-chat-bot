import { type NextRequest, NextResponse } from "next/server"
import { FirestoreService } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    try {
        const result = await FirestoreService.getUserChatSessions(userId)

        if (result.success) {
            return NextResponse.json({ sessions: result.sessions })
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }
    } catch (error) {
        console.error("Error fetching sessions:", error)
        return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { sessionId, title, lastMessage, userId } = await request.json()

        if (!sessionId || !userId) {
            return NextResponse.json({ error: "Session ID and User ID required" }, { status: 400 })
        }

        const result = await FirestoreService.saveChatSession({
            id: sessionId,
            title: title || "New Chat",
            lastMessage: lastMessage || "",
            userId,
            messageCount: 1,
        })

        if (result.success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }
    } catch (error) {
        console.error("Error saving session:", error)
        return NextResponse.json({ error: "Failed to save session" }, { status: 500 })
    }
}
