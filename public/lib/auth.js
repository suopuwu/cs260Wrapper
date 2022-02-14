$(function () {
  const bbnVersion = '1.0.0';
  database.ref("version").on('value', (version) => {
    console.log(version.val());
    if (version.val() !== bbnVersion) {
      var updatePrompter = $.mSnackbar.add({
        text: `You are on version ${bbnVersion}, the latest is ${version.val()}. Please refresh the page to update. Major features may not work otherwise.`,
        lifeSpan: Infinity
      });
    }
  });

  var signInHtml = `
    <style>
      #sign-in {
        display: flex;
        flex-flow: column nowrap;
        width: 230px;
      }

      .auth-title {
        padding-bottom: 10px;
        font-family: monospace;
        font-size: 2em;
      }

      #sign-in > button:first-of-type {
        margin-top: 20px;
      }
      #sign-in > button {
        margin-top: 10px;
        border: none;
        background-color: #263238;
        border-radius: 5px;
        padding: 10px;
        color: white;
        font-size: 1.5em;
        font-family: 'fjalla one', sans-serif;
        cursor: pointer;
      }

      #sign-in > button:focus {
        border: none;
        background-color: none;
      }
      
      #sign-in > input {
        width:100%;
      }

      .login-icon {
        width: 35px;
        cursor: pointer;
      }

      .login-icon-holder {
        display: flex;
        padding-top: 10px;
        justify-content: space-evenly;
      }
    </style>
    <div id="sign-in">
      <span class="auth-title">Sign In</span>
      <input placeholder="Email" type="text" id="email-input" autocomplete="off">
      <input placeholder="Password" type="password" id="password-input" autocomplete="off">
      <span id="loginErrorMessage" style="color: red;"></span>
      <a href="javascript:;" id="reset-password" class="ripple reset-password display-none">Reset Password</a>
      <button class="ripple" id="sign-in-confirm">Login</button>
      <button class="ripple display-none" id="register-confirm">Register</button>
      <span class="login-icon-holder">
        <image src="/images/google.png" class="login-icon" id="google-login">
      </span>
    </div>
  `;

  function errorHtml(errorMessage) {
    return `
      <span id="loginErrorMessage" style="color: red;">${errorMessage}</span>
    `;
  }

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      if (!user.emailVerified) {
        $.mSnackbar.add({
          text: 'You have not verified your email. Please do so, as without a verified email, the app will not work.',
          lifeSpan: Infinity
        });
      }
      //if already logged in
      // console.log(user);
      // console.log("current user above");
      window.user = user;
      switchLoginLogout(user);
    } else {
      window.user = null;
      console.log("no user");
      switchLoginLogout();
    }
  });

  function switchLoginLogout(user) {
    if (user) {
      $("#sign-in-button")
        .html(
          `<span>
            ${
              user.photoURL
                ? '<image class="profile-picture" src="' + user.photoURL + '">'
                : ""
            }
            ${
              user.displayName ? user.displayName : user.email
            }</span><i class="material-icons" style="padding-left: 10px;">logout</i>`
        )
        .off()
        .click(signOut);
    } else {
      $("#sign-in-button")
        .html('Sign in <i class="material-icons">login</i>')
        .off()
        .click(() => suopPopup.pop(signInHtml, loginPopupHandlers));
    }
  }

  function loginPopupHandlers() {
    $("#email-input").focus();
    $("#sign-in-confirm").click(() =>
      emailLogin({
        email: $("#email-input").val(),
        password: $("#password-input").val(),
      })
    );
    $("#sign-in > input").keydown(function (e) {
      if (e.keyCode === 13) {
        emailLogin({
          email: $("#email-input").val(),
          password: $("#password-input").val(),
        });
      }
    });
    $("#google-login").click(googleLogin);
    $("#register-confirm").click(() =>
      emailCreateAccount({
        email: $("#email-input").val(),
        password: $("#password-input").val(),
      })
    );
    $("#reset-password").click(() => resetPassword($("#email-input").val()));
  }

  function googleLogin() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase
      .auth()
      .signInWithRedirect(provider)
      .then((result) => {
        /** @type {firebase.auth.OAuthCredential} */
        var credential = result.credential;

        // This gives you a Google Access Token. You can use it to access the Google API.
        var token = credential.accessToken;
        // The signed-in user info.
        var user = result.user;
        suopPopup.close();
      })
      .catch((error) => {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // ...
      });
  }

  function emailCreateAccount({
    email,
    password
  } = {}) {
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        var user = userCredential.user;
        user
          .sendEmailVerification()
          .then(function () {
            // Email sent.
          })
          .catch(function (error) {
            // An error happened.
          });
        suopPopup.close();
      })
      .catch((error) => {
        $("#loginErrorMessage").html(error.message);
      });
  }

  function emailLogin({
    email,
    password
  } = {}) {
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Signed in
        var user = userCredential.user;
        suopPopup.close();

        // ...
      })
      .catch((error) => {
        //login failed
        console.log(error.code);

        switch (error.code) {
          case "auth/wrong-password":
            $("#loginErrorMessage").html("Incorrect password");
            $("#reset-password").removeClass("display-none");
            break;
          case "auth/user-not-found":
            $("#register-confirm").removeClass("display-none");
            $("#loginErrorMessage").html(
              "There is no user with this email address. Create an account?"
            );
            break;
          case "auth/invalid-email":
            $("#loginErrorMessage").html("Please choose a valid email address");
            break;
          default:
            $("#loginErrorMessage").html(error.message);
            break;
        }
      });
  }

  function signOut() {
    firebase
      .auth()
      .signOut()
      .then(() => {
        console.log("signed out");
        // Sign-out successful.
      })
      .catch((error) => {
        // An error happened.
      });
  }

  function resetPassword(email) {
    console.log("password reset");
    firebase
      .auth()
      .sendPasswordResetEmail(email)
      .then(function () {
        $("#reset-password")
          .off()
          .html("A password reset email has been sent to " + email);
      })
      .catch(function (error) {
        $("#reset-password").off().html(error.message);
      });
  }
});

//todo make it so that you can use urls of images for player images.