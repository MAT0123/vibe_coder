import { NextResponse } from 'next/server'
import { getCollection } from '@/app/lib/db'
import { Project } from '@/app/lib/models'
import { ObjectId } from 'mongodb'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { type = 'static' } = await request.json()
    
    const projects = await getCollection('projects')
    const project = await projects.findOne({ _id: new ObjectId(id) }) as Project | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update status to building
    await projects.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'building', updatedAt: new Date() } }
    )

    let deploymentUrl: string | undefined

    if (type === 'static') {
      // Static deployment: files are served by our middleware
      // The URL is the subdomain or custom domain
      let host = process.env.APP_DOMAIN || 'localhost:3000'
      // Strip any leading protocol to prevent protocol duplication
      host = host.replace(/^https?:\/\//, '')
      deploymentUrl = project.customDomain
        ? `https://${project.customDomain}`
        : `https://${project.subdomain}.${host}`
    } else if (type === 'vercel') {
      const { deployToVercel } = await import('@/app/lib/vercel-deploy')
      const vercelDeployment = await deployToVercel(id)
      deploymentUrl = `https://${vercelDeployment.url}`
    }

    await projects.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'deployed',
          deploymentUrl,
          deploymentType: type,
          updatedAt: new Date()
        } 
      }
    )

    return NextResponse.json({
      projectId: id,
      deploymentUrl,
      type,
      status: 'deployed',
    })
  } catch (error) {
    console.error('Deploy failed:', error)
    return NextResponse.json(
      { error: 'Deployment failed' },
      { status: 500 }
    )
  }
}
