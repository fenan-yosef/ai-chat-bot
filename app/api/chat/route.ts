import { type NextRequest, NextResponse } from "next/server"
import { FirestoreService } from "@/lib/firebase-admin"
import { MemoryManager } from "@/lib/memory-manager"
import type { MemoryItem, UserMemory } from "@/types/chat"

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
  }

  try {
    const { message, history, userId, sessionId } = await request.json()

    // Get user's memory if they're logged in
    let userMemory: UserMemory | null = null
    if (userId) {
      const memoryResult = await FirestoreService.getUserMemory(userId)
      if (memoryResult.success && memoryResult.memory) {
        userMemory = {
          userId: memoryResult.memory.userId,
          memories: memoryResult.memory.memories.map((m: any) => ({
            ...m,
            timestamp: m.timestamp.toDate ? m.timestamp.toDate() : new Date(m.timestamp),
          })),
          lastUpdated: memoryResult.memory.lastUpdated.toDate
            ? memoryResult.memory.lastUpdated.toDate()
            : new Date(memoryResult.memory.lastUpdated),
          totalMemories: memoryResult.memory.totalMemories || 0,
          storageUsed: memoryResult.memory.storageUsed || 0,
          storageLimit: memoryResult.memory.storageLimit || 1024 * 1024,
        }
      }
    }

    // Check if this is a manual memory instruction
    const isMemoryInstruction = MemoryManager.isManualMemoryInstruction(message)

    // Build memory context
    const memoryContext = userMemory ? MemoryManager.buildMemoryContext(userMemory.memories) : ""

    // Prepare conversation history
    const conversationHistory = history.slice(-10).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }))

    // Enhanced system prompt
    const systemPrompt = `You are AURA, an intelligent AI assistant. You are helpful, knowledgeable, and conversational. You respond in a friendly and professional manner.

${memoryContext ? `Here's what I remember about this user:\n${memoryContext}\n` : ""}

Guidelines:
- Provide helpful, accurate, and relevant responses
- Be conversational but professional
- Use the memory context to personalize responses when appropriate
- If the user asks you to remember something, acknowledge it and confirm you'll remember it
- If asked about capabilities you don't have, politely explain limitations
- Keep responses concise but comprehensive`

    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...conversationHistory,
      { role: "user", parts: [{ text: message }] },
    ]

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated."

    // Save message to Firestore if user is authenticated
    if (userId && sessionId) {
      await Promise.all([
        FirestoreService.saveMessage({
          content: message,
          role: "user",
          userId,
          sessionId,
        }),
        FirestoreService.saveMessage({
          content: aiResponse,
          role: "assistant",
          userId,
          sessionId,
        }),
      ])

      // Handle memory extraction and saving
      let newMemories: MemoryItem[] = []

      if (isMemoryInstruction) {
        // Handle manual memory instruction
        const manualMemory = MemoryManager.extractManualMemory(message, sessionId)
        if (manualMemory) {
          newMemories = [manualMemory]
        }
      } else {
        // Extract automatic memories
        newMemories = await MemoryManager.analyzeAndExtractMemories(message, aiResponse, userMemory, sessionId)
      }

      if (newMemories.length > 0) {
        const updatedMemories = userMemory ? [...userMemory.memories, ...newMemories] : newMemories
        const optimizedMemories = MemoryManager.optimizeMemoryStorage(updatedMemories)

        await FirestoreService.saveUserMemory(userId, {
          userId,
          memories: optimizedMemories,
          lastUpdated: new Date(),
          totalMemories: optimizedMemories.length,
          storageUsed: MemoryManager.calculateStorageUsage(optimizedMemories),
          storageLimit: 1024 * 1024, // 1MB
        })
      }
    }

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
