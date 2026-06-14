import { NextResponse } from 'next/server'
import { getCollection } from '@/app/lib/db'
import { Project } from '@/app/lib/models'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const host = searchParams.get('__host') || searchParams.get('host') || request.headers.get('host') || ''
    const hostname = host.split(':')[0]
    
    // Extract path from the URL (the [...path] catch-all)
    const url = new URL(request.url)
    const pathMatch = url.pathname.match(/^\/api\/serve(\/.*)?$/)
    let path = pathMatch ? pathMatch[1] || '/' : '/'
    
    if (path === '/') path = '/index.html'
    if (!path.startsWith('/')) path = '/' + path

    const projects = await getCollection('projects')
    
    // Look up project by subdomain or custom domain
    const appDomain = process.env.APP_DOMAIN || 'localhost'
    let project = null as Project | null
    
    // Check if it's a subdomain (abc123.yourapp.com)
    if (hostname.endsWith(appDomain)) {
      const subdomain = hostname.replace(`.${appDomain}`, '').split('.')[0]
      if (subdomain && subdomain !== 'www' && subdomain !== appDomain) {
        project = await projects.findOne({ subdomain }) as Project | null
      }
    }
    
    // Check if it's a custom domain
    if (!project) {
      project = await projects.findOne({ 
        customDomain: hostname,
        customDomainVerified: true 
      }) as Project | null
    }

    if (!project) {
      return new NextResponse('Project not found', { status: 404 })
    }

    // If deployed externally (Vercel/AWS), proxy to that URL
    if (project.deploymentUrl && project.deploymentType !== 'static') {
      const targetUrl = new URL(path, project.deploymentUrl)
      const proxyResponse = await fetch(targetUrl, {
        headers: {
          ...Object.fromEntries(request.headers),
          host: targetUrl.hostname,
        },
      })
      
      return new NextResponse(proxyResponse.body, {
        status: proxyResponse.status,
        headers: proxyResponse.headers,
      })
    }

    // Serve static files from the project
    const fileContent = project.files[path] || 
                       project.files[path.slice(1)] || // try without leading slash
                       project.files[path + '/index.html'] || // try index.html in folder
                       project.files['/index.html'] || // fallback to root
                       project.files['index.html']

    if (!fileContent) {
      return new NextResponse(`File not found: ${path}`, { status: 404 })
    }

    // Determine content type
    const contentType = path.endsWith('.css') ? 'text/css' :
                       path.endsWith('.js') ? 'application/javascript' :
                       path.endsWith('.json') ? 'application/json' :
                       path.endsWith('.png') ? 'image/png' :
                       path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'image/jpeg' :
                       path.endsWith('.svg') ? 'image/svg+xml' :
                       'text/html'

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('Serve error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
