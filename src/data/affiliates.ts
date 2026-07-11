// アフィリエイト広告データ（サイト側で統一デザインに載せ替えて表示する）
// ASPが配布するバナーは使わず、トラッキングURL（href）と計測ビーコン（beacon）だけを利用する。
// 掲載文言（headline / points）は事実ベースの控えめな表現にとどめ、
// 手数料など変動しうる数値は各公式サイトでの確認前提とする。

export type AffiliateCategory =
  | 'securities'
  | 'ideco'
  | 'nisa'
  | 'creditcard'
  | 'app'
  | 'robo'
  | 'book'
  | 'other';

export interface Affiliate {
  id: string;
  name: string;
  category: AffiliateCategory;
  status: 'approved' | 'pending';
  asp: 'a8' | 'valuecommerce';
  href: string;
  beacon?: string;
  initial: string;
  tag: string;
  headline: string;
  points: string[];
  cta: string;
}

export const affiliates: Affiliate[] = [
  {
    id: 'matsui-securities',
    name: '松井証券',
    category: 'securities',
    status: 'approved',
    asp: 'a8',
    href: 'https://px.a8.net/svt/ejp?a8mat=4B7UT5+C6SIE2+3XCC+64C3M',
    beacon: 'https://www16.a8.net/0.gif?a8mat=4B7UT5+C6SIE2+3XCC+64C3M',
    initial: '松',
    tag: 'ネット証券',
    headline: '老舗として知られるネット証券',
    points: [
      '日本株・投資信託・米国株など幅広く対応',
      '少額から積み立てられる',
      'サポート体制に定評',
    ],
    cta: '松井証券の詳細を見る',
  },
  {
    id: 'dmm-kabu',
    name: 'DMM株',
    category: 'securities',
    status: 'approved',
    asp: 'a8',
    href: 'https://px.a8.net/svt/ejp?a8mat=4B7VKV+D2XX22+1WP2+15ORS2',
    beacon: 'https://www19.a8.net/0.gif?a8mat=4B7VKV+D2XX22+1WP2+15ORS2',
    initial: 'D',
    tag: 'ネット証券',
    headline: '日本株も米国株もアプリひとつで',
    points: [
      '取引に応じてポイントが貯まる',
      '米国株の取扱いにも対応',
      'NISA口座にも対応',
    ],
    cta: 'DMM株の詳細を見る',
  },
  {
    id: 'matsui-ideco',
    name: '松井証券のiDeCo',
    category: 'ideco',
    status: 'approved',
    asp: 'a8',
    href: 'https://px.a8.net/svt/ejp?a8mat=4B7UT5+BFEKKA+3XCC+BXIYQ',
    beacon: 'https://www17.a8.net/0.gif?a8mat=4B7UT5+BFEKKA+3XCC+BXIYQ',
    initial: 'i',
    tag: 'iDeCo',
    headline: 'iDeCoで老後資金をコツコツ準備',
    points: [
      '掛金は全額が所得控除の対象',
      '運用益も非課税で再投資できる',
      '低コストの投資信託から選べる',
    ],
    cta: '松井証券のiDeCoを見る',
  },
];
