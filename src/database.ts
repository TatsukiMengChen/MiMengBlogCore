import { MongoClient } from 'mongodb'

const uri = 'mongodb+srv://Test:8iswnlr9gX4kSOMy@mimeng.rn5kp6h.mongodb.net/'
const client = new MongoClient(uri)

let db: any = null

export async function connectToDatabase(): Promise<void> {
  await client.connect()
  db = client.db('MiMengBlog')
}

export function getDatabase(): any {
  return db
}
