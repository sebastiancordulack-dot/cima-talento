// Static city/ZIP → metro lookup for CiMA's operating states (Brief §9):
// NY, NJ, CT, MA, RI, MD, VA, DC, IL, GA, TN, TX, FL — and growing.
//
// Each metro lists ZIP 3-digit prefixes (most reliable) and major city names.
// Metro names are the canonical, normalized values stored on candidates and
// talent_pool, so they stay consistent across the platform. Extend by adding
// to METROS; the lookup maps are derived from it.

export interface MetroDef {
  metro: string;
  /** Representative state — only used when the form didn't supply one. */
  state: string;
  /** Approximate city-center [longitude, latitude] for the talent map. */
  coords: [number, number];
  zip3: string[];
  cities: string[];
}

export const METROS: MetroDef[] = [
  // ---- New York metro (spans NY, NJ, CT) ----
  {
    metro: 'New York',
    state: 'NY',
    coords: [-74.00, 40.71],
    zip3: ['100','101','102','103','104','105','106','107','108','109','110','111','112','113','114','116','117','118','119',
           '070','071','072','073','074','075','076','077','066','068','069'],
    cities: ['new york','manhattan','brooklyn','queens','bronx','staten island','yonkers','new rochelle','mount vernon',
             'hempstead','freeport','hicksville','long island','newark','jersey city','paterson','elizabeth','edison',
             'woodbridge','clifton','passaic','union city','bayonne','hoboken','west new york','stamford','norwalk',
             'bridgeport','danbury','greenwich'],
  },
  { metro: 'Hartford', state: 'CT', coords: [-72.69, 41.76], zip3: ['060','061','062'], cities: ['hartford','west hartford','east hartford','new britain'] },
  { metro: 'New Haven', state: 'CT', coords: [-72.92, 41.31], zip3: ['064','065'], cities: ['new haven','waterbury','meriden'] },
  // ---- New England ----
  {
    metro: 'Boston',
    state: 'MA',
    coords: [-71.06, 42.36],
    zip3: ['018','019','020','021','022','024'],
    cities: ['boston','cambridge','somerville','quincy','newton','brookline','lynn','lowell','lawrence','malden','medford','revere'],
  },
  { metro: 'Worcester', state: 'MA', coords: [-71.80, 42.26], zip3: ['015','016','017'], cities: ['worcester','framingham'] },
  { metro: 'Providence', state: 'RI', coords: [-71.41, 41.82], zip3: ['028','029'], cities: ['providence','cranston','warwick','pawtucket','woonsocket'] },
  // ---- DC / Mid-Atlantic ----
  {
    metro: 'Washington',
    state: 'DC',
    coords: [-77.04, 38.90],
    zip3: ['200','202','203','204','205','206','207','208','209','220','221','222','223'],
    cities: ['washington','silver spring','bethesda','rockville','gaithersburg','hyattsville','college park',
             'arlington','alexandria','fairfax','reston','herndon','falls church','annandale','manassas'],
  },
  { metro: 'Baltimore', state: 'MD', coords: [-76.61, 39.29], zip3: ['210','211','212','214'], cities: ['baltimore','columbia','towson','dundalk','annapolis'] },
  { metro: 'Richmond', state: 'VA', coords: [-77.44, 37.54], zip3: ['232'], cities: ['richmond','henrico','chesterfield'] },
  { metro: 'Hampton Roads', state: 'VA', coords: [-76.29, 36.85], zip3: ['233','234','235'], cities: ['norfolk','virginia beach','chesapeake','newport news','hampton','portsmouth','suffolk'] },
  // ---- Midwest ----
  {
    metro: 'Chicago',
    state: 'IL',
    coords: [-87.63, 41.88],
    zip3: ['600','601','602','603','604','605','606','607','608'],
    cities: ['chicago','aurora','naperville','joliet','cicero','elgin','waukegan','skokie','evanston','schaumburg',
             'des plaines','berwyn','oak park','cicero','arlington heights','bolingbrook'],
  },
  // ---- Southeast ----
  {
    metro: 'Atlanta',
    state: 'GA',
    coords: [-84.39, 33.75],
    zip3: ['300','301','302','303','305'],
    cities: ['atlanta','marietta','sandy springs','roswell','alpharetta','lawrenceville','decatur','smyrna',
             'johns creek','duluth','kennesaw','norcross','college park'],
  },
  { metro: 'Nashville', state: 'TN', coords: [-86.78, 36.16], zip3: ['370','371','372'], cities: ['nashville','murfreesboro','franklin','hendersonville','smyrna','antioch'] },
  { metro: 'Memphis', state: 'TN', coords: [-90.05, 35.15], zip3: ['380','381'], cities: ['memphis','germantown','bartlett','collierville'] },
  { metro: 'Knoxville', state: 'TN', coords: [-83.92, 35.96], zip3: ['377','378','379'], cities: ['knoxville','maryville','oak ridge'] },
  { metro: 'Chattanooga', state: 'TN', coords: [-85.31, 35.05], zip3: ['373','374'], cities: ['chattanooga','cleveland'] },
  // ---- Texas ----
  {
    metro: 'Dallas–Fort Worth',
    state: 'TX',
    coords: [-96.90, 32.80],
    zip3: ['750','751','752','753','760','761','762'],
    cities: ['dallas','fort worth','arlington','plano','irving','garland','frisco','mckinney','denton','mesquite',
             'grand prairie','carrollton','richardson','lewisville','allen','flower mound','euless','bedford','grapevine'],
  },
  {
    metro: 'Houston',
    state: 'TX',
    coords: [-95.37, 29.76],
    zip3: ['770','771','772','773','774','775'],
    cities: ['houston','pasadena','sugar land','the woodlands','pearland','baytown','katy','spring','cypress',
             'humble','missouri city','league city','conroe'],
  },
  { metro: 'San Antonio', state: 'TX', coords: [-98.49, 29.42], zip3: ['780','781','782'], cities: ['san antonio','new braunfels','schertz','converse'] },
  { metro: 'Austin', state: 'TX', coords: [-97.74, 30.27], zip3: ['786','787'], cities: ['austin','round rock','cedar park','georgetown','san marcos','pflugerville','leander','kyle'] },
  { metro: 'El Paso', state: 'TX', coords: [-106.49, 31.76], zip3: ['798','799','885'], cities: ['el paso','socorro','horizon city'] },
  { metro: 'Rio Grande Valley', state: 'TX', coords: [-98.23, 26.20], zip3: ['785'], cities: ['mcallen','brownsville','edinburg','harlingen','pharr','mission','weslaco','san juan'] },
  { metro: 'Corpus Christi', state: 'TX', coords: [-97.40, 27.80], zip3: ['783','784'], cities: ['corpus christi','portland','kingsville'] },
  // ---- Florida ----
  {
    metro: 'Miami',
    state: 'FL',
    coords: [-80.19, 25.76],
    zip3: ['330','331','332','333'],
    cities: ['miami','hialeah','miami beach','coral gables','doral','homestead','kendall','miami gardens','north miami',
             'fort lauderdale','hollywood','pembroke pines','miramar','coral springs','davie','sunrise','plantation','aventura'],
  },
  { metro: 'West Palm Beach', state: 'FL', coords: [-80.05, 26.71], zip3: ['334'], cities: ['west palm beach','boca raton','boynton beach','delray beach','jupiter','wellington'] },
  { metro: 'Orlando', state: 'FL', coords: [-81.38, 28.54], zip3: ['327','328','329','347'], cities: ['orlando','kissimmee','sanford','winter park','apopka','altamonte springs','oviedo'] },
  { metro: 'Tampa', state: 'FL', coords: [-82.46, 27.95], zip3: ['335','336','337','346'], cities: ['tampa','saint petersburg','st petersburg','clearwater','brandon','largo','riverview','wesley chapel'] },
  { metro: 'Jacksonville', state: 'FL', coords: [-81.66, 30.33], zip3: ['320','322'], cities: ['jacksonville','orange park','saint augustine'] },
];

// US state name → 2-letter code (for normalizing the free-text "Estado" field).
export const STATE_ABBR: Record<string, string> = {
  alabama:'AL', alaska:'AK', arizona:'AZ', arkansas:'AR', california:'CA', colorado:'CO', connecticut:'CT',
  delaware:'DE', 'district of columbia':'DC', florida:'FL', georgia:'GA', hawaii:'HI', idaho:'ID', illinois:'IL',
  indiana:'IN', iowa:'IA', kansas:'KS', kentucky:'KY', louisiana:'LA', maine:'ME', maryland:'MD', massachusetts:'MA',
  michigan:'MI', minnesota:'MN', mississippi:'MS', missouri:'MO', montana:'MT', nebraska:'NE', nevada:'NV',
  'new hampshire':'NH', 'new jersey':'NJ', 'new mexico':'NM', 'new york':'NY', 'north carolina':'NC',
  'north dakota':'ND', ohio:'OH', oklahoma:'OK', oregon:'OR', pennsylvania:'PA', 'rhode island':'RI',
  'south carolina':'SC', 'south dakota':'SD', tennessee:'TN', texas:'TX', utah:'UT', vermont:'VT', virginia:'VA',
  washington:'WA', 'west virginia':'WV', wisconsin:'WI', wyoming:'WY',
};

const VALID_ABBR = new Set(Object.values(STATE_ABBR));

/** Lowercase, strip accents/punctuation, collapse whitespace. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize a free-text state to its 2-letter code, else return cleaned input. */
export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  const trimmed = state.trim();
  if (trimmed === '') return null;
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && VALID_ABBR.has(upper)) return upper;
  const byName = STATE_ABBR[normalizeText(trimmed)];
  return byName ?? upper;
}

// Derived lookups (built once at module load).
export const ZIP3_TO_METRO: Record<string, { metro: string; state: string }> = {};
export const CITY_TO_METRO: Record<string, { metro: string; state: string }> = {};
for (const m of METROS) {
  for (const z of m.zip3) ZIP3_TO_METRO[z] = { metro: m.metro, state: m.state };
  for (const c of m.cities) CITY_TO_METRO[normalizeText(c)] = { metro: m.metro, state: m.state };
}
