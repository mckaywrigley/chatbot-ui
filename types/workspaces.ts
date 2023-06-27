interface Workspace {
    name: string;
    slug: string;
    logo: string;
}
  
interface WorkspaceSelectorProps {
    workspaces: Workspace[];
    onSelectWorkspace: (workspace: Workspace) => void;
}