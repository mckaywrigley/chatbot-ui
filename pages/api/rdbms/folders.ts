import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { getDataSource, getUser } from '../../../utils/server/rdbms';
import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import { RDBMSFolder, RDBMSUser } from '../../../types/rdbms';
import { FolderInterface, FolderType } from '@/types/folder';

import { authOptions } from '../auth/[...nextauth]';

import { DataSource, In } from 'typeorm';

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
    return await rdbmsGetFolders(res, dataSource, user);
  } else if (req.method === 'PUT') {
    const updatedFolders = body;
    if (updatedFolders !== null) {
      return await rdbmsUpdateFolders(res, dataSource, user, updatedFolders);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No folders provided' });
    }
  } else if (req.method === 'DELETE') {
    const deletedFolderIds = body as string[];
    return await rdbmsDeleteFolders(res, dataSource, user, deletedFolderIds);
  } else {
    await dataSource.destroy();
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsGetFolders = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const rdbmsFolders = await folderRepo.findBy({
    user: { id: user.id },
  });

  const folders: FolderInterface[] = [];

  for (const rdbmsFolder of rdbmsFolders) {
    let folder: FolderInterface = {
      id: rdbmsFolder.id,
      name: rdbmsFolder.name,
      type: rdbmsFolder.folder_type as FolderType,
    };

    folders.push(folder);
  }
  await dataSource.destroy();
  return res.status(200).json(folders);
};

const rdbmsUpdateFolders = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  updatedFolders: FolderInterface[],
) => {
  const rdbmsFolders: RDBMSFolder[] = [];
  const folderRepo = dataSource.getRepository(RDBMSFolder);

  for (const folder of updatedFolders) {
    const rdbmsFolder = new RDBMSFolder();

    rdbmsFolder.user = user;
    rdbmsFolder.id = folder.id;
    rdbmsFolder.name = folder.name;
    rdbmsFolder.folder_type = folder.type;

    rdbmsFolders.push(rdbmsFolder);
  }

  await folderRepo.save(rdbmsFolders);
  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeleteFolders = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  deletedFolderIds: string[],
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);

  const deletedFolders = await folderRepo.findBy({
    user: { id: user.id },
    id: In(deletedFolderIds),
  });

  await folderRepo.remove(deletedFolders);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

export default handler;
