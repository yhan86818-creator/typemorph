import React from 'react';
import TypeMorphApp from '../page';

export const metadata = {
  title: 'TypeMorph | ローカルファーストのスキーマ変換・コード生成ツール',
  description: 'JSON、SQL、YAML、APIスキーマをTypeScriptやZodに瞬時に変換。完全にブラウザ内で動作し、機密データを外部に送信しません。',
  robots: { index: false, follow: false },
};

export default function JapaneseHomePage() {
  return <TypeMorphApp defaultView="landing" />;
}
