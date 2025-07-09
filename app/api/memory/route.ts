import { type NextRequest, NextResponse } from "next/server"
import { FirestoreService } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  try {
    const result = await FirestoreService.getUserMemory(userId)

    if (result.success) {
      if (result.memory) {
        // Convert Firestore timestamps to ISO strings for client
        const memories = result.memory.memories.map((m: any) => ({
          ...m,
          timestamp: m.timestamp.toDate ? m.timestamp.toDate().toISOString() : m.timestamp,
        }))
        return NextResponse.json({ memories })
      } else {
        return NextResponse.json({ memories: [] })
      }
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Error fetching memories:", error)
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, memories } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const memoryData = {
      userId,
      memories: memories.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
      lastUpdated: new Date(),
      totalMemories: memories.length,
      storageUsed: JSON.stringify(memories).length,
      storageLimit: 1024 * 1024, // 1MB
    }

    const result = await FirestoreService.saveUserMemory(userId, memoryData)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Error updating memories:", error)
    return NextResponse.json({ error: "Failed to update memories" }, { status: 500 })
  }
}
