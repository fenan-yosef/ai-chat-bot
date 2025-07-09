import { type NextRequest, NextResponse } from "next/server"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  try {
    const memoryDoc = await getDoc(doc(db, "userMemories", userId))

    if (!memoryDoc.exists()) {
      return NextResponse.json({ memories: [] })
    }

    const data = memoryDoc.data()
    const memories = data.memories.map((m: any) => ({
      ...m,
      timestamp: m.timestamp.toDate().toISOString(),
    }))

    return NextResponse.json({ memories })
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
    }

    await updateDoc(doc(db, "userMemories", userId), memoryData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating memories:", error)
    return NextResponse.json({ error: "Failed to update memories" }, { status: 500 })
  }
}
