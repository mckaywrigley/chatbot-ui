export interface Workspace {
    name: string;
    slug: string;
    logo: string;
}
  
export interface WorkspaceSelectorProps {
    workspaces: Workspace[];
    onSelectWorkspace: (workspace: Workspace) => void;
}