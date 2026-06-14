import { getCollection } from "@/app/lib/db"

export interface User {
  id: string
  email: string
  passwordHash: string
  tokenBalance: number
  createdAt: string
}

export interface Payment {
  id: string
  userId: string
  amount: number
  tokensCredited: number
  status: string
  createdAt: string
}

export const db = {
  findUserByEmail: async (email: string): Promise<User | null> => {
    const collection = await getCollection("users")
    const doc = await collection.findOne({ email: email.toLowerCase() })
    if (!doc) return null
    return {
      id: doc.id,
      email: doc.email,
      passwordHash: doc.passwordHash,
      tokenBalance: doc.tokenBalance,
      createdAt: doc.createdAt
    }
  },

  findUserById: async (id: string): Promise<User | null> => {
    const collection = await getCollection("users")
    const doc = await collection.findOne({ id })
    if (!doc) return null
    return {
      id: doc.id,
      email: doc.email,
      passwordHash: doc.passwordHash,
      tokenBalance: doc.tokenBalance,
      createdAt: doc.createdAt
    }
  },

  createUser: async (email: string, passwordHash: string): Promise<User> => {
    const collection = await getCollection("users")
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 11),
      email: email.toLowerCase(),
      passwordHash,
      tokenBalance: 600000, // Generous default tokens for demo/eval
      createdAt: new Date().toISOString()
    }
    await collection.insertOne(newUser)
    return newUser
  },

  updateUserPasswordHash: async (email: string, passwordHash: string): Promise<User | null> => {
    const collection = await getCollection("users")
    await collection.updateOne(
      { email: email.toLowerCase() },
      { $set: { passwordHash } }
    )
    return db.findUserByEmail(email)
  },

  updateUserBalance: async (userId: string, tokensToChange: number): Promise<User | null> => {
    const collection = await getCollection("users")
    await collection.updateOne(
      { id: userId },
      { $inc: { tokenBalance: tokensToChange } }
    )
    
    // Ensure it doesn't go below 0
    const user = await db.findUserById(userId)
    if (user && user.tokenBalance < 0) {
      await collection.updateOne({ id: userId }, { $set: { tokenBalance: 0 } })
      user.tokenBalance = 0
    }
    return user
  },

  createPayment: async (userId: string, amount: number, tokensCredited: number): Promise<Payment> => {
    const collection = await getCollection("payments")
    const newPayment: Payment = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      amount,
      tokensCredited,
      status: "COMPLETED",
      createdAt: new Date().toISOString()
    }
    await collection.insertOne(newPayment)

    const usersCol = await getCollection("users")
    await usersCol.updateOne(
      { id: userId },
      { $inc: { tokenBalance: tokensCredited } }
    )

    return newPayment
  }
}
