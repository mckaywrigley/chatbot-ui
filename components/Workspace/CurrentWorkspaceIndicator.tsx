import { Workspace } from '@/types/workspaces';
import React from 'react'

type Props = {
    workspace: Workspace;
}

export default function CurrentWorkspaceIndicator({workspace}: Props) {

    return (
        <div>
          <h4>Current Workspace:</h4>
          {workspace ? (
            <div>
              <img src={workspace.logo} alt={workspace.name} />
              <span>{workspace.name}</span>
            </div>
          ) : (
            <div>No workspace selected</div>
          )}
        </div>
      );    
}