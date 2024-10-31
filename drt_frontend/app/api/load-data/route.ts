import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const response = await axios.get('http://localhost:8000/datastore/load-data/');
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Failed to load data from Django:', error);
    return NextResponse.json({ error: 'Failed to load data from Django' }, { status: 500 });
  }
}
