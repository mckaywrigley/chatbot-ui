import { NextResponse } from 'next/server';

import Prisma from '@/lib/prisma';

export async function GET() {
  const conversations = await Prisma.history.findMany({
    select: {
      id: true,
      name: true,
      messages: true,
      model: true,
      prompt: true,
      temperature: true,
      folderId: true,
    },
  });

  return NextResponse.json(conversations);
}

export async function POST(request: Request) {
  const { conversations } = await request.json();

  for await (const conversation of conversations) {
    await Prisma.history.upsert({
      where: { id: conversation.id },
      update: conversation,
      create: conversation,
    });
  }

  return NextResponse.json({ status: 'ok' });
}

export async function DELETE() {
  await Prisma.history.deleteMany({});

  return NextResponse.json({ status: 'ok' });
}
