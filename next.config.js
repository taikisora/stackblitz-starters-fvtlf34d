/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',          // Next.jsを静的ファイルとして書き出す
    trailingSlash: true,       // 💡 アプリ内でページ遷移（リンク移動）を正常に動かすための必須設定
    images: { unoptimized: true }, // 💡 アプリ化の際、画像最適化エラーでビルドが止まるのを防ぐ設定
  };
  
  module.exports = nextConfig;