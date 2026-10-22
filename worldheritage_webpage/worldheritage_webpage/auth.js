// ログイン・新規登録・ログアウト（Supabase Auth）
// 読み込み順: supabase-js（CDN） → supabase-config.js → auth.js

const configured = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
const sb = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const HOME_PAGE = "main.html";

function showMessage(text, type) {
  const box = document.getElementById("message");
  if (!box) return;
  box.textContent = text;
  box.className = "message " + type; // "error" | "success"
  box.hidden = false;
}

function clearMessage() {
  const box = document.getElementById("message");
  if (box) box.hidden = true;
}

function setBusy(form, busy) {
  const button = form.querySelector("button[type=submit]");
  button.disabled = busy;
  button.textContent = busy ? "処理中…" : button.dataset.label;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------- 新規登録 ----------
async function handleSignup(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirm = form.confirm.value;

  clearMessage();
  if (!username || !email || !password || !confirm) return showMessage("すべての項目を入力してください。", "error");
  if (username.length < 2 || username.length > 20) return showMessage("ユーザー名は2〜20文字で入力してください。", "error");
  if (!isValidEmail(email)) return showMessage("メールアドレスの形式が正しくありません。", "error");
  if (password.length < 8) return showMessage("パスワードは8文字以上で入力してください。", "error");
  if (password !== confirm) return showMessage("パスワードが確認用と一致しません。", "error");

  setBusy(form, true);
  try {
    const { data: available, error: checkError } = await sb.rpc("username_available", { name: username });
    if (checkError) throw checkError;
    if (!available) return showMessage("このユーザー名は既に使われています。", "error");

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username } }, // トリガーが profiles に保存する
    });
    if (error) {
      if (/already registered/i.test(error.message)) return showMessage("このメールアドレスは既に登録されています。", "error");
      throw error;
    }
    // メール確認が有効な場合、登録済みアドレスでもエラーにならず identities が空で返る
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return showMessage("このメールアドレスは既に登録されています。", "error");
    }
    if (data.session) {
      showMessage("登録が完了しました。トップページへ移動します…", "success");
      setTimeout(() => (location.href = HOME_PAGE), 1200);
    } else {
      showMessage("確認メールを送信しました。メール内のリンクを開いてからログインしてください。", "success");
      form.reset();
    }
  } catch (err) {
    console.error(err);
    showMessage("登録に失敗しました。時間をおいて再度お試しください。", "error");
  } finally {
    setBusy(form, false);
  }
}

// ---------- ログイン ----------
async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value.trim();
  const password = form.password.value;

  clearMessage();
  if (!email || !password) return showMessage("メールアドレスとパスワードを入力してください。", "error");

  setBusy(form, true);
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (/email not confirmed/i.test(error.message)) return showMessage("メールアドレスの確認が済んでいません。届いたメールのリンクを開いてください。", "error");
      return showMessage("メールアドレスまたはパスワードが正しくありません。", "error");
    }
    location.href = HOME_PAGE;
  } catch (err) {
    console.error(err);
    showMessage("ログインに失敗しました。時間をおいて再度お試しください。", "error");
  } finally {
    setBusy(form, false);
  }
}

// ---------- ヘッダーのログイン状態表示（main.html の #auth-status） ----------
async function renderAuthStatus() {
  const slot = document.getElementById("auth-status");
  if (!slot) return;

  const { data: { session } } = configured ? await sb.auth.getSession() : { data: { session: null } };
  if (!session) {
    slot.innerHTML = '<a class="auth-link" href="login.html">ログイン</a>';
    return;
  }

  const { data: profile } = await sb.from("profiles").select("username").eq("id", session.user.id).single();
  const name = (profile && profile.username) || session.user.user_metadata.username || session.user.email;

  slot.innerHTML = "";
  const label = document.createElement("span");
  label.className = "auth-user";
  label.textContent = name + " さん";
  const logout = document.createElement("button");
  logout.className = "auth-link";
  logout.type = "button";
  logout.textContent = "ログアウト";
  logout.addEventListener("click", async () => {
    await sb.auth.signOut();
    location.reload();
  });
  slot.append(label, logout);
}

// ログイン中に login.html / signup.html を開いたとき
function showLoggedIn(session, form) {
  const name = session.user.user_metadata.username || session.user.email;
  form.hidden = true;
  document.querySelector(".switch").hidden = true;
  showMessage(name + " さんとしてログイン中です。", "success");

  const actions = document.createElement("div");
  actions.className = "logged-in-actions";
  const home = document.createElement("a");
  home.href = HOME_PAGE;
  home.className = "btn-primary";
  home.textContent = "トップページへ";
  const logout = document.createElement("button");
  logout.type = "button";
  logout.className = "btn-secondary";
  logout.textContent = "ログアウトして別のアカウントを使う";
  logout.addEventListener("click", async () => {
    await sb.auth.signOut();
    location.reload();
  });
  actions.append(home, logout);
  form.after(actions);
}

document.addEventListener("DOMContentLoaded", async () => {
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const authForm = signupForm || loginForm;

  if (authForm) {
    authForm.querySelector("button[type=submit]").dataset.label = authForm.querySelector("button[type=submit]").textContent;
    if (!configured) {
      showMessage("Supabase が未設定です。supabase-config.js に URL と anon キーを入力してください。", "error");
      authForm.querySelector("button[type=submit]").disabled = true;
      return;
    }
    // すでにログイン中ならフォームの代わりにログイン中表示
    const { data: { session } } = await sb.auth.getSession();
    if (session) return showLoggedIn(session, authForm);
    authForm.addEventListener("submit", signupForm ? handleSignup : handleLogin);
  }

  renderAuthStatus();
});
