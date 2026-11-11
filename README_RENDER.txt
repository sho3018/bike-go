バイクGO! — ホスティング（Render）にのせる手順
================================================

ホスティングというのは、バイクGO! をインターネット上のコンピューターに
置くことです。そうすると、翔のパソコンを閉じていても、誰でもいつでも
サイトを開けるようになります。トンネル（start-tunnel.bat）は、
もう使わなくてよくなります。

使うのは「Render」というサービスです。無料で、カードの登録もいりません。
データは Firestore に入っているので、Render の無料プランの制限
（しばらく誰も来ないとサーバーが寝ること）があっても、投稿が
消えることはありません。

■ 無料プランで知っておくこと

・15分くらい誰も来ないと、サーバーが寝ます。次に誰かが開いたとき、
　起きるまで30〜60秒くらいかかります。真っ白な画面が出ても、
　1分くらい待てば表示されます。
・URL は「https://bike-go-○○○.onrender.com」みたいな形になります。
　この URL は変わりません。友だちに送るときはこの URL を送ります。
・公開すると、インターネットの誰でもサイトを開けます。デモアカウント
　（demo@bike-go.jp / demo1234）は誰でも知っているパスワードなので、
　誰でもデモで入って投稿できます。個人情報は書かないでください。

■ 先にやっておくこと

・Firebase の鍵ファイル（serviceAccountKey.json）を作ってあること。
　まだの人は、先に「README_FIREBASE.txt」の手順1〜3をやってください。
　鍵がないと、ホスティングのデータが保存されません。

■ 準備するもの

・GitHub のアカウント（無料）
・Render のアカウント（無料。GitHub のアカウントで作れます）

■ 手順1：GitHub にコードを上げる

1. ブラウザで https://github.com を開く
2. 「Sign up」を押してアカウントを作る（メールアドレスとパスワード）
3. ログインしたら、右上の「＋」→「New repository」を押す
4. 「Repository name」に「bike-go」と入れる
5. 「Public」のまま、「Create repository」を押す
6. 「uploading an existing file」という文字を押す
7. パソコンで「bike-go-server」フォルダを開いて、次のファイルを
　 全部選んで、ブラウザの画面にドラッグする
　　server.js / package.json / package-lock.json
　　render.yaml / .gitignore
　　README.txt / README_FIREBASE.txt / README_RENDER.txt / README_TUNNEL.txt
　　start.bat / start.command / start.sh / start-tunnel.bat
　　public フォルダ（中の go_bike_go.html も入る）
　 ※ 入れてはいけないもの：
　 　 serviceAccountKey.json（鍵ファイル。人に見せてはいけない）
　 　 node_modules（大きすぎる。Render が自動で入れてくれる）
　 　 data.json（自分のパソコンの中のデータ）
　 　 cloudflared.exe（トンネル用。ホスティングでは使わない）
8. 下の「Commit changes」を押す

■ 手順2：Render でサーバーを作る

1. ブラウザで https://render.com を開く
2. 「Get Started」→「GitHub」を押して、GitHub のアカウントで
　 ログインする（GitHub の画面が出たら「Authorize render」を押す）
3. ダッシュボードで「New」→「Web Service」を押す
4. 「bike-go」というリポジトリの横の「Connect」を押す
5. 名前（Name）が「bike-go」になっているのを確認する
6. 「Instance Type」が「Free」になっているのを確認する
7. 「Create Web Service」を押す
8. ビルド（準備）が始まる。2〜3分待つ

■ 手順3：鍵を Render に入れる（いちばん大事）

1. Render の画面で、作った「bike-go」を開く
2. 左側のメニューで「Environment」を押す
3. 「Add Environment Variable」を押す
4. 「Key」に「FIREBASE_SERVICE_ACCOUNT」と入れる
5. 「Value」には、serviceAccountKey.json の中身を全部入れる
　 ・パソコンで serviceAccountKey.json をメモ帳で開く
　 ・Ctrl＋A ですべて選んで、Ctrl＋C でコピーする
　 ・Render の「Value」の欄に Ctrl＋V で貼り付ける
6. 「Save Changes」を押す（サーバーが自動で再起動する）

■ 手順4：開いてみる

1. Render の画面の左上に「https://bike-go-○○○.onrender.com」
　 という URL が出ているので、それを押す
2. 真っ白だったら、1分くらい待つ（サーバーが起きている最中）
3. バイクGO! のログイン画面が出れば成功
4. デモアカウントでログインして、試しに1つ投稿してみる
　 メール： demo@bike-go.jp
　 パスワード： demo1234
5. パソコンの localhost:3000 で見ていた投稿と同じものが出るはず
　 （同じ Firestore を見ているから）

■ 困ったとき

・「Application failed to respond」や真っ白が1分以上続く
→ Render の画面で「Logs」を開いて、赤い文字がないか見る。
　「保存先: Firestore (bike-go)」と出ていれば、サーバーは動いている。
　「保存先: data.json」と出ていたら、手順3の鍵が入っていないか、
　コピーが間違っている。Value を入れ直して「Save Changes」を押す。

・ビルドが「Failed」になる
→ 「Logs」の最後のほうを見て、エラーを教えてください。
　よくあるのは、GitHub への上げ忘れ（server.js や package.json
　がない）です。手順1でファイルが全部上がっているか確認する。

・デプロイのたびに投稿が消える
→ 鍵が入っておらず、data.json モードで動いている証拠です。
　Render の中のデータは、デプロイすると消えます。手順3をやれば直ります。

・URL を変えたい
→ Render の「Settings」で名前を変えられます。ただし卒研の間は、
　最初にもらった URL のまま使うのがおすすめです。

■ トンネルはどうする？

ホスティングにのせたら、トンネル（start-tunnel.bat）はもう不要です。
パソコンを閉じてもサイトは開けます。発表のときは、Render の URL を
そのまま見せればOKです。
