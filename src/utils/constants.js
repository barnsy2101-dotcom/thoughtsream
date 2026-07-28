export const ACCENT = 'var(--text-main)';
export const TOPIC_ACCENT = 'var(--text-main)';

/* index 0 = neutral default; others are user-assignable */
export const COLORS = [
  { bg: 'var(--bubble-bg-default)', border: 'var(--bubble-border-default)', text: 'var(--text-main)', dot: '#737373' },
  { bg: 'rgba(255,255,255,0.06)',  border: 'rgba(255,255,255,0.20)', text: 'var(--text-main)', dot: '#cccccc' },
  { bg: 'rgba(200,200,200,0.08)',  border: 'rgba(200,200,200,0.22)', text: 'var(--text-main)', dot: '#aaaaaa' },
  { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.38)', text: 'var(--text-main)', dot: '#f472b6' },
  { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.38)',  text: 'var(--text-main)', dot: '#fbbf24' },
  { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.38)',  text: '#d1fae5', dot: '#34d399' },
];

/* ---------- simulated AI knowledge (fallback when no API key) ---------- */
export const CATEGORIES = {
  'Marketing':          ['marketing','ads','advertising','seo','social','brand','branding','campaign','content','audience','promotion','influencer','newsletter','outreach'],
  'Revenue & Pricing':  ['revenue','pricing','price','subscription','monetize','monetization','sales','profit','paid','billing','freemium','tier','upsell','money'],
  'Product':            ['product','feature','features','mvp','prototype','roadmap','app','tool','integration','plugin'],
  'Launch & Timeline':  ['launch','timeline','deadline','schedule','ship','shipping','release','milestone','beta','sprint','quarter'],
  'Team & Hiring':      ['team','hire','hiring','recruit','founder','cofounder','engineer','designer','staff','culture','contractor'],
  'Technology':         ['api','backend','frontend','database','ai','llm','ml','cloud','infrastructure','stack','code','tech','automation'],
  'Users & Customers':  ['user','users','customer','customers','feedback','onboarding','retention','churn','community','support','persona'],
  'Growth':             ['growth','scale','scaling','viral','referral','referrals','acquisition','funnel','conversion','metrics','kpi','partnership'],
  'Design':             ['design','ui','ux','visual','layout','logo','style','aesthetic','wireframe'],
  'Risks & Challenges': ['risk','risks','competitor','competitors','challenge','problem','threat','legal','cost','costs','budget','burnout'],
};

export const STOP = new Set(('the a an and or but if then of to in on for with we our is are be it this that i my me at as by from about into '
  + 'should could would can will need needs more less get make makes use using have has had do does did how what when where why who '
  + 'maybe also just really think thing things idea ideas new some every want wants like lets let go going lot very much so not no yes '
  + 'up out over under after before there here they them their you your one two too all any way ways good great big small pro con').split(' '));

/* ---------- starter templates ---------- */
export const TEMPLATES = {
  'SWOT analysis': [
    'Strength: what do we do better than anyone?',
    'Weakness: where are we most exposed?',
    'Opportunity: what trend could we ride?',
    'Threat: which competitor move worries us?',
  ],
  'How might we…': [
    'How might we delight first-time users?',
    'How might we double word-of-mouth growth?',
    'How might we cut onboarding to one step?',
  ],
  'Pros & cons': [
    'Pro: the strongest argument in favor',
    'Con: the biggest risk or cost',
    'Pro: a second-order benefit',
    'Con: what could go wrong long-term?',
  ],
};

/* ---------- persistence ---------- */
export const LS_SESSIONS = 'thoughtstream_sessions';
export const LS_CURRENT = 'thoughtstream_current';
export const LS_APIKEY = 'thoughtstream_api_key';
export const LS_HISTORY = 'thoughtstream_history';
export const LS_LAST_ACTIVE = 'thoughtstream_last_active';
