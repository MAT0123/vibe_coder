import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'lovable-clone'

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

export async function getClient(): Promise<MongoClient> {
  if (clientPromise) return clientPromise
  
  client = new MongoClient(uri)
  clientPromise = client.connect()
  return clientPromise
}

export async function getDb(): Promise<Db> {
  const activeClient = await getClient()
  return activeClient.db(dbName)
}

export async function getCollection(name: string) {
  const database = await getDb()
  return database.collection(name)
}
