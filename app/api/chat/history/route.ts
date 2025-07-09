import { type NextRequest, NextResponse } from "next/server"
import { FirestoreService } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const userId = searchParams.get("userId")

    if (!sessionId || !userId) {
        return NextResponse.json({ error: "Session ID and User ID required" }, { status: 400 })
    }

    try {
        const result = await FirestoreService.getUserMessages(userId, sessionId)

        if (result.success) {
            return NextResponse.json({ messages: result.messages })
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }
    } catch (error) {
        console.error("Error fetching chat history:", error)
        return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
    }
}
