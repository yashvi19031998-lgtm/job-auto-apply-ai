import { NextResponse } from 'next/server';

export async function POST(_request: Request) {
  return NextResponse.json({
    success: true,
    message: 'Not implemented yet'
  });
}
