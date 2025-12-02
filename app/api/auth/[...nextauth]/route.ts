import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: {
          label: 'Email',
          type: 'email',
          placeholder: 'test@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials, req) {
        const user = {
          id: '1',
          name: 'J Smith',
          email: 'jsmith@example.com',
        };

        if (user) {
          return user;
        } else {
          return null;
        };
      },
    }),
  ],
};

const handler = NextAuth(authOptions);

export {
  handler as GET,
  handler as POST,
};