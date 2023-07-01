import { ChatBody } from './chat';

export interface EdgarParams {
  symbols: string[];
  formTypes: string[];
  startDate: number;
  endDate: number;
}

export interface EdgarBody extends ChatBody {
  edgarParams: EdgarParams;
}
