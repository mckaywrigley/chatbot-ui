import { NextResponse } from 'next/server';

import Prisma from '@/lib/prisma';

export async function GET() {
  const prompts = await Prisma.prompt.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      content: true,
      model: true,
      folderId: true,
    },
  });

  return NextResponse.json(prompts);
}

export async function POST(request: Request) {
  const { prompts } = await request.json();

  for await (const prompt of prompts) {
    await Prisma.prompt.upsert({
      where: { id: prompt.id },
      update: prompt,
      create: prompt,
    });
  }

  return NextResponse.json({ status: 'ok' });
}

export async function DELETE() {
  await Prisma.prompt.deleteMany({});

  return NextResponse.json({ status: 'ok' });
}
