import { ChatBody } from './chat';

// export interface EdgarParams {
//   symbols: string[];
//   formTypes: string[];
//   startDate: number;
//   endDate: number;
// }

export interface EdgarParams {
  [key: string]: any;
}

export interface EdgarBody extends ChatBody {
  edgarParams: EdgarParams;
}
