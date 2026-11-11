// バイクGO! サーバー（Firestore版）
// 使い方: Node.js を入れて、このフォルダで「start.bat」をダブルクリックするだけ。
// 保存先は2つあります：
//   ・serviceAccountKey.json がある場合 → Firestore（クラウド）に保存します
//   ・ない場合 → 今まで通り data.json（このパソコンの中）に保存します
// 画面の使い方は変わりません。フロント（go_bike_go.html）はそのまま使えます。
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ホスティング（Render など）はポート番号を決めてくるので、それを使います。
// 自分のパソコンで動かすときは 3000 を使います。
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_FILE = path.join(__dirname, 'data.json');
const KEY_FILE = path.join(__dirname, 'serviceAccountKey.json');
const HTML_FILE = path.join(__dirname, 'public', 'go_bike_go.html');

// ---------- 保存先の決定 ----------
// 鍵は2つの場所から読めます（環境変数が優先）：
//   1. 環境変数 FIREBASE_SERVICE_ACCOUNT（Render などのホスティング用。鍵の中身をそのまま入れる）
//   2. serviceAccountKey.json（自分のパソコン用）
// どちらもなければ data.json モードで動くので、Firebase の準備がまだでも試せます。
function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error('環境変数 FIREBASE_SERVICE_ACCOUNT が JSON として読めませんでした: ' + e.message);
      console.error('鍵の中身をそのままコピーして貼り付けているか確認してください。');
      return null;
    }
  }
  if (fs.existsSync(KEY_FILE)) {
    return require(KEY_FILE);
  }
  return null;
}
let USE_FIRESTORE = !!process.env.FIRESTORE_EMULATOR_HOST || !!getServiceAccount();
let db = null;
let firestoreProjectId = '';
if (USE_FIRESTORE) {
  try {
    const admin = require('firebase-admin');
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      firestoreProjectId = process.env.FIREBASE_PROJECT_ID || 'bike-go-test';
      admin.initializeApp({ projectId: firestoreProjectId });
    } else {
      const serviceAccount = getServiceAccount();
      firestoreProjectId = serviceAccount.project_id || '';
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
  } catch (e) {
    console.error('Firestore を使えなかったので、data.json モードで起動します: ' + e.message);
    console.error('serviceAccountKey.json を入れた場合は、まず npm install を実行してください。');
    console.error('ホスティングの場合は、環境変数 FIREBASE_SERVICE_ACCOUNT を確認してください。');
    USE_FIRESTORE = false;
    db = null;
  }
}

// ---------- 点検リストの項目（フロントと共通） ----------
const CHECKLIST_ITEMS = [
  { id: 'brake', label: 'ブレーキ', desc: '遊び・効き具合・フルード量' },
  { id: 'tire', label: 'タイヤ', desc: '空気圧・溝の深さ・ひび割れ' },
  { id: 'light', label: '灯火類', desc: 'ヘッドライト・ウインカー・ブレーキランプ' },
  { id: 'chain', label: 'チェーン', desc: 'たるみ・注油状態' },
  { id: 'oil', label: 'オイル', desc: 'エンジンオイル量・漏れ確認' },
];

// ---------- パスワードのハッシュ化（簡易版・卒研デモ用） ----------
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}
function makeUser(uid, email, password, name, bike, area, bio) {
  const salt = crypto.randomBytes(8).toString('hex');
  return { uid, email, passwordHash: hashPassword(password, salt), salt, name, bike, area, bio, avatar: '' };
}

// ---------- 初期データ ----------
function seedData() {
  const now = Date.now();
  const users = {};
  const demo = makeUser('user_demo', 'demo@bike-go.jp', 'demo1234', 'デモライダー', 'CB400SF', '関東', 'デモアカウントです。安全運転第一！');
  const u1 = makeUser('user_1', 'shimanami@bike-go.jp', 'demo1234', 'しまなみツアラー', 'V-Strom 650', '中国・四国', '絶景を求めて走ります。');
  const u2 = makeUser('user_2', 'ninja@bike-go.jp', 'demo1234', 'Ninja乗り', 'Ninja 400', '関西', '峠道が好きです。ヤエー大歓迎！');
  users[demo.uid] = demo; users[u1.uid] = u1; users[u2.uid] = u2;
  return {
    users,
    posts: [
      {
        id: 'p1', authorUid: 'user_1', title: 'しまなみ海道ツーリング最高でした！',
        content: '天候にも恵まれ、最高のツーリングになりました。橋の上から見る瀬戸内海は絶景です。風が少し強かったですが、安全運転で楽しめました。\nおすすめの休憩スポットは亀老山展望公園です！',
        category: 'ツーリング', area: '中国・四国', spotName: 'しまなみ海道',
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        timestamp: now - 1000 * 60 * 60 * 2, yaeeCount: 12, yaeeUsers: [], bookmarks: [],
        comments: [{ authorName: 'Ninja乗り', text: '景色最高ですね！いつか行ってみたいです。', timestamp: now - 1000 * 60 * 30 }],
      },
      {
        id: 'p2', authorUid: 'user_2', title: 'オイル交換のタイミングについて',
        content: '皆さん、オイル交換はどのくらいの頻度でされていますか？\nマニュアルには半年または5000kmとありますが、シビアコンディションだと早めが良いと聞きました。アドバイスお願いします。',
        category: 'メンテ・カスタム', area: '全国', spotName: '', imageUrl: '',
        timestamp: now - 1000 * 60 * 60 * 24, yaeeCount: 5, yaeeUsers: [], bookmarks: [], comments: [],
      },
    ],
    checklists: {}, // uid -> { items:[true/false...], comment, logCount, logs:[...] }
  };
}

// ---------- データの読み書き ----------
// Firestore は「users / posts / checklists」という3つの箱（コレクション）に分けます。
// 1つの投稿 = posts の中の1つの書類（ドキュメント）です。
// 1人のユーザー = users の中の1つの書類です。
let data = { users: {}, posts: [], checklists: {} };

function loadFromFile() {
  try {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (!loaded.users) loaded.users = {};
    if (!loaded.posts) loaded.posts = [];
    if (!loaded.checklists) loaded.checklists = {};
    return loaded;
  } catch (e) {
    return null;
  }
}
function saveToFile() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function loadFromFirestore() {
  const usersSnap = await db.collection('users').get();
  const postsSnap = await db.collection('posts').get();
  const checklistsSnap = await db.collection('checklists').get();
  const users = {};
  usersSnap.forEach((doc) => { users[doc.id] = { uid: doc.id, ...doc.data() }; });
  const posts = [];
  postsSnap.forEach((doc) => { posts.push({ id: doc.id, ...doc.data() }); });
  posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const checklists = {};
  checklistsSnap.forEach((doc) => { checklists[doc.id] = doc.data(); });
  return { users, posts, checklists };
}
// Firestore に1件だけ書き込みます（undefined は Firestore に入れられないので落とします）。
function cleanForFirestore(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
async function persistUser(uid) {
  if (!USE_FIRESTORE) return saveToFile();
  await db.collection('users').doc(uid).set(cleanForFirestore(data.users[uid]));
}
async function persistPost(postId) {
  if (!USE_FIRESTORE) return saveToFile();
  const post = data.posts.find((x) => x.id === postId);
  if (post) await db.collection('posts').doc(postId).set(cleanForFirestore(post));
}
async function persistChecklist(uid) {
  if (!USE_FIRESTORE) return saveToFile();
  await db.collection('checklists').doc(uid).set(cleanForFirestore(data.checklists[uid]));
}
async function persistAll() {
  if (!USE_FIRESTORE) return saveToFile();
  const batch = db.batch();
  for (const [uid, u] of Object.entries(data.users)) {
    batch.set(db.collection('users').doc(uid), cleanForFirestore(u));
  }
  for (const post of data.posts) {
    batch.set(db.collection('posts').doc(post.id), cleanForFirestore(post));
  }
  for (const [uid, cl] of Object.entries(data.checklists)) {
    batch.set(db.collection('checklists').doc(uid), cleanForFirestore(cl));
  }
  await batch.commit();
}
// 起動時の読み込み。Firestore が空で data.json があれば、そちらを Firestore に移します。
async function loadData() {
  if (USE_FIRESTORE) {
    try {
      const loaded = await loadFromFirestore();
      const empty = Object.keys(loaded.users).length === 0 && loaded.posts.length === 0;
      if (empty) {
        const fromFile = loadFromFile();
        if (fromFile && (Object.keys(fromFile.users).length > 0 || fromFile.posts.length > 0)) {
          data = fromFile;
          await persistAll();
          console.log('data.json のデータを Firestore に移しました。');
        } else {
          data = seedData();
          await persistAll();
        }
      } else {
        data = loaded;
      }
      return;
    } catch (e) {
      console.error('Firestore から読めなかったので、data.json モードで起動します: ' + e.message);
      USE_FIRESTORE = false;
      db = null;
    }
  }
  const fromFile = loadFromFile();
  if (fromFile) {
    data = fromFile;
  } else {
    data = seedData();
    saveToFile();
  }
}
// 互換用：古い saveData() の呼び出しは、ファイルモードではそのまま、
// Firestore モードでは全体保存になります（今は各処理で個別保存を使っています）。
async function saveData() {
  await persistAll();
}

// ---------- ログイン状態（トークン） ----------
const tokens = new Map(); // token -> uid
function publicUser(u) {
  if (!u) return null;
  return { uid: u.uid, name: u.name, bike: u.bike, area: u.area, bio: u.bio, avatar: u.avatar };
}
function authUser(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const uid = tokens.get(token);
  return uid ? data.users[uid] || null : null;
}
function newId(prefix) {
  return prefix + crypto.randomBytes(5).toString('hex');
}
function defaultChecklist(uid) {
  if (!data.checklists[uid]) {
    data.checklists[uid] = { items: CHECKLIST_ITEMS.map(() => false), comment: '', logCount: 0, logs: [] };
  }
  return data.checklists[uid];
}

// ---------- 小さなヘルパー ----------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 画像(base64)も入るので10MBまで
        reject(new Error('データが大きすぎます'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('JSONが読めません')); }
    });
    req.on('error', reject);
  });
}

// ---------- サーバー本体 ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    // トップページ：アプリ本体を表示
    if (req.method === 'GET' && (p === '/' || p === '/go_bike_go.html' || p === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(HTML_FILE).pipe(res);
      return;
    }
    // 動作確認用
    if (req.method === 'GET' && p === '/api/health') {
      return sendJson(res, 200, { ok: true, storage: USE_FIRESTORE ? 'firestore' : 'data.json', project: firestoreProjectId || undefined });
    }

    // 投稿とユーザー一覧（ログイン後にフロントが読み込む）
    if (req.method === 'GET' && p === '/api/data') {
      const users = {};
      for (const [uid, u] of Object.entries(data.users)) users[uid] = publicUser(u);
      return sendJson(res, 200, { users, posts: data.posts });
    }

    // 新規登録
    if (req.method === 'POST' && p === '/api/signup') {
      const b = await readBody(req);
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      const name = String(b.name || '').trim();
      if (!email || !password || !name) return sendJson(res, 400, { error: 'メール・パスワード・名前を入力してください' });
      if (password.length < 6) return sendJson(res, 400, { error: 'パスワードは6文字以上にしてください' });
      if (Object.values(data.users).some((u) => u.email === email)) return sendJson(res, 400, { error: 'そのメールはすでに使われています' });
      const uid = newId('user_');
      const user = makeUser(uid, email, password, name, String(b.bike || '未登録'), '全国', 'よろしくお願いします！');
      data.users[uid] = user;
      await persistUser(uid);
      const token = crypto.randomBytes(24).toString('hex');
      tokens.set(token, uid);
      return sendJson(res, 200, { token, user: publicUser(user) });
    }

    // ログイン
    if (req.method === 'POST' && p === '/api/login') {
      const b = await readBody(req);
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      const user = Object.values(data.users).find((u) => u.email === email);
      if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
        return sendJson(res, 401, { error: 'メールかパスワードが違います' });
      }
      const token = crypto.randomBytes(24).toString('hex');
      tokens.set(token, user.uid);
      return sendJson(res, 200, { token, user: publicUser(user) });
    }

    // 自分の情報＋点検リスト
    if (req.method === 'GET' && p === '/api/me') {
      const user = authUser(req);
      if (!user) return sendJson(res, 401, { error: 'ログインしてください' });
      const cl = defaultChecklist(user.uid);
      return sendJson(res, 200, { user: publicUser(user), checklist: CHECKLIST_ITEMS.map((it, i) => ({ ...it, checked: !!cl.items[i] })), checklistComment: cl.comment, checklistLogCount: cl.logCount });
    }

    // プロフィール更新
    if (req.method === 'PUT' && p === '/api/profile') {
      const user = authUser(req);
      if (!user) return sendJson(res, 401, { error: 'ログインしてください' });
      const b = await readBody(req);
      if (b.name) user.name = String(b.name);
      if (b.bike !== undefined) user.bike = String(b.bike);
      if (b.area !== undefined) user.area = String(b.area);
      if (b.bio !== undefined) user.bio = String(b.bio);
      if (b.avatar !== undefined) user.avatar = String(b.avatar);
      await persistUser(user.uid);
      return sendJson(res, 200, { user: publicUser(user) });
    }

    // 公開プロフィール
    if (req.method === 'GET' && p.startsWith('/api/users/')) {
      const uid = decodeURIComponent(p.slice('/api/users/'.length));
      return sendJson(res, 200, { user: publicUser(data.users[uid]) });
    }

    // 投稿する
    if (req.method === 'POST' && p === '/api/posts') {
      const user = authUser(req);
      if (!user) return sendJson(res, 401, { error: 'ログインしてください' });
      const b = await readBody(req);
      if (!String(b.title || '').trim() || !String(b.content || '').trim()) return sendJson(res, 400, { error: 'タイトルと本文を入力してください' });
      const post = {
        id: newId('p_'), authorUid: user.uid,
        title: String(b.title), content: String(b.content),
        category: String(b.category || 'ツーリング'), area: String(b.area || '全国'),
        spotName: String(b.spotName || ''), imageUrl: String(b.imageUrl || ''),
        timestamp: Date.now(), yaeeCount: 0, yaeeUsers: [], bookmarks: [], comments: [],
      };
      data.posts.unshift(post);
      await persistPost(post.id);
      return sendJson(res, 200, { post });
    }

    // ヤエー / ブックマーク / コメント（/api/posts/xxx/yyy の形）
    const m = p.match(/^\/api\/posts\/([^/]+)\/(yaee|bookmark|comments)$/);
    if (m) {
      const user = authUser(req);
      if (!user) return sendJson(res, 401, { error: 'ログインしてください' });
      const post = data.posts.find((x) => x.id === m[1]);
      if (!post) return sendJson(res, 404, { error: '投稿が見つかりません' });
      if (req.method === 'POST' && m[2] === 'yaee') {
        const i = post.yaeeUsers.indexOf(user.uid);
        if (i > -1) { post.yaeeUsers.splice(i, 1); post.yaeeCount--; }
        else { post.yaeeUsers.push(user.uid); post.yaeeCount++; }
        await persistPost(post.id);
        return sendJson(res, 200, { post });
      }
      if (req.method === 'POST' && m[2] === 'bookmark') {
        const i = post.bookmarks.indexOf(user.uid);
        if (i > -1) post.bookmarks.splice(i, 1); else post.bookmarks.push(user.uid);
        await persistPost(post.id);
        return sendJson(res, 200, { post });
      }
      if (req.method === 'POST' && m[2] === 'comments') {
        const b = await readBody(req);
        const text = String(b.text || '').trim();
        if (!text) return sendJson(res, 400, { error: 'コメントを入力してください' });
        post.comments.push({ authorName: user.name, text, timestamp: Date.now() });
        await persistPost(post.id);
        return sendJson(res, 200, { post });
      }
    }

    // 点検リストの保存
    if (req.method === 'POST' && p === '/api/checklist') {
      const user = authUser(req);
      if (!user) return sendJson(res, 401, { error: 'ログインしてください' });
      const b = await readBody(req);
      const cl = defaultChecklist(user.uid);
      if (Array.isArray(b.items)) cl.items = CHECKLIST_ITEMS.map((_, i) => !!b.items[i]);
      if (typeof b.comment === 'string') cl.comment = b.comment;
      cl.logCount += 1;
      cl.logs.push({ date: new Date().toISOString(), comment: cl.comment, checkedCount: cl.items.filter(Boolean).length });
      await persistChecklist(user.uid);
      return sendJson(res, 200, { logCount: cl.logCount });
    }

    return sendJson(res, 404, { error: '見つかりません' });
  } catch (e) {
    console.error(e);
    return sendJson(res, 500, { error: 'サーバーでエラーが起きました: ' + e.message });
  }
});

async function main() {
  await loadData();
  server.listen(PORT, '0.0.0.0', () => {
    console.log('==============================================');
    console.log('  バイクGO! サーバーが起動しました');
    console.log('  保存先: ' + (USE_FIRESTORE ? 'Firestore' + (firestoreProjectId ? ' (' + firestoreProjectId + ')' : '') : 'data.json (このパソコンの中)'));
    if (process.env.PORT) {
      console.log('  ホスティングで動いています。ポート: ' + PORT);
      console.log('  ブラウザでは、ホスティングがくれた URL で開いてください');
    } else {
      console.log('  ブラウザでこちらを開いてください:');
      console.log('    http://localhost:' + PORT);
      console.log('  止めるときはこの黒い画面を閉じてください');
    }
    console.log('  デモアカウント: demo@bike-go.jp / demo1234');
    console.log('==============================================');
  });
}
main();
