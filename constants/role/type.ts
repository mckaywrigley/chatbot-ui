export interface IRole {
  img: string;
  imgAlt: string;
  title: string;
  description: string;
  index: number;
  prompt: string;
  options?: IRoleOption[];
  example?: string;
}

export interface IOption {
  label: any;
  value: any;
  prompt?: string;
}

export interface IRoleOption {
  option?: IOption[];
  label: string;
  key: string;
  type: formType;
}

export enum language {
  zh = '中文',
  en = '英文'
}

export enum formType {
  select = 'select',
  input = 'input',
  imageUploader = 'imageUploader',
  promptSelect = 'promptSelect'
}