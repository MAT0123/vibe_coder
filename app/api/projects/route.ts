import { NextResponse } from 'next/server'
import { getCollection } from '@/app/lib/db'
import { Project } from '@/app/lib/models'
import { nanoid } from 'nanoid'

const SUBDOMAIN_LENGTH = 12

function generateSubdomain(): string {
  return nanoid(SUBDOMAIN_LENGTH).toLowerCase()
}

function unescapeFileContent(files: Record<string, string>): Record<string, string> {
  const unescaped: Record<string, string> = {}
  for (const [key, val] of Object.entries(files || {})) {
    if (typeof val === 'string') {
      unescaped[key] = val
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    } else {
      unescaped[key] = val;
    }
  }
  return unescaped;
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, userId, files } = body

    if (!name || !files) {
      return NextResponse.json(
        { error: 'Name and files are required' },
        { status: 400 }
      )
    }

    const projects = await getCollection('projects')
    
    // Ensure unique subdomain
    let subdomain: string
    let existing = null
    let attempts = 0
    
    do {
      subdomain = generateSubdomain()
      existing = await projects.findOne({ subdomain })
      attempts++
    } while (existing && attempts < 10)

    if (existing) {
      return NextResponse.json(
        { error: 'Failed to generate unique subdomain' },
        { status: 500 }
      )
    }

    const project: any = {
      userId: userId || 'anonymous',
      name,
      subdomain,
      customDomainVerified: false,
      files: unescapeFileContent(files),
      messages: body.messages || [],
      deploymentType: 'static',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await projects.insertOne(project)
    
    return NextResponse.json({
      projectId: result.insertedId,
      subdomain: project.subdomain,
      url: `https://${subdomain}.${process.env.APP_DOMAIN || 'localhost:3000'}`,
    })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    const projects = await getCollection('projects')
    const query = userId ? { userId } : {}
    
    const list = await projects
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    
    return NextResponse.json(list)
  } catch (error) {
    console.error('Failed to list projects:', error)
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    )
  }
}
