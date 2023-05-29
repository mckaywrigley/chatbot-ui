import { NextResponse } from 'next/server';

import Prisma from '@/lib/prisma';

export async function GET() {
  const folders = await Prisma.folder.findMany({
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const { folders } = await request.json();

  for await (const folder of folders) {
    await Prisma.folder.upsert({
      where: { id: folder.id },
      update: folder,
      create: folder,
    });
  }

  return NextResponse.json({ status: 'ok' });
}

export async function DELETE() {
  await Prisma.folder.deleteMany({});

  return NextResponse.json({ status: 'ok' });
}
