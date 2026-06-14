import fs from "fs"
import path from "path"

const DB_FILE = path.join(process.cwd(), "database.json")

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

interface DatabaseSchema {
  users: User[]
  payments: Payment[]
}

function initDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData: DatabaseSchema = { users: [], payments: [] }
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2))
    return defaultData
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8")
    return JSON.parse(raw)
  } catch (err) {
    const defaultData: DatabaseSchema = { users: [], payments: [] }
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2))
    return defaultData
  }
}

function saveDb(data: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

export const db = {
  getUsers: (): User[] => {
    return initDb().users
  },
  
  findUserByEmail: (email: string): User | null => {
    const users = db.getUsers()
    return users.find(u => u.email === email.toLowerCase()) || null
  },

  findUserById: (id: string): User | null => {
    const users = db.getUsers()
    return users.find(u => u.id === id) || null
  },

  createUser: (email: string, passwordHash: string): User => {
    const data = initDb()
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 11),
      email: email.toLowerCase(),
      passwordHash,
      tokenBalance: 25000, // 25k tokens (equivalent to ~$0.05 USD)
      createdAt: new Date().toISOString()
    }
    data.users.push(newUser)
    saveDb(data)
    return newUser
  },

  updateUserPasswordHash: (email: string, passwordHash: string): User | null => {
    const data = initDb()
    const userIndex = data.users.findIndex(u => u.email === email.toLowerCase())
    if (userIndex === -1) return null

    data.users[userIndex].passwordHash = passwordHash
    saveDb(data)
    return data.users[userIndex]
  },

  updateUserBalance: (userId: string, tokensToChange: number): User | null => {
    const data = initDb()
    const userIndex = data.users.findIndex(u => u.id === userId)
    if (userIndex === -1) return null

    data.users[userIndex].tokenBalance += tokensToChange
    // Clamp to 0
    if (data.users[userIndex].tokenBalance < 0) {
      data.users[userIndex].tokenBalance = 0
    }

    saveDb(data)
    return data.users[userIndex]
  },

  createPayment: (userId: string, amount: number, tokensCredited: number): Payment => {
    const data = initDb()
    const newPayment: Payment = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      amount,
      tokensCredited,
      status: "COMPLETED",
      createdAt: new Date().toISOString()
    }
    data.payments.push(newPayment)
    
    // Auto increment user balance
    const userIndex = data.users.findIndex(u => u.id === userId)
    if (userIndex !== -1) {
      data.users[userIndex].tokenBalance += tokensCredited
    }
    
    saveDb(data)
    return newPayment
  }
}
