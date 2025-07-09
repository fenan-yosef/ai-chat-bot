"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Bot, User } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Message } from "@/types/chat"
import { forwardRef } from "react"

interface ChatMessagesProps {
    messages: Message[]
    isTyping: boolean
}

const formatTime = (date: Date | string) => {
    const validDate = typeof date === "string" ? new Date(date) : date
    if (isNaN(validDate.getTime())) {
        return "Now"
    }
    return validDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    })
}

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(({ messages, isTyping }, ref) => {
    return (
        <div className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
            <ScrollArea ref={ref} className="h-full p-6">
                <div className="flex flex-col-reverse">
                    <AnimatePresence>
                        {messages
                            .slice()
                            .reverse()
                            .map((message, index) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                    className={`flex gap-4 mb-6 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {message.role === "assistant" && (
                                        <Avatar className="w-10 h-10 border-2 border-purple-200 dark:border-purple-700">
                                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500">
                                                <Bot className="w-5 h-5 text-white" />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}

                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.role === "user"
                                                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white ml-auto"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                        <p
                                            className={`text-xs mt-2 opacity-70 ${message.role === "user" ? "text-purple-100" : "text-gray-500 dark:text-gray-400"
                                                }`}
                                        >
                                            {formatTime(message.timestamp)}
                                        </p>
                                    </motion.div>

                                    {message.role === "user" && (
                                        <Avatar className="w-10 h-10 border-2 border-blue-200 dark:border-blue-700">
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500">
                                                <User className="w-5 h-5 text-white" />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </motion.div>
                            ))}
                    </AnimatePresence>

                    {/* Typing Indicator */}
                    <AnimatePresence>
                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex gap-4 mb-6"
                            >
                                <Avatar className="w-10 h-10 border-2 border-purple-200 dark:border-purple-700">
                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500">
                                        <Bot className="w-5 h-5 text-white" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                                    <div className="flex gap-1">
                                        {[0, 0.2, 0.4].map((delay, index) => (
                                            <motion.div
                                                key={index}
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay }}
                                                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </ScrollArea>
        </div>
    )
})

ChatMessages.displayName = "ChatMessages"
