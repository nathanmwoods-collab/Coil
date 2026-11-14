/**
 * Team reference data, keyed by sport then abbreviation. Adding a sport is
 * data-only: add its teams here and its players to the player pool.
 *
 * Colors are approximate primary/secondary brand colors used only to tint
 * fallback avatars. No logos or wordmarks are used anywhere in the app.
 */
import type { Sport } from '../engine/types';

export interface Team {
  abbr: string;
  city: string;
  /** Team name, e.g. "Eagles". */
  name: string;
  /** What fans actually type. */
  nicknames: string[];
  /** Primary color (avatar fill). */
  color: string;
  /** Secondary color (avatar ring). */
  alt: string;
}

const t = (abbr: string, city: string, name: string, nicknames: string[], color: string, alt: string): Team => ({
  abbr, city, name, nicknames, color, alt,
});

const NFL: Team[] = [
  t('ARI', 'Arizona', 'Cardinals', ['Cards', 'Zona', 'Red Sea'], '#97233F', '#FFB612'),
  t('ATL', 'Atlanta', 'Falcons', ['Falcs', 'Rise Up'], '#A71930', '#A5ACAF'),
  t('BAL', 'Baltimore', 'Ravens', ['Flock', 'Bmore'], '#241773', '#9E7C0C'),
  t('BUF', 'Buffalo', 'Bills', ['Mafia', 'Bills Mafia'], '#00338D', '#C60C30'),
  t('CAR', 'Carolina', 'Panthers', ['Cats', 'Keep Pounding'], '#0085CA', '#101820'),
  t('CHI', 'Chicago', 'Bears', ['Da Bears', 'Monsters of the Midway'], '#0B162A', '#C83803'),
  t('CIN', 'Cincinnati', 'Bengals', ['Who Dey', 'Cincy', 'Stripes'], '#FB4F14', '#000000'),
  t('CLE', 'Cleveland', 'Browns', ['Dawgs', 'Dawg Pound'], '#311D00', '#FF3C00'),
  t('DAL', 'Dallas', 'Cowboys', ['Boys', "America's Team", 'Pokes'], '#003594', '#869397'),
  t('DEN', 'Denver', 'Broncos', ['Donkeys', 'Orange Crush'], '#FB4F14', '#002244'),
  t('DET', 'Detroit', 'Lions', ['Motor City', 'Honolulu Blue'], '#0076B6', '#B0B7BC'),
  t('GB', 'Green Bay', 'Packers', ['Pack', 'Cheeseheads', 'GNB'], '#203731', '#FFB612'),
  t('HOU', 'Houston', 'Texans', ['H-Town', 'Tex'], '#03202F', '#A71930'),
  t('IND', 'Indianapolis', 'Colts', ['Indy', 'Horseshoe'], '#002C5F', '#A2AAAD'),
  t('JAX', 'Jacksonville', 'Jaguars', ['Jags', 'Duval', 'JAC'], '#006778', '#D7A22A'),
  t('KC', 'Kansas City', 'Chiefs', ['Kingdom', 'KAN'], '#E31837', '#FFB81C'),
  t('LAC', 'Los Angeles', 'Chargers', ['Bolts', 'LA Chargers'], '#0080C6', '#FFC20E'),
  t('LAR', 'Los Angeles', 'Rams', ['LA Rams', 'Horns'], '#003594', '#FFA300'),
  t('LV', 'Las Vegas', 'Raiders', ['Vegas', 'Silver and Black', 'LVR', 'Raider Nation'], '#000000', '#A5ACAF'),
  t('MIA', 'Miami', 'Dolphins', ['Fins', 'Phins'], '#008E97', '#FC4C02'),
  t('MIN', 'Minnesota', 'Vikings', ['Vikes', 'Skol'], '#4F2683', '#FFC62F'),
  t('NE', 'New England', 'Patriots', ['Pats', 'NWE', 'Foxborough'], '#002244', '#C60C30'),
  t('NO', 'New Orleans', 'Saints', ['Nola', 'Who Dat', 'NOR'], '#D3BC8D', '#101820'),
  t('NYG', 'New York', 'Giants', ['G-Men', 'Big Blue', 'NY Giants'], '#0B2265', '#A71930'),
  t('NYJ', 'New York', 'Jets', ['Gang Green', 'NY Jets'], '#125740', '#FFFFFF'),
  t('PHI', 'Philadelphia', 'Eagles', ['Birds', 'Iggles', 'Philly'], '#004C54', '#A5ACAF'),
  t('PIT', 'Pittsburgh', 'Steelers', ['Stillers', 'Steel City', 'Black and Yellow'], '#FFB612', '#101820'),
  t('SEA', 'Seattle', 'Seahawks', ['Hawks', '12s'], '#002244', '#69BE28'),
  t('SF', 'San Francisco', '49ers', ['Niners', 'Forty Niners', 'SFO'], '#AA0000', '#B3995D'),
  t('TB', 'Tampa Bay', 'Buccaneers', ['Bucs', 'Tampa', 'TAM'], '#D50A0A', '#34302B'),
  t('TEN', 'Tennessee', 'Titans', ['Nashville', 'Tits'], '#0C2340', '#4B92DB'),
  t('WAS', 'Washington', 'Commanders', ['Commies', 'DC', 'WSH'], '#5A1414', '#FFB612'),
];

const index = (teams: Team[]) => Object.fromEntries(teams.map((x) => [x.abbr, x]));

/** Sports with no teams yet are simply empty. */
export const TEAMS: Record<Sport, Record<string, Team>> = {
  nfl: index(NFL),
  nba: {},
  mlb: {},
};

export function teamInfo(abbr: string, sport: Sport = 'nfl'): Team | undefined {
  return TEAMS[sport]?.[abbr];
}

/** Black or white, whichever reads better on a hex fill. */
export function readableOn(hex: string): '#0B0B14' | '#FFFFFF' {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? '#0B0B14' : '#FFFFFF';
}
