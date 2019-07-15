# 🔐 Fake Auth
A fake auth service for prototyping authentication flows and error states. It currently supports signin, signup, password resetting, changing passwords, and subscribing to auth state changes.

Everything is client-side, including the "database" which is stored in local storage. Perfect for quick prototyping or theme developers who'd like to have a demo site without needing to setup a backend.

# Install
```
npm install fake-auth --save
```

# Usage
A simple example with React
```jsx
import React, { useState } from 'react';
import fakeAuth from 'fake-auth';

function SigninComponent(props){
  const [error, setError] = useState();

  const handleSubmit = (email, pass) => {
    fakeAuth.signin(email, pass)
      .then(user => {
        props.onSignin(user);
      })
      .catch(error => {
        setError(error);
      });
  }
  
  return (
    <form onSubmit={(event) => {
      const [email, pass] = event.target.children;
      handleSubmit(email, pass);
    }}>
      {error && <p>{error.message}</p>}
      <input type="email" name="email" />
      <input type="password" name="pass" />
    </form>
  )
}
```

# Methods

- `signin(email, pass).then((user) => ...)` 
- `signup(email, pass).then((user) => ...)`
- `signout().then(() => ...)`
- `onChange((user) => ...)`
- `sendPasswordResetEmail(email).then(() => ...)`
- `confirmPasswordReset(email, code).then(() => ...)`
