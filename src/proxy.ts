import { withAuth } from "next-auth/middleware";

const authMiddleware = withAuth({
  pages: {
    signIn: "/api/auth/signin",
  },
});

export default authMiddleware;
export const proxy = authMiddleware;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
