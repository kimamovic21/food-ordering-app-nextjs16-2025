import { User } from '@/models/user';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import client from '@/libs/mongoConnect';

const mongoAdapter = MongoDBAdapter(client);

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: {
    ...mongoAdapter,
    createUser: async (user: any) => {
      const createdUser = await mongoAdapter.createUser(user);

      // Ensure all schema fields are present with defaults for new users
      if (createdUser) {
        const updatedUser = await User.findByIdAndUpdate(
          createdUser.id,
          {
            phone: user.phone || '',
            streetAddress: user.streetAddress || '',
            postalCode: user.postalCode || '',
            city: user.city || '',
            country: user.country || '',
            role: user.role || 'user',
            provider: user.provider || 'oauth',
          },
          { new: true }
        );
        return updatedUser || createdUser;
      }

      return createdUser;
    },
  },
  allowDangerousEmailAccountLinking: true,
  session: { strategy: 'jwt' as const },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: 'Credentials',
      id: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'test@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) return null;

        await mongoose.connect(process.env.MONGODB_URL as string);
        const user = await User.findOne({ email });

        if (!user?.password) return null;

        const passwordOk = bcrypt.compareSync(password, user.password);

        if (!passwordOk) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image || '',
          phone: user.phone || '',
          streetAddress: user.streetAddress || '',
          postalCode: user.postalCode || '',
          city: user.city || '',
          country: user.country || '',
          role: user.role || 'user',
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (!session?.user?.email) return session;

      // First, copy role from token if available
      if (token?.role) {
        session.user.role = token.role;
      }

      // Then fetch fresh data from database
      try {
        await mongoose.connect(process.env.MONGODB_URL as string);
        const userInDb = await User.findOne({ email: session.user.email });

        if (userInDb) {
          session.user.name = userInDb.name;
          session.user.image = userInDb.image;
          session.user.phone = userInDb.phone || '';
          session.user.streetAddress = userInDb.streetAddress || '';
          session.user.postalCode = userInDb.postalCode || '';
          session.user.city = userInDb.city || '';
          session.user.country = userInDb.country || '';
          session.user.role = userInDb.role || 'user';
        }
      } catch (error) {
        console.error('Error in session callback:', error);
      }

      return session;
    },

    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = (user as any)._id;
        token.email = (user as any).email;
        token.phone = (user as any).phone || '';
        token.streetAddress = (user as any).streetAddress || '';
        token.postalCode = (user as any).postalCode || '';
        token.city = (user as any).city || '';
        token.country = (user as any).country || '';
        token.role = (user as any).role || 'user';
      } else if (token.email) {
        // Refresh user data from database on each JWT callback
        try {
          await mongoose.connect(process.env.MONGODB_URL as string);
          const userInDb = await User.findOne({ email: token.email });
          if (userInDb) {
            token.role = userInDb.role || 'user';
            token.phone = userInDb.phone || '';
            token.streetAddress = userInDb.streetAddress || '';
            token.postalCode = userInDb.postalCode || '';
            token.city = userInDb.city || '';
            token.country = userInDb.country || '';
          }
        } catch (error) {
          console.error('Error fetching user data in JWT callback:', error);
        }
      }

      return token;
    },
  },

  async signIn({
    user,
    account,
  }: {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      [key: string]: any;
    };
    account?: {
      provider?: string;
      [key: string]: any;
    };
  }) {
    if (account?.provider === 'google') {
      await mongoose.connect(process.env.MONGODB_URL as string);
      const existingUser = await User.findOne({ email: user.email });

      if (existingUser) {
        // Update provider if not already set
        if (!existingUser.provider || existingUser.provider !== 'google') {
          await User.findByIdAndUpdate(existingUser._id, { provider: 'google' });
        }
      }
    }

    return true;
  },
};
