import { NextResponse } from 'next/server'
import { getCollection } from '@/app/lib/db'
import { Project, DomainVerification } from '@/app/lib/models'
import { ObjectId } from 'mongodb'
import { nanoid } from 'nanoid'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { domain } = await request.json()

    if (!domain || !isValidDomain(domain)) {
      return NextResponse.json(
        { error: 'Valid domain is required' },
        { status: 400 }
      )
    }

    const projects = await getCollection('projects')
    const project = await projects.findOne({ _id: new ObjectId(id) }) as Project | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if domain is already used
    const existing = await projects.findOne({ customDomain: domain }) as Project | null
    if (existing && existing._id !== project._id) {
      return NextResponse.json(
        { error: 'Domain is already in use' },
        { status: 409 }
      )
    }

    const token = nanoid(32)
    const cnameTarget = `cname.${process.env.APP_DOMAIN || 'yourapp.com'}`

    const domains = await getCollection('domains')
    await domains.updateOne(
      { projectId: id },
      {
        $set: {
          projectId: id,
          domain,
          verified: false,
          verificationToken: token,
          cnameTarget,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )

    await projects.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          customDomain: domain,
          customDomainVerified: false,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      projectId: id,
      domain,
      cnameTarget,
      verificationToken: token,
      instructions: {
        type: 'CNAME',
        name: domain,
        value: cnameTarget,
        message: `Add a CNAME record for ${domain} pointing to ${cnameTarget}`,
      },
    })
  } catch (error) {
    console.error('Domain add failed:', error)
    return NextResponse.json(
      { error: 'Failed to add domain' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const verify = searchParams.get('verify')

    if (verify === 'true') {
      // Verification logic
    const domains = await getCollection('domains')
      const domainDoc = await domains.findOne({ projectId: id })

      if (!domainDoc) {
        return NextResponse.json({ error: 'No domain configured' }, { status: 404 })
      }

      // TODO: Actually verify DNS records (use a DNS library or external API)
      // For now, simulate verification
      const isVerified = await verifyDomain(domainDoc.domain, domainDoc.cnameTarget)

      if (isVerified) {
        const projects = await getCollection('projects')
        await projects.updateOne(
          { _id: new ObjectId(id) },
          { $set: { customDomainVerified: true, updatedAt: new Date() } }
        )
        await domains.updateOne(
          { projectId: id },
          { $set: { verified: true } }
        )
      }

      return NextResponse.json({
        projectId: id,
        domain: domainDoc.domain,
        verified: isVerified,
      })
    }

    const domains = await getCollection('domains')
    const domainDoc = await domains.findOne({ projectId: id })

    return NextResponse.json(domainDoc || { message: 'No domain configured' })
  } catch (error) {
    console.error('Domain verification failed:', error)
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    )
  }
}

function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
  return domainRegex.test(domain)
}

async function verifyDomain(domain: string, target: string): Promise<boolean> {
  // In production, use a DNS lookup library like `dns` or `dns2`
  // For now, return true to allow manual verification
  return true
}
