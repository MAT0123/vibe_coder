import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/authMiddleware"

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        tokenBalance: user.tokenBalance
      }
    })
  } catch (err: any) {
    console.error("Auth status error:", err)
    return NextResponse.json({ user: null })
  }
}
