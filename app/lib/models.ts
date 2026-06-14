import { ObjectId } from 'mongodb'

export interface Project {
  _id?: ObjectId
  userId: string
  name: string
  subdomain: string
  customDomain?: string
  customDomainVerified: boolean
  files: Record<string, string>
  deploymentUrl?: string
  deploymentType: 'static' | 'vercel' | 'aws'
  status: 'draft' | 'building' | 'deployed'
  createdAt: Date
  updatedAt: Date
}

export interface DomainVerification {
  projectId: string
  domain: string
  verified: boolean
  verificationToken: string
  cnameTarget: string
  createdAt: Date
}
