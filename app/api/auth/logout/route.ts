import { NextResponse } from "next/server"

export async function POST() {
  try {
    const response = NextResponse.json({ success: true })
    
    // Clear the token cookie
    response.cookies.set({
      name: "token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/"
    })

    // Clear the vibe_session cookie
    response.cookies.set({
      name: "vibe_session",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/"
    })

    return response
  } catch (err: any) {
    console.error("Logout error:", err)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
export async function GET() {
  return POST()
}
