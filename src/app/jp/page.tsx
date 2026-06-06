import React from 'react';
import TypeMorphApp from '../page';

export const metadata = {
  title: 'TypeMorph | 300以上のローカルファースト開発ツールとコンバーター',
  description: 'JSON、SQL、APIスキーマをTypeScriptやZodに瞬時に変換。完全にブラウザ内で動作し、機密データを外部に送信しません。',
};

export default function JapaneseHomePage() {
  return <TypeMorphApp defaultView="landing" />;
}
