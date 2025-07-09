"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import ChatBot from "@/app/page"

export default function ChatPage() {
    const params = useParams()
    const router = useRouter()
    const chatId = params.id as string

    // Redirect to main page with chat ID as state
    useEffect(() => {
        if (chatId) {
            // Store the chat ID for the main component to pick up
            sessionStorage.setItem("selectedChatId", chatId)
            router.replace("/")
        }
    }, [chatId, router])

    return <ChatBot />
}
