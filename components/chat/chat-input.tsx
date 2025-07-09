"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { forwardRef } from "react"

interface ChatInputProps {
    value: string
    onChange: (value: string) => void
    onSubmit: (e: React.FormEvent) => void
    disabled: boolean
    placeholder?: string
}

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
    ({ value, onChange, onSubmit, disabled, placeholder = "Type your message..." }, ref) => {
        return (
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onSubmit={onSubmit}
                className="mt-4 flex gap-2"
            >
                <div className="flex-1 relative">
                    <Input
                        ref={ref}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="pr-12 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-white/20 dark:border-gray-700/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    >
                        <Button
                            type="submit"
                            size="sm"
                            disabled={disabled || !value.trim()}
                            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </motion.div>
                </div>
            </motion.form>
        )
    },
)

ChatInput.displayName = "ChatInput"
