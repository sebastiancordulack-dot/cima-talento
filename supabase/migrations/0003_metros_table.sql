-- ============================================================================
-- Migration 0003: Metros reference table
--
-- Moves the metro catalog out of the static `lib/location/metro-data.ts` array
-- and into the database so non-technical staff can add new metros from the UI
-- (the code falls back to the static list if this table is missing/empty, so
-- the app keeps working before this migration is applied).
--
-- Each metro drives three things: the map dot (lng/lat), form auto-routing
-- (zip3 + cities → metro), and the filter/grouping label (metro name).
-- Run this in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.metros (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  metro       text not null unique,                 -- canonical display name
  state       text not null,                        -- representative 2-letter code
  lng         double precision not null,            -- map dot longitude
  lat         double precision not null,            -- map dot latitude
  zip3        text[] not null default '{}',         -- 3-digit ZIP prefixes (auto-routing)
  cities      text[] not null default '{}',         -- lowercase city names (auto-routing)
  created_by  uuid references public.hiring_managers (id) on delete set null
);

create index if not exists metros_zip3_idx   on public.metros using gin (zip3);
create index if not exists metros_cities_idx on public.metros using gin (cities);

-- RLS: any authenticated staff can read. Writes happen through the service-role
-- client in server actions (which bypasses RLS), matching the talent-pool
-- pattern — so no staff-facing insert/update policy is needed here.
alter table public.metros enable row level security;

create policy metros_select on public.metros
  for select to authenticated
  using (true);

-- ---- Seed: the original 28 metros from metro-data.ts ------------------------
insert into public.metros (metro, state, lng, lat, zip3, cities) values
  ('New York', 'NY', -74, 40.71, array['100', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '116', '117', '118', '119', '070', '071', '072', '073', '074', '075', '076', '077', '066', '068', '069']::text[], array['new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'yonkers', 'new rochelle', 'mount vernon', 'hempstead', 'freeport', 'hicksville', 'long island', 'newark', 'jersey city', 'paterson', 'elizabeth', 'edison', 'woodbridge', 'clifton', 'passaic', 'union city', 'bayonne', 'hoboken', 'west new york', 'stamford', 'norwalk', 'bridgeport', 'danbury', 'greenwich']::text[]),
  ('Hartford', 'CT', -72.69, 41.76, array['060', '061', '062']::text[], array['hartford', 'west hartford', 'east hartford', 'new britain']::text[]),
  ('New Haven', 'CT', -72.92, 41.31, array['064', '065']::text[], array['new haven', 'waterbury', 'meriden']::text[]),
  ('Boston', 'MA', -71.06, 42.36, array['018', '019', '020', '021', '022', '024']::text[], array['boston', 'cambridge', 'somerville', 'quincy', 'newton', 'brookline', 'lynn', 'lowell', 'lawrence', 'malden', 'medford', 'revere']::text[]),
  ('Worcester', 'MA', -71.8, 42.26, array['015', '016', '017']::text[], array['worcester', 'framingham']::text[]),
  ('Providence', 'RI', -71.41, 41.82, array['028', '029']::text[], array['providence', 'cranston', 'warwick', 'pawtucket', 'woonsocket']::text[]),
  ('Washington', 'DC', -77.04, 38.9, array['200', '202', '203', '204', '205', '206', '207', '208', '209', '220', '221', '222', '223']::text[], array['washington', 'silver spring', 'bethesda', 'rockville', 'gaithersburg', 'hyattsville', 'college park', 'arlington', 'alexandria', 'fairfax', 'reston', 'herndon', 'falls church', 'annandale', 'manassas']::text[]),
  ('Baltimore', 'MD', -76.61, 39.29, array['210', '211', '212', '214']::text[], array['baltimore', 'columbia', 'towson', 'dundalk', 'annapolis']::text[]),
  ('Richmond', 'VA', -77.44, 37.54, array['232']::text[], array['richmond', 'henrico', 'chesterfield']::text[]),
  ('Hampton Roads', 'VA', -76.29, 36.85, array['233', '234', '235']::text[], array['norfolk', 'virginia beach', 'chesapeake', 'newport news', 'hampton', 'portsmouth', 'suffolk']::text[]),
  ('Chicago', 'IL', -87.63, 41.88, array['600', '601', '602', '603', '604', '605', '606', '607', '608']::text[], array['chicago', 'aurora', 'naperville', 'joliet', 'cicero', 'elgin', 'waukegan', 'skokie', 'evanston', 'schaumburg', 'des plaines', 'berwyn', 'oak park', 'cicero', 'arlington heights', 'bolingbrook']::text[]),
  ('Atlanta', 'GA', -84.39, 33.75, array['300', '301', '302', '303', '305']::text[], array['atlanta', 'marietta', 'sandy springs', 'roswell', 'alpharetta', 'lawrenceville', 'decatur', 'smyrna', 'johns creek', 'duluth', 'kennesaw', 'norcross', 'college park']::text[]),
  ('Nashville', 'TN', -86.78, 36.16, array['370', '371', '372']::text[], array['nashville', 'murfreesboro', 'franklin', 'hendersonville', 'smyrna', 'antioch']::text[]),
  ('Memphis', 'TN', -90.05, 35.15, array['380', '381']::text[], array['memphis', 'germantown', 'bartlett', 'collierville']::text[]),
  ('Knoxville', 'TN', -83.92, 35.96, array['377', '378', '379']::text[], array['knoxville', 'maryville', 'oak ridge']::text[]),
  ('Chattanooga', 'TN', -85.31, 35.05, array['373', '374']::text[], array['chattanooga', 'cleveland']::text[]),
  ('Dallas–Fort Worth', 'TX', -96.9, 32.8, array['750', '751', '752', '753', '760', '761', '762']::text[], array['dallas', 'fort worth', 'arlington', 'plano', 'irving', 'garland', 'frisco', 'mckinney', 'denton', 'mesquite', 'grand prairie', 'carrollton', 'richardson', 'lewisville', 'allen', 'flower mound', 'euless', 'bedford', 'grapevine']::text[]),
  ('Houston', 'TX', -95.37, 29.76, array['770', '771', '772', '773', '774', '775']::text[], array['houston', 'pasadena', 'sugar land', 'the woodlands', 'pearland', 'baytown', 'katy', 'spring', 'cypress', 'humble', 'missouri city', 'league city', 'conroe']::text[]),
  ('San Antonio', 'TX', -98.49, 29.42, array['780', '781', '782']::text[], array['san antonio', 'new braunfels', 'schertz', 'converse']::text[]),
  ('Austin', 'TX', -97.74, 30.27, array['786', '787']::text[], array['austin', 'round rock', 'cedar park', 'georgetown', 'san marcos', 'pflugerville', 'leander', 'kyle']::text[]),
  ('El Paso', 'TX', -106.49, 31.76, array['798', '799', '885']::text[], array['el paso', 'socorro', 'horizon city']::text[]),
  ('Rio Grande Valley', 'TX', -98.23, 26.2, array['785']::text[], array['mcallen', 'brownsville', 'edinburg', 'harlingen', 'pharr', 'mission', 'weslaco', 'san juan']::text[]),
  ('Corpus Christi', 'TX', -97.4, 27.8, array['783', '784']::text[], array['corpus christi', 'portland', 'kingsville']::text[]),
  ('Miami', 'FL', -80.19, 25.76, array['330', '331', '332', '333']::text[], array['miami', 'hialeah', 'miami beach', 'coral gables', 'doral', 'homestead', 'kendall', 'miami gardens', 'north miami', 'fort lauderdale', 'hollywood', 'pembroke pines', 'miramar', 'coral springs', 'davie', 'sunrise', 'plantation', 'aventura']::text[]),
  ('West Palm Beach', 'FL', -80.05, 26.71, array['334']::text[], array['west palm beach', 'boca raton', 'boynton beach', 'delray beach', 'jupiter', 'wellington']::text[]),
  ('Orlando', 'FL', -81.38, 28.54, array['327', '328', '329', '347']::text[], array['orlando', 'kissimmee', 'sanford', 'winter park', 'apopka', 'altamonte springs', 'oviedo']::text[]),
  ('Tampa', 'FL', -82.46, 27.95, array['335', '336', '337', '346']::text[], array['tampa', 'saint petersburg', 'st petersburg', 'clearwater', 'brandon', 'largo', 'riverview', 'wesley chapel']::text[]),
  ('Jacksonville', 'FL', -81.66, 30.33, array['320', '322']::text[], array['jacksonville', 'orange park', 'saint augustine']::text[])
on conflict (metro) do nothing;
