<!DOCTYPE html>
<html lang="${locale.currentLanguageTag!'id'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0a254a">
  <title>LMS PRESISI Lemdiklat Polri</title>
  <link rel="icon" type="image/png" href="${url.resourcesPath}/img/logo-lemdiklat-polri.png">
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css">
</head>
<body class="login-page">
  <div class="login-shell">
    <section class="login-visual" aria-label="Identitas LMS PRESISI Lemdiklat Polri">
      <img class="login-hero-art" src="${url.resourcesPath}/img/login-hero-v3.png" alt="LMS PRESISI Lemdiklat Polri, platform induk pendidikan Polri">
    </section>

    <main class="login-panel">
      <p class="login-principles">PRESISI <i></i> PROFESIONAL <i></i> BERINTEGRITAS</p>

      <form class="login-card" id="kc-form-login" action="${url.loginAction}" method="post">
        <div class="login-brand-mobile">
          <img src="${url.resourcesPath}/img/logo-lemdiklat-polri.png" alt="Logo Lemdiklat Polri">
          <span>LMS PRESISI<br>LEMDIKLAT POLRI</span>
        </div>

        <div class="login-card-heading">
          <span class="login-card-mark">
            <img src="${url.resourcesPath}/img/logo-lemdiklat-polri.png" alt="Logo Lemdiklat Polri">
          </span>
          <div>
            <h1>Selamat datang</h1>
            <p>Masuk ke LMS PRESISI Lemdiklat Polri</p>
          </div>
        </div>

        <p class="login-intro">
          Gunakan akun yang sudah terdaftar di pusat identitas LMS PRESISI.
          Username dan kata sandi diverifikasi langsung oleh Keycloak.
        </p>

        <#if message?has_content>
          <div class="form-alert ${message.type}" role="alert">
            ${message.summary}
          </div>
        </#if>

        <div class="form-row">
          <label for="username">NRP / NIP / Email</label>
          <div class="login-input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path>
            </svg>
            <input
              id="username"
              name="username"
              type="text"
              value="${(login.username!'')}"
              autocomplete="username"
              placeholder="Masukkan NRP, NIP, atau email"
              autofocus
              aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
            >
          </div>
          <#if messagesPerField.existsError('username')>
            <small class="field-error">${messagesPerField.get('username')}</small>
          <#else>
            <small class="field-error"></small>
          </#if>
        </div>

        <div class="form-row">
          <label for="password">Kata sandi</label>
          <div class="input-action login-input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="11" rx="2"></rect>
              <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
            </svg>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="Masukkan kata sandi"
              aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
            >
            <button type="button" id="togglePassword">Lihat</button>
          </div>
          <#if messagesPerField.existsError('password')>
            <small class="field-error">${messagesPerField.get('password')}</small>
          <#else>
            <small class="field-error"></small>
          </#if>
        </div>

        <div class="login-options">
          <#if realm.rememberMe && !usernameHidden??>
            <label class="check-row">
              <input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>>
              <span>Ingat perangkat ini</span>
            </label>
          <#else>
            <span></span>
          </#if>
          <#if realm.resetPasswordAllowed>
            <a class="forgot-password" href="${url.loginResetCredentialsUrl}">Lupa kata sandi?</a>
          </#if>
        </div>

        <#if auth.selectedCredential?has_content>
          <input type="hidden" name="credentialId" value="${auth.selectedCredential}">
        </#if>

        <button class="btn btn-primary login-submit" type="submit">
          <span>Masuk ke LMS PRESISI</span>
          <b aria-hidden="true">→</b>
        </button>

        <div class="prototype-note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 11v5m0-8h.01"></path>
          </svg>
          <div>
            <b>Akses SSO LMS PRESISI</b>
            <span>Gunakan akun bootstrap atau akun yang sudah diberikan akses oleh pengelola.</span>
          </div>
        </div>

        <div class="portal-hints" aria-label="Portal yang memakai SSO LMS PRESISI">
          <p>Portal ini dipakai oleh</p>
          <div>
            <span>Admin Pusat</span>
            <span>Admin Satdik</span>
            <span>Pengelola Akademik</span>
            <span>Admin TI</span>
          </div>
        </div>
      </form>

      <footer class="login-panel-footer">
        PENDIDIKAN <i></i> KOMPETENSI <i></i> MUTU <i></i> PENGAWASAN <i></i> UNTUK INDONESIA
      </footer>
    </main>
  </div>

  <script src="${url.resourcesPath}/js/login.js"></script>
</body>
</html>
