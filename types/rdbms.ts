import {
  Entity,
  Column,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from "typeorm"

@Entity()
export class RDBMSUser {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar', nullable: true })
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

  @Column()
  prompt!: string;

  @Column()
  temperature!: number;

  @ManyToOne(() => RDBMSFolder, { onUpdate: "CASCADE" })
  @JoinColumn()
  folder!: RDBMSFolder | null
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

  @Column()
  content!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
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

  @Column()
  description!: string;

  @Column()
  content!: string;

  @Column()
  model_id!: string;

  @ManyToOne(() => RDBMSFolder, { onUpdate: "CASCADE" })
  @JoinColumn()
  folder!: RDBMSFolder | null
}