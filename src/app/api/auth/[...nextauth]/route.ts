import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails = process.env.ALLOWED_EMAILS 
  ? process.env.ALLOWED_EMAILS.split(",").map(e => e.trim().toLowerCase()) 
  : [];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const currentAllowed = process.env.ALLOWED_EMAILS 
        ? process.env.ALLOWED_EMAILS.split(",").map(e => e.trim().toLowerCase()) 
        : [];
      
      console.log("==== LOGIN ATTEMPT ====");
      console.log("User email:", user.email);
      console.log("Allowed emails:", currentAllowed);
      
      if (user.email && currentAllowed.includes(user.email.toLowerCase())) {
        return true;
      }
      // Return false to display "AccessDenied"
      return false;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
