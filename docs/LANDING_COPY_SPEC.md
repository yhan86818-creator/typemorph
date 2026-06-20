# Feature Spec: Landing Page Copy見直し(誇張表現の削除)

## 1. 背景・目的

調査の結果、製品全体のコピーに「Institutional-Grade」「Elite」のような誇張表現、および的外れな比較(競合として"Generic AI Chatbots"を比較表に並べる等)が見つかった。

具体的に確認できた箇所は以下。

- `src/app/layout.tsx` 34行目: ページタイトルが`"TypeMorph | 160+ Institutional-Grade Local-First Developer Tools"`
- `src/components/LandingView.tsx` 541行目付近: 比較表に競合として"Generic AI Chatbots"が含まれている
- `src/app/pricing/page.tsx` 60行目付近: 有料プランの名称に"Elite"が使われている
- `src/data/alternatives.ts`: quicktype等との比較ページのコピー全体

実際のランディングページのスクリーンショットを確認した結果、追加で以下の問題が見つかった。

- 比較表("Why TypeMorph Pro?")で、競合として"Legacy Web Tools"と"Generic AI Chatbot"が並んでいる。これらはユーザーが実際に検討する競合ではなく(実際に比較検討されるのはquicktype等の同カテゴリツール)、的外れな比較に見える。
- "[TRUSTED BY ENTERPRISE ARCHITECTS]"というバッジが表示されているが、現時点でこれを裏付ける実績(導入企業、利用者数等)が確認できない。根拠のない権威付けは、信頼性を損なうリスクが高いため削除する。
- "Stop pasting data into ad-heavy tools."というセクションで、競合が広告だらけであることを対立軸にしているが、TypeMorphが本来訴えるべき強みは「広告がないこと」ではなく「ローカルで完結し、データを一切送信しないこと」。広告の有無を軸にした対比は的外れであり、プライバシー・ローカル性の訴求に統合し直す。

これらは、今回採用するポジショニング(下記)と矛盾するため見直す。

**採用するポジショニング: 「サーバーに何も送らない、静かに信頼できるスキーマツール」**。実績(GitHubスター数等)がまだ少ない初期段階で「Institutional-Grade」「Elite」「世界最高」のような大企業向け・誇張的な言葉を使うと、実物を見たときの期待値とのギャップが信頼を損なう。機能の豊富さや派手さを訴える言葉より、「実際に何ができるかを正確に、誇張なく説明する」方向に変える。

## 2. やりたいことの具体像

製品全体のコピーを以下の方針で見直す。

- 「Institutional-Grade」「Elite」「World's most comprehensive」のような、規模・権威を誇示する形容詞は避け、機能を具体的に・正確に説明する言葉に置き換える。
- 競合比較は、実際に比較対象として意味のあるツール(quicktype等、同じカテゴリの変換ツール)に絞る。"Generic AI Chatbots"のような的外れな比較対象は削除する。
- 「100%ブラウザローカルで動作する」「データを一切サーバーに送らない」という、TypeMorphが実際に持っている具体的な特徴を、誇張ではなく事実として前面に出す。

トーンの参考イメージ: 「3 classes affected, 3 of 6 output languages need regeneration」のように、何が起きるかを淡々と具体的に示す書き方が望ましい。「革命的」「業界最高」等の煽り文句は使わない。

## 3. 対象範囲

**今回見直す対象**
- `src/app/layout.tsx`(ページタイトル・メタデータの文言)
- `src/components/LandingView.tsx`(トップページの比較表・コピー。特に"Why TypeMorph Pro?"比較表の競合項目、"[TRUSTED BY ENTERPRISE ARCHITECTS]"バッジ、"Stop pasting data into ad-heavy tools"セクション)
- `src/app/pricing/page.tsx`(プラン名・説明文)
- `src/data/alternatives.ts`(quicktype等との比較ページのコピー)
- 日本語版ランディングページ(`src/app/jp/page.tsx`)も同様の方針で確認し、対応する誇張表現があれば見直す

**今回やらないこと**
- レイアウト・デザイン(配色、余白、コンポーネント構造)の変更は行わない。文言(テキスト)のみを対象とする。
- 機能の実装・修正は行わない。本タスクはコピーの見直しのみ。
- 価格そのもの(金額)の変更は対象外。プラン名や説明文の言葉づかいのみを見直す。

## 4. 受け入れ条件

- 上記4ファイルから、誇大・権威主義的な表現(Institutional-Grade, Elite, World's most等)が、より具体的で事実に基づいた表現に置き換えられていること。
- "Generic AI Chatbots"・"Legacy Web Tools"のような、比較対象として不適切な項目が比較表から削除されていること。
- "[TRUSTED BY ENTERPRISE ARCHITECTS]"のような、現時点で根拠を示せない実績主張のバッジが削除されていること。
- "ad-heavy tools"を軸にした対立構造が、プライバシー・ローカル完結という本来の強みを軸にした訴求に書き換えられていること。
- 既存のテストが壊れないこと(コピー変更がコンポーネントの構造やpropsを壊していないか確認)。
- 変更後、ぽぽ自身が実際にページを開いて、トーンが意図通りになっているか目で確認する。

## 5. 設計判断は実装者(Opus)に委ねる部分

- 具体的にどの言葉に置き換えるか(例: "Institutional-Grade"を何と言い換えるか)の最終的な文言選定
- 比較表で"Generic AI Chatbots"を削除した後、何行構成にするか
- プラン名("Elite"等)の代替案
- 日本語版ページの文言をどう調整するか(英語版と完全に同じ方針で訳すか、日本語の文脈に合わせて多少調整するか)
