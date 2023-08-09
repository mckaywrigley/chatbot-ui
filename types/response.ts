export interface IError {
  code?: number;
  detail?: any;
}

export interface IResponse {
  success: boolean;
  message: string;
  data?: {};
}
