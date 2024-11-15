import { NextResponse } from 'next/server';
import fetchApi from '@/app/api/apiHelper';

export async function GET(
  request: Request,
  context: { params: { key: string } }
) {
  const { key } = await context.params; // Await params

  try {
    const response = await fetchApi(`/datastore/get_cached_data/${key}/`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load cached data from Django:', error);
    return NextResponse.json(
      { error: 'Failed to load cached data from Django' },
      { status: 500 }
    );
  }
}
