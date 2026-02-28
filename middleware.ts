import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/((?!login|api/auth|api/sync|api/debug|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
}
