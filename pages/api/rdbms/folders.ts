import { NextApiRequest, NextApiResponse } from 'next';

import { RDBMSFolder, RDBMSUser } from '../../../types/rdbms';
import { FolderInterface, FolderType } from '@/types/folder';

import { getDataSource } from './dataSource';

import { DataSource } from 'typeorm';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // TODO get user from bearer token

  const user = new RDBMSUser();
  user.user_id = 'test_user';

  let body: any | null = null;
  if (req.body !== '') {
    body = JSON.parse(req.body);
  }

  const dataSource = await getDataSource();

  if (req.method === 'POST') {
    return await rdbmsGetAllFolders(res, dataSource, user);
  } else if (req.method === 'PUT') {
    const updatedFolders = body;
    if (updatedFolders !== null) {
      return await rdbmsUpdateAllFolders(res, dataSource, user, updatedFolders);
    } else {
      return res.status(400).json({ error: 'No folders provided' });
    }
  } else if (req.method === 'DELETE') {
    return await rdbmsDeleteAllFolders(res, dataSource, user);
  } else {
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsGetAllFolders = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const rdbmsFolders = await folderRepo.findBy({ user: user });

  const folders: FolderInterface[] = [];

  for (const rdbmsFolder of rdbmsFolders) {
    let folder: FolderInterface = {
      id: rdbmsFolder.id,
      name: rdbmsFolder.name,
      type: rdbmsFolder.folder_type as FolderType,
    };

    folders.push(folder);
  }
  return res.status(200).json(folders);
};

const rdbmsUpdateAllFolders = async (
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
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeleteAllFolders = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);

  const deletedFolders = await folderRepo.findBy({
    user: user,
  });

  await folderRepo.remove(deletedFolders);

  return res.status(200).json({
    OK: true,
  });
};

export default handler;
