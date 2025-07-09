import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId } = await request.json()
        const sessionId = params.id

        if (!userId || !sessionId) {
            return NextResponse.json({ error: "User ID and Session ID required" }, { status: 400 })
        }

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

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting session:", error)
        return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
    }
}
