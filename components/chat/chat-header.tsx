"use client"

import { motion } from "framer-motion"
import { Sparkles, LogIn, LogOut, Brain, Menu } from "lucide-react"
import type { User as FirebaseUser } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ChatHeaderProps {
    user: FirebaseUser | null
    onSignOut: () => void
    onAuthDialogOpen: () => void
    onMemoryDialogOpen: () => void
    onSidebarToggle: () => void
}

export function ChatHeader({
    user,
    onSignOut,
    onAuthDialogOpen,
    onMemoryDialogOpen,
    onSidebarToggle,
}: ChatHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between py-6"
        >
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onSidebarToggle} className="">
                    <Menu className="w-5 h-5" />
                </Button>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                >
                    <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </motion.div>
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                        AURA
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">Your Intelligent AI Assistant</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {user && (
                    <Button onClick={onMemoryDialogOpen} variant="outline" size="sm" className="mr-2 bg-transparent">
                        <Brain className="w-4 h-4 mr-2" />
                        Memory
                    </Button>
                )}
                {user ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={user.photoURL || ""} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                                {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                            {user.displayName || user.email}
                        </span>
                        <Button onClick={onSignOut} variant="outline" size="sm">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <Button onClick={onAuthDialogOpen} variant="outline" size="sm">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                    </Button>
                )}
            </div>
        </motion.div>
    )
}
