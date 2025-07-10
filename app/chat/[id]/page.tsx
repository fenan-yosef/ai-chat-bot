import { redirect } from "next/navigation"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: PageProps) {
    const { id } = await params

    // Redirect to main page with chat ID as query parameter
    redirect(`/?chat=${id}`)
}
