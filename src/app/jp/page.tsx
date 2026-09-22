import React from 'react';
import TypeMorphApp from '../page';

export const metadata = {
  title: 'TypeMorph | ローカルファーストのスキーマ変換・コード生成ツール',
  description: 'JSON、SQL、YAML、APIスキーマをTypeScriptやZodに瞬時に変換。変換処理はブラウザ内で実行。未ログインでは履歴をローカルに保存し、ログインすると入力と生成結果をクラウド履歴に自動保存します。共有・URL取得は別の通信操作です。',
  robots: { index: false, follow: false },
};

export default function JapaneseHomePage() {
  return <TypeMorphApp defaultView="landing" />;
}
