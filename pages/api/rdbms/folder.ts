import { NextApiRequest, NextApiResponse } from 'next';

import { RDBMSFolder, RDBMSUser } from '../../../types/rdbms';
import { FolderInterface } from '@/types/folder';

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
    const newFolder = body;
    if (newFolder !== null) {
      return await rdbmsCreateFolder(res, dataSource, user, newFolder);
    } else {
      return res.status(400).json({ error: 'No name or folder_type provided' });
    }
  } else if (req.method === 'PUT') {
    const updatedFolder = body;
    if (updatedFolder !== null) {
      return await rdbmsUpdateFolder(res, dataSource, user, updatedFolder);
    } else {
      return res.status(400).json({ error: 'No name or folder_id provided' });
    }
  } else if (req.method === 'DELETE') {
    const folderId = body['folder_id'];
    if (folderId !== undefined) {
      return await rdbmsDeleteFolder(res, dataSource, user, folderId);
    } else {
      return res.status(400).json({ error: 'No folder_id provided' });
    }
  } else {
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
    user: user,
    id: updatedFolder.id,
  });

  if (rdbmsFolder !== null) {
    rdbmsFolder.name = updatedFolder.name;
    await folderRepo.save(rdbmsFolder);

    return res.status(200).json({
      OK: true,
    });
  }

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
    user: user,
    id: folderId,
  });

  if (deletedFolder !== null) {
    await folderRepo.remove(deletedFolder);

    return res.status(200).json({
      OK: true,
    });
  }

  return res.status(500).send({ error: 'Folder not found' });
};

export default handler;
