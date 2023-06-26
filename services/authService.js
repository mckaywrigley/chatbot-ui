import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Auth } from '@aws-amplify/auth';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(user => {
        console.log("currentauthenticateduser: ",user)
        setUser(user);
      })
      .catch((err) => {
        console.log("no user found: ",user,"\nerr: ",err)
        setUser(null);
      });      
  },[]);

  const login = (usernameOrEmail, password) => {
    Auth.signIn(usernameOrEmail, password)
    .then(cognitoUser => {
      setUser(cognitoUser);
      console.log('user', cognitoUser)
      return cognitoUser;
    })
    .catch((err) => {
      if (err.code === 'UserNotFoundException') {
        err.message = 'Invalid username or password';
      }
      console.log('error: ',err)
      throw err;
    })
  }

  const logout = () => {
    console.log("logout called");
    Auth.signOut().then((data) => {
      console.log("logout data: ",data);
      setUser(null);
      return data;
    });
  };
  
  const values = useMemo(() => ({
    user,
    login,
    logout,
  }), [user, login, logout]);

  return (
    <UserContext.Provider value={values}>{children}</UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('`useUser` must be within a `UserProvider` component');
  }

  return context;
};

