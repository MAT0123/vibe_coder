import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'lovable-clone'

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (db) return db
  
  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
  }
  
  db = client.db(dbName)
  return db
}

export async function getCollection(name: string) {
  const database = await getDb()
  return database.collection(name)
}
