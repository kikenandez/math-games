/* Bid Challenge — build the most appealing holiday resort at auction.
 *
 * Each player starts with 20 stars. Ten places (hotels, rides, restaurants,
 * relaxation spots) are auctioned with SEALED bids: the highest bid wins the
 * place and pays its stars, the others keep theirs. Final score = appeal of
 * every place + pair bonuses + variety bonus + 1 pt per unspent star
 * − a penalty if the resort has nowhere to sleep.
 *
 * Options: hot-seat or computer opponents (2-4 seats), "one by one" or
 * "all at once" auctions, random news flashes, silent bidding.
 * Port of the pygame version (retroGames/bidChallenge).
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- i18n
  const I18N = window.MathArcadeI18n;
  const LANG = I18N && ['en', 'fr', 'es'].includes(I18N.lang) ? I18N.lang : 'en';
  const LI = { en: 0, fr: 1, es: 2 }[LANG];

  const S = {
    subtitle: ['Build the most attractive holiday resort — at auction!', 'Construisez la station de vacances la plus attirante — aux enchères !', '¡Construye el complejo vacacional más atractivo — en subasta!'],
    intro: ['Everyone gets {0} stars and {1} places go up for auction. Secret bids: the highest wins the place and pays its stars. Build the most appealing resort!',
      'Chacun reçoit {0} étoiles et {1} lieux sont mis aux enchères. Mises secrètes : la plus haute remporte le lieu et paie ses étoiles. Construisez la station la plus attirante !',
      'Cada uno recibe {0} estrellas y se subastan {1} lugares. Pujas secretas: la más alta gana el lugar y paga sus estrellas. ¡Construye el complejo más atractivo!'],
    seat: ['Seat {0}', 'Place {0}', 'Puesto {0}'],
    human: ['Human', 'Humain', 'Humano'],
    computer: ['Computer', 'Ordinateur', 'Ordenador'],
    empty: ['— empty —', '— absent —', '— vacío —'],
    opt_mode: ['Auctions', 'Enchères', 'Subastas'],
    mode_seq: ['one by one', 'tour par tour', 'una a una'],
    mode_bulk: ['all at once', "toutes d'un coup", 'todas a la vez'],
    mode_hint: ['One by one: bid, reveal, next. All at once: spread your stars over the 10 places first.', "Tour par tour : on mise, on révèle, on continue. Toutes d'un coup : chacun répartit d'abord ses étoiles sur les 10 lieux.", 'Una a una: pujar, revelar, siguiente. Todas a la vez: reparte primero tus estrellas entre los 10 lugares.'],
    opt_events: ['Twists of fate', 'Aléas de la vie', 'Imprevistos'],
    events_hint: ['3 random news flashes change places or stars.', '3 Flash info au hasard changent les lieux ou les étoiles.', '3 noticias al azar cambian lugares o estrellas.'],
    opt_silent: ['Silent bidding', 'Mise silencieuse', 'Puja silenciosa'],
    silent_hint: ['No sound while bidding: nobody can count your clicks.', 'Aucun son pendant la mise : personne ne peut compter vos clics.', 'Sin sonido al pujar: nadie puede contar tus clics.'],
    yes: ['yes', 'oui', 'sí'], no: ['no', 'non', 'no'],
    play: ['PLAY ▶', 'JOUER ▶', 'JUGAR ▶'],
    rules: ['Rules', 'Règles', 'Reglas'],
    best: ['Best resort: {0} pts', 'Record : {0} pts', 'Récord: {0} pts'],
    menu_keys: ['Enter: play · T / A / S: options · 2 / 3 / 4: seats · M: sound', 'Entrée : jouer · T / A / S : options · 2 / 3 / 4 : places · M : son', 'Enter: jugar · T / A / S: opciones · 2 / 3 / 4: puestos · M: sonido'],
    player: ['Player {0}', 'Joueur {0}', 'Jugador {0}'],
    cpu: [' (cpu)', ' (ordi)', ' (IA)'],
    hud_round: ['Auction {0} / {1}', 'Enchère {0} / {1}', 'Subasta {0} / {1}'],
    hud_plan: ['All-at-once bids', 'Mises groupées', 'Pujas agrupadas'],
    hud_event: ['News flash', 'Flash info', 'Última hora'],
    hud_keys: ['H: rules · M: sound', 'H : règles · M : son', 'H: reglas · M: sonido'],
    appeal: ['Appeal', 'Attrait', 'Atractivo'],
    pts: ['{0} pts', '{0} pts', '{0} pts'],
    duo_with: ['Pair with: {0} (+{1})', 'Duo avec : {0} (+{1})', 'Pareja con: {0} (+{1})'],
    p_owned: ['already with {0}', 'déjà chez {0}', 'ya es de {0}'],
    p_coming: ['still to come', 'encore à venir', 'aún por venir'],
    p_gone: ['went unsold', 'parti sans preneur', 'quedó sin vender'],
    p_absent: ['not in this game', 'absent de cette partie', 'no está en esta partida'],
    worth: ['For you this place is worth: +{0} pts', 'Pour vous ce lieu vaut : +{0} pts', 'Para ti este lugar vale: +{0} pts'],
    worth_sub: ['(appeal, pair, variety, lodging)', '(attrait, duo, variété, hébergement)', '(atractivo, pareja, variedad, alojamiento)'],
    secret_bid: ['Secret bid — {0}', 'Mise secrète de {0}', 'Puja secreta de {0}'],
    stars_left: ['{0} stars left', 'Il vous reste {0} étoiles', 'Te quedan {0} estrellas'],
    left_if_win: ['{0} left if you win', 'reste {0} si gagné', 'quedan {0} si ganas'],
    bid: ['Bid', 'Miser', 'Pujar'], pass: ['Pass', 'Passer', 'Pasar'],
    bid_hint: ['Arrows or tap a star · digits · Enter/Space to confirm', 'Flèches ou clic sur une étoile · chiffres · Entrée/Espace pour valider', 'Flechas o toca una estrella · cifras · Enter/Espacio para confirmar'],
    opening: ['Opening the envelopes', 'Ouverture des enveloppes', 'Abriendo los sobres'],
    revealing: ['Bids, from lowest to highest', 'Révélation des mises, de la plus petite à la plus grande', 'Pujas, de la más baja a la más alta'],
    result: ['Result', 'Résultat', 'Resultado'],
    goes_to: ['And {0} goes to', 'Et {0} revient à', 'Y {0} es para'],
    wins_place: ['{0} wins {1}!', '{0} remporte {1} !', '¡{0} gana {1}!'],
    unsold_msg: ['{0}: unsold!', '{0} : invendu !', '{0}: ¡sin vender!'],
    paid: ['Paid: {0} star(s).', 'Payé : {0} étoile(s).', 'Pagado: {0} estrella(s).'],
    tie_fewer: ['Tie: the player with fewer places wins.', "Égalité : le joueur avec le moins de lots l'emporte.", 'Empate: gana quien tiene menos lugares.'],
    tie_rot: ['Perfect tie: rotating priority decides.', 'Égalité parfaite : la priorité tournante tranche.', 'Empate perfecto: decide la prioridad rotatoria.'],
    nobody: ['Nobody bid: unsold.', "Personne n'a misé : lot invendu.", 'Nadie pujó: sin vender.'],
    skip_anim: ['Space / tap: skip animation', "Espace / clic : passer l'animation", 'Espacio / toque: saltar animación'],
    next: ['Space / tap: next', 'Espace / clic : suite', 'Espacio / toque: siguiente'],
    final_next: ['Space / tap: final results', 'Espace / clic : résultat final', 'Espacio / toque: resultados finales'],
    wins: ['WINS!', 'GAGNE !', '¡GANA!'],
    no_places: ['no places yet', "aucun lieu pour l'instant", 'aún sin lugares'],
    leading: ['leading', 'en tête', 'en cabeza'],
    no_lodging: ['no lodging {0}', 'sans hébergement {0}', 'sin alojamiento {0}'],
    info: ['spent {0} · appeal {1} · pairs +{2} · variety +{3} · stars +{4}', 'dépensé {0} · attrait {1} · duos +{2} · variété +{3} · étoiles +{4}', 'gastado {0} · atractivo {1} · parejas +{2} · variedad +{3} · estrellas +{4}'],
    unsold: ['unsold', 'invendu', 'sin vender'],
    h_title: ['Secret bid', 'Mise secrète', 'Puja secreta'],
    h_turn: ["{0}'s turn", 'Au tour de {0}', 'Turno de {0}'],
    h_hide: ['Everyone else, look away!', "Les autres joueurs ne regardent pas l'écran !", '¡Los demás, no miréis!'],
    h_plan: ['Secretly spread your stars over the {0} places', 'Répartissez en secret vos étoiles sur les {0} lieux', 'Reparte en secreto tus estrellas entre los {0} lugares'],
    h_lot: ['Auction {0} / {1}: {2}', 'Enchère {0} / {1} : {2}', 'Subasta {0} / {1}: {2}'],
    h_go: ["I'm ready ▶", 'Je suis prêt ▶', 'Estoy listo ▶'],
    plan_head: ['{0} — secret spread: {1} / {2} stars bid', '{0} — répartition secrète : {1} / {2} étoiles misées', '{0} — reparto secreto: {1} / {2} estrellas'],
    plan_hint: ['Up/Down: choose · Left/Right or digits: bid · Enter: confirm', 'Haut/Bas : choisir · Gauche/Droite ou chiffres : miser · Entrée : valider', 'Arriba/Abajo: elegir · Izq/Der o cifras: pujar · Enter: confirmar'],
    plan_note: ['Unspent stars are worth 1 pt each.', 'Les étoiles non dépensées valent 1 pt chacune.', 'Las estrellas no gastadas valen 1 pt cada una.'],
    confirm: ['Confirm', 'Valider', 'Confirmar'],
    pair_short: ['Pair: {0}', 'Duo : {0}', 'Pareja: {0}'],
    absent: [' (absent)', ' (absent)', ' (ausente)'],
    attr_short: ['{0} · appeal {1}', '{0} · attrait {1}', '{0} · atractivo {1}'],
    flash: ['NEWS FLASH — {0}', 'FLASH INFO — {0}', 'ÚLTIMA HORA — {0}'],
    before_auction: ['before auction {0}', "avant l'enchère {0}", 'antes de la subasta {0}'],
    before_final: ['before the final count', 'avant le décompte final', 'antes del recuento final'],
    cont: ['Space / tap to continue', 'Espace ou clic pour continuer', 'Espacio o toque para continuar'],
    eff_appeal: ['{0}{1}: appeal {2} → {3}', '{0}{1} : attrait {2} → {3}', '{0}{1}: atractivo {2} → {3}'],
    at_owner: [' (at {0})', ' (chez {0})', ' (de {0})'],
    eff_plus: ['{0}: +3 stars (now {1})', '{0} : +3 étoiles (il en a {1})', '{0}: +3 estrellas (ahora {1})'],
    eff_minus: ['{0}: −{1} stars ({2} left)', '{0} : −{1} étoiles (il en reste {2})', '{0}: −{1} estrellas (quedan {2})'],
    eff_none: ['No effect this time… phew!', 'Aucun effet cette fois-ci… ouf !', 'Sin efecto esta vez… ¡uf!'],
    final_title: ['BID CHALLENGE — the resorts', 'BID CHALLENGE — les stations', 'BID CHALLENGE — los complejos'],
    resort_of: ["{0}'s resort", 'Station de {0}', 'Complejo de {0}'],
    wasteland: ['Empty lot…', 'Terrain vague…', 'Solar vacío…'],
    final_line: ['{0}. {1} — {2} pts · {3}', '{0}. {1} — {2} pts · {3}', '{0}. {1} — {2} pts · {3}'],
    final_sub: ['{0} place(s) · spent {1} stars · {2} left', '{0} lieu(x) · dépensé {1} étoiles · il en reste {2}', '{0} lugar(es) · gastado {1} estrellas · quedan {2}'],
    ledger_bids: ['Bids', 'Mises', 'Pujas'],
    ledger_spent: ['Spent', 'Dépensé', 'Gastado'],
    tie_title: ['TIE!', 'ÉGALITÉ !', '¡EMPATE!'],
    you_win: ['YOU WIN!', 'VOUS GAGNEZ !', '¡GANASTE!'],
    you_lose: ['YOU LOSE!', 'PERDU !', '¡PERDISTE!'],
    x_wins: ['{0} WINS!', '{0} GAGNE !', '¡{0} GANA!'],
    new_record: ['NEW RECORD!', 'NOUVEAU RECORD !', '¡NUEVO RÉCORD!'],
    col_appeal: ['Appeal', 'Attrait', 'Atractivo'], col_pairs: ['Pairs', 'Duos', 'Parejas'],
    col_variety: ['Variety', 'Variété', 'Variedad'], col_stars: ['Stars', 'Étoiles', 'Estrellas'],
    col_lodging: ['Lodging', 'Héberg.', 'Aloj.'], col_total: ['Total', 'Total', 'Total'],
    btn_details: ['Score details', 'Détail des points', 'Detalle de puntos'],
    btn_picture: ['Resort picture', 'Image des stations', 'Imagen de los complejos'],
    btn_download: ['Download picture', "Télécharger l'image", 'Descargar imagen'],
    btn_again: ['Play again', 'Rejouer', 'Jugar otra vez'],
    btn_menu: ['Menu', 'Menu', 'Menú'],
    cat_H: ['Lodging', 'Hébergement', 'Alojamiento'], cat_A: ['Ride', 'Attraction', 'Atracción'],
    cat_R: ['Food', 'Restauration', 'Restauración'], cat_D: ['Relax', 'Détente', 'Relax'],
    lot_palace: ['5-Star Palace', 'Palace 5 étoiles', 'Palacio 5 estrellas'],
    lot_family: ['Family Hotel', 'Hôtel familial', 'Hotel familiar'],
    lot_treehouse: ['Treehouse Cabins', 'Cabanes perchées', 'Cabañas en árboles'],
    lot_glamping: ['Glamping', 'Camping glamping', 'Glamping'],
    lot_coaster: ['Roller Coaster', 'Montagnes russes', 'Montaña rusa'],
    lot_waterpark: ['Water Park', 'Parc aquatique', 'Parque acuático'],
    lot_ferris: ['Ferris Wheel', 'Grande roue', 'Noria'],
    lot_haunted: ['Haunted House', 'Maison hantée', 'Casa encantada'],
    lot_gourmet: ['Starred Restaurant', 'Restaurant étoilé', 'Restaurante estrella'],
    lot_panoramic: ['Sky Restaurant', 'Resto panoramique', 'Restaurante mirador'],
    lot_cocktail: ['Cocktail Bar', 'Bar à cocktails', 'Bar de cócteles'],
    lot_foodtrucks: ['Food Trucks', 'Food trucks', 'Food trucks'],
    lot_beach: ['Private Beach', 'Plage privée', 'Playa privada'],
    lot_spa: ['Thermal Spa', 'Spa thermal', 'Spa termal'],
    lot_forest: ['Enchanted Forest', 'Forêt enchantée', 'Bosque encantado'],
    lot_lake: ['Lake & Pedal Boats', 'Lac & pédalos', 'Lago e hidropedales'],
    rate0: ['Dream destination', 'Destination de rêve', 'Destino de ensueño'],
    rate1: ['Very popular resort', 'Station très prisée', 'Complejo muy popular'],
    rate2: ['Really nice place', 'Lieu bien sympa', 'Lugar muy agradable'],
    rate3: ['Quiet little spot', 'Petit coin tranquille', 'Rincón tranquilo'],
    rate4: ['Needs renovation', 'Endroit à rénover', 'Necesita reformas'],
    ev_heatwave: ['Heatwave!', 'Canicule !', '¡Ola de calor!'],
    evt_heatwave: ['Everyone wants to cool off: +2 appeal for Water Park, Private Beach, Lake & Pedal Boats and Thermal Spa.', "Tout le monde veut se rafraîchir : +2 d'attrait pour Parc aquatique, Plage privée, Lac & pédalos et Spa thermal.", 'Todos quieren refrescarse: +2 de atractivo para Parque acuático, Playa privada, Lago e hidropedales y Spa termal.'],
    ev_storm: ['Storm over the region', 'Tempête sur la région', 'Tormenta en la región'],
    evt_storm: ['Outdoor places suffer: −2 for Private Beach, Glamping, Enchanted Forest and Ferris Wheel.', 'Les lieux en plein air souffrent : −2 pour Plage privée, Camping glamping, Forêt enchantée et Grande roue.', 'Los lugares al aire libre sufren: −2 para Playa privada, Glamping, Bosque encantado y Noria.'],
    ev_guide: ['The food guide came by', 'Le guide gastronomique est passé', 'Pasó la guía gastronómica'],
    evt_guide: ['Critics love it: +2 for every Food place.', 'Les critiques adorent : +2 pour chaque lieu de Restauration.', 'A la crítica le encanta: +2 para cada lugar de Restauración.'],
    ev_breakdown: ['Giant breakdown', 'Panne géante', 'Avería gigante'],
    evt_breakdown: ['Roller Coaster and Ferris Wheel under maintenance: −3 appeal.', "Montagnes russes et Grande roue en maintenance : −3 d'attrait.", 'Montaña rusa y Noria en mantenimiento: −3 de atractivo.'],
    ev_halloween: ['Halloween party', "Fête d'Halloween", 'Fiesta de Halloween'],
    evt_halloween: ['Chills guaranteed: Haunted House +4, Cocktail Bar +2.', 'Frissons garantis : Maison hantée +4, Bar à cocktails +2.', 'Escalofríos garantizados: Casa encantada +4, Bar de cócteles +2.'],
    ev_slow: ['Slow travel is trendy', 'Le slow tourisme est à la mode', 'El turismo lento está de moda'],
    evt_slow: ['Calm is in: +1 for every Lodging and every Relax place.', 'Le calme est tendance : +1 pour chaque Hébergement et chaque lieu de Détente.', 'La calma está de moda: +1 para cada Alojamiento y cada lugar de Relax.'],
    ev_influencer: ['A star influencer arrives', 'Une influenceuse star débarque', 'Llega una influencer famosa'],
    evt_influencer: ['Her video goes viral: a random place already sold gains +4.', 'Sa vidéo devient virale : un lieu déjà vendu, tiré au hasard, gagne +4.', 'Su vídeo se hace viral: un lugar ya vendido, al azar, gana +4.'],
    ev_subsidy: ['Regional subsidy', 'Subvention régionale', 'Subvención regional'],
    evt_subsidy: ['A boost for the underdog: the player with the fewest stars gets 3.', "Coup de pouce au plus modeste : le joueur qui a le moins d'étoiles en reçoit 3.", 'Ayuda al más modesto: el jugador con menos estrellas recibe 3.'],
    ev_tax: ['Tax audit', 'Contrôle fiscal', 'Inspección fiscal'],
    evt_tax: ['The player with the most stars loses 3.', "Le joueur qui a le plus d'étoiles en perd 3.", 'El jugador con más estrellas pierde 3.'],
    ev_renovation: ['Renovation works', 'Travaux de rénovation', 'Obras de reforma'],
    evt_renovation: ["Each resort's least attractive place gains +2.", 'Le lieu le moins attractif de chaque station gagne +2.', 'El lugar menos atractivo de cada complejo gana +2.'],
    ev_review: ['1-star customer review', 'Avis clients : 1 étoile', 'Reseña de 1 estrella'],
    evt_review: ["An unhappy guest: the leader's best place loses 3 appeal.", "Un client mécontent : le meilleur lieu du joueur en tête perd 3 d'attrait.", 'Un cliente descontento: el mejor lugar del líder pierde 3 de atractivo.']
  };

  const HELP = [
    ['Rules', 'Règles', 'Reglas'],
    [
      'Everyone starts with 20 stars. 10 places are auctioned; the full list is shown at the bottom of the screen.',
      'Secret bids from 0 to all your stars. The highest bid wins the place and pays it; the others pay nothing. If nobody bids, the place is unsold. Tie: the player with fewer places wins, then a rotating priority.',
      '"One by one" mode: bid place by place. "All at once" mode: everyone first spreads their stars over the 10 places, then results are revealed one by one.',
      'Twists of fate: 3 news flashes pop up during the game (heatwave, breakdown, tax audit, subsidy…) and change places\' appeal or players\' stars.',
      'Final resort score: appeal of every place you own (news flashes included).',
      'Pair: +5 for each complete pair (e.g. Palace + Spa, Ferris Wheel + Sky Restaurant).',
      'Variety: +3 / +7 / +12 for 2 / 3 / 4 different categories.',
      '+1 per unspent star.',
      '−8 if the resort has no lodging: where would visitors sleep?'
    ],
    [
      'Chaque joueur commence avec 20 étoiles. 10 lieux sont mis aux enchères ; la liste complète est visible en bas de l\'écran.',
      'Mises secrètes de 0 à toutes ses étoiles. La plus haute mise remporte le lieu et paie sa mise ; les autres ne paient rien. Si personne ne mise, le lieu est invendu. Égalité : le joueur qui possède le moins de lieux gagne, sinon la priorité tournante.',
      'Mode « tour par tour » : on mise lieu par lieu. Mode « toutes d\'un coup » : chacun répartit d\'abord ses étoiles sur les 10 lieux, puis les résultats tombent un par un.',
      'Aléas de la vie : 3 Flash info surgissent pendant la partie (canicule, panne, contrôle fiscal, subvention…) et changent l\'attrait des lieux ou les étoiles des joueurs.',
      'Points de la station : attrait de chaque lieu possédé (Flash info compris).',
      'Duo : +5 pour chaque paire complète (ex. Palace + Spa, Grande roue + Resto panoramique).',
      'Variété : +3 / +7 / +12 pour 2 / 3 / 4 catégories différentes.',
      '+1 par étoile non dépensée.',
      '−8 si la station n\'a aucun hébergement : où dormiraient les visiteurs ?'
    ],
    [
      'Cada jugador empieza con 20 estrellas. Se subastan 10 lugares; la lista completa se ve abajo en la pantalla.',
      'Pujas secretas de 0 a todas tus estrellas. La puja más alta gana el lugar y la paga; los demás no pagan nada. Si nadie puja, queda sin vender. Empate: gana quien tiene menos lugares, si no, la prioridad rotatoria.',
      'Modo «una a una»: se puja lugar por lugar. Modo «todas a la vez»: cada uno reparte primero sus estrellas entre los 10 lugares y luego se revelan uno a uno.',
      'Imprevistos: 3 noticias de última hora aparecen durante la partida (ola de calor, avería, inspección fiscal, subvención…) y cambian el atractivo de los lugares o las estrellas.',
      'Puntos del complejo: atractivo de cada lugar que posees (noticias incluidas).',
      'Pareja: +5 por cada pareja completa (p. ej. Palacio + Spa, Noria + Restaurante mirador).',
      'Variedad: +3 / +7 / +12 por 2 / 3 / 4 categorías diferentes.',
      '+1 por estrella no gastada.',
      '−8 si el complejo no tiene alojamiento: ¿dónde dormirían los visitantes?'
    ]
  ];

  function t(key, ...args) {
    const e = S[key];
    const s = e ? (e[LI] !== undefined ? e[LI] : e[0]) : key;
    return s.replace(/\{(\d)\}/g, (_, i) => String(args[+i]));
  }

  // ---------------------------------------------------------------- constants
  const W = 1180, H = 760;
  const STEP_MS = 1000 / 60;
  const HUD_H = 64, MARGIN = 24;
  const CARD = [24, 80, 660, 330], CARD_ICON = [40, 98, 320, 236];
  const BIDBOX = [24, 424, 660, 190], PLAYERS_BOX = [704, 80, 452, 534];
  const STRIP_Y = 628, THUMB_W = 108, THUMB_H = 118, THUMB_GAP = 6;
  const STAR_X = 48, STAR_Y = 494, STAR_STEP = 31, STAR_R = 12;
  const BTN_MINUS = [44, 534, 56, 48], BTN_PLUS = [220, 534, 56, 48], BTN_CONFIRM = [474, 532, 190, 52];
  const MINI_W = 38, MINI_H = 28;
  const PLAN_W = 560, PLAN_H = 104, PLAN_STEP = 112;
  const PLAN_STAR_X = 40, PLAN_STAR_Y = 698, PLAN_STAR_STEP = 28;
  const BTN_PLAN = [960, 664, 196, 60];
  const CONFETTI_COUNT = 150;

  const START_STARS = 20, NUM_AUCTIONS = 10, MIN_PER_CAT = 2;
  const DIGIT_WINDOW = 50;
  const DRUMROLL_F = 80, BID_INTRO_F = 18, STAR_COUNT_F = 5, BID_HOLD_F = 28, SUSPENSE_F = 80;
  const EVENT_MIN_F = 40, EVENTS_PER_GAME = 3;
  const MODE_SEQ = 'seq', MODE_BULK = 'bulk';
  const AI_PROFILES = [['Léa', 1.15], ['Hugo', 1.0], ['Inès', 0.85]];
  const AI_FUTURE_DUO = 0.35, AI_BULK_TARGETS = [4, 6];

  const STAR_VALUE = 1, PAIR_BONUS = 5, NO_HOTEL_PENALTY = 8;
  const DIVERSITY_BONUS = [0, 0, 3, 7, 12];
  const RATINGS = [[45, 'rate0'], [35, 'rate1'], [25, 'rate2'], [15, 'rate3'], [-999, 'rate4']];

  const BEST_KEY = 'bidchallenge_best';
  const PREFS_KEY = 'bidchallenge_prefs';

  const BG = '#f3e3b6', PANEL = '#fffcf0', PANEL_HI = '#eadcb8', TEXT = '#2b2418', INK = '#2b2418';
  const DIM = '#8a7a5c', ACCENT = '#3f86d6', SUCCESS = '#3f9e55', WARN = '#e08a3a', ERR = '#d94b5f';
  const GOLD = '#ffcc33', GOLD_DARK = '#a8780f', STAR_EMPTY = '#e2d5b2', STAR_LIGHT = '#fbecb4';
  const PLAYER_COLORS = ['#3f86d6', '#e0535f', '#4fae62', '#9a63d0'];
  const CAT_COLORS = { H: '#4f7fd0', A: '#e05a5a', R: '#f0a03a', D: '#45a872' };
  const CATS = ['H', 'A', 'R', 'D'];

  // ---------------------------------------------------------------- data
  const LOT_POOL = [
    ['palace', 'H', 9], ['family', 'H', 6], ['treehouse', 'H', 5], ['glamping', 'H', 4],
    ['coaster', 'A', 8], ['waterpark', 'A', 7], ['ferris', 'A', 6], ['haunted', 'A', 5],
    ['gourmet', 'R', 9], ['panoramic', 'R', 7], ['cocktail', 'R', 5], ['foodtrucks', 'R', 4],
    ['beach', 'D', 8], ['spa', 'D', 7], ['forest', 'D', 5], ['lake', 'D', 4]
  ].map(([key, cat, appeal]) => ({ key, cat, appeal, name: t('lot_' + key) }));
  const LOTS = Object.fromEntries(LOT_POOL.map((l) => [l.key, l]));
  const PAIRS = [['palace', 'spa'], ['family', 'waterpark'], ['treehouse', 'forest'], ['glamping', 'lake'],
    ['coaster', 'foodtrucks'], ['ferris', 'panoramic'], ['haunted', 'cocktail'], ['gourmet', 'beach']];
  const PARTNER = {};
  PAIRS.forEach(([a, b]) => { PARTNER[a] = b; PARTNER[b] = a; });
  const keysOf = (...cats) => LOT_POOL.filter((l) => cats.includes(l.cat)).map((l) => l.key);

  const EVENTS = [
    { key: 'heatwave', bumps: [['waterpark', 2], ['beach', 2], ['lake', 2], ['spa', 2]] },
    { key: 'storm', bumps: [['beach', -2], ['glamping', -2], ['forest', -2], ['ferris', -2]] },
    { key: 'guide', bumps: keysOf('R').map((k) => [k, 2]) },
    { key: 'breakdown', bumps: [['coaster', -3], ['ferris', -3]] },
    { key: 'halloween', bumps: [['haunted', 4], ['cocktail', 2]] },
    { key: 'slow', bumps: keysOf('H', 'D').map((k) => [k, 1]) },
    { key: 'influencer', bumps: [] }, { key: 'subsidy', bumps: [] }, { key: 'tax', bumps: [] },
    { key: 'renovation', bumps: [] }, { key: 'review', bumps: [] }
  ];

  // ---------------------------------------------------------------- rng
  function makeRng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6D2B79F5) | 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    return {
      next, shuffle,
      uniform: (lo, hi) => lo + (hi - lo) * next(),
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      choice: (arr) => arr[Math.floor(next() * arr.length)],
      sample: (arr, k) => shuffle(arr.slice()).slice(0, k)
    };
  }

  // ---------------------------------------------------------------- model
  function scoreBreakdown(lots, stars, mods) {
    mods = mods || {};
    const keys = new Set(lots.map((l) => l.key));
    const cats = new Set(lots.map((l) => l.cat));
    const parts = {
      appeal: lots.reduce((s, l) => s + Math.max(0, l.appeal + (mods[l.key] || 0)), 0),
      duos: PAIR_BONUS * PAIRS.filter(([a, b]) => keys.has(a) && keys.has(b)).length,
      variety: DIVERSITY_BONUS[cats.size],
      stars: STAR_VALUE * stars,
      hotel: cats.has('H') ? 0 : -NO_HOTEL_PENALTY
    };
    parts.total = parts.appeal + parts.duos + parts.variety + parts.stars + parts.hotel;
    return parts;
  }

  function rating(total) {
    for (const [min, key] of RATINGS) if (total >= min) return t(key);
    return t('rate4');
  }

  function makePlayer(name, human, aggr) {
    const p = { name, human, aggr: aggr || 1, stars: START_STARS, spent: 0, lots: [], mods: {} };
    p.score = () => scoreBreakdown(p.lots, p.stars, p.mods);
    return p;
  }

  class Model {
    constructor(players, seed, eventsOn) {
      this.players = players;
      this.rng = makeRng(seed);
      this.lots = this.drawLots();
      this.round = 0;
      this.results = [];
      this.mods = {};
      players.forEach((p) => { p.mods = this.mods; });
      this.events = {};
      if (eventsOn) {
        const keys = new Set(this.lots.map((l) => l.key));
        const pool = EVENTS.filter((e) => !e.bumps.length || e.bumps.some(([k]) => keys.has(k)));
        const rounds = this.rng.sample(Array.from({ length: NUM_AUCTIONS }, (_, i) => i + 1), EVENTS_PER_GAME).sort((a, b) => a - b);
        const chosen = this.rng.sample(pool, EVENTS_PER_GAME);
        rounds.forEach((r, i) => { this.events[r] = chosen[i]; });
      }
    }

    drawLots() {
      let chosen = [];
      for (const cat of CATS) chosen = chosen.concat(this.rng.sample(LOT_POOL.filter((l) => l.cat === cat), MIN_PER_CAT));
      const rest = LOT_POOL.filter((l) => !chosen.includes(l));
      chosen = chosen.concat(this.rng.sample(rest, NUM_AUCTIONS - chosen.length));
      return this.rng.shuffle(chosen);
    }

    get isOver() { return this.round >= this.lots.length; }
    get current() { return this.isOver ? null : this.lots[this.round]; }
    upcoming() { return this.lots.slice(this.round + 1); }
    appeal(lot) { return Math.max(0, lot.appeal + (this.mods[lot.key] || 0)); }

    ownerOf(key) {
      const i = this.players.findIndex((p) => p.lots.some((l) => l.key === key));
      return i < 0 ? null : i;
    }

    status(idx) {
      if (idx > this.round || (idx === this.round && this.isOver)) return 'future';
      if (idx === this.round) return 'current';
      const w = this.results[idx].winner;
      return w === null ? 'unsold' : w;
    }

    marginal(seat, lot) {
      const p = this.players[seat];
      return scoreBreakdown(p.lots.concat([lot]), 0, this.mods).total - scoreBreakdown(p.lots, 0, this.mods).total;
    }

    pickWinner(bids) {
      const vals = Object.values(bids);
      const best = vals.length ? Math.max(...vals) : 0;
      if (best <= 0) return [null, t('nobody')];
      const tied = Object.keys(bids).map(Number).filter((s) => bids[s] === best);
      if (tied.length === 1) return [tied[0], ''];
      const fewest = Math.min(...tied.map((s) => this.players[s].lots.length));
      const tied2 = tied.filter((s) => this.players[s].lots.length === fewest);
      if (tied2.length === 1) return [tied2[0], t('tie_fewer')];
      const n = this.players.length, first = this.round % n;
      tied2.sort((a, b) => ((a - first + n) % n) - ((b - first + n) % n));
      return [tied2[0], t('tie_rot')];
    }

    resolve(bids) {
      const lot = this.current;
      const clean = {};
      for (const s of Object.keys(bids)) clean[s] = Math.max(0, Math.min(bids[s], this.players[s].stars));
      const [winner, reason] = this.pickWinner(clean);
      if (winner !== null) {
        const w = this.players[winner];
        w.stars -= clean[winner];
        w.spent += clean[winner];
        w.lots.push(lot);
      }
      const res = { lot, bids: clean, winner, reason };
      this.results.push(res);
      this.round++;
      return res;
    }

    ranking() {
      return this.players.map((_, i) => i).sort((a, b) => {
        const pa = this.players[a], pb = this.players[b];
        return (pb.score().total - pa.score().total) || (pb.stars - pa.stars) || (a - b);
      });
    }

    applyEvent(ev) {
      const lines = [];
      const ownerTag = (key) => {
        const s = this.ownerOf(key);
        return s === null ? '' : t('at_owner', this.players[s].name);
      };
      const bump = (key, delta, who) => {
        const lot = LOTS[key];
        const before = this.appeal(lot);
        this.mods[key] = (this.mods[key] || 0) + delta;
        if (this.lots.includes(lot)) lines.push({ text: t('eff_appeal', lot.name, who, before, this.appeal(lot)), sign: delta, key });
      };
      const sold = this.lots.slice(0, this.round).filter((l) => this.ownerOf(l.key) !== null);
      ev.bumps.forEach(([k, d]) => bump(k, d, ownerTag(k)));
      if (ev.key === 'influencer' && sold.length) {
        const lot = this.rng.choice(sold);
        bump(lot.key, 4, ownerTag(lot.key));
      } else if (ev.key === 'subsidy') {
        const low = Math.min(...this.players.map((p) => p.stars));
        this.players.forEach((p) => {
          if (p.stars === low) { p.stars += 3; lines.push({ text: t('eff_plus', p.name, p.stars), sign: 1, key: null }); }
        });
      } else if (ev.key === 'tax') {
        const high = Math.max(...this.players.map((p) => p.stars));
        this.players.forEach((p) => {
          if (high > 0 && p.stars === high) {
            const loss = Math.min(3, p.stars);
            p.stars -= loss;
            lines.push({ text: t('eff_minus', p.name, loss, p.stars), sign: -1, key: null });
          }
        });
      } else if (ev.key === 'renovation') {
        this.players.forEach((p) => {
          if (!p.lots.length) return;
          const lot = p.lots.slice().sort((a, b) => (this.appeal(a) - this.appeal(b)) || a.name.localeCompare(b.name))[0];
          bump(lot.key, 2, t('at_owner', p.name));
        });
      } else if (ev.key === 'review') {
        const leader = this.players[this.ranking()[0]];
        if (leader.lots.length) {
          const lot = leader.lots.slice().sort((a, b) => (this.appeal(b) - this.appeal(a)) || b.name.localeCompare(a.name))[0];
          bump(lot.key, -3, t('at_owner', leader.name));
        }
      }
      if (!lines.length) lines.push({ text: t('eff_none'), sign: 0, key: null });
      return lines;
    }
  }

  function aiBid(m, seat, rng) {
    const p = m.players[seat], lot = m.current;
    if (!lot || p.stars === 0) return 0;
    const cats = new Set(p.lots.map((l) => l.cat));
    let value = m.marginal(seat, lot);
    if (lot.cat === 'H' && !cats.has('H')) {
      const hotelsLeft = m.upcoming().filter((l) => l.cat === 'H').length;
      value -= NO_HOTEL_PENALTY * (1 - 1 / (1 + hotelsLeft));
    }
    if (m.upcoming().some((l) => l.key === PARTNER[lot.key])) value += PAIR_BONUS * AI_FUTURE_DUO;
    let maxPay = Math.trunc(value * p.aggr) - 1;
    maxPay = Math.max(0, Math.min(maxPay, p.stars));
    const rivals = Math.max(0, ...m.players.filter((_, s) => s !== seat).map((q) => q.stars));
    if (maxPay > rivals) return rivals + 1;
    return Math.max(0, Math.min(p.stars, Math.round(maxPay * rng.uniform(0.6, 1.0))));
  }

  function aiPlan(m, seat, rng) {
    const p = m.players[seat];
    const keys = new Set(m.lots.map((l) => l.key));
    const hotels = m.lots.filter((l) => l.cat === 'H').length;
    const scored = m.lots.map((lot, i) => {
      let v = m.appeal(lot);
      if (keys.has(PARTNER[lot.key])) v += PAIR_BONUS * 0.5;
      if (lot.cat === 'H') v += NO_HOTEL_PENALTY / Math.max(1, hotels);
      return [v * p.aggr * rng.uniform(0.8, 1.2), i];
    }).sort((a, b) => b[0] - a[0]);
    const top = scored.slice(0, rng.int(AI_BULK_TARGETS[0], AI_BULK_TARGETS[1]));
    const total = top.reduce((s, [v]) => s + v, 0);
    const budget = Math.round(p.stars * rng.uniform(0.75, 1.0));
    const bids = new Array(m.lots.length).fill(0);
    top.forEach(([v, i]) => { bids[i] = Math.floor(budget * v / total); });
    return bids;
  }

  // ---------------------------------------------------------------- sound
  const Sfx = (function () {
    let ac = null, out = null;
    function ensure() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ac) {
        ac = new AC();
        out = ac.createGain();
        out.gain.value = 0.55;
        out.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    const muted = () => !!(window.MathArcadeAudio && window.MathArcadeAudio.muted);
    function tone(freq, start, dur, o) {
      o = o || {};
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, start + dur);
      const peak = o.gain || 0.15, att = o.attack || 0.008;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + att);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g); g.connect(out);
      osc.start(start); osc.stop(start + dur + 0.02);
    }
    function drumroll(start, dur) {
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const tt = i / ac.sampleRate;
        d[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 26 * tt)) * (0.3 + 0.7 * tt / dur) * (i > len - 2000 ? (len - i) / 2000 : 1);
      }
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'lowpass'; f.frequency.value = 900;
      g.gain.value = 0.32;
      src.buffer = buf;
      src.connect(f); f.connect(g); g.connect(out);
      src.start(start);
    }
    const arp = (t0, freqs, step, dur, gain) => freqs.forEach((f, i) => tone(f, t0 + i * step, dur, { type: 'triangle', gain }));
    function play(name) {
      if (muted() || !ensure()) return;
      const t0 = ac.currentTime + 0.01;
      switch (name) {
        case 'tick': tone(900, t0, 0.04, { type: 'square', gain: 0.04 }); break;
        case 'count': tone(1250, t0, 0.05, { type: 'triangle', gain: 0.07 }); break;
        case 'confirm': tone(523, t0, 0.16, { gain: 0.12 }); tone(784, t0, 0.16, { gain: 0.1 }); break;
        case 'win': arp(t0, [523, 659, 784, 1046], 0.08, 0.2, 0.14); break;
        case 'lose': tone(330, t0, 0.25, { type: 'triangle', to: 200, gain: 0.13 }); break;
        case 'unsold': tone(400, t0, 0.32, { type: 'triangle', to: 160, gain: 0.12 }); break;
        case 'handoff': tone(440, t0, 0.2, { gain: 0.1 }); tone(554, t0, 0.2, { gain: 0.1 }); break;
        case 'drumroll': drumroll(t0, DRUMROLL_F / 60); break;
        case 'suspense': tone(220, t0, SUSPENSE_F / 60, { type: 'sine', to: 440, gain: 0.06, attack: 0.3 }); break;
        case 'news': arp(t0, [784, 659, 784, 988], 0.09, 0.14, 0.12); break;
        case 'fanfare': arp(t0, [392, 523, 659, 784, 1046, 1318], 0.09, 0.3, 0.13); break;
        default: break;
      }
    }
    return { play, unlock: ensure };
  })();

  // ---------------------------------------------------------------- canvas
  const canvas = document.getElementById('game');
  const mainCtx = canvas.getContext('2d');
  let c = mainCtx;            // current drawing context (main canvas or offscreen)
  let fit = { s: 1, x: 0, y: 0 };
  let renderScale = 1;
  let hits = [];
  let recordHits = true;
  let pointer = { x: -1, y: -1 };

  const stage = window.MathArcadeShell
    ? window.MathArcadeShell.createCanvasStage(canvas, mainCtx, { onResize: computeFit })
    : null;

  function computeFit(info) {
    const w = info ? info.width : window.innerWidth, h = info ? info.height : window.innerHeight;
    const dpr = info ? info.dpr : Math.min(window.devicePixelRatio || 1, 2);
    const s = Math.min(w / W, h / H);
    fit = { s, x: (w - W * s) / 2, y: (h - H * s) / 2 };
    renderScale = Math.min(3, Math.max(1, Math.ceil(s * dpr * 2) / 2));
  }
  if (!stage) {
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      computeFit({ width: window.innerWidth, height: window.innerHeight, dpr });
    };
    window.addEventListener('resize', resize);
    resize();
  }

  const FONTS = { title: '"Lilita One", sans-serif', body: 'Fredoka, Arial, sans-serif' };
  function setFont(size, kind) {
    if (kind === 'title') c.font = `${size}px ${FONTS.title}`;
    else if (kind === 'bold') c.font = `600 ${size}px ${FONTS.body}`;
    else c.font = `500 ${size}px ${FONTS.body}`;
  }
  function txt(s, x, y, size, color, o) {
    o = o || {};
    setFont(size, o.kind);
    c.fillStyle = color;
    c.textAlign = o.align || 'left';
    c.textBaseline = o.base || 'top';
    if (o.max) c.fillText(s, x, y, o.max);
    else c.fillText(s, x, y);
  }
  function tw(s, size, kind) { setFont(size, kind); return c.measureText(s).width; }
  function wrap(s, size, kind, width) {
    const out = [];
    let cur = '';
    for (const word of s.split(/\s+/)) {
      const trial = cur ? cur + ' ' + word : word;
      if (tw(trial, size, kind) <= width || !cur) cur = trial;
      else { out.push(cur); cur = word; }
    }
    if (cur) out.push(cur);
    return out;
  }
  function rrect(x, y, w, h, r, fill, stroke, lw) {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  }
  function panel(x, y, w, h, border, lw, fill) {
    rrect(x, y + 3, w, h, 14, 'rgba(43,36,24,0.18)');
    rrect(x, y, w, h, 14, fill || PANEL, border || INK, lw || 2.5);
  }
  function star(cx, cy, r, fill, stroke) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const px = cx + rr * Math.cos(a), py = cy + rr * Math.sin(a);
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = Math.max(1, r / 8); c.stroke(); }
  }
  function hit(x, y, w, h, fn) { if (recordHits) hits.push({ x, y, w, h, fn }); }
  function hover(x, y, w, h) { return pointer.x >= x && pointer.x <= x + w && pointer.y >= y && pointer.y <= y + h; }
  function button(r, label, color, enabled, fn, size) {
    const [x, y, w, h] = r;
    const on = enabled !== false;
    let col = on ? color : STAR_EMPTY;
    const press = on && hover(x, y, w, h);
    rrect(x, y + 4, w, h, 12, INK);
    rrect(x, y + (press ? 1 : 0), w, h, 12, col, INK, 2.5);
    txt(label, x + w / 2, y + h / 2 + (press ? 1 : 0), size || 26, on ? '#fff' : DIM, { kind: 'title', align: 'center', base: 'middle' });
    if (on && fn) hit(x, y, w, h + 4, fn);
  }

  // ---------------------------------------------------------------- icons
  const iconCache = new Map();
  function icon(key, w, h, scale) {
    const sc = scale || renderScale;
    const id = `${key}:${w}x${h}@${sc}`;
    let cv = iconCache.get(id);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc);
      const ictx = cv.getContext('2d');
      ictx.scale(sc, sc);
      drawLotIcon(ictx, key, w, h);
      iconCache.set(id, cv);
    }
    return cv;
  }
  function blitIcon(key, x, y, w, h, scale) { c.drawImage(icon(key, w, h, scale), x, y, w, h); }

  function drawLotIcon(g, key, w, h) {
    const m = Math.min(w, h);
    const lw = Math.max(1, m * 0.016);
    const P = (u, v) => [u * w, v * h];
    const stroke = (s) => { if (s !== false) { g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); } };
    const R = (u0, v0, u1, v1, fill, s) => { g.beginPath(); g.rect(u0 * w, v0 * h, (u1 - u0) * w, (v1 - v0) * h); g.fillStyle = fill; g.fill(); stroke(s); };
    const POLY = (pts, fill, s) => { g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(u * w, v * h) : g.moveTo(u * w, v * h))); g.closePath(); g.fillStyle = fill; g.fill(); stroke(s); };
    const CIRC = (u, v, r, fill, s) => { g.beginPath(); g.arc(u * w, v * h, Math.max(1, r * m), 0, Math.PI * 2); g.fillStyle = fill; g.fill(); stroke(s); };
    const ELL = (u0, v0, u1, v1, fill, s) => { g.beginPath(); g.ellipse((u0 + u1) / 2 * w, (v0 + v1) / 2 * h, (u1 - u0) / 2 * w, (v1 - v0) / 2 * h, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); stroke(s); };
    const LINE = (pts, color, width) => { g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(u * w, v * h) : g.moveTo(u * w, v * h))); g.strokeStyle = color; g.lineWidth = Math.max(1, width * m); g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
    const SEMI = (u, v, r, fill) => { g.beginPath(); g.arc(u * w, v * h, r * m, Math.PI, 0); g.closePath(); g.fillStyle = fill; g.fill(); stroke(); };
    const STAR = (u, v, r, fill) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = (i % 2 ? r * 0.45 : r) * m, a = -Math.PI / 2 + i * Math.PI / 5;
        const x = u * w + rr * Math.cos(a), y = v * h + rr * Math.sin(a);
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath(); g.fillStyle = fill; g.fill(); stroke();
    };
    const bg = (sky, ground, gv) => {
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = ground; g.fillRect(0, (gv || 0.8) * h, w, h);
    };
    const SKY = '#a4d4f2', GRASS = '#86c46e';
    g.lineCap = 'round'; g.lineJoin = 'round';

    switch (key) {
      case 'palace':
        bg(SKY, GRASS);
        R(0.16, 0.38, 0.84, 0.8, '#f6ecd4');
        R(0.4, 0.26, 0.6, 0.38, '#f6ecd4');
        ELL(0.42, 0.16, 0.58, 0.34, GOLD);
        for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
          if (row === 2 && (col === 2 || col === 3)) continue;
          R(0.2 + col * 0.105, 0.43 + row * 0.12, 0.26 + col * 0.105, 0.5 + row * 0.12, '#5b86c4', false);
        }
        R(0.44, 0.66, 0.56, 0.8, '#8c5a3c');
        for (let i = 0; i < 5; i++) STAR(0.22 + i * 0.14, 0.08, 0.055, GOLD);
        break;
      case 'family':
        bg(SKY, GRASS);
        R(0.24, 0.38, 0.76, 0.8, '#f2ad7a');
        POLY([[0.18, 0.4], [0.5, 0.14], [0.82, 0.4]], '#c9463c');
        for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++)
          R(0.3 + col * 0.15, 0.45 + row * 0.14, 0.38 + col * 0.15, 0.53 + row * 0.14, '#fff6d2', false);
        R(0.46, 0.68, 0.54, 0.8, '#7a5032');
        LINE([[0.88, 0.37], [0.82, 0.62]], INK, 0.012);
        CIRC(0.88, 0.3, 0.07, '#f05a7e');
        break;
      case 'treehouse':
        bg(SKY, GRASS);
        R(0.45, 0.4, 0.55, 0.8, '#7a5032');
        CIRC(0.3, 0.42, 0.2, '#4c9a52'); CIRC(0.7, 0.42, 0.2, '#4c9a52'); CIRC(0.5, 0.28, 0.22, '#5aae5c');
        R(0.36, 0.3, 0.64, 0.48, '#b07a48');
        POLY([[0.32, 0.31], [0.5, 0.16], [0.68, 0.31]], '#9a3c32');
        R(0.46, 0.35, 0.54, 0.43, '#fbe3a0', false);
        LINE([[0.6, 0.48], [0.6, 0.8]], '#5a3c26', 0.018); LINE([[0.68, 0.48], [0.68, 0.8]], '#5a3c26', 0.018);
        [0.55, 0.62, 0.69, 0.76].forEach((v) => LINE([[0.6, v], [0.68, v]], '#5a3c26', 0.014));
        break;
      case 'glamping':
        bg('#f9c48e', '#6fa45e');
        [[0.12, 0.12], [0.3, 0.2], [0.62, 0.1], [0.85, 0.22]].forEach(([u, v]) => CIRC(u, v, 0.014, '#fffbe0', false));
        POLY([[0.06, 0.82], [0.3, 0.36], [0.54, 0.82]], '#f6f0e0');
        POLY([[0.24, 0.82], [0.3, 0.56], [0.36, 0.82]], '#c8b090');
        POLY([[0.5, 0.82], [0.68, 0.5], [0.86, 0.82]], '#e2c8a0');
        POLY([[0.88, 0.82], [0.92, 0.64], [0.96, 0.82]], '#f07a28');
        POLY([[0.9, 0.82], [0.92, 0.73], [0.94, 0.82]], '#ffd23c', false);
        break;
      case 'coaster': {
        bg(SKY, GRASS);
        const pts = [];
        for (let i = 0; i <= 20; i++) pts.push([i / 20, 0.55 - 0.3 * Math.sin(i / 20 * Math.PI * 1.6)]);
        pts.forEach(([u, v], i) => { if (i % 2 === 0) LINE([[u, v], [u, 0.8]], '#9696a8', 0.014); });
        LINE(pts, '#c83c3c', 0.04);
        g.beginPath(); g.arc(0.82 * w, 0.5 * h, 0.15 * m, 0, Math.PI * 2); g.strokeStyle = '#c83c3c'; g.lineWidth = 0.04 * m; g.stroke();
        const [cu, cv] = pts[6];
        R(cu - 0.06 * m / w, cv - 0.08 * m / h, cu + 0.06 * m / w, cv - 0.02 * m / h, '#ffcc33');
        break;
      }
      case 'waterpark':
        bg(SKY, GRASS);
        ELL(0.08, 0.68, 0.96, 0.96, '#46aee6');
        R(0.1, 0.2, 0.22, 0.78, '#d2d2dc');
        R(0.08, 0.16, 0.24, 0.22, '#e05a5a');
        LINE([[0.22, 0.22], [0.55, 0.32], [0.3, 0.48], [0.62, 0.58], [0.72, 0.76]], INK, 0.09);
        LINE([[0.22, 0.22], [0.55, 0.32], [0.3, 0.48], [0.62, 0.58], [0.72, 0.76]], '#ffcc33', 0.065);
        [[0.78, 0.74], [0.84, 0.7], [0.74, 0.7]].forEach(([u, v]) => CIRC(u, v, 0.025, '#fff', false));
        break;
      case 'ferris': {
        bg(SKY, GRASS);
        LINE([[0.5, 0.44], [0.3, 0.82]], '#6e6e82', 0.03); LINE([[0.5, 0.44], [0.7, 0.82]], '#6e6e82', 0.03);
        const cx = 0.5 * w, cy = 0.44 * h, rad = 0.34 * m;
        g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.strokeStyle = '#787896'; g.lineWidth = 0.022 * m; g.stroke();
        const cols = ['#e05050', '#ffcc33', '#50aae6', '#6ebe5a'];
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4, x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a);
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.strokeStyle = '#9696aa'; g.lineWidth = Math.max(1, 0.008 * m); g.stroke();
          CIRC(x / w, y / h, 0.05, cols[i % 4]);
        }
        break;
      }
      case 'haunted':
        bg('#2d2348', '#37413a');
        CIRC(0.82, 0.2, 0.1, '#fbf0be', false);
        R(0.22, 0.42, 0.66, 0.8, '#5f4b73');
        POLY([[0.16, 0.44], [0.42, 0.12], [0.72, 0.46]], '#3c2d50');
        R(0.3, 0.5, 0.38, 0.6, '#fad250'); R(0.5, 0.5, 0.58, 0.6, '#fad250');
        R(0.4, 0.66, 0.48, 0.8, '#281e32');
        g.beginPath(); g.arc(0.82 * w, 0.58 * h, 0.07 * m, Math.PI, 0); g.lineTo(0.82 * w + 0.07 * m, 0.72 * h); g.lineTo(0.82 * w - 0.07 * m, 0.72 * h); g.closePath(); g.fillStyle = '#f5f5ff'; g.fill(); stroke();
        [[0.12, 0.2], [0.6, 0.16]].forEach(([u, v]) => {
          const s = 0.04 * m / w, sv = 0.04 * m / h;
          LINE([[u - 2 * s, v], [u - s, v + sv], [u, v], [u + s, v + sv], [u + 2 * s, v]], '#140f1e', 0.014);
        });
        break;
      case 'gourmet':
        bg('#ece1f0', '#c83c46', 0.72);
        ELL(0.14, 0.64, 0.86, 0.86, '#ffffff');
        SEMI(0.5, 0.7, 0.3, '#c8cdd7');
        CIRC(0.5, 0.38, 0.04, '#aaafbe');
        STAR(0.5, 0.16, 0.09, GOLD);
        break;
      case 'panoramic':
        bg(SKY, GRASS);
        POLY([[0.46, 0.82], [0.48, 0.38], [0.52, 0.38], [0.54, 0.82]], '#aaaab9');
        LINE([[0.5, 0.24], [0.5, 0.06]], '#78788c', 0.016);
        ELL(0.22, 0.24, 0.78, 0.42, '#f0f0f5');
        R(0.25, 0.3, 0.75, 0.35, '#5aa0dc', false);
        CIRC(0.5, 0.06, 0.022, ERR, false);
        break;
      case 'cocktail':
        bg('#fab97d', '#f0d7a0');
        LINE([[0.56, 0.32], [0.7, 0.1]], '#50a05a', 0.016);
        POLY([[0.3, 0.28], [0.7, 0.28], [0.5, 0.58]], '#fa7896');
        LINE([[0.5, 0.58], [0.5, 0.78]], INK, 0.03);
        LINE([[0.38, 0.79], [0.62, 0.79]], INK, 0.035);
        SEMI(0.64, 0.26, 0.14, '#3caad2');
        CIRC(0.33, 0.27, 0.05, '#ffd23c');
        break;
      case 'foodtrucks':
        bg(SKY, '#afafaf');
        [[0.04, 0.4, 0.48, '#f07850'], [0.52, 0.46, 0.96, '#50aac8']].forEach(([u0, v0, u1, col]) => {
          R(u0, v0, u1, 0.78, col);
          R(u0 + 0.06, v0 + 0.08, u1 - 0.06, v0 + 0.2, '#fff6dc');
          const du = (u1 - u0) / 4;
          for (let i = 0; i < 4; i++) R(u0 + i * du, v0 - 0.07, u0 + (i + 1) * du, v0, i % 2 ? '#e64646' : '#ffffff', false);
          g.strokeStyle = INK; g.lineWidth = lw; g.strokeRect(u0 * w, (v0 - 0.07) * h, (u1 - u0) * w, 0.07 * h);
          CIRC(u0 + 0.1, 0.8, 0.05, '#2b2b34'); CIRC(u1 - 0.1, 0.8, 0.05, '#2b2b34');
        });
        break;
      case 'beach':
        bg('#78c8fa', '#f0d796', 0.68);
        R(0, 0.52, 1, 0.68, '#288cd2', false);
        CIRC(0.82, 0.2, 0.1, '#ffd73c', false);
        LINE([[0.35, 0.4], [0.35, 0.86]], '#785a3c', 0.022);
        SEMI(0.35, 0.42, 0.22, '#e64646');
        R(0.52, 0.78, 0.8, 0.88, '#5078dc');
        break;
      case 'spa':
        bg('#cde8ec', '#bed7c8', 0.62);
        ELL(0.08, 0.6, 0.92, 0.92, '#5ac8d2');
        [[0.56, 0.14], [0.44, 0.11], [0.35, 0.08]].forEach(([v, rad]) => {
          g.beginPath(); g.ellipse(0.5 * w, v * h, rad * m, rad * m * 0.5, 0, 0, Math.PI * 2); g.fillStyle = '#787882'; g.fill(); stroke();
        });
        [0.25, 0.75].forEach((u) => LINE([0, 1, 2, 3, 4].map((i) => [u + 0.03 * Math.sin(i), 0.55 - i * 0.08]), '#ffffff', 0.016));
        break;
      case 'forest':
        bg(SKY, GRASS);
        [[0.18, 0.3, '#287840'], [0.42, 0.16, '#328c46'], [0.66, 0.26, '#287840'], [0.88, 0.38, '#3c9650']].forEach(([u, top, col]) => {
          R(u - 0.015, 0.76, u + 0.015, 0.82, '#6e4b2d', false);
          for (let k = 0; k < 3; k++) {
            const v0 = top + k * (0.8 - top) / 3.4, half = 0.08 + k * 0.03;
            POLY([[u - half, v0 + 0.22], [u, v0], [u + half, v0 + 0.22]], col);
          }
        });
        SEMI(0.56, 0.82, 0.05, '#dc3c3c');
        break;
      case 'lake':
        bg(SKY, GRASS, 0.56);
        POLY([[-0.05, 0.58], [0.28, 0.16], [0.6, 0.58]], '#82879b');
        POLY([[0.4, 0.58], [0.7, 0.24], [1.05, 0.58]], '#9696aa');
        POLY([[0.22, 0.24], [0.28, 0.16], [0.34, 0.24]], '#ffffff', false);
        ELL(0.04, 0.58, 0.96, 0.96, '#3c96dc');
        ELL(0.42, 0.7, 0.62, 0.8, '#ffffff');
        LINE([[0.58, 0.74], [0.6, 0.6]], '#ffffff', 0.025);
        CIRC(0.6, 0.6, 0.025, '#ffffff', false);
        CIRC(0.63, 0.61, 0.012, WARN, false);
        break;
      default:
        g.fillStyle = PANEL_HI; g.fillRect(0, 0, w, h);
    }
  }

  // ---------------------------------------------------------------- state
  const prefs = loadPrefs();
  let state = 'menu';
  let model = null;
  let frame = 0;
  let showHelp = false;
  let showDetails = false;
  let multiHuman = false;
  let aiRng = null;
  let bids = {}, plans = null, humanQueue = [], bidder = 0, bid = 0, plan = [], planSel = 0;
  let handoffTarget = 'playing';
  let digitBuffer = '', digitTimer = 0;
  let shownEvents = new Set(), currentEvent = null, eventLines = [], eventFrame = 0;
  let pendingWinner = null, revealOrder = [], revealStarts = {}, suspenseStart = 0, revealEnd = 0;
  let revealFrame = 0, revealCounted = 0, revealDone = false, result = null;
  let confetti = [];
  let finalCanvas = null, newRecord = false;
  let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;

  function loadPrefs() {
    const d = { seats: ['human', 'human', 'off', 'off'], mode: MODE_SEQ, events: true, silent: true };
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (p && Array.isArray(p.seats) && p.seats.length === 4) {
        p.seats[0] = 'human';
        if (p.seats[1] === 'off') p.seats[1] = 'ai';
        return Object.assign(d, p);
      }
    } catch (e) { /* ignore */ }
    return d;
  }
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }

  function startGame() {
    const seed = Math.floor(Math.random() * 2 ** 30);
    const players = [];
    let humans = 0, ai = 0;
    for (const kind of prefs.seats) {
      if (kind === 'human') players.push(makePlayer(t('player', ++humans), true));
      else if (kind === 'ai') { const [n, a] = AI_PROFILES[ai++]; players.push(makePlayer(n, false, a)); }
    }
    model = new Model(players, seed, prefs.events);
    aiRng = makeRng(seed ^ 0x5eed);
    multiHuman = humans > 1;
    newRecord = false;
    showHelp = false;
    plans = null;
    shownEvents = new Set();
    confetti = [];
    result = null;
    revealDone = false;
    finalCanvas = null;
    Sfx.unlock();
    advance();
  }

  function advance() {
    const r = model.round;
    if (model.events[r] && !shownEvents.has(r)) {
      shownEvents.add(r);
      currentEvent = model.events[r];
      eventLines = model.applyEvent(currentEvent);
      eventFrame = 0;
      confetti = [];
      Sfx.play('news');
      setState('event');
      return;
    }
    if (model.isOver) endGame();
    else if (prefs.mode === MODE_SEQ) beginRound();
    else if (plans === null) beginPlanning();
    else {
      bids = {};
      for (const s of Object.keys(plans)) bids[s] = plans[s][r];
      startReveal();
    }
  }

  function beginRound() {
    bids = {};
    model.players.forEach((p, s) => { if (!p.human) bids[s] = aiBid(model, s, aiRng); });
    humanQueue = model.players.map((p, s) => (p.human ? s : -1)).filter((s) => s >= 0);
    nextHuman();
  }

  function beginPlanning() {
    plans = {};
    model.players.forEach((p, s) => { if (!p.human) plans[s] = aiPlan(model, s, aiRng); });
    humanQueue = model.players.map((p, s) => (p.human ? s : -1)).filter((s) => s >= 0);
    nextHuman();
  }

  function nextHuman() {
    if (!humanQueue.length) {
      if (prefs.mode === MODE_SEQ) startReveal(); else advance();
      return;
    }
    bidder = humanQueue.shift();
    digitBuffer = ''; digitTimer = 0;
    if (prefs.mode === MODE_SEQ) {
      const stars = model.players[bidder].stars;
      bid = Math.min(stars, Math.max(1, Math.floor(model.appeal(model.current) / 2)));
      handoffTarget = 'playing';
    } else {
      plan = new Array(NUM_AUCTIONS).fill(0);
      planSel = 0;
      handoffTarget = 'plan';
    }
    if (multiHuman) { Sfx.play('handoff'); setState('handoff'); } else setState(handoffTarget);
  }

  function confirmBid() { bids[bidder] = bid; Sfx.play('confirm'); nextHuman(); }
  function confirmPlan() { plans[bidder] = plan.slice(); Sfx.play('confirm'); nextHuman(); }

  function startReveal() {
    for (const s of Object.keys(bids)) bids[s] = Math.max(0, Math.min(bids[s], model.players[s].stars));
    [pendingWinner] = model.pickWinner(bids);
    revealOrder = Object.keys(bids).map(Number).sort((a, b) => (bids[a] - bids[b]) || (a - b));
    let tt = DRUMROLL_F;
    revealStarts = {};
    for (const s of revealOrder) { revealStarts[s] = tt; tt += BID_INTRO_F + bids[s] * STAR_COUNT_F + BID_HOLD_F; }
    suspenseStart = tt;
    revealEnd = tt + SUSPENSE_F;
    revealFrame = 0; revealCounted = 0; revealDone = false; result = null; confetti = [];
    setState('reveal');
    Sfx.play('drumroll');
  }

  function counted(seat) {
    if (revealDone) return bids[seat];
    const start = revealStarts[seat];
    if (revealFrame < start) return null;
    const d = revealFrame - start - BID_INTRO_F;
    return d < 0 ? 0 : Math.min(bids[seat], Math.floor(d / STAR_COUNT_F) + 1);
  }

  function finishReveal() {
    revealDone = true;
    result = model.resolve(bids);
    const w = result.winner;
    if (w === null) { Sfx.play('unsold'); return; }
    Sfx.play(model.players[w].human || multiHuman ? 'win' : 'lose');
    const col = PLAYER_COLORS[w];
    const pal = [col, GOLD, '#ffffff', '#ffb3c1', '#9fd8ff'];
    confetti = Array.from({ length: CONFETTI_COUNT }, () => ({
      x: Math.random() * W, y: -10 - Math.random() * 250, vx: (Math.random() - 0.5) * 3,
      vy: 1.5 + Math.random() * 3, col: pal[Math.floor(Math.random() * pal.length)], size: 4 + Math.floor(Math.random() * 5),
      rot: Math.random() * 6
    }));
  }

  function continueReveal() { if (!revealDone) finishReveal(); else advance(); }

  function endGame() {
    const bestHuman = Math.max(0, ...model.players.filter((p) => p.human).map((p) => p.score().total));
    if (bestHuman > best) {
      best = bestHuman; newRecord = true;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* ignore */ }
    }
    finalCanvas = renderFinal();
    showDetails = false;
    confetti = [];
    Sfx.play('fanfare');
    setState('game_over');
  }

  function setBid(v) {
    v = Math.max(0, Math.min(v, model.players[bidder].stars));
    if (v !== bid) { bid = v; if (!prefs.silent) Sfx.play('tick'); }
  }
  function setPlan(i, v) {
    const room = model.players[bidder].stars - (plan.reduce((a, b) => a + b, 0) - plan[i]);
    v = Math.max(0, Math.min(v, room));
    if (v !== plan[i]) { plan[i] = v; if (!prefs.silent) Sfx.play('tick'); }
  }

  function winnerTitle() {
    const order = model.ranking();
    const top = model.players[order[0]];
    const co = order.filter((s) => model.players[s].score().total === top.score().total && model.players[s].stars === top.stars);
    if (co.length > 1) return [t('tie_title'), WARN];
    if (!multiHuman) return top.human ? [t('you_win'), SUCCESS] : [t('you_lose'), ERR];
    return [t('x_wins', top.name), PLAYER_COLORS[order[0]]];
  }

  // ---------------------------------------------------------------- DOM overlays
  const $ = (id) => document.getElementById(id);
  const overlays = { menu: $('menu'), handoff: $('handoff'), help: $('help'), endbar: $('endbar') };

  function setState(s) {
    state = s;
    syncOverlays();
  }

  function syncOverlays() {
    overlays.menu.classList.toggle('hidden', state !== 'menu' || showHelp);
    overlays.handoff.classList.toggle('hidden', state !== 'handoff' || showHelp);
    overlays.endbar.classList.toggle('hidden', state !== 'game_over' || showHelp);
    overlays.help.classList.toggle('hidden', !showHelp);
    if (state === 'menu') buildMenu();
    if (state === 'handoff') {
      const p = model.players[bidder];
      $('h-title').textContent = t('h_title');
      $('h-turn').textContent = t('h_turn', p.name);
      $('h-turn').style.color = PLAYER_COLORS[bidder];
      $('h-hide').textContent = t('h_hide');
      $('h-what').textContent = handoffTarget === 'plan'
        ? t('h_plan', NUM_AUCTIONS)
        : t('h_lot', model.round + 1, NUM_AUCTIONS, model.current.name);
      $('h-go').textContent = t('h_go');
    }
    if (state === 'game_over') {
      $('e-toggle').textContent = showDetails ? t('btn_picture') : t('btn_details');
      $('e-download').textContent = t('btn_download');
      $('e-menu').textContent = t('btn_menu');
      $('e-again').textContent = t('btn_again');
    }
  }

  function buildMenu() {
    $('m-sub').textContent = t('subtitle');
    $('m-intro').textContent = t('intro', START_STARS, NUM_AUCTIONS);
    const seats = $('m-seats');
    seats.innerHTML = '';
    prefs.seats.forEach((kind, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seat' + (kind === 'off' ? ' off' : '') + (i === 0 ? ' locked' : '');
      b.style.borderColor = kind === 'off' ? '' : PLAYER_COLORS[i];
      const label = document.createElement('span');
      label.textContent = t('seat', i + 1);
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = kind === 'human' ? t('human') : kind === 'ai' ? t('computer') : t('empty');
      if (kind !== 'off') who.style.color = PLAYER_COLORS[i];
      b.append(label, who);
      if (i > 0) b.addEventListener('click', () => cycleSeat(i));
      seats.appendChild(b);
    });
    const opts = $('m-opts');
    opts.innerHTML = '';
    [
      ['mode', t('opt_mode'), prefs.mode === MODE_SEQ ? t('mode_seq') : t('mode_bulk'), true, t('mode_hint'), 'T'],
      ['events', t('opt_events'), prefs.events ? t('yes') : t('no'), prefs.events, t('events_hint'), 'A'],
      ['silent', t('opt_silent'), prefs.silent ? t('yes') : t('no'), prefs.silent, t('silent_hint'), 'S']
    ].forEach(([name, title, value, on, hint]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt' + (on ? '' : ' no');
      const tl = document.createElement('span'); tl.textContent = title;
      const v = document.createElement('span'); v.className = 'v'; v.textContent = value;
      const h = document.createElement('span'); h.className = 'h'; h.textContent = hint;
      b.append(tl, v, h);
      b.addEventListener('click', () => toggleOption(name));
      opts.appendChild(b);
    });
    $('m-play').textContent = t('play');
    $('m-rules').textContent = t('rules');
    $('m-best').textContent = t('best', best);
    $('m-keys').textContent = t('menu_keys');
  }

  function cycleSeat(i) {
    const order = i === 1 ? ['ai', 'human'] : ['ai', 'human', 'off'];
    const cur = prefs.seats[i];
    prefs.seats[i] = order[(order.indexOf(cur) + 1) % order.length] || 'ai';
    savePrefs();
    buildMenu();
  }
  function toggleOption(name) {
    if (name === 'mode') prefs.mode = prefs.mode === MODE_SEQ ? MODE_BULK : MODE_SEQ;
    else if (name === 'events') prefs.events = !prefs.events;
    else if (name === 'silent') prefs.silent = !prefs.silent;
    savePrefs();
    buildMenu();
  }

  function buildHelp() {
    $('r-title').textContent = HELP[0][LI];
    const ul = $('r-list');
    ul.innerHTML = '';
    HELP[1 + LI].forEach((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    });
  }
  function toggleHelp(on) {
    showHelp = on === undefined ? !showHelp : on;
    if (showHelp) buildHelp();
    syncOverlays();
  }

  $('m-play').addEventListener('click', startGame);
  $('m-rules').addEventListener('click', () => toggleHelp(true));
  $('r-close').addEventListener('click', () => toggleHelp(false));
  $('h-go').addEventListener('click', () => setState(handoffTarget));
  $('e-again').addEventListener('click', startGame);
  $('e-menu').addEventListener('click', () => setState('menu'));
  $('e-toggle').addEventListener('click', () => { showDetails = !showDetails; syncOverlays(); });
  $('e-download').addEventListener('click', downloadPicture);

  function downloadPicture() {
    if (!finalCanvas) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const a = document.createElement('a');
    a.download = `bid-challenge-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`;
    a.href = finalCanvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---------------------------------------------------------------- input
  function typedNumber(e) {
    if (!/^[0-9]$/.test(e.key)) return null;
    digitBuffer = digitTimer > 0 ? (digitBuffer + e.key).slice(-2) : e.key;
    digitTimer = DIGIT_WINDOW;
    return parseInt(digitBuffer, 10);
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (showHelp) {
      if (k === 'Escape' || k === 'Enter' || k === ' ' || k === 'h' || k === 'H') { e.preventDefault(); toggleHelp(false); }
      return;
    }
    if ((k === 'h' || k === 'H') && state !== 'menu') { toggleHelp(true); return; }
    const confirmKey = k === 'Enter' || k === ' ';
    if (state === 'menu') {
      if (k === 'Enter') { e.preventDefault(); startGame(); }
      else if (k === '2' || k === '3' || k === '4') cycleSeat(+k - 1);
      else if (k === 't' || k === 'T') toggleOption('mode');
      else if (k === 'a' || k === 'A') toggleOption('events');
      else if (k === 's' || k === 'S') toggleOption('silent');
    } else if (state === 'handoff') {
      if (confirmKey) { e.preventDefault(); setState(handoffTarget); }
    } else if (state === 'playing') {
      if (['ArrowRight', 'ArrowUp', '+', '='].includes(k)) { e.preventDefault(); setBid(bid + 1); }
      else if (['ArrowLeft', 'ArrowDown', '-'].includes(k)) { e.preventDefault(); setBid(bid - 1); }
      else if (confirmKey) { e.preventDefault(); confirmBid(); }
      else { const n = typedNumber(e); if (n !== null) setBid(n); }
    } else if (state === 'plan') {
      if (k === 'ArrowUp') { e.preventDefault(); planSel = (planSel + NUM_AUCTIONS - 1) % NUM_AUCTIONS; digitTimer = 0; }
      else if (k === 'ArrowDown' || k === 'Tab') { e.preventDefault(); planSel = (planSel + 1) % NUM_AUCTIONS; digitTimer = 0; }
      else if (['ArrowRight', '+', '='].includes(k)) { e.preventDefault(); setPlan(planSel, plan[planSel] + 1); }
      else if (['ArrowLeft', '-'].includes(k)) { e.preventDefault(); setPlan(planSel, plan[planSel] - 1); }
      else if (k === 'Enter') { e.preventDefault(); confirmPlan(); }
      else { const n = typedNumber(e); if (n !== null) setPlan(planSel, n); }
    } else if (state === 'reveal') {
      if (confirmKey) { e.preventDefault(); continueReveal(); }
    } else if (state === 'event') {
      if (confirmKey && eventFrame >= EVENT_MIN_F) { e.preventDefault(); advance(); }
    } else if (state === 'game_over') {
      if (k === 'Tab') { e.preventDefault(); showDetails = !showDetails; syncOverlays(); }
      else if (k === 'Enter' || k === 'r' || k === 'R') { e.preventDefault(); startGame(); }
    }
  });

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - fit.x) / fit.s, y: (e.clientY - r.top - fit.y) / fit.s };
  }
  canvas.addEventListener('pointermove', (e) => { pointer = toLogical(e); });
  canvas.addEventListener('pointerdown', (e) => {
    Sfx.unlock();
    const p = toLogical(e);
    pointer = p;
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) { h.fn(); return; }
    }
    if (state === 'reveal') continueReveal();
    else if (state === 'event' && eventFrame >= EVENT_MIN_F) advance();
  });
  canvas.addEventListener('wheel', (e) => {
    if (state === 'playing') { e.preventDefault(); setBid(bid + (e.deltaY < 0 ? 1 : -1)); }
    else if (state === 'plan') { e.preventDefault(); setPlan(planSel, plan[planSel] + (e.deltaY < 0 ? 1 : -1)); }
  }, { passive: false });
  // The shared audio.js "boings" on every canvas click; that would let a listener
  // count bid clicks, so canvas clicks never reach it in this game.
  window.addEventListener('click', (e) => { if (e.target === canvas) e.stopPropagation(); }, true);

  // ---------------------------------------------------------------- update
  function update() {
    frame++;
    if ((state === 'playing' || state === 'plan') && digitTimer > 0) digitTimer--;
    if (state === 'event') eventFrame++;
    if (state === 'reveal' && !revealDone) {
      revealFrame++;
      const n = revealOrder.reduce((s, seat) => s + (counted(seat) || 0), 0);
      if (n > revealCounted) { revealCounted = n; Sfx.play('count'); }
      if (revealFrame === suspenseStart) Sfx.play('suspense');
      if (revealFrame >= revealEnd) finishReveal();
    }
    for (const f of confetti) {
      f.x += f.vx + 0.6 * Math.sin((frame + f.size * 10) / 12);
      f.y += f.vy;
      f.rot += 0.1;
    }
    if (confetti.length) confetti = confetti.filter((f) => f.y < H + 10);
  }

  // ---------------------------------------------------------------- draw
  function draw() {
    const dpr = stage ? stage.dpr : Math.min(window.devicePixelRatio || 1, 2);
    c = mainCtx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = BG;
    c.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    c.setTransform(dpr * fit.s, 0, 0, dpr * fit.s, dpr * fit.x, dpr * fit.y);
    hits = [];
    recordHits = true;
    if (state === 'menu' || !model) drawMenuBackdrop();
    else if (state === 'game_over') drawGameOver();
    else if (state === 'plan') { drawHud(); drawPlan(); }
    else {
      drawHud();
      drawCard();
      if (state === 'reveal') drawReveal();
      else if (state === 'playing') drawBidPanel();
      else panel(...BIDBOX, PANEL_HI);
      drawPlayers();
      drawStrip();
      if (state === 'event') drawEvent();
    }
    for (const f of confetti) {
      c.save(); c.translate(f.x, f.y); c.rotate(f.rot);
      c.fillStyle = f.col; c.fillRect(-f.size / 2, -f.size / 4, f.size, f.size / 2 + 2);
      c.restore();
    }
  }

  function drawMenuBackdrop() {
    const keys = LOT_POOL.map((l) => l.key);
    for (let row = 0; row < 6; row++) for (let col = 0; col < 9; col++) {
      const k = keys[(row * 9 + col) % keys.length];
      const x = col * 136 - (row % 2) * 60, y = row * 130 + 10;
      c.globalAlpha = 0.55;
      blitIcon(k, x, y, 120, 90);
      c.globalAlpha = 1;
      c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, y, 120, 90);
    }
  }

  function drawHud() {
    rrect(0, 0, W, HUD_H, 0, PANEL);
    c.fillStyle = INK; c.fillRect(0, HUD_H - 2, W, 2.5);
    const rnd = Math.min(model.round + (state === 'reveal' && revealDone ? 0 : 1), NUM_AUCTIONS);
    const label = state === 'plan' ? t('hud_plan') : state === 'event' ? t('hud_event') : t('hud_round', rnd, NUM_AUCTIONS);
    txt(label, MARGIN, HUD_H / 2, 26, TEXT, { kind: 'title', base: 'middle' });
    txt('BID', W / 2 - 4, HUD_H / 2, 30, ERR, { kind: 'title', base: 'middle', align: 'right' });
    txt('CHALLENGE', W / 2 + 4, HUD_H / 2, 30, TEXT, { kind: 'title', base: 'middle' });
    txt(t('hud_keys'), W - MARGIN - 52, HUD_H / 2, 14, DIM, { align: 'right', base: 'middle' });
    rrect(W - MARGIN - 40, 14, 40, 36, 10, PANEL, INK, 2.5);
    txt('?', W - MARGIN - 20, HUD_H / 2 + 1, 24, TEXT, { kind: 'title', align: 'center', base: 'middle' });
    hit(W - MARGIN - 40, 14, 40, 36, () => toggleHelp(true));
  }

  function shownLot() {
    if (state === 'reveal' && result) return result.lot;
    return model.current || (model.results.length ? model.results[model.results.length - 1].lot : null);
  }

  function catTag(cat, x, y) {
    const name = t('cat_' + cat);
    const w = tw(name, 15, 'bold') + 22;
    rrect(x, y, w, 28, 14, CAT_COLORS[cat], INK, 2);
    txt(name, x + w / 2, y + 14, 15, '#fff', { kind: 'bold', align: 'center', base: 'middle' });
  }

  function drawCard() {
    const lot = shownLot();
    panel(...CARD);
    if (!lot) return;
    const [ix, iy, iw, ih] = CARD_ICON;
    blitIcon(lot.key, ix, iy, iw, ih);
    rrect(ix - 3, iy - 3, iw + 6, ih + 6, 8, null, CAT_COLORS[lot.cat], 5);
    rrect(ix - 5.5, iy - 5.5, iw + 11, ih + 11, 10, null, INK, 2);
    const x = ix + iw + 24, right = CARD[0] + CARD[2] - 16;
    catTag(lot.cat, x, CARD[1] + 20);
    let y = CARD[1] + 60;
    for (const line of wrap(lot.name, 34, 'title', right - x)) { txt(line, x, y, 34, TEXT, { kind: 'title' }); y += 36; }
    y += 6;
    const a = model.appeal(lot), mod = a - lot.appeal;
    txt(t('appeal') + (mod ? ` ${mod > 0 ? '+' : ''}${mod}` : ''), x, y + 3, 15, mod > 0 ? SUCCESS : mod < 0 ? ERR : DIM, { kind: 'bold' });
    const shown = Math.min(a, 10);
    for (let i = 0; i < shown; i++) star(x + 104 + i * 15, y + 11, 7, GOLD, GOLD_DARK);
    txt(t('pts', a), x + 104 + shown * 15 + 4, y + 2, 17, TEXT, { kind: 'bold' });
    y += 34;
    const partner = LOTS[PARTNER[lot.key]];
    txt(t('duo_with', partner.name, PAIR_BONUS), x, y, 15, TEXT, { kind: 'bold', max: right - x });
    y += 22;
    const owner = model.ownerOf(partner.key);
    let status, col;
    if (owner !== null) { status = t('p_owned', model.players[owner].name); col = PLAYER_COLORS[owner]; }
    else if (model.upcoming().includes(partner)) { status = t('p_coming'); col = SUCCESS; }
    else if (model.lots.slice(0, model.round).includes(partner)) { status = t('p_gone'); col = DIM; }
    else { status = t('p_absent'); col = DIM; }
    txt(status, x + 14, y, 13, col);
    y += 28;
    if (state === 'playing') {
      const gain = model.marginal(bidder, lot);
      txt(t('worth', gain), x, y, 15, gain > 0 ? SUCCESS : DIM, { kind: 'bold', max: right - x });
      txt(t('worth_sub'), x, y + 20, 12, DIM, { max: right - x });
    }
  }

  function drawBidPanel() {
    const [x, y, w, h] = BIDBOX;
    const p = model.players[bidder], col = PLAYER_COLORS[bidder];
    panel(x, y, w, h, col, 3.5);
    txt(t('secret_bid', p.name), x + 20, y + 12, 24, col, { kind: 'title' });
    txt(t('stars_left', p.stars), x + w - 20, y + 16, 15, DIM, { align: 'right' });
    for (let i = 0; i < START_STARS; i++) {
      const cx = STAR_X + i * STAR_STEP;
      if (i < bid) star(cx, STAR_Y, STAR_R + 2, GOLD, GOLD_DARK);
      else if (i < p.stars) star(cx, STAR_Y, STAR_R, STAR_LIGHT, GOLD_DARK);
      else star(cx, STAR_Y, STAR_R - 3, STAR_EMPTY);
      if (i < p.stars) {
        const target = i + 1;
        hit(cx - 15, STAR_Y - 16, 30, 32, () => setBid(target === bid && bid === 1 ? 0 : target));
      }
    }
    button(BTN_MINUS, '−', ACCENT, bid > 0, () => setBid(bid - 1), 30);
    button(BTN_PLUS, '+', ACCENT, bid < p.stars, () => setBid(bid + 1), 30);
    const mid = (BTN_MINUS[0] + BTN_MINUS[2] + BTN_PLUS[0]) / 2, cy = BTN_MINUS[1] + BTN_MINUS[3] / 2;
    txt(String(bid), mid - 12, cy, 38, TEXT, { kind: 'title', align: 'center', base: 'middle' });
    star(mid + 22, cy, 12, GOLD, GOLD_DARK);
    txt(t('left_if_win', p.stars - bid), BTN_PLUS[0] + BTN_PLUS[2] + 16, cy, 14, DIM, { base: 'middle', max: BTN_CONFIRM[0] - BTN_PLUS[0] - BTN_PLUS[2] - 26 });
    button(BTN_CONFIRM, bid ? t('bid') : t('pass'), bid ? SUCCESS : WARN, true, confirmBid);
    txt(t('bid_hint'), x + 20, y + h - 22, 13, DIM, { max: w - 40 });
  }

  function drawReveal() {
    const [x, y, w, h] = BIDBOX;
    const done = revealDone, winner = done ? pendingWinner : null;
    panel(x, y, w, h, winner !== null ? PLAYER_COLORS[winner] : INK, winner !== null ? 3.5 : 2.5);
    const dots = '.'.repeat(1 + Math.floor(frame / 15) % 3);
    const head = done ? t('result') : revealFrame < DRUMROLL_F ? t('opening') + dots : t('revealing');
    txt(head, x + 20, y + 12, 24, TEXT, { kind: 'title', max: w - 40 });
    const n = revealOrder.length;
    const rowH = Math.min(30, Math.floor((h - 108) / n));
    const vals = Object.values(bids);
    const bestBid = vals.length ? Math.max(...vals) : 0;
    revealOrder.forEach((seat, idx) => {
      const ry = y + 48 + idx * rowH;
      const p = model.players[seat];
      const cnt = counted(seat);
      if (done && seat === winner) rrect(x + 12, ry - 3, w - 24, rowH, 8, '#fff1c2');
      txt(p.name, x + 24, ry, 17, cnt !== null ? PLAYER_COLORS[seat] : DIM, { kind: 'bold', max: 120 });
      if (cnt === null) { txt('?', x + 150, ry, 18, DIM, { kind: 'title' }); return; }
      const b = bids[seat];
      for (let i = 0; i < cnt; i++) star(x + 158 + i * 20, ry + 10, 8, done && b === bestBid && b > 0 ? GOLD : '#f8dc8a', GOLD_DARK);
      const finished = cnt === b && (done || revealFrame >= revealStarts[seat] + BID_INTRO_F + b * STAR_COUNT_F);
      txt(String(cnt), x + 150 + cnt * 20 + 16, ry, finished ? 20 : 17, finished ? TEXT : DIM, { kind: finished ? 'title' : 'bold' });
      if (done && seat === winner) txt(t('wins'), x + w - 24, ry, 18, SUCCESS, { kind: 'title', align: 'right' });
    });
    if (!done) {
      if (revealFrame >= suspenseStart) txt(t('goes_to', model.current.name) + dots, x + 20, y + h - 58, 24, TEXT, { kind: 'title', max: w - 40 });
      txt(t('skip_anim'), x + 20, y + h - 22, 13, DIM);
      return;
    }
    if (result.winner === null) {
      txt(t('unsold_msg', result.lot.name), x + 20, y + h - 60, 24, DIM, { kind: 'title' });
    } else {
      const pulse = 1 + 0.06 * Math.sin(frame / 6);
      c.save();
      c.translate(x + 20, y + h - 46);
      c.scale(pulse, pulse);
      txt(t('wins_place', model.players[result.winner].name, result.lot.name), 0, 0, 26, PLAYER_COLORS[result.winner], { kind: 'title', base: 'middle', max: (w - 40) / pulse });
      c.restore();
    }
    const nxt = model.isOver && !model.events[NUM_AUCTIONS] ? t('final_next') : t('next');
    const paid = result.winner !== null ? t('paid', result.bids[result.winner]) + '  ' : '';
    txt((paid + result.reason + '  ' + nxt).trim(), x + 20, y + h - 22, 13, DIM, { max: w - 40 });
  }

  function drawPlayers() {
    const [ax, ay, aw, ah] = PLAYERS_BOX;
    const n = model.players.length, gap = 10;
    const h = Math.floor((ah - gap * (n - 1)) / n);
    const leader = model.ranking()[0];
    model.players.forEach((p, seat) => {
      const y = ay + seat * (h + gap);
      const col = PLAYER_COLORS[seat];
      const active = state === 'playing' && seat === bidder;
      panel(ax, y, aw, h, active ? col : INK, active ? 3.5 : 2.5);
      c.save(); c.beginPath(); c.roundRect(ax, y, aw, h, 14); c.clip();
      c.fillStyle = col; c.fillRect(ax, y, 10, h);
      c.restore();
      txt(p.name + (p.human ? '' : t('cpu')), ax + 22, y + 10, 20, col, { kind: 'title', max: 150 });
      star(ax + 188, y + 21, 10, GOLD, GOLD_DARK);
      txt(String(p.stars), ax + 202, y + 11, 20, TEXT, { kind: 'title' });
      const sc = p.score();
      txt(t('pts', sc.total), ax + aw - 16, y + 8, 24, TEXT, { kind: 'title', align: 'right' });
      if (seat === leader && model.round > 0) txt(t('leading'), ax + aw - 16, y + 34, 12, SUCCESS, { kind: 'bold', align: 'right' });
      const iy = y + 40;
      p.lots.forEach((lot, i) => {
        const ix = ax + 22 + i * (MINI_W + 4);
        blitIcon(lot.key, ix, iy, MINI_W, MINI_H);
        rrect(ix, iy, MINI_W, MINI_H, 3, null, CAT_COLORS[lot.cat], 2);
      });
      if (!p.lots.length) txt(t('no_places'), ax + 22, iy + 6, 13, DIM);
      if (h >= 100) txt(t('info', p.spent, sc.appeal, sc.duos, sc.variety, sc.stars), ax + 22, y + h - 22, 12, DIM, { max: aw - 36 });
      if (sc.hotel < 0 && h >= 76) txt(t('no_lodging', sc.hotel), ax + aw - 16, h < 100 ? y + h - 22 : y + 52, 12, ERR, { kind: 'bold', align: 'right' });
    });
  }

  function drawStrip() {
    model.lots.forEach((lot, i) => {
      const x = MARGIN - 1 + i * (THUMB_W + THUMB_GAP), y = STRIP_Y;
      let st = model.status(i);
      if (state === 'reveal' && !revealDone && i === model.round) st = 'current';
      panel(x, y, THUMB_W, THUMB_H, INK, 2);
      blitIcon(lot.key, x + 5, y + 5, THUMB_W - 10, 60);
      rrect(x + 5, y + 5, THUMB_W - 10, 60, 3, null, CAT_COLORS[lot.cat], 2);
      wrap(lot.name, 12, 'bold', THUMB_W - 8).slice(0, 2).forEach((line, k) => txt(line, x + THUMB_W / 2, y + 70 + k * 14, 12, TEXT, { kind: 'bold', align: 'center' }));
      const a = model.appeal(lot);
      txt(t('pts', a), x + THUMB_W / 2, y + THUMB_H - 5, 12, a > lot.appeal ? SUCCESS : a < lot.appeal ? ERR : DIM, { kind: 'bold', align: 'center', base: 'bottom' });
      if (st === 'current') rrect(x - 1, y - 1, THUMB_W + 2, THUMB_H + 2, 14, null, GOLD, 5);
      else if (st === 'unsold') {
        rrect(x, y, THUMB_W, THUMB_H, 14, 'rgba(243,227,182,0.75)');
        txt(t('unsold'), x + THUMB_W / 2, y + THUMB_H / 2, 16, DIM, { kind: 'title', align: 'center', base: 'middle' });
      } else if (typeof st === 'number') {
        const col = PLAYER_COLORS[st];
        rrect(x, y, THUMB_W, THUMB_H, 14, null, col, 4);
        rrect(x + 5, y + 5, THUMB_W - 10, 20, 4, col);
        txt(model.players[st].name, x + THUMB_W / 2, y + 15, 12, '#fff', { kind: 'bold', align: 'center', base: 'middle', max: THUMB_W - 14 });
      }
    });
  }

  function planRects(i) {
    const col = Math.floor(i / 5), row = i % 5;
    const cx = MARGIN + col * (PLAN_W + 12), cy = 80 + row * PLAN_STEP;
    return { cell: [cx, cy, PLAN_W, PLAN_H], minus: [cx + PLAN_W - 178, cy + 28, 44, 44], plus: [cx + PLAN_W - 58, cy + 28, 44, 44] };
  }

  function drawPlan() {
    const p = model.players[bidder], pcol = PLAYER_COLORS[bidder];
    const used = plan.reduce((a, b) => a + b, 0);
    model.lots.forEach((lot, i) => {
      const { cell, minus, plus } = planRects(i);
      const sel = i === planSel;
      panel(...cell, sel ? pcol : INK, sel ? 4 : 2);
      hit(cell[0], cell[1], cell[2], cell[3], () => { planSel = i; digitTimer = 0; });
      blitIcon(lot.key, cell[0] + 8, cell[1] + 8, 118, 88);
      rrect(cell[0] + 8, cell[1] + 8, 118, 88, 4, null, CAT_COLORS[lot.cat], 2.5);
      const x = cell[0] + 138, maxW = minus[0] - x - 8;
      txt(lot.name, x, cell[1] + 10, 21, TEXT, { kind: 'title', max: maxW });
      txt(t('attr_short', t('cat_' + lot.cat), model.appeal(lot)), x, cell[1] + 40, 13, CAT_COLORS[lot.cat], { kind: 'bold', max: maxW });
      const partner = LOTS[PARTNER[lot.key]], here = model.lots.includes(partner);
      txt(t('pair_short', partner.name) + (here ? '' : t('absent')), x, cell[1] + 62, 13, here ? SUCCESS : DIM, { max: maxW });
      button(minus, '−', ACCENT, plan[i] > 0, () => { planSel = i; setPlan(i, plan[i] - 1); }, 28);
      button(plus, '+', ACCENT, used < p.stars, () => { planSel = i; setPlan(i, plan[i] + 1); }, 28);
      const mid = (minus[0] + minus[2] + plus[0]) / 2, cy = minus[1] + 22;
      txt(String(plan[i]), mid - 8, cy, 34, plan[i] ? TEXT : DIM, { kind: 'title', align: 'center', base: 'middle' });
      if (plan[i]) star(mid + 20, cy, 10, GOLD, GOLD_DARK);
    });
    txt(t('plan_head', p.name, used, p.stars), PLAN_STAR_X, 652, 22, pcol, { kind: 'title', max: BTN_PLAN[0] - PLAN_STAR_X - 30 });
    for (let i = 0; i < START_STARS; i++) {
      const cx = PLAN_STAR_X + 10 + i * PLAN_STAR_STEP;
      if (i < used) star(cx, PLAN_STAR_Y, 12, GOLD, GOLD_DARK);
      else if (i < p.stars) star(cx, PLAN_STAR_Y, 11, STAR_LIGHT, GOLD_DARK);
      else star(cx, PLAN_STAR_Y, 8, STAR_EMPTY);
    }
    txt(t('plan_hint'), PLAN_STAR_X, 724, 13, DIM, { max: BTN_PLAN[0] - PLAN_STAR_X - 20 });
    txt(t('plan_note'), BTN_PLAN[0] - 20, 690, 13, DIM, { align: 'right', max: 320 });
    button(BTN_PLAN, t('confirm'), SUCCESS, true, confirmPlan);
  }

  function drawEvent() {
    c.fillStyle = 'rgba(43,36,24,0.55)';
    c.fillRect(0, 0, W, H);
    const slide = Math.pow(Math.max(0, 1 - eventFrame / 25), 2);
    const textLines = wrap(t('evt_' + currentEvent.key), 17, 'body', 720);
    const effects = eventLines.slice(0, 7);
    const bh = 54 + 20 + 52 + 24 * textLines.length + 26 + 32 * effects.length + 56;
    const bw = 800, bx = (W - bw) / 2, by = (H - bh) / 2 + slide * 400;
    panel(bx, by, bw, bh, INK, 3.5);
    c.save(); c.beginPath(); c.roundRect(bx, by, bw, bh, 14); c.clip();
    c.fillStyle = ERR; c.fillRect(bx, by, bw, 54);
    c.restore();
    c.fillStyle = INK; c.fillRect(bx, by + 53, bw, 2.5);
    const r = model.round;
    const when = r >= NUM_AUCTIONS ? t('before_final') : t('before_auction', r + 1);
    txt(t('flash', when), W / 2, by + 28, 24, '#fff', { kind: 'title', align: 'center', base: 'middle' });
    let y = by + 72;
    txt(t('ev_' + currentEvent.key), W / 2, y, 36, TEXT, { kind: 'title', align: 'center' });
    y += 52;
    textLines.forEach((line) => { txt(line, W / 2, y, 17, TEXT, { align: 'center' }); y += 24; });
    y += 10;
    c.fillStyle = PANEL_HI; c.fillRect(bx + 40, y, bw - 80, 2);
    y += 14;
    effects.forEach((e) => {
      const col = e.sign > 0 ? SUCCESS : e.sign < 0 ? ERR : DIM;
      const ex = bx + 60;
      if (e.key) {
        blitIcon(e.key, ex, y, 36, 26);
        rrect(ex, y, 36, 26, 3, null, CAT_COLORS[LOTS[e.key].cat], 1.5);
      }
      txt(e.text, ex + 50, y + 4, 17, col, { kind: 'bold', max: bw - 130 });
      y += 32;
    });
    if (eventFrame >= EVENT_MIN_F) txt(t('cont'), W / 2, by + bh - 28, 13, DIM, { align: 'center' });
  }

  // ---------------------------------------------------------------- final picture
  function drawResort(seat, x, y, w, h, scale) {
    const p = model.players[seat];
    const keys = new Set(p.lots.map((l) => l.key));
    c.save();
    c.beginPath(); c.roundRect(x, y, w, h, 12); c.clip();
    c.translate(x, y);
    const horizon = h * 0.3;
    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#8cc8f0'); sky.addColorStop(1, '#d7ebfa');
    c.fillStyle = sky; c.fillRect(0, 0, w, horizon);
    c.beginPath(); c.arc(w - 40, 34, 18, 0, Math.PI * 2); c.fillStyle = '#ffdc5a'; c.fill();
    [[w * 0.2, w * 0.3, '#6eaa64'], [w * 0.75, w * 0.35, '#64a05f']].forEach(([cx, rad, col]) => {
      c.beginPath(); c.ellipse(cx, horizon + h * 0.02, rad, h * 0.1, 0, 0, Math.PI * 2); c.fillStyle = col; c.fill();
    });
    c.fillStyle = '#82be6e'; c.fillRect(0, horizon, w, h - horizon);
    if (keys.has('beach')) {
      c.fillStyle = '#f0d796'; c.fillRect(0, h - 34, w, 34);
      c.fillStyle = '#3c96d7'; c.fillRect(0, h - 18, w, 18);
    }
    if (keys.has('lake')) { c.beginPath(); c.ellipse(w - 85, horizon + 21, 65, 15, 0, 0, Math.PI * 2); c.fillStyle = '#46a0dc'; c.fill(); }
    const lots = p.lots, k = lots.length;
    if (!k) {
      rrect(w / 2 - 110, h * 0.62 - 30, 220, 60, 8, '#b48c5a', INK, 2.5);
      txt(t('wasteland'), w / 2, h * 0.62, 22, '#fff', { kind: 'title', align: 'center', base: 'middle' });
    } else {
      const cols = k <= 3 ? k : Math.min(5, Math.ceil(k / 2));
      const rows = Math.ceil(k / cols);
      const top = horizon - h * 0.04, bottom = h - (keys.has('beach') ? 38 : 8);
      const cellW = (w - 20) / cols, cellH = (bottom - top) / rows;
      const labelH = cellH > 70 ? 18 : 0;
      const iw = Math.min(cellW - 12, (cellH - labelH - 10) * 4 / 3), ih = iw * 3 / 4;
      const centers = lots.map((_, i) => [10 + cellW * (i % cols + 0.5), top + cellH * Math.floor(i / cols) + (cellH - labelH) / 2]);
      for (let r = 0; r < rows; r++) {
        const yy = centers[r * cols][1] + ih / 2 + 3;
        c.strokeStyle = '#e1c896'; c.lineWidth = Math.max(4, ih / 10); c.lineCap = 'round';
        c.beginPath(); c.moveTo(10, yy); c.lineTo(w - 10, yy); c.stroke();
      }
      lots.forEach((lot, i) => {
        const [cx, cy] = centers[i];
        const rx = cx - iw / 2, ry = cy - ih / 2;
        c.fillStyle = 'rgba(40,70,35,0.45)'; c.fillRect(rx + 4, ry + 4, iw, ih);
        blitIcon(lot.key, rx, ry, iw, ih, scale);
        c.strokeStyle = CAT_COLORS[lot.cat]; c.lineWidth = 3; c.strokeRect(rx, ry, iw, ih);
        c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(rx - 1.5, ry - 1.5, iw + 3, ih + 3);
        if (labelH) {
          const lw = Math.min(tw(lot.name, 12, 'bold') + 12, cellW - 6);
          rrect(cx - lw / 2, ry + ih + 4, lw, 17, 5, '#fffcf0', INK, 1.2);
          txt(lot.name, cx, ry + ih + 12.5, 12, TEXT, { kind: 'bold', align: 'center', base: 'middle', max: lw - 8 });
        }
      });
    }
    const label = t('resort_of', p.name);
    const bw = tw(label, 17, 'title') + 20;
    rrect(8, 6, bw, 28, 9, PLAYER_COLORS[seat], INK, 2);
    txt(label, 8 + bw / 2, 20, 17, '#fff', { kind: 'title', align: 'center', base: 'middle' });
    c.restore();
    rrect(x, y, w, h, 12, null, PLAYER_COLORS[seat], 4);
    rrect(x - 2, y - 2, w + 4, h + 4, 13, null, INK, 2);
  }

  function drawLedger(x, y, w, h) {
    const n = model.players.length;
    const nameW = 150, totalW = 80;
    const colW = (w - nameW - totalW) / NUM_AUCTIONS;
    const iconH = 28;
    const rowH = Math.max(16, Math.min(26, Math.floor((h - iconH - 4) / n)));
    txt(t('ledger_bids'), x + 4, y + 8, 14, DIM, { kind: 'bold' });
    txt(t('ledger_spent'), x + w - totalW / 2, y + 8, 14, DIM, { kind: 'bold', align: 'center' });
    model.results.forEach((res, i) => {
      const cx = x + nameW + i * colW + colW / 2;
      blitIcon(res.lot.key, cx - 18, y, 36, iconH - 2, 2);
      rrect(cx - 18, y, 36, iconH - 2, 2, null, CAT_COLORS[res.lot.cat], 1.5);
    });
    model.players.forEach((p, seat) => {
      const ry = y + iconH + 2 + seat * rowH;
      if (seat % 2 === 0) rrect(x, ry, w, rowH, 4, PANEL_HI);
      txt(p.name, x + 6, ry + rowH / 2, 14, PLAYER_COLORS[seat], { kind: 'bold', base: 'middle' });
      model.results.forEach((res, i) => {
        const cx = x + nameW + i * colW + colW / 2;
        const b = res.bids[seat] || 0;
        if (res.winner === seat) {
          rrect(cx - 18, ry + 2, 36, rowH - 4, 9, PLAYER_COLORS[seat]);
          txt(String(b), cx, ry + rowH / 2, 14, '#fff', { kind: 'bold', align: 'center', base: 'middle' });
        } else txt(String(b), cx, ry + rowH / 2, 14, DIM, { align: 'center', base: 'middle' });
      });
      txt(String(p.spent), x + w - totalW / 2, ry + rowH / 2, 17, TEXT, { kind: 'title', align: 'center', base: 'middle' });
    });
  }

  function renderFinal() {
    const FS = 2;
    const cv = document.createElement('canvas');
    cv.width = W * FS; cv.height = H * FS;
    const prevC = c, prevRec = recordHits;
    c = cv.getContext('2d');
    recordHits = false;
    c.scale(FS, FS);
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    const [title, tcol] = winnerTitle();
    txt(t('final_title'), MARGIN, 18, 22, DIM, { kind: 'title' });
    txt(title, W - MARGIN, 10, 34, tcol, { kind: 'title', align: 'right' });
    const ranks = {};
    model.ranking().forEach((s, i) => { ranks[s] = i + 1; });
    const n = model.players.length;
    const [colsN, rowsN] = n <= 3 ? [n, 1] : [2, 2];
    const ax = MARGIN, ay = 58, aw = W - 2 * MARGIN, ah = 538, gap = 16;
    const slotW = (aw - gap * (colsN - 1)) / colsN, slotH = (ah - gap * (rowsN - 1)) / rowsN;
    model.players.forEach((p, seat) => {
      const sx = ax + (seat % colsN) * (slotW + gap), sy = ay + Math.floor(seat / colsN) * (slotH + gap);
      const sceneH = slotH - 48;
      drawResort(seat, sx, sy, slotW, sceneH, FS);
      const sc = p.score();
      txt(t('final_line', ranks[seat], p.name, sc.total, rating(sc.total)), sx + 4, sy + sceneH + 8, 18, PLAYER_COLORS[seat], { kind: 'title', max: slotW - 8 });
      txt(t('final_sub', p.lots.length, p.spent, p.stars), sx + 4, sy + sceneH + 30, 13, TEXT, { max: slotW - 8 });
    });
    drawLedger(MARGIN, 604, W - 2 * MARGIN, H - 604 - 10);
    c = prevC;
    recordHits = prevRec;
    return cv;
  }

  function drawGameOver() {
    if (!showDetails && finalCanvas) {
      const s = 0.9;
      c.drawImage(finalCanvas, (W - W * s) / 2, 6, W * s, H * s);
      return;
    }
    const order = model.ranking();
    const [title, tcol] = winnerTitle();
    const bw = 920, bh = 150 + 66 * order.length + 40;
    const bx = (W - bw) / 2, by = Math.max(20, (H - 80 - bh) / 2);
    panel(bx, by, bw, bh, GOLD, 4);
    let y = by + 18;
    if (newRecord) { txt(t('new_record'), W / 2, y, 20, SUCCESS, { kind: 'title', align: 'center' }); y += 28; }
    txt(title, W / 2, y, 48, tcol, { kind: 'title', align: 'center' });
    y += 62;
    const cols = [['col_appeal', 'appeal'], ['col_pairs', 'duos'], ['col_variety', 'variety'], ['col_stars', 'stars'], ['col_lodging', 'hotel'], ['col_total', 'total']];
    const cx0 = bx + 350;
    cols.forEach(([label], k) => txt(t(label), cx0 + k * 92, y, 13, DIM, { kind: 'bold', align: 'center' }));
    y += 22;
    order.forEach((seat, rank) => {
      const p = model.players[seat], sc = p.score();
      c.fillStyle = PANEL_HI; c.fillRect(bx + 24, y, bw - 48, 1.5);
      txt(`${rank + 1}. ${p.name}`, bx + 30, y + 8, 24, PLAYER_COLORS[seat], { kind: 'title', max: 270 });
      txt(rating(sc.total), bx + 48, y + 38, 13, DIM);
      cols.forEach(([, field], k) => {
        const v = sc[field];
        const s = field === 'appeal' || field === 'total' || v <= 0 ? String(v) : '+' + v;
        txt(s, cx0 + k * 92, y + 16, field === 'total' ? 24 : 18, v < 0 ? ERR : TEXT, { kind: field === 'total' ? 'title' : 'bold', align: 'center' });
      });
      y += 66;
    });
    txt(t('best', best), W / 2, by + bh - 34, 15, DIM, { align: 'center' });
  }

  // ---------------------------------------------------------------- loop
  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(250, now - last);
    last = now;
    while (acc >= STEP_MS) { update(); acc -= STEP_MS; }
    draw();
    requestAnimationFrame(loop);
  }

  setState('menu');
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => iconCache.clear());
  requestAnimationFrame(loop);

  // test hook (headless smoke tests drive the game through this)
  window.__bidChallenge = {
    get state() { return state; }, get model() { return model; }, prefs,
    startGame, confirmBid, confirmPlan, continueReveal, advance, setBid, setPlan,
    update, draw, setPlanSel: (i) => { planSel = i; }, go: () => setState(handoffTarget),
    get eventFrame() { return eventFrame; }, get revealDone() { return revealDone; }, get bidder() { return bidder; }
  };
})();
