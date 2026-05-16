import React from 'react';
import TypeFlowApp from '../page';

export const metadata = {
  title: 'TypeFlow Pro | 300以上のローカルファースト開発ツールとコンバーター',
  description: 'JSON、SQL、APIスキーマをTypeScriptやZodに瞬時に変換。完全にブラウザ内で動作し、機密データを外部に送信しません。',
};

export default function JapaneseHomePage() {
  return <TypeFlowApp defaultView="landing" />;
}
