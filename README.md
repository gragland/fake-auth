# 🔐 Fake Auth
A fake auth service for prototyping authentication flows (signin, signup, forgot password, etc).

Fake Auth keeps everything client-side, including the "database" which is kept in local storage.
Perfect for quick prototyping and theme developers who'd like to have a demo site without needing to setup a backend
or connect to a 3rd party auth service.

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

- `signin(email: string, pass: string)`
- `signup(email: string, pass: string)`
- `signout`
- `onChange(callback: function)`
- `sendPasswordResetEmail(email: string)`
- `confirmPasswordReset(email: string, code: string)`
