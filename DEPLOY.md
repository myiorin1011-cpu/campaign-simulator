# デプロイ手順

## GitHub Pages へのデプロイ

### 初回セットアップ

1. GitHubにリポジトリ `campaign-simulator` を作成
2. `package.json` の `homepage` フィールドを実際のURLに更新:
   ```
   "homepage": "https://<GitHubユーザー名>.github.io/campaign-simulator"
   ```
3. リモートを設定してプッシュ:
   ```bash
   git remote add origin https://github.com/<ユーザー名>/campaign-simulator.git
   git push -u origin main
   ```

### デプロイ実行

```bash
npm run build
npm run deploy
```

`gh-pages` ブランチが自動作成され、GitHub Pagesに公開されます。

### GitHub リポジトリ設定

Settings > Pages > Branch: `gh-pages` / `/ (root)` に設定してください。

### 公開URL

`https://<ユーザー名>.github.io/campaign-simulator`
