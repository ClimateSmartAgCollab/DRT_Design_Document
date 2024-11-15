import { NextResponse } from 'next/server';
import fetchApi from '@/app/api/apiHelper';

export async function GET() {
  try {
    const response = await fetchApi('/datastore/load-data/');
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load data from Django:', error);
    return NextResponse.json(
      { error: 'Failed to load data from Django' },
      { status: 500 }
    );
  }
}
