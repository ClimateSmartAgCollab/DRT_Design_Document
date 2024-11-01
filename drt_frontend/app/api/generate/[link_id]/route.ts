// app/api/generate/[link_id]/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request, context: { params: Promise<{ link_id: string }> }) {
  const { link_id } = await context.params; // Await params here
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  try {
    const response = await fetch(`${baseUrl}/generate_nlinks/${link_id}/`, {
      credentials: 'include',
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const errorText = await response.text();
      console.error('Unexpected response format:', errorText);
      return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to generate link:', error);
    return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
  }
}
