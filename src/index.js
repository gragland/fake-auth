// Delay to mimic slower network requests
const RESPONSE_DELAY = 200;
// Function to generate random user token
const generateToken = () => String(Math.floor(Math.random() * 10000));

export default {
  onChangeCallback: null,

  signin: function(email, password) {
    return getAuthByEmail(email).then(auth => {
      // If user found then check password
      if (auth) {
        // If password match singin user otherwise throw error
        if (auth.user.password === password) {
          this.changeAuthToken(auth.token);
          return auth.user;
        } else {
          throw new CustomError("auth/wrong-password", "Password is wrong");
        }
      } else {
        // If user not found then throw error
        throw new CustomError(
          "auth/user-not-found",
          "Email does not have an account"
        );
      }
    });
  },

  signup: function(email, password) {
    return getAuthByEmail(email).then(auth => {
      // Throw error if email is already in use
      if (auth) {
        throw new CustomError(
          "auth/email-already-in-use",
          "Email is already in use"
        );
      }

      // Create auth object
      const newAuth = { token: generateToken(), user: { email, password } };
      // Store auth object and signin user
      return addAuth(newAuth).then(() => {
        this.changeAuthToken(newAuth.token);
        return newAuth.user;
      });
    });
  },

  signout: async function() {
    // Signout user
    this.changeAuthToken(null);
    return Promise.resolve();
  },

  onChange: function(cb) {
    // Store callback function so we can also call within ...
    // ... setAuthToken(). Necessary because storage event listener ...
    // ... only fires when local storage is changed by another tab.
    this.onChangeCallback = cb;

    const handleTokenChange = token => {
      getAuth(token).then(auth => {
        this.onChangeCallback(auth ? auth.user : false);
      });
    };

    const listener = window.addEventListener(
      "storage",
      ({ key, newValue }) => {
        if (key === "auth-token") {
          handleTokenChange(JSON.parse(newValue));
        }
      },
      false
    );

    const authToken = storeGet("auth-token");
    handleTokenChange(authToken);

    // Return an unsubscribe function so consumer ...
    // ... can unsubscribe when needed.
    return () => {
      window.removeEventListener("storage", listener);
    };
  },

  sendPasswordResetEmail: function(email) {
    // Get the user token for the email address and use as password reset code.
    // A real auth service would do this server-side and email ...
    // ... the code to the provided email address.
    // For testing we save the reset code to local storage and ...
    // ... read in subsequent confirmPasswordReset() call.
    return getAuthByEmail(email).then(auth => {
      if (auth) {
        storeSet("auth-pass-reset-code", auth.token);
        console.log("Your one-time use password reset code:", auth.token);
        throw new CustomError(
          "auth/cannot-send-email",
          `You're using Fake Auth, which cannot send password reset emails. These emails normally contain a link to your site with a special reset code. But worry not! Fake Auth has stored the reset code locally in your browser so you can simply go to your change password page now and choose a new password. This enables you to fully test your password reset flow and error states without involving emails.`
        );
      } else {
        throw new CustomError(
          "auth/user-not-found",
          "Email does not have an account"
        );
      }
    });
  },

  confirmPasswordReset: function(password, code) {
    let resetCode;
    // If code was passed in
    if (code) {
      resetCode = code;
    } else {
      // Otherwise grab the code from local storage
      resetCode = storeGet("auth-pass-reset-code");
      // Remove code from storage so it's one-time use.
      storeRemove("auth-pass-reset-code");
    }

    return updateAuth(resetCode, { password }).then(response => {
      if (response) {
        return true;
      } else {
        throw new CustomError(
          "auth/invalid-action-code",
          "Invalid password update code"
        );
      }
    });
  },

  // Updates auth token in storage and calls onChangeCallback()
  changeAuthToken: function(authToken) {
    storeSet("auth-token", authToken);
    // If we have an onChangeCallback (set in this.onChange)
    if (this.onChangeCallback) {
      // Fetch user via token and pass to callback
      getAuth(authToken).then(auth => {
        this.onChangeCallback(auth ? auth.user : false);
      });
    }
  }
};

/***** LOCAL DB *****/

const _getAll = () => storeGet("auth-db", []);
const _setAll = db => storeSet("auth-db", db);

const getAuth = token => {
  return delay(() => _getAll().find(item => item.token === token));
};

const getAuthByEmail = email => {
  return delay(() => _getAll().find(item => item.user.email === email));
};

const addAuth = auth => {
  return delay(() => {
    const all = _getAll();
    all.push(auth);
    _setAll(all);
  });
};

const updateAuth = (token, userData = {}) => {
  return delay(() => {
    const all = _getAll();
    const index = all.findIndex(item => item.token === token);

    if (index !== -1) {
      all[index].user = {
        ...all[index].user,
        ...userData
      };
      _setAll(all);
      return true;
    } else {
      return false;
    }
  });
};

// Initialize db with some data if client-side
if (typeof window !== "undefined" && _getAll().length === 0) {
  _setAll([
    {
      user: {
        email: "demo@gmail.com",
        pass: "demo"
      },
      token: "12345"
    }
  ]);
}

/***** HELPERS *****/

function storeGet(key, defaultValue = null) {
  const value = window.localStorage.getItem(key);
  return value ? JSON.parse(value) : defaultValue;
}

function storeSet(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function storeRemove(key) {
  window.localStorage.removeItem(key);
}

const delay = cb => {
  return new Promise(resolve =>
    setTimeout(() => {
      resolve(cb());
    }, RESPONSE_DELAY)
  );
};

function CustomError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

CustomError.prototype = Object.create(Error.prototype);
