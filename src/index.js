import { Base64 } from "js-base64";

// Delay to mimic slower network requests
const RESPONSE_DELAY = 200;
// Can increment to prevent old storage data from being used
const STORAGE_VERSION = "fa5";
// Function to generate a fake JWT token
const generateToken = (data) => Base64.encode(JSON.stringify(data));
// Function to generate user uid
const generateUid = () => String(Math.floor(Math.random() * 10000));

export default {
  onChangeCallback: null,

  getCurrentUser: function () {
    const token = storeGet("access-token");
    return getAuth(token).then((auth) => auth.user);
  },

  signup: function (email, password) {
    return getAuthByEmail(email).then((auth) => {
      // Throw error if email is already in use
      if (auth) {
        throw new CustomError(
          "auth/email-already-in-use",
          "Email is already in use"
        );
      }

      // Create auth object
      const user = { uid: generateUid(), email, password };
      const newAuth = { user, token: generateToken(user) };
      // Store auth object and signin user
      return addAuth(newAuth).then(() => {
        this.changeAccessToken(newAuth.token);
        return newAuth;
      });
    });
  },

  signin: function (email, password) {
    return getAuthByEmail(email).then((auth) => {
      // If user found then check password
      if (auth) {
        // If password match singin user otherwise throw error
        if (auth.user.password === password) {
          this.changeAccessToken(auth.token);
          return auth;
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

  signinWithProvider: function (provider) {
    return getAuthByProvider(provider).then((auth) => {
      this.changeAccessToken(auth.token);
      return {
        ...auth,
        token: auth.token,
      };
    });
  },

  signout: async function () {
    // Signout user
    this.changeAccessToken(null);
    return Promise.resolve();
  },

  onChange: function (cb) {
    // Store callback function so we can also call within
    // setAccessToken(). Necessary because storage event listener
    // only fires when local storage is changed by another tab.
    this.onChangeCallback = cb;

    const handleTokenChange = (token) => {
      getAuth(token).then((auth) => {
        this.onChangeCallback(auth || false);
      });
    };

    const listener = window.addEventListener(
      "storage",
      ({ key, newValue }) => {
        if (key === "access-token") {
          handleTokenChange(JSON.parse(newValue));
        }
      },
      false
    );

    const accessToken = storeGet("access-token");
    handleTokenChange(accessToken);

    // Return an unsubscribe function so consumer
    // can unsubscribe when needed.
    return () => {
      window.removeEventListener("storage", listener);
    };
  },

  sendPasswordResetEmail: function (email) {
    // Get the user token for the email address and use as password reset code.
    // A real auth service would do this server-side and email
    // the code to the provided email address.
    // For testing we save the reset code to local storage and
    // read in subsequent confirmPasswordReset() call.
    return getAuthByEmail(email).then((auth) => {
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

  confirmPasswordReset: function (password, code) {
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

    return updateAuth(resetCode, { password }).then((updatedAuth) => {
      if (updatedAuth) {
        return true;
      } else {
        throw new CustomError(
          "auth/invalid-action-code",
          "Invalid password update code"
        );
      }
    });
  },

  updateEmail: function (email) {
    return updateAuthForCurrentUser({ email }).then((updatedAuth) => {
      return updatedAuth.user;
    });
  },

  updatePassword: function (password) {
    return updateAuthForCurrentUser({ password }).then((updatedAuth) => {
      return updatedAuth.user;
    });
  },

  updateProfile: function (data) {
    return updateAuthForCurrentUser(data).then((updatedAuth) => {
      return updatedAuth.user;
    });
  },

  // Updates access token in storage and calls onChangeCallback()
  changeAccessToken: function (accessToken) {
    storeSet("access-token", accessToken);
    // If we have an onChangeCallback (set in this.onChange)
    if (this.onChangeCallback) {
      // Fetch user via accessToken and pass to callback
      getAuth(accessToken).then((auth) => {
        this.onChangeCallback(auth || false);
      });
    }
  },

  getAccessToken: function () {
    return storeGet("access-token");
  },

  // Used server-side to verify and decode access token
  verifyAccessToken: function (accessToken) {
    return JSON.parse(Base64.decode(accessToken));
  },
};

/***** LOCAL DB *****/

const _getAll = () => storeGet("auth-db", []);
const _setAll = (db) => storeSet("auth-db", db);

const getAuth = (token) => {
  return delay(() => _getAll().find((item) => item.token === token));
};

const getAuthByEmail = (email) => {
  return delay(() => _getAll().find((item) => item.user.email === email));
};

const addAuth = (auth) => {
  return delay(() => {
    const all = _getAll();
    all.push(auth);
    _setAll(all);
  });
};

const updateAuthForCurrentUser = (userData) => {
  const accessToken = storeGet("access-token");
  if (!accessToken) {
    throw new CustomError(
      "auth/not-signed-in",
      `You must be signed in to perform this action`
    );
  }

  return updateAuth(accessToken, userData);
};

const updateAuth = (token, userData = {}) => {
  return delay(() => {
    const all = _getAll();
    const index = all.findIndex((item) => item.token === token);

    if (index !== -1) {
      all[index] = {
        ...all[index],
        user: {
          ...all[index].user,
          ...userData,
        },
      };

      _setAll(all);
      return all[index];
    } else {
      return false;
    }
  });
};

const getAuthByProvider = (provider) => {
  // Normally there would be an actual OAuth flow here that returns
  // the user's email address and provider data.
  // TODO: Don't rely on user being in storage
  const emailFromOauth = "demo@gmail.com";
  return getAuthByEmail(emailFromOauth).then((auth) => {
    return {
      ...auth,
      user: {
        ...auth.user,
        // Include provider in user object
        // TODO: Persist this to storage
        provider: provider,
      },
    };
  });
};

// Initialize db with some data if client-side
if (typeof window !== "undefined" && _getAll().length === 0) {
  const initialUser = {
    uid: generateUid(),
    email: "demo@gmail.com",
    password: "demo",
  };

  const initialDb = [
    {
      user: initialUser,
      token: generateToken(initialUser),
    },
  ];

  _setAll(initialDb);
}

/***** HELPERS *****/

function storeGet(key, defaultValue = null) {
  const value = window.localStorage.getItem(`${key}-${STORAGE_VERSION}`);
  return value ? JSON.parse(value) : defaultValue;
}

function storeSet(key, value) {
  window.localStorage.setItem(
    `${key}-${STORAGE_VERSION}`,
    JSON.stringify(value)
  );
}

function storeRemove(key) {
  window.localStorage.removeItem(`${key}-${STORAGE_VERSION}`);
}

const delay = (cb) => {
  return new Promise((resolve) =>
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
