import {
  RDBMSConversation,
  RDBMSFolder,
  RDBMSMessage,
  RDBMSPrompt,
  RDBMSSystemPrompt,
  RDBMSUser,
} from '../../types/rdbms';

import {
  RDBMS_COCKROACHDB_TIME_TRAVEL_QUERIES,
  RDBMS_DB,
  RDBMS_DB_TYPE,
  RDBMS_HOST,
  RDBMS_PASS,
  RDBMS_PORT,
  RDBMS_SSL_CA,
  RDBMS_SSL_CERT,
  RDBMS_SSL_ENABLED,
  RDBMS_SSL_HOST,
  RDBMS_SSL_KEY,
  RDBMS_SYNCHRONIZE,
  RDBMS_USER,
} from '../app/const';

import 'reflect-metadata';
import { DataSource } from 'typeorm';

const tslOptions = {
  host: RDBMS_SSL_HOST,
  rejectUnauthorized: true,
  ca: RDBMS_SSL_CA,
  cert: RDBMS_SSL_CERT,
  key: RDBMS_SSL_KEY,
};

export const getDataSource = async () => {
  let dataSource: DataSource | null = null;
  if (RDBMS_DB_TYPE === 'postgres') {
    dataSource = new DataSource({
      type: 'postgres',
      applicationName: 'chatbot',
      host: RDBMS_HOST,
      port: RDBMS_PORT,
      username: RDBMS_USER,
      password: RDBMS_PASS,
      database: RDBMS_DB,
      entities: [
        RDBMSUser,
        RDBMSFolder,
        RDBMSConversation,
        RDBMSMessage,
        RDBMSPrompt,
        RDBMSSystemPrompt,
      ],
      synchronize: RDBMS_SYNCHRONIZE,
      logging: false,
      ssl: RDBMS_SSL_ENABLED ? tslOptions : undefined,
    });
  } else if (RDBMS_DB_TYPE === 'cockroachdb') {
    dataSource = new DataSource({
      type: 'cockroachdb',
      applicationName: 'chatbot',
      host: RDBMS_HOST,
      port: RDBMS_PORT,
      username: RDBMS_USER,
      password: RDBMS_PASS,
      database: RDBMS_DB,
      entities: [
        RDBMSUser,
        RDBMSFolder,
        RDBMSConversation,
        RDBMSMessage,
        RDBMSPrompt,
        RDBMSSystemPrompt,
      ],
      synchronize: RDBMS_SYNCHRONIZE,
      logging: false,
      ssl: RDBMS_SSL_ENABLED ? tslOptions : undefined,
      timeTravelQueries: RDBMS_COCKROACHDB_TIME_TRAVEL_QUERIES,
    });
  } else if (RDBMS_DB_TYPE === 'mysql') {
    dataSource = new DataSource({
      type: 'mysql',
      extra: {
        program_name: 'chatbot',
      },
      host: RDBMS_HOST,
      port: RDBMS_PORT,
      username: RDBMS_USER,
      password: RDBMS_PASS,
      database: RDBMS_DB,
      entities: [
        RDBMSUser,
        RDBMSFolder,
        RDBMSConversation,
        RDBMSMessage,
        RDBMSPrompt,
        RDBMSSystemPrompt,
      ],
      synchronize: RDBMS_SYNCHRONIZE,
      logging: false,
      ssl: RDBMS_SSL_ENABLED ? tslOptions : undefined,
    });
  } else if (RDBMS_DB_TYPE === 'mariadb') {
    dataSource = new DataSource({
      type: 'mariadb',
      extra: {
        program_name: 'chatbot',
      },
      host: RDBMS_HOST,
      port: RDBMS_PORT,
      username: RDBMS_USER,
      password: RDBMS_PASS,
      database: RDBMS_DB,
      entities: [
        RDBMSUser,
        RDBMSFolder,
        RDBMSConversation,
        RDBMSMessage,
        RDBMSPrompt,
        RDBMSSystemPrompt,
      ],
      synchronize: RDBMS_SYNCHRONIZE,
      logging: false,
      ssl: RDBMS_SSL_ENABLED ? tslOptions : undefined,
    });
  }

  if (dataSource !== null) {
    // to initialize initial connection with the database, register all entities
    // and "synchronize" database schema, call "initialize()" method of a newly created database
    // once in your application bootstrap
    await dataSource
      .initialize()
      .then(() => {
        // here you can start to work with your database
      })
      .catch((error) => console.log(error));

    return dataSource;
  } else {
    throw new Error('RDBMS type not supported');
  }
};

export const getUser = async (dataSource: DataSource, id: string) => {
  // Try to fetch account from database
  const userRepo = dataSource.getRepository(RDBMSUser);
  let rdbmsUser = await userRepo.findOneBy({ id: id });

  // If no user found, create a new one
  if (!rdbmsUser) {
    rdbmsUser = new RDBMSUser();
    rdbmsUser.id = id.toLowerCase();
  }

  await userRepo.save(rdbmsUser);
  return rdbmsUser;
};
