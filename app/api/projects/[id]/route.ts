import { NextResponse } from 'next/server'
import { getCollection } from '@/app/lib/db'
import { Project } from '@/app/lib/models'
import { ObjectId } from 'mongodb'

interface RouteParams {
  params: Promise<{ id: string }>
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

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const projects = await getCollection('projects')
    const project = await projects.findOne({ _id: new ObjectId(id) }) as Project | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to get project:', error)
    return NextResponse.json({ error: 'Failed to get project' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const projects = await getCollection('projects')
    const update: any = { updatedAt: new Date() }
    
    if (body.files) update.files = unescapeFileContent(body.files)
    if (body.name) update.name = body.name
    if (body.customDomain !== undefined) update.customDomain = body.customDomain
    if (body.messages !== undefined) update.messages = body.messages
    
    const result = await projects.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const projects = await getCollection('projects')
    
    const result = await projects.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
