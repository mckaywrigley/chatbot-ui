export interface Variable {
  name: string;
  options: string[];
}
export interface VariableInstance {
  variable: Variable;
  value: string;
}
