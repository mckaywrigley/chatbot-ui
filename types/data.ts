import { EdgarParams } from './edgar';

export interface KeyValuePair {
  key: string;
  value: any;
}

export interface EdgarKeyValuePair extends KeyValuePair {
  key: keyof EdgarParams;
}
