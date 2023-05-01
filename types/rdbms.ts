import { RDBMS_DB_TYPE } from "@/utils/app/const";
import {
  Entity,
  Column,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from "typeorm"

import {ColumnType} from 'typeorm/driver/types/ColumnTypes'

let textType = 'varchar' as ColumnType
let timestampType = 'timestamptz' as ColumnType
let floatType = 'real' as ColumnType

if (["mysql", "mariadb"].includes(RDBMS_DB_TYPE)){
  textType = "longtext" as ColumnType
  timestampType = 'timestamp' as ColumnType
  floatType = 'float' as ColumnType
}

@Entity()
export class RDBMSUser {
  @PrimaryColumn()
  id!: string;

  @Column({ type: textType, nullable: true })
  pass!: string | null;
}


@Entity()
export class RDBMSFolder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => RDBMSUser, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn()
  user!: RDBMSUser

  @Column()
  name!: string;

  @Column()
  folder_type!: string;
}


@Entity()
export class RDBMSConversation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => RDBMSUser, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn()
  user!: RDBMSUser

  @Column()
  name!: string;

  @Column()
  model_id!: string;

  @Column({type: textType})
  prompt!: string | '';

  @Column({type: floatType})
  temperature!: number;

  @ManyToOne(() => RDBMSFolder, { onUpdate: "CASCADE" })
  @JoinColumn()
  folder!: RDBMSFolder | null

  @Column({ type: timestampType, default: () => 'NOW()' })
  creation_time!: Date;
}


@Entity()
export class RDBMSMessage {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => RDBMSUser, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn()
  user!: RDBMSUser

  @ManyToOne(() => RDBMSConversation, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn()
  conversation!: RDBMSConversation

  @Column()
  role!: string;

  @Column({type: textType})
  content!: string;

  @Column({ type: timestampType, default: () => 'NOW()' })
  timestamp!: Date;
}

@Entity()
export class RDBMSPrompt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => RDBMSUser, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn()
  user!: RDBMSUser

  @Column()
  name!: string;

  @Column({type: textType})
  description!: string | '';

  @Column({type: textType})
  content!: string | '';

  @Column()
  model_id!: string;

  @ManyToOne(() => RDBMSFolder, { onUpdate: "CASCADE" })
  @JoinColumn()
  folder!: RDBMSFolder | null
}

@Entity()
export class RDBMSSystemPrompt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => RDBMSUser, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn()
  user!: RDBMSUser

  @Column()
  name!: string;

  @Column({type: textType})
  content!: string | '';
}