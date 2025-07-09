import { type NextRequest, NextResponse } from "next/server"
import { FirestoreService } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    try {
        const result = await FirestoreService.getUserPreferences(userId)
        return NextResponse.json({ preferences: result.preferences || { theme: "system" } })
    } catch (error) {
        console.error("Error fetching user preferences:", error)
        return NextResponse.json({ preferences: { theme: "system" } })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { userId, preferences } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 })
        }

        await FirestoreService.saveUserPreferences(userId, preferences)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error saving user preferences:", error)
        return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 })
    }
}
