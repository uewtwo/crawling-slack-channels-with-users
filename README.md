# これは何？
npm module の Slack Web api client(https://www.npmjs.com/package/@slack/web-api) を用いて
Slackのチャンネル一覧と、それに所属するユーザのリストをcsv形式で取得するスクリプトです。
# 仕様
- アーカイブされたチャンネルはフィルターされます。
- 削除されたユーザ(削除フラグのついたユーザ)は含まれます。
- 外部ユーザは `stranger` フラグが `true` になっています。
# How To Use
`.env.sample` を参考に `.env` ファイルを生成し、上で作成したTOKEN情報を入力

```
$ git clone https://github.com/uewtwo/crawling-slack-channels-with-users.git
$ cd crawling-slack-channels-with-users
$ npm ci
$ node slack.js
```
これで、カレントディレクトリに csvファイルが生成されていると思います。

