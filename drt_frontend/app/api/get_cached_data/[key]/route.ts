import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request, { params }: { params: { key: string } }) {
  const { key } = params;

  try {
    const response = await axios.get(`http://localhost:8000/datastore/get_cached_data/${key}/`);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error(`Failed to fetch cached data for key ${key}:`, error);
    return NextResponse.json({ error: `No cached data found for key: ${key}` }, { status: 404 });
  }
}
