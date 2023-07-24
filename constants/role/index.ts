import { IRole, formType, language } from './type';
import { translator } from './translator';
import { travelor } from './travelor';
import { ieltes } from './ielts';
import { petBehaviorist } from './petBehaviorist';
export {
  formType,
  language
};

export type { IRole, IOption, IRoleOption } from './type';

export const defaultRoleList: IRole[] = [
  translator,
  travelor,
  petBehaviorist,
  ieltes
];
