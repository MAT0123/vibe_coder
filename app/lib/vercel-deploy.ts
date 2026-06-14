import { getCollection } from '@/app/lib/db'
import { Project } from '@/app/lib/models'
import { ObjectId } from 'mongodb'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_API = 'https://api.vercel.com'

interface DeploymentFile {
  file: string
  data: string
  encoding?: 'base64' | 'utf-8'
}

export async function deployToVercel(projectId: string): Promise<{ url: string; deploymentId: string }> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN is not configured')
  }

  const projects = await getCollection('projects')
  const project = await projects.findOne({ _id: new ObjectId(projectId) }) as Project | null

  if (!project) {
    throw new Error('Project not found')
  }

  // Create a Vercel project if not already created
  const projectName = `vibed-${project.subdomain}`
  
  const createProjectRes = await fetch(`${VERCEL_API}/v9/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      framework: 'nextjs',
    }),
  })

  if (!createProjectRes.ok) {
    const error = await createProjectRes.text()
    throw new Error(`Failed to create Vercel project: ${error}`)
  }

  const vercelProject = await createProjectRes.json()

  // Upload files
  const files = Object.entries(project.files).map(([path, content]) => ({
    file: path,
    data: Buffer.from(content).toString('base64'),
    encoding: 'base64' as const,
  }))

  const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      project: vercelProject.id,
      files,
      target: 'production',
      framework: 'nextjs',
    }),
  })

  if (!deployRes.ok) {
    const error = await deployRes.text()
    throw new Error(`Failed to deploy: ${error}`)
  }

  const deployment = await deployRes.json()

  // Add custom domain to Vercel project if configured
  if (project.customDomain && project.customDomainVerified) {
    await addDomainToVercel(vercelProject.id, project.customDomain)
  }

  // Also add subdomain to Vercel project
  const subdomain = `${project.subdomain}.${process.env.APP_DOMAIN || 'yourapp.com'}`
  await addDomainToVercel(vercelProject.id, subdomain)

  return {
    url: deployment.url,
    deploymentId: deployment.id,
  }
}

async function addDomainToVercel(projectId: string, domain: string): Promise<void> {
  const res = await fetch(`${VERCEL_API}/v9/projects/${projectId}/domains`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  })

  if (!res.ok) {
    console.error(`Failed to add domain ${domain} to Vercel:`, await res.text())
  }
}

export async function getDeploymentStatus(deploymentId: string): Promise<string> {
  const res = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}`, {
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    },
  })

  if (!res.ok) {
    throw new Error('Failed to get deployment status')
  }

  const deployment = await res.json()
  return deployment.readyState || 'UNKNOWN'
}
