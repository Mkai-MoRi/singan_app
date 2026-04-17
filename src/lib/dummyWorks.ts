export interface Work {
  id: number;
  caseName: string;
  title: string;
  meta: string;
  /** 記録タブ「作品検索」でピンしたときに表示する解説（任意） */
  caption?: string;
  /** タイトル以外の表記でも検索できるようにする（任意） */
  searchAliases?: readonly string[];
}

export const WORKS: Work[] = [
  { id: 1,  caseName: "CASE_01", title: "無題・濃紺",        meta: "油彩・キャンバス / 推定1980s" },
  { id: 2,  caseName: "CASE_02", title: "静物 No.7",          meta: "水彩・紙 / 推定1960s" },
  { id: 3,  caseName: "CASE_03", title: "朱の矩形",           meta: "アクリル・木板 / 推定1990s" },
  { id: 4,  caseName: "CASE_04", title: "港の夕景",           meta: "油彩・キャンバス / 推定1940s" },
  { id: 5,  caseName: "CASE_05", title: "裸婦習作 III",       meta: "木炭・紙 / 推定1930s" },
  { id: 6,  caseName: "CASE_06", title: "幾何学的構成 α",     meta: "油彩・キャンバス / 推定1970s" },
  { id: 7,  caseName: "CASE_07", title: "風景断片 #12",       meta: "水彩・紙 / 推定1950s" },
  { id: 8,  caseName: "CASE_08", title: "石膏頭部",           meta: "ブロンズ鋳造 / 推定1920s" },
  { id: 9,  caseName: "CASE_09", title: "抽象・白",           meta: "油彩・麻布 / 推定2000s" },
  { id: 10, caseName: "CASE_10", title: "室内 午後",          meta: "油彩・キャンバス / 推定1970s" },
  { id: 11, caseName: "CASE_11", title: "花卉 No.3",          meta: "水彩・紙 / 推定1990s" },
  {
    id: 12,
    caseName: "CASE_12",
    title: "『Specular / スペキュラー』",
    meta: "(2021)",
    searchAliases: ["Specular", "specular", "スペキュラー"],
    caption:
      "『Specular』は、「見る」という行為そのものを主題にした作品です。\n\n球体に投影された目の映像を通して、視覚が世界を捉えるだけでなく、自らに折り返されていく再帰的な構造が示されます。\n\nそこには、ソーシャルメディアや陰謀論、疑似科学、ニュースなど、現代人の認識を形づくる視覚情報が幾重にも重ねられています。\n\n観客は、見ることと見られることのあいだを行き来しながら、スクリーンに媒介された現代の知覚や信念の不安定さに向き合うことになります。",
  },
  { id: 13, caseName: "CASE_13", title: "黒の習作",           meta: "インク・紙 / 推定1980s" },
  { id: 14, caseName: "CASE_14", title: "女性肖像 習作",      meta: "鉛筆・紙 / 推定1910s" },
  { id: 15, caseName: "CASE_15", title: "都市 断面",          meta: "アクリル・ボード / 推定2010s" },
  { id: 16, caseName: "CASE_16", title: "山岳 No.2",          meta: "油彩・キャンバス / 推定1950s" },
  { id: 17, caseName: "CASE_17", title: "赤い矩形と円",       meta: "エナメル・鉄板 / 推定1970s" },
  { id: 18, caseName: "CASE_18", title: "波濤",               meta: "油彩・キャンバス / 推定1930s" },
  { id: 19, caseName: "CASE_19", title: "グリッド構成 VII",   meta: "シルクスクリーン / 推定1980s" },
  { id: 20, caseName: "CASE_20", title: "無名の肖像",         meta: "油彩・キャンバス / 推定1890s" },
];

/** キーワード「練習」解禁後のみ先頭に載る練習枠（00） */
export const PRACTICE_WORK: Work = {
  id: 0,
  caseName: "CASE_00",
  title: "チュートリアル問題",
  meta: "操作トレーニング / CASE 01 に先行",
};

/** キーワード解禁後のみカタログに載る拡張枠（id 21） */
export const SECRET_WORK: Work = {
  id: 21,
  caseName: "CASE_21_EXT",
  title: "夕陽参照アーカイブ",
  meta: "デジタル複製 / 制限解除枠",
};
