/**
 * What drafters actually type. Team aliases (full names, cities, nicknames)
 * live on each team in `teams.ts`; this file holds player nicknames and
 * initialisms, keyed by sport then player id.
 *
 * Search is accent, case and punctuation insensitive, so "arsb", "ARSB" and
 * "A.R.S.B." all work. Keep entries short and well known.
 */
import type { Sport } from '../engine/types';

const NFL_PLAYER_ALIASES: Record<string, string[]> = {
  p_ja_chase: ['Uno', 'JMC'],
  p_bi_robinson: ['Bijan', 'BR7'],
  p_ja_gibbs: ['Sonic'],
  p_pu_nacua: ['Puka'],
  p_ce_lamb: ['CD', 'CD Lamb', 'CeeDee'],
  p_ju_jefferson: ['JJ', 'Jettas', 'JJettas', 'Griddy'],
  p_ch_mccaffrey: ['CMC', 'Run CMC'],
  p_am_ra_st_brown: ['ARSB', 'Sun God', 'Saint Brown'],
  p_ja_smith_njigba: ['JSN'],
  p_as_jeanty: ['Jeanty'],
  p_ma_nabers: ['Leek'],
  p_de_achane: ['Achane'],
  p_jo_taylor: ['JT', 'JT28'],
  p_ni_collins: ['Nico'],
  p_sa_barkley: ['Saquon', 'Quads', 'SaQuads'],
  p_br_thomas: ['BTJ', 'BT Jr'],
  p_dr_london: ['London'],
  p_de_henry: ['King Henry', 'El Tractorcito', 'Tractorcito', 'The King'],
  p_aj_brown: ['AJB', 'Swole Batman'],
  p_ga_wilson: ['GW', 'G Wilson'],
  p_la_mcconkey: ['Ladd'],
  p_ja_cook: ['Cook'],
  p_te_higgins: ['Tee'],
  p_ky_williams: ['Kyren'],
  p_te_mcmillan: ['Tet', 'TMac'],
  p_bu_irving: ['Bucky'],
  p_jo_allen: ['JA17'],
  p_la_jackson: ['Lamar', 'LJ', 'LJ8', 'Action Jackson'],
  p_br_hall: ['Breece'],
  p_da_adams: ['Tae'],
  p_te_mclaurin: ['Scary Terry', 'F1'],
  p_dk_metcalf: ['DK'],
  p_ja_hurts: ['Hurts'],
  p_ja_williams: ['Jamo'],
  p_tr_henderson: ['Tre'],
  p_ke_walker: ['K9', 'KW3'],
  p_ja_waddle: ['Penguin'],
  p_jo_burrow: ['Joey B', 'Joe Brrr', 'Joe Shiesty', 'Joe Cool'],
  p_ma_harrison: ['MHJ', 'Maserati Marv'],
  p_ja_daniels: ['JD5'],
  p_al_kamara: ['AK41', 'AK'],
  p_de_smith: ['Slim Reaper', 'Smitty', 'Skinny Batman'],
  p_pa_mahomes: ['PM15', 'Showtime', 'Pat', 'Patty Ice'],
  p_ca_skattebo: ['Skatt'],
  p_ma_stafford: ['Staff'],
  p_ty_hill: ['Cheetah', 'Reek'],
  p_ge_kittle: ["People's Tight End"],
  p_da_montgomery: ['Knuckles', 'D-Mont', 'Monty'],
  p_mi_pittman: ['MPJ'],
  p_ju_herbert: ['Herbie'],
  p_ky_murray: ['K1'],
  p_da_prescott: ['Dak'],
  p_ma_andrews: ['Mandrews'],
  p_is_pacheco: ['Pop', 'Pacheco'],
  p_tr_kelce: ['Killa Trav', 'Zeus'],
  p_tr_etienne: ['ETN'],
  p_co_kupp: ['Coop'],
  p_st_diggs: ['Diggs'],
  p_br_purdy: ['Mr. Irrelevant', 'BCB'],
  p_ba_mayfield: ['Bake', 'Baker'],
  p_cj_stroud: ['CJ', 'CJ7'],
  p_tr_lawrence: ['T-Law', 'TLaw', 'Sunshine'],
  p_de_samuel: ['Deebo'],
  p_ta_dell: ['Tank'],
  p_ta_bigsby: ['Tank'],
  p_ma_brown: ['Hollywood'],
  p_jj_mccarthy: ['JJ', 'JJM', 'Nine'],
  p_tu_tagovailoa: ['Tua'],
};

export const PLAYER_ALIASES: Record<Sport, Record<string, string[]>> = {
  nfl: NFL_PLAYER_ALIASES,
  nba: {},
  mlb: {},
};

/** Position words people type instead of the abbreviation. */
export const POSITION_WORDS: Record<string, string[]> = {
  QB: ['quarterback'],
  RB: ['running back', 'runningback', 'back', 'halfback'],
  WR: ['wide receiver', 'receiver', 'wideout'],
  TE: ['tight end'],
};

export function playerAliases(playerId: string, sport: Sport = 'nfl'): string[] {
  return PLAYER_ALIASES[sport]?.[playerId] ?? [];
}
