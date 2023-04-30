import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { getDataSource, getUser } from '../../../utils/server/rdbms';
import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import { RDBMSFolder, RDBMSUser } from '../../../types/rdbms';
import { FolderInterface } from '@/types/folder';

import { authOptions } from '../auth/[...nextauth]';

import { DataSource } from 'typeorm';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  let userId = '';
  if (NEXT_PUBLIC_NEXTAUTH_ENABLED) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'User is not authenticated' });
    } else if (!session.user) {
      return res.status(401).json({ error: 'User is not authenticated' });
    } else if (!session.user.email) {
      return res
        .status(401)
        .json({ error: 'User does not have an email address' });
    }
    userId = session.user.email;
  } else {
    userId = 'test_user';
  }

  const dataSource = await getDataSource();
  const user = await getUser(dataSource, userId);

  let body: any | null = null;
  if (req.body !== '') {
    body = JSON.parse(req.body);
  }

  if (req.method === 'POST') {
    const newFolder = body;
    if (newFolder !== null) {
      return await rdbmsCreateFolder(res, dataSource, user, newFolder);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No name or folder_type provided' });
    }
  } else if (req.method === 'PUT') {
    const updatedFolder = body;
    if (updatedFolder !== null) {
      return await rdbmsUpdateFolder(res, dataSource, user, updatedFolder);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No name or folder_id provided' });
    }
  } else if (req.method === 'DELETE') {
    const folderId = body['folder_id'];
    if (folderId !== undefined) {
      return await rdbmsDeleteFolder(res, dataSource, user, folderId);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No folder_id provided' });
    }
  } else {
    await dataSource.destroy();
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsCreateFolder = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  newFolder: FolderInterface,
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const rdbmsFolder = new RDBMSFolder();

  rdbmsFolder.id = newFolder.id;
  rdbmsFolder.user = user;
  rdbmsFolder.name = newFolder.name;
  rdbmsFolder.folder_type = newFolder.type.toString();
  await folderRepo.save(rdbmsFolder);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsUpdateFolder = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  updatedFolder: FolderInterface,
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const rdbmsFolder = await folderRepo.findOneBy({
    user: { id: user.id },
    id: updatedFolder.id,
  });

  if (rdbmsFolder !== null) {
    rdbmsFolder.name = updatedFolder.name;
    await folderRepo.save(rdbmsFolder);

    await dataSource.destroy();
    return res.status(200).json({
      OK: true,
    });
  }

  await dataSource.destroy();
  return res.status(500).send({ error: 'Folder not found' });
};

const rdbmsDeleteFolder = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  folderId: string,
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const deletedFolder = await folderRepo.findOneBy({
    user: { id: user.id },
    id: folderId,
  });

  if (deletedFolder !== null) {
    await folderRepo.remove(deletedFolder);

    await dataSource.destroy();
    return res.status(200).json({
      OK: true,
    });
  }

  await dataSource.destroy();
  return res.status(500).send({ error: 'Folder not found' });
};

export default handler;
