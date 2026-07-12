/**
 * Single source of truth for every question in the three modules.
 * The UI renders from these definitions and the Sheet columns are derived
 * from the `key` order, so prompt text and stored data never drift apart.
 *
 * `gentle` (溫柔版) and `sharp` (犀利版) only change the *wording shown now* —
 * historical rows already written keep whatever tone was used at the time.
 */

export type Tone = "gentle" | "sharp";
export type FieldType = "text" | "longtext" | "scale";

export interface Question {
  key: string;
  type: FieldType;
  /** short label used as the spreadsheet column header */
  label: string;
  gentle: string;
  sharp: string;
  /** scale bounds (inclusive) */
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  required?: boolean;
}

export const prompt = (q: Question, tone: Tone): string =>
  tone === "sharp" ? q.sharp : q.gentle;

/* ----------------------------- 每日打卡 ----------------------------- */
export const DAILY_QUESTIONS: Question[] = [
  {
    key: "alive",
    type: "longtext",
    label: "最活著的時刻",
    gentle: "今天最活著的時刻是什麼？",
    sharp: "今天什麼時候感覺最活著？什麼時候感覺最像在演戲？",
    placeholder: "慢慢寫，沒有標準答案⋯⋯",
    required: true,
  },
  {
    key: "avoiding",
    type: "longtext",
    label: "在逃避的事",
    gentle: "今天有哪件我一直在逃避、但其實該面對的事？",
    sharp: "我今天到底在逃避什麼？誠實講。",
  },
  {
    key: "direction",
    type: "scale",
    label: "靠近渴望的生活",
    min: 1,
    max: 5,
    minLabel: "推向我不要的人生",
    maxLabel: "推向我渴望的人生",
    gentle:
      "今天的行動，比較靠近「我不想要的生活」還是「我渴望的生活」？",
    sharp: "我今天做的事，正把我推向我厭惡的人生，還是我渴望的人生？",
    required: true,
  },
  {
    key: "energy",
    type: "scale",
    label: "活力值",
    min: 1,
    max: 10,
    minLabel: "耗盡",
    maxLabel: "充盈",
    gentle: "今天的活力值",
    sharp: "今天的活力值",
    required: true,
  },
  {
    key: "note",
    type: "text",
    label: "一句話備註",
    gentle: "一句話備註",
    sharp: "一句話，不用修飾",
    placeholder: "隨手記一句⋯⋯",
  },
  // NOTE: appended at the end on purpose. Sheet columns are derived from this
  // array's order, so inserting mid-list would shift every existing user's
  // historical daily columns out of alignment. New questions must go last.
  {
    key: "oldIdentity",
    type: "longtext",
    label: "維護舊身分的行為",
    gentle:
      "今天有哪些行為，其實是在維持一個「已經不太適合我、卻很熟悉」的舊自己？（先看見就好，不用急著改）",
    sharp: "我今天做的哪些事，只是在維護那個低效、早該淘汰的舊身分？",
  },
  {
    key: "pretendUnimportant",
    type: "longtext",
    label: "假裝不重要的事",
    gentle:
      "有沒有一件其實很重要的事，我正在假裝它「還好、沒那麼要緊」？",
    sharp:
      "有哪件最重要的事，是我正在假裝它不重要——好讓自己可以繼續不去面對它？",
  },
];

/* ----------------------------- 每週整理 ----------------------------- */
export const WEEKLY_QUESTIONS: Question[] = [
  {
    key: "pattern",
    type: "longtext",
    // Column header / analytics key stays "內在模式" (analytics finds this column
    // by that header text, and old rows keep their column) — only the wording shown changes.
    label: "內在模式",
    gentle:
      "這一週，有什麼感覺一直擋在我跟我想做的事之間？（先看見、為它命名就好，不用苛責自己）",
    sharp:
      "這一週，是什麼感覺一直擋在我跟我想做的事之間？別替它找藉口——直接指名它。",
    required: true,
  },
  {
    key: "refuse",
    type: "longtext",
    label: "拒絕成為的樣子",
    gentle: "我拒絕讓生活變成的樣子（一句話）",
    sharp: "我拒絕讓生命變成的樣子——寫到讓自己不舒服為止",
  },
  {
    key: "building",
    type: "longtext",
    label: "正在建設的生活",
    gentle: "我正在建設的生活（一句話）",
    sharp: "我正在建設的生活（一句話）",
  },
  {
    key: "representative",
    type: "longtext",
    label: "代表性的舉動",
    gentle: "這週最能代表「我想成為的人」的一個舉動是什麼？",
    sharp:
      "這週有哪個瞬間，是「我想成為的人」會做的事？只有一個算一個。",
  },
  {
    key: "adjust",
    type: "longtext",
    label: "下週想調整的一件事",
    gentle: "下週想調整的一件小事",
    sharp: "下週要改的一件事，講具體的，不要講「加油」那種空話",
  },
];

/* --------------------------- 季度深度重啟 --------------------------- */
export const QUARTERLY_QUESTIONS: Question[] = [
  {
    key: "dissatisfaction",
    type: "longtext",
    label: "持久的不滿",
    gentle:
      "有什麼樣的不滿，我已經忍受到覺得「還好」，但其實我很討厭？",
    sharp:
      "我學會忍受的持久不滿是什麼？那種我明明討厭卻日復一日接受的平庸。",
    required: true,
  },
  {
    key: "socialChange",
    type: "longtext",
    label: "社交上的改變",
    gentle:
      "如果我不再扮演現在這個角色，社交上會有什麼改變？誰會因此不開心？",
    sharp:
      "如果我不再是現在這個「平庸的角色」，我會在社交上失去什麼？誰會不高興？",
  },
  {
    key: "unspoken",
    type: "longtext",
    label: "還沒說出口的觀察",
    gentle:
      "關於現在的生活，有什麼觀察是我還沒對任何人說出口的？",
    sharp:
      "關於我現在的生活，有什麼真相是我不敢對最尊敬的人承認的？",
  },
  {
    key: "fiveTenYears",
    type: "longtext",
    label: "5年後與10年後",
    gentle:
      "如果未來 5 年完全沒有改變，一個尋常的週二會是什麼樣子？10 年後呢？",
    sharp:
      "如果 5 年後完全沒改變，描述一個平凡的週二。10 年後呢？誰會最終放棄我？",
  },
  {
    key: "protecting",
    type: "longtext",
    label: "在保護什麼、代價是什麼",
    gentle:
      "為了維持現在的「安全感」，我在保護什麼？這個保護讓我付出了什麼代價？",
    sharp:
      "為了維持現狀的「安全」，我在保護什麼脆弱的東西？付出了什麼代價？",
  },
  {
    key: "singlePattern",
    type: "longtext",
    label: "單一內在模式",
    gentle: "主導這一切的「單一內在模式」是什麼？",
    sharp:
      "定義「單一敵人」：主導局勢的內部模式是什麼（例如：害怕被嘲笑）？",
    required: true,
  },
  {
    key: "antiVision",
    type: "longtext",
    label: "反願景",
    gentle: "反願景：我拒絕讓生命變成的樣子（一句話）",
    sharp: "反願景：用一句讓自己讀了不舒服的話，捕捉我拒絕的人生",
  },
  {
    key: "visionMvp",
    type: "longtext",
    label: "願景 MVP",
    gentle: "願景 MVP：我正在建設的生活（一句話）",
    sharp: "願景 MVP：我正在建設的生活（一句話）",
  },
  {
    key: "identity",
    type: "text",
    label: "身分宣告",
    gentle: "身分宣告：我是一個會______的人",
    sharp: "身分宣告：我是一個會______的人",
    placeholder: "我是一個會⋯⋯的人",
    required: true,
  },
];

export const MODULES = {
  daily: DAILY_QUESTIONS,
  weekly: WEEKLY_QUESTIONS,
  quarterly: QUARTERLY_QUESTIONS,
} as const;

export type ModuleKey = keyof typeof MODULES;
