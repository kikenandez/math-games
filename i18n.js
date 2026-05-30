(function () {
  const supported = ['en', 'fr', 'es'];
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('lang');
  const stored = localStorage.getItem('mathArcadeLang');
  const lang = supported.includes(requested) ? requested : (supported.includes(stored) ? stored : 'en');
  localStorage.setItem('mathArcadeLang', lang);
  document.documentElement.lang = lang;

  const map = {
    fr: {
      'Math Arcade · Hub': 'Math Arcade · Accueil',
      'A handcrafted collection of browser-native math arcade games. Cartoon aliens, friendly defenders, falling cargo, and a meteor swarm — all keyboard & mouse, no installs.': 'Une collection artisanale de jeux d’arcade mathématiques jouables dans le navigateur. Aliens cartoon, défenseurs amicaux, cargaison qui tombe et essaim de météores : clavier et souris, sans installation.',
      'click a card to': 'cliquez sur une carte pour',
      'everything runs in your browser': 'tout fonctionne dans votre navigateur',
      '· everything runs in your browser · zero installs · high scores save locally': '· tout fonctionne dans votre navigateur · zéro installation · les meilleurs scores sont sauvegardés localement',
      'zero installs': 'zéro installation',
      'high scores save locally': 'les meilleurs scores sont sauvegardés localement',
      'PLAY': 'JOUER',
      'PLAY ▶': 'JOUER ▶',
      'SOLVE': 'RÉSOUS',
      'SURVIVE': 'SURVIS',
      'A handcrafted arcade by': 'Une arcade artisanale par',
      'SUPPORT ON PATREON': 'SOUTENIR SUR PATREON',
      'Built with HTML5 canvas · static files · runs entirely in your browser · no installs · no tracking ·': 'Créé avec HTML5 canvas · fichiers statiques · fonctionne entièrement dans votre navigateur · sans installation · sans pistage ·',
      'Cargo edition': 'Édition cargaison',
      'Defend Planet Numero': 'Défendez la planète Numero',
      'Clear the clutter': 'Nettoyez le désordre',
      'Logic puzzle': 'Puzzle logique',
      'Highway hopper': 'Saut sur autoroute',
      'Meteor defense': 'Défense météore',
      'Pyramid hop': 'Saut pyramidal',
      'Target practice': 'Tir de précision',
      'Rule eater': 'Mangeur de règles',
      'Rule whacker': 'Tape-règle',
      'Swap and clear': 'Échangez et effacez',
      'Reduce enemies to 0': 'Réduisez les ennemis à 0',
      'A cargo truck bumps along a sunset road, tossing math-stickered boxes into the air. Type the answer before they hit the ground.': 'Un camion de cargaison roule sur une route au coucher du soleil et projette des caisses avec des opérations. Tapez la réponse avant qu’elles touchent le sol.',
      'A formation of math-expression aliens drifts down. Type the answer to vaporize every ship with that value before they breach the line.': 'Une formation d’aliens avec des expressions mathématiques descend. Tapez la réponse pour vaporiser tous les vaisseaux ayant cette valeur avant qu’ils franchissent la ligne.',
      'Math boxes fall in a factory. Click ones matching the active rule. Touching boxes merge — 6-operand chains arm a 5-second typed defuse.': 'Des boîtes de maths tombent dans une usine. Cliquez celles qui respectent la règle active. Les boîtes qui se touchent fusionnent : les chaînes de 6 opérandes déclenchent un désamorçage à taper en 5 secondes.',
      'Puzzly visual algebra: balances reveal hidden values for shapes. Deduce, type, and check your answers to clear each level.': 'Algèbre visuelle en puzzle : les balances révèlent les valeurs cachées des formes. Déduisez, tapez et vérifiez vos réponses pour terminer chaque niveau.',
      'Hop through traffic and rivers while eating only numbers that match the active rule. Wrong snacks cost time; clocks buy a comeback.': 'Traversez la route et la rivière en mangeant seulement les nombres qui respectent la règle active. Les mauvais choix coûtent du temps ; les horloges aident à revenir.',
      'Classic city defense: click to launch missiles and chain explosions. Protect the cities, ration silos, survive the waves.': 'Défense de ville classique : cliquez pour lancer des missiles et enchaîner les explosions. Protégez les villes, gérez les silos, survivez aux vagues.',
      'Hop an isometric pyramid, clear tiles, and adjust special math tiles to zero. Dodge red balls and a very determined snake.': 'Sautez sur une pyramide isométrique, effacez les cases et ramenez les cases mathématiques à zéro. Évitez les boules rouges et un serpent très obstiné.',
      'Drift and shoot asteroids whose expressions equal the target answer. Wrong shots cost shield; clear the rocks to level up.': 'Dérivez et tirez sur les astéroïdes dont les expressions valent la réponse cible. Les mauvais tirs coûtent du bouclier ; nettoyez les rochers pour passer de niveau.',
      'Eat only apples matching the active rule while growing longer. Wrong apples shrink you; walls and self-crashes end the run.': 'Mangez seulement les pommes qui respectent la règle active en grandissant. Les mauvaises pommes vous raccourcissent ; murs et collisions terminent la partie.',
      'Moles pop up with numbers. Whack only the ones matching the rule before correct moles escape or the timer runs out.': 'Des taupes apparaissent avec des nombres. Tapez seulement celles qui respectent la règle avant qu’elles s’échappent ou que le temps soit écoulé.',
      'Swap adjacent tiles to clear rows or columns whose values all match the active rule. Use hints carefully: they cost moves.': 'Échangez des tuiles adjacentes pour effacer des lignes ou colonnes dont toutes les valeurs respectent la règle active. Utilisez les indices avec prudence : ils coûtent des coups.',
      'Enemies walk a winding path carrying numbers. Place <b>operator towers</b> (−1, −3, ÷2…) next to the path to reduce them to <b>0</b> before they reach your base. Anything non-zero costs HP.': 'Des ennemis suivent un chemin sinueux avec des nombres. Placez des <b>tours opérateurs</b> (−1, −3, ÷2…) près du chemin pour les réduire à <b>0</b> avant votre base. Toute valeur non nulle coûte des PV.',
      'Cargo\'s bouncing off the truck. Type the answer that matches a flying box and hit <b>Enter</b> to pop everything with that value. Don\'t let a box hit the ground.': 'La cargaison rebondit hors du camion. Tapez la réponse qui correspond à une caisse volante puis appuyez sur <b>Entrée</b> pour éclater tout ce qui a cette valeur. Ne laissez aucune caisse toucher le sol.',
      'A formation of math aliens drifts down. Type the answer that matches a ship and hit <b>Enter</b> to vaporize every ship with that value. Watch for the UFO mothership — it\'s worth 500 points but only flies by briefly.': 'Une formation d’aliens mathématiques descend. Tapez la réponse qui correspond à un vaisseau puis appuyez sur <b>Entrée</b> pour vaporiser tous les vaisseaux ayant cette valeur. Surveillez le vaisseau-mère OVNI : il vaut 500 points mais ne passe que brièvement.',
      'Math boxes fall from above. <b>Click</b> any box whose evaluation matches the active <b>RULE</b> banner. Boxes that touch <b>merge</b> into longer chains — a 6-operand chain <b>arms</b> a 10-second bomb and freezes the other boxes during the countdown. <b>Type</b> its answer to defuse for +200 (or detonate for a penalty). Score starts at 200; reach 0 to lose.': 'Des boîtes mathématiques tombent d’en haut. <b>Cliquez</b> toute boîte dont le résultat correspond à la <b>RÈGLE</b> active. Les boîtes qui se touchent <b>fusionnent</b> en chaînes plus longues : une chaîne de 6 opérandes <b>arme</b> une bombe de 10 secondes et fige les autres boîtes. <b>Tapez</b> sa réponse pour désamorcer et gagner +200, sinon elle explose avec une pénalité. Le score commence à 200 ; à 0, vous perdez.',
      'Each clue is a balance: the shapes on the left side weigh the same as the number on the right. Each level now generates fresh values and totals. Select a shape, type its value, and hit <b>CHECK</b> when every box is filled.': 'Chaque indice est une balance : les formes à gauche pèsent autant que le nombre à droite. Chaque niveau génère de nouvelles valeurs et de nouveaux totaux. Sélectionnez une forme, tapez sa valeur, puis cliquez <b>VÉRIFIER</b> quand toutes les cases sont remplies.',
      'Use <b>arrow keys</b> or <b>WASD</b> to hop. Each round picks a rule (even, odd, multiples, primes…). Snack the numbers that match — wrong number costs <b>2 seconds</b>. Grab glowing gold <b>clocks</b> for bonus time. Fill the belly, then leap to the lily pad to win the round.': 'Utilisez les <b>flèches</b> ou <b>WASD</b> pour sauter. Chaque manche choisit une règle (pairs, impairs, multiples, nombres premiers…). Mangez les nombres valides ; un mauvais nombre coûte <b>2 secondes</b>. Attrapez les <b>horloges</b> dorées pour gagner du temps. Remplissez le ventre, puis sautez sur le nénuphar pour gagner la manche.',
      'Click anywhere to launch a player missile from the nearest silo. It arcs up, lands at your click, and explodes — destroying any enemy missile or MIRV caught in the blast. Each silo holds 10 missiles; reload between waves. Lose all 6 cities and it\'s game over.': 'Cliquez n’importe où pour lancer un missile depuis le silo le plus proche. Il monte en arc, atterrit là où vous avez cliqué et explose, détruisant tout missile ennemi ou MIRV dans le souffle. Chaque silo contient 10 missiles ; rechargez entre les vagues. Perdez les 6 villes et la partie est terminée.',
      'Hop the pyramid with <b>arrow keys</b> or <b>WASD</b>. Visit every tile to clear it Q*bert-style. A few interior tiles are <b style="color:#ff8a3d">math tiles</b> with a value — descending hops (<b style="color:#5cd97a">SE/SW</b>) add <b>+1</b>, ascending hops (<b style="color:#ff5c7c">NE/NW</b>) subtract <b>−1</b>. Bring every math tile to <b>0</b>. Dodge the <b style="color:#e2434b">red balls</b> tumbling down from the apex, and watch for the <b style="color:#a45cd9">snake</b> that hatches at the top and chases you.': 'Sautez sur la pyramide avec les <b>flèches</b> ou <b>WASD</b>. Visitez chaque tuile pour l’effacer façon Q*bert. Certaines tuiles intérieures sont des <b style="color:#ff8a3d">tuiles mathématiques</b> avec une valeur : les sauts descendants (<b style="color:#5cd97a">SE/SW</b>) ajoutent <b>+1</b>, les sauts ascendants (<b style="color:#ff5c7c">NE/NW</b>) retirent <b>−1</b>. Amenez chaque tuile mathématique à <b>0</b>. Évitez les <b style="color:#e2434b">boules rouges</b> qui tombent du sommet et surveillez le <b style="color:#a45cd9">serpent</b> qui éclot en haut et vous poursuit.',
      'Drift through space and gun down asteroids stamped with arithmetic expressions. The HUD shows a <b style="color:#ffd24d">target answer</b>. Shoot only the rocks whose expression evaluates to that number. Each correct hit rolls a new target. Wrong shots cost <b style="color:#5cd97a">shield</b> — lose all shield and you lose a <b style="color:#ff5c7c">life</b>. Survive long enough to clear the level.': 'Dérivez dans l’espace et abattez les astéroïdes marqués d’expressions arithmétiques. Le HUD affiche une <b style="color:#ffd24d">réponse cible</b>. Tirez seulement sur les rochers dont l’expression vaut ce nombre. Chaque bon tir choisit une nouvelle cible. Les mauvais tirs coûtent du <b style="color:#5cd97a">bouclier</b> ; sans bouclier, vous perdez une <b style="color:#ff5c7c">vie</b>. Survivez assez longtemps pour finir le niveau.',
      'Move with <b>arrow keys</b> or <b>WASD</b>. Apples scatter the board, each with a number. Eat only the ones matching the <b style="color:#5cd97a">active rule</b> (evens, primes, in-order, etc.) to grow and score. A <b style="color:#ff5c7c">wrong apple</b> shrinks you by one segment. Crashing into the wall or yourself ends the run.': 'Déplacez-vous avec les <b>flèches</b> ou <b>WASD</b>. Des pommes numérotées sont dispersées sur le plateau. Mangez seulement celles qui respectent la <b style="color:#5cd97a">règle active</b> (pairs, premiers, dans l’ordre, etc.) pour grandir et marquer. Une <b style="color:#ff5c7c">mauvaise pomme</b> vous raccourcit d’un segment. Toucher un mur ou votre corps termine la partie.',
      'Moles pop up from holes with numbers stuck to their fur. <b>Click only the ones matching the active rule</b> (evens, primes, multiples…). Wrong-mole bonks cost a <b style="color:#ff5c7c">miss</b>. Moles duck back after a couple of seconds — letting too many <b style="color:#ff5c7c">correct</b> ones escape is a miss too. Use up all 3 misses or the timer hits zero and you\'re out.': 'Des taupes sortent des trous avec des nombres sur leur fourrure. <b>Cliquez seulement celles qui respectent la règle active</b> (pairs, premiers, multiples…). Frapper une mauvaise taupe coûte un <b style="color:#ff5c7c">raté</b>. Les taupes replongent après quelques secondes : laisser trop de <b style="color:#ff5c7c">bonnes</b> taupes s’échapper compte aussi comme raté. Épuisez les 3 ratés ou laissez le temps tomber à zéro, et c’est fini.',
      'Click a tile, then click an adjacent tile to <b>swap them</b>. A line of <b>3+ tiles in a row or column</b> whose values <b>all match the active rule</b> clears and scores. <b>Right-click</b> a cell to toggle a cue mark for <b style="color:#ff5c7c">-25 points</b>. The <b>hint</b> button shows one playable swap and costs <b style="color:#5cd9ff">1 move</b>.': 'Cliquez une tuile, puis une tuile adjacente pour les <b>échanger</b>. Une ligne de <b>3 tuiles ou plus</b> en rangée ou colonne dont les valeurs <b>respectent toutes la règle active</b> disparaît et rapporte des points. <b>Clic droit</b> sur une case pour poser un repère contre <b style="color:#ff5c7c">-25 points</b>. Le bouton <b>indice</b> montre un échange possible et coûte <b style="color:#5cd9ff">1 coup</b>.',
      '<b>Drag</b> a tile toward a neighbor to slice it over and swap, or <b>tap</b> a tile and then tap an adjacent one. A line of <b>3+ tiles in a row or column</b> whose values <b>all match the active rule</b> clears and scores. <b>Right-click</b> a cell to toggle a cue mark for <b style="color:#ff5c7c">-25 points</b>. The <b>hint</b> button shows one playable swap and costs <b style="color:#5cd9ff">1 move</b>.': '<b>Faites glisser</b> une tuile vers une voisine pour l’échanger, ou <b>touchez</b> une tuile puis une tuile adjacente. Une ligne de <b>3 tuiles ou plus</b> en rangée ou colonne dont les valeurs <b>respectent toutes la règle active</b> disparaît et rapporte des points. <b>Clic droit</b> sur une case pour poser un repère contre <b style="color:#ff5c7c">-25 points</b>. Le bouton <b>indice</b> montre un échange possible et coûte <b style="color:#5cd9ff">1 coup</b>.',
      'Bubbles enter from the left carrying a number and travel through <b>three sequential redirect gates</b>. At each gate click <b>TOP / MID / BOT</b> to switch the route (keys: <b>Q W E</b> for gate&nbsp;1, <b>A S D</b> for gate&nbsp;2, <b>Z X C</b> for gate&nbsp;3). MID is short, TOP/BOT are long detours that expose bubbles to more towers. Place <b>operator towers</b> near the path — each tower fires <b>once per path cell it covers</b>: a straight stretch&nbsp;=&nbsp;<b>1</b> hit, an inside corner&nbsp;=&nbsp;<b>2</b>, an inside U-turn&nbsp;=&nbsp;<b>3</b>. The hover preview shows the exact ×N for the active route. Reduce every bubble to <b>0</b> before it reaches the base. Survive <b>5 waves</b> to level up.': 'Des bulles entrent par la gauche avec un nombre et traversent <b>trois portes de redirection successives</b>. À chaque porte, cliquez <b>HAUT / MILIEU / BAS</b> pour changer la route (touches : <b>Q W E</b> pour la porte&nbsp;1, <b>A S D</b> pour la porte&nbsp;2, <b>Z X C</b> pour la porte&nbsp;3). MILIEU est court ; HAUT/BAS sont de longs détours qui exposent les bulles à plus de tours. Placez des <b>tours opérateurs</b> près du chemin : chaque tour tire <b>une fois par case de chemin couverte</b>. Segment droit&nbsp;=&nbsp;<b>1</b> coup, coin intérieur&nbsp;=&nbsp;<b>2</b>, demi-tour intérieur&nbsp;=&nbsp;<b>3</b>. L’aperçu au survol affiche le ×N exact de la route active. Réduisez chaque bulle à <b>0</b> avant la base. Survivez à <b>5 vagues</b> pour passer de niveau.',
      'type': 'taper',
      'arcade': 'arcade',
      'click': 'clic',
      'puzzle': 'puzzle',
      'logic': 'logique',
      'dodge': 'éviter',
      'timing': 'timing',
      'aim': 'viser',
      'defense': 'défense',
      'maze': 'labyrinthe',
      'jump': 'saut',
      'shoot': 'tir',
      'snake': 'serpent',
      'rules': 'règles',
      'whack': 'taper',
      'swap': 'échanger',
      'match': 'associer',
      'strategy': 'stratégie',
      'reflex': 'réflexes',
      'place': 'placer',
      'mobile ok': 'compatible mobile',
      'pc only': 'PC uniquement',
      'Score': 'Score',
      'Level': 'Niveau',
      'Targets': 'Cibles',
      'Wave': 'Vague',
      'Round': 'Manche',
      'Lives': 'Vies',
      'Time': 'Temps',
      'Misses': 'Ratés',
      'Shield': 'Bouclier',
      'Length': 'Longueur',
      'Speed': 'Vitesse',
      'Detonations': 'Détonations',
      'Moves': 'Coups',
      'Gold': 'Or',
      'Base HP': 'PV base',
      'Bonus': 'Bonus',
      'Solved': 'Résolus',
      'of': 'sur',
      'Rule': 'Règle',
      'Target Answer': 'Réponse cible',
      'Match a line of': 'Alignez',
      'Whack only': 'Tapez seulement',
      'SPD Bonus': 'Bonus vitesse',
      'START': 'DÉMARRER',
      'LAUNCH': 'LANCER',
      'SLITHER': 'RAMPEZ',
      'START WHACKING': 'COMMENCER À TAPER',
      'DEFEND': 'DÉFENDRE',
      'START WAVE': 'LANCER LA VAGUE',
      'RESET': 'RÉINITIALISER',
      'NEW PUZZLE': 'NOUVEAU PUZZLE',
      'CHECK ↵': 'VÉRIFIER ↵',
      'Tweaks': 'Réglages',
      'Hint (H)': 'Indice (H)',
      'Hint (-1 move)': 'Indice (-1 coup)',
      'Open tweaks panel': 'Ouvrir les réglages',
      'EASY': 'FACILE',
      'NORMAL': 'NORMAL',
      'HARD': 'DIFFICILE',
      'MED': 'MOYEN',
      'INFERNO': 'INFERNO',
      'ROTATE': 'TOURNER',
      'MOUSE': 'SOURIS',
      'SOLID': 'SOLIDE',
      'WRAP': 'BOUCLE',
      'ON': 'ON',
      'OFF': 'OFF',
      'TWILIGHT': 'CRÉPUSCULE',
      'DAWN': 'AUBE',
      'STORM': 'ORAGE',
      'Difficulty': 'Difficulté',
      'Falling speed': 'Vitesse de chute',
      'Spawn rate': 'Fréquence',
      'Allow negative numbers': 'Autoriser les nombres négatifs',
      'Enemy speed': 'Vitesse ennemie',
      'Bomb timer': 'Minuteur bombe',
      'Hard mode (no chain bonus warning)': 'Mode difficile (sans avertissement de chaîne)',
      'Ship speed': 'Vitesse du vaisseau',
      'Control mode': 'Mode de contrôle',
      'Target timer': 'Minuteur cible',
      'Operations': 'Opérations',
      'River speed': 'Vitesse rivière',
      'Spawn speed': 'Vitesse apparition',
      'Blast radius': 'Rayon explosion',
      'Min line length': 'Longueur minimale',
      'click moles that match the rule — leave the rest alone': 'tapez les taupes qui respectent la règle — laissez les autres',
      'route each bubble through the path that drains it to zero': 'dirigez chaque bulle par le chemin qui la ramène à zéro',
      'cargo edition': 'édition cargaison',
      'clear-the-clutter math arcade': 'arcade de maths pour nettoyer le bazar',
      'slither · eat what the rule says · grow long': 'rampez · mangez selon la règle · grandissez',
      'eat 10 numbers that match the rule — before time runs out': 'mangez 10 nombres qui respectent la règle avant la fin du temps',
      'defend Planet Numero from operation-ships': 'défendez la planète Numero des vaisseaux-opérations',
      'shoot only the rocks that match the target answer': 'tirez seulement sur les rochers qui valent la réponse cible',
      'hop the pyramid · balance the puzzle tiles to zero': 'sautez sur la pyramide · ramenez les tuiles à zéro',
      'protect the friendly cities from the meteor swarm': 'protégez les villes amies de l’essaim de météores',
      'visual algebra puzzles · deduce each shape\'s value': 'puzzles d’algèbre visuelle · déduisez la valeur de chaque forme',
      'swap adjacent tiles · clear lines that match the rule': 'échangez des tuiles adjacentes · effacez les lignes valides',
      'type answer': 'taper la réponse',
      'negative sign': 'signe négatif',
      'delete': 'effacer',
      'submit': 'valider',
      'fire': 'tirer',
      'pause': 'pause',
      'thrust forward': 'pousser',
      'rotate ship': 'tourner le vaisseau',
      'fire bullet': 'tirer',
      'hyperspace jump': 'saut hyperspatial',
      'hop frog': 'faire sauter la grenouille',
      'move snake': 'déplacer le serpent',
      'alt controls': 'contrôles alternatifs',
      'destroy a matching box': 'détruire une boîte valide',
      'type defuse / mothership answer': 'taper désamorçage / réponse vaisseau-mère',
      'submit answer': 'valider la réponse',
      'delete digit': 'effacer un chiffre',
      'launch missile at cursor': 'lancer un missile au curseur',
      'fire from left / center / right silo': 'tirer depuis le silo gauche / centre / droit',
      'select an answer box': 'sélectionner une réponse',
      'cycle answer boxes': 'parcourir les réponses',
      'type value': 'taper la valeur',
      'check answers': 'vérifier les réponses',
      'hint': 'indice',
      'new puzzle': 'nouveau puzzle',
      'reset level': 'réinitialiser le niveau',
      'PAUSED': 'PAUSE',
      'GAME OVER': 'PARTIE TERMINÉE',
      'Level Clear!': 'Niveau réussi !',
      'Wave Clear!': 'Vague réussie !',
      'Correct!': 'Correct !',
      'Wrong!': 'Faux !',
      'Paratroopers': 'Parachutistes',
      'TROOPERS': 'CHUTISTES',
      'Visual differentiation': 'Différenciation visuelle',
      'Defend your turret against falling paratroopers and helicopters. Shoot down only the target letters (**p** vs **q**, **b** vs **d**) while letting the friendly ones escape in the rescue truck!': 'Défendez votre tourelle des parachutistes et hélicoptères. Abattez uniquement les lettres cibles et laissez les amies fuir dans le camion !',
      'visual action training · distinguish letter reversals': 'entraînement visuel d\'action · distinguer les inversions de lettres',
      'Aim and fire your base turret! Helicopters fly across the sky, dropping paratroopers. At each level, you must shoot down <b>only the target letters</b> while letting the friendly ones land safely so they can run into the <b>Rescue Truck</b>!': 'Visez et tirez avec votre tourelle ! Des hélicoptères traversent le ciel, lâchant des parachutistes. À chaque niveau, abattez <b>uniquement les lettres cibles</b> et laissez les amies atterrir pour courir vers le <b>camion de sauvetage</b> !',
      '⚠️ <b>SABOTAGE STACKING:</b> Landing 4 bad paratroopers on either side of the turret will blow you up!': '⚠️ <b>PILE DE SABOTAGE :</b> Si 4 parachutistes ennemis atterrissent de chaque côté de la tourelle, vous explosez !',
      'mission briefing': 'briefing de mission',
      'LEVEL': 'NIVEAU',
      'COMMENCE': 'COMMENCER',
      'BASE DESTROYED': 'BASE DÉTRUITE',
      'Defenders overrun!': 'Défenseurs débordés !',
      'DEFEND AGAIN': 'DÉFENDRE À NOUVEAU',
      'READY': 'PRÊT',
      'RESCUE': 'SAUVETAGE',
      'paratroopers-briefing-help': 'Abattez les mauvaises cibles pour défendre votre base et marquer des points ! Évitez les bonnes : elles doivent atterrir puis rejoindre le <b>camion de sauvetage</b> pour vous donner un bonus.',
      'Zap bad targets to defend your base and score points! Avoid shooting good ones — they must land safely and escape in the <b>Rescue Truck</b> to reward you bonus points.': 'Abattez les mauvaises cibles pour défendre votre base et marquer des points ! Évitez les bonnes : elles doivent atterrir puis rejoindre le <b>camion de sauvetage</b> pour vous donner un bonus.',
      'Zap bad targets to defend your base and score points! Avoid shooting good ones — they must land safely and escape in the **Rescue Truck** to reward you bonus points.': 'Abattez les mauvaises cibles pour défendre votre base et marquer des points ! Évitez les bonnes : elles doivent atterrir puis rejoindre le <b>camion de sauvetage</b> pour vous donner un bonus.',
      'Shoot ONLY "p" paratroopers! Save "q" & ALL helicopters.': 'Tirez SEULEMENT sur les parachutistes "p" ! Sauvez "q" et TOUS les hélicoptères.',
      'Shoot ONLY "q" paratroopers! Save "p" & ALL helicopters.': 'Tirez SEULEMENT sur les parachutistes "q" ! Sauvez "p" et TOUS les hélicoptères.',
      'Shoot ONLY "b" helicopters! Save "d" & ALL paratroopers.': 'Tirez SEULEMENT sur les hélicoptères "b" ! Sauvez "d" et TOUS les parachutistes.',
      'Shoot ONLY "d" helicopters! Save "b" & ALL paratroopers.': 'Tirez SEULEMENT sur les hélicoptères "d" ! Sauvez "b" et TOUS les parachutistes.',
      'Shoot "p" paratroopers & "b" helicopters! Save "q" & "d".': 'Tirez sur les parachutistes "p" et hélicoptères "b" ! Sauvez "q" et "d".',
      'Shoot "q" paratroopers & "d" helicopters! Save "p" & "b".': 'Tirez sur les parachutistes "q" et hélicoptères "d" ! Sauvez "p" et "b".',
      'Shoot "p" paratroopers · save "q" + helicopters': 'Tirez "p" · sauvez "q" + hélicos',
      'Shoot "q" paratroopers · save "p" + helicopters': 'Tirez "q" · sauvez "p" + hélicos',
      'Shoot "b" helicopters · save "d" + paratroopers': 'Tirez hélico "b" · sauvez "d" + parachutistes',
      'Shoot "d" helicopters · save "b" + paratroopers': 'Tirez hélico "d" · sauvez "b" + parachutistes',
      'Shoot paratrooper "p" + helicopter "b"': 'Tirez parachutiste "p" + hélico "b"',
      'Shoot paratrooper "q" + helicopter "d"': 'Tirez parachutiste "q" + hélico "d"',
      'SHOOT p': 'TIRER p',
      'SHOOT q': 'TIRER q',
      'SHOOT HELI b': 'TIRER HÉLI b',
      'SHOOT HELI d': 'TIRER HÉLI d',
      'SHOOT p & b': 'TIRER p & b',
      'SHOOT q & d': 'TIRER q & d',
      '⚡ Shoot ONLY "p" paratroopers! Save "q" & ALL helicopters. ⚡': '⚡ TIREZ SEULEMENT SUR LES PARACHUTISTES "p" ! SAUVEZ "q" ET TOUS LES HÉLICOPTÈRES. ⚡',
      '⚡ Shoot ONLY "q" paratroopers! Save "p" & ALL helicopters. ⚡': '⚡ TIREZ SEULEMENT SUR LES PARACHUTISTES "q" ! SAUVEZ "p" ET TOUS LES HÉLICOPTÈRES. ⚡',
      '⚡ Shoot ONLY "b" helicopters! Save "d" & ALL paratroopers. ⚡': '⚡ TIREZ SEULEMENT SUR LES HÉLICOPTÈRES "b" ! SAUVEZ "d" ET TOUS LES PARACHUTISTES. ⚡',
      '⚡ Shoot ONLY "d" helicopters! Save "b" & ALL paratroopers. ⚡': '⚡ TIREZ SEULEMENT SUR LES HÉLICOPTÈRES "d" ! SAUVEZ "b" ET TOUS LES PARACHUTISTES. ⚡',
      '⚡ Shoot "p" paratroopers & "b" helicopters! Save "q" & "d". ⚡': '⚡ TIREZ SUR LES PARACHUTISTES "p" ET HÉLICOPTÈRES "b" ! SAUVEZ "q" ET "d". ⚡',
      '⚡ Shoot "q" paratroopers & "d" helicopters! Save "p" & "b". ⚡': '⚡ TIREZ SUR LES PARACHUTISTES "q" ET HÉLICOPTÈRES "d" ! SAUVEZ "p" ET "b". ⚡',
      'Turret sabotaged! Landed paratroopers blew up the base!': 'Tourelle sabotée ! Les parachutistes ont fait exploser la base !',
      'Shot down friendly rescue fleet!': 'Flotte de sauvetage amie abattue !',
      'Shot down friendly paratroopers!': 'Parachutistes alliés abattus !',
      'BOOM +50!': 'BOOM +50 !',
      'RESCUE DAMAGE! −1♥ −30': 'DÉGÂTS SAUVETAGE ! −1♥ −30',
      'HIT +10': 'TOUCHÉ +10',
      'FRIENDLY FIRE! −1♥ −15': 'TIR AMI ! −1♥ −15',
      'RESCUE +20!': 'SAUVÉ +20 !',
      'POP!': 'POP !',
      'CRASH!': 'CRASH !',
      'CLANG!': 'CLANG !',
      'CRUSH!': 'ÉCRASÉ !',
      'LEVEL CLEAR': 'NIVEAU RÉUSSI',
      'LEVEL CLEAR!': 'NIVEAU RÉUSSI !',
      'Next briefing incoming': 'Prochaine mission'
    },
    es: {
      'Math Arcade · Hub': 'Math Arcade · Inicio',
      'A handcrafted collection of browser-native math arcade games. Cartoon aliens, friendly defenders, falling cargo, and a meteor swarm — all keyboard & mouse, no installs.': 'Una colección artesanal de juegos arcade de matemáticas para el navegador. Aliens de dibujos, defensores amistosos, carga que cae y una lluvia de meteoritos: teclado y ratón, sin instalar nada.',
      'click a card to': 'haz clic en una tarjeta para',
      'everything runs in your browser': 'todo funciona en tu navegador',
      '· everything runs in your browser · zero installs · high scores save locally': '· todo funciona en tu navegador · cero instalaciones · las mejores puntuaciones se guardan localmente',
      'zero installs': 'cero instalaciones',
      'high scores save locally': 'las mejores puntuaciones se guardan localmente',
      'PLAY': 'JUGAR',
      'PLAY ▶': 'JUGAR ▶',
      'SOLVE': 'RESOLVER',
      'SURVIVE': 'SOBREVIVIR',
      'A handcrafted arcade by': 'Una arcade artesanal de',
      'SUPPORT ON PATREON': 'APOYAR EN PATREON',
      'Built with HTML5 canvas · static files · runs entirely in your browser · no installs · no tracking ·': 'Creado con HTML5 canvas · archivos estáticos · funciona completamente en tu navegador · sin instalaciones · sin rastreo ·',
      'Cargo edition': 'Edición carga',
      'Defend Planet Numero': 'Defiende el planeta Numero',
      'Clear the clutter': 'Limpia el desorden',
      'Logic puzzle': 'Puzzle lógico',
      'Highway hopper': 'Saltos en carretera',
      'Meteor defense': 'Defensa de meteoritos',
      'Pyramid hop': 'Salto piramidal',
      'Target practice': 'Práctica de tiro',
      'Rule eater': 'Come-reglas',
      'Rule whacker': 'Golpea-reglas',
      'Swap and clear': 'Intercambia y limpia',
      'Reduce enemies to 0': 'Reduce enemigos a 0',
      'A cargo truck bumps along a sunset road, tossing math-stickered boxes into the air. Type the answer before they hit the ground.': 'Un camión avanza por una carretera al atardecer lanzando cajas con operaciones. Escribe la respuesta antes de que toquen el suelo.',
      'A formation of math-expression aliens drifts down. Type the answer to vaporize every ship with that value before they breach the line.': 'Una formación de aliens con expresiones matemáticas desciende. Escribe la respuesta para vaporizar todas las naves con ese valor antes de que crucen la línea.',
      'Math boxes fall in a factory. Click ones matching the active rule. Touching boxes merge — 6-operand chains arm a 5-second typed defuse.': 'Cajas matemáticas caen en una fábrica. Haz clic en las que cumplan la regla activa. Las cajas que se tocan se fusionan: las cadenas de 6 operandos activan un desarme de 5 segundos.',
      'Puzzly visual algebra: balances reveal hidden values for shapes. Deduce, type, and check your answers to clear each level.': 'Álgebra visual tipo puzzle: las balanzas revelan valores ocultos de formas. Deduce, escribe y comprueba tus respuestas para superar cada nivel.',
      'Hop through traffic and rivers while eating only numbers that match the active rule. Wrong snacks cost time; clocks buy a comeback.': 'Salta entre tráfico y ríos comiendo solo números que cumplan la regla activa. Los bocados incorrectos cuestan tiempo; los relojes ayudan a remontar.',
      'Classic city defense: click to launch missiles and chain explosions. Protect the cities, ration silos, survive the waves.': 'Defensa clásica de ciudades: haz clic para lanzar misiles y encadenar explosiones. Protege las ciudades, administra los silos y sobrevive a las oleadas.',
      'Hop an isometric pyramid, clear tiles, and adjust special math tiles to zero. Dodge red balls and a very determined snake.': 'Salta por una pirámide isométrica, limpia casillas y ajusta las casillas matemáticas a cero. Esquiva bolas rojas y una serpiente muy insistente.',
      'Drift and shoot asteroids whose expressions equal the target answer. Wrong shots cost shield; clear the rocks to level up.': 'Deriva y dispara a asteroides cuyas expresiones valen la respuesta objetivo. Los disparos incorrectos cuestan escudo; limpia las rocas para subir de nivel.',
      'Eat only apples matching the active rule while growing longer. Wrong apples shrink you; walls and self-crashes end the run.': 'Come solo manzanas que cumplan la regla activa mientras creces. Las manzanas incorrectas te acortan; chocar con muros o contigo termina la partida.',
      'Moles pop up with numbers. Whack only the ones matching the rule before correct moles escape or the timer runs out.': 'Los topos aparecen con números. Golpea solo los que cumplan la regla antes de que escapen los correctos o se acabe el tiempo.',
      'Swap adjacent tiles to clear rows or columns whose values all match the active rule. Use hints carefully: they cost moves.': 'Intercambia fichas adyacentes para limpiar filas o columnas cuyos valores cumplan la regla activa. Usa pistas con cuidado: cuestan movimientos.',
      'Enemies walk a winding path carrying numbers. Place <b>operator towers</b> (−1, −3, ÷2…) next to the path to reduce them to <b>0</b> before they reach your base. Anything non-zero costs HP.': 'Los enemigos recorren un camino sinuoso llevando números. Coloca <b>torres operadoras</b> (−1, −3, ÷2…) junto al camino para reducirlos a <b>0</b> antes de que lleguen a tu base. Cualquier valor distinto de cero cuesta vida.',
      'Cargo\'s bouncing off the truck. Type the answer that matches a flying box and hit <b>Enter</b> to pop everything with that value. Don\'t let a box hit the ground.': 'La carga rebota fuera del camión. Escribe la respuesta que coincida con una caja voladora y pulsa <b>Enter</b> para explotar todo lo que tenga ese valor. No dejes que ninguna caja toque el suelo.',
      'A formation of math aliens drifts down. Type the answer that matches a ship and hit <b>Enter</b> to vaporize every ship with that value. Watch for the UFO mothership — it\'s worth 500 points but only flies by briefly.': 'Una formación de aliens matemáticos desciende. Escribe la respuesta que coincida con una nave y pulsa <b>Enter</b> para vaporizar todas las naves con ese valor. Vigila la nave nodriza OVNI: vale 500 puntos, pero pasa muy rápido.',
      'Math boxes fall from above. <b>Click</b> any box whose evaluation matches the active <b>RULE</b> banner. Boxes that touch <b>merge</b> into longer chains — a 6-operand chain <b>arms</b> a 10-second bomb and freezes the other boxes during the countdown. <b>Type</b> its answer to defuse for +200 (or detonate for a penalty). Score starts at 200; reach 0 to lose.': 'Cajas matemáticas caen desde arriba. Haz <b>clic</b> en cualquier caja cuyo resultado coincida con la <b>REGLA</b> activa. Las cajas que se tocan se <b>fusionan</b> en cadenas más largas: una cadena de 6 operandos <b>activa</b> una bomba de 10 segundos y congela las demás cajas. <b>Escribe</b> su respuesta para desarmarla y ganar +200, o detona con penalización. El marcador empieza en 200; si llega a 0, pierdes.',
      'Each clue is a balance: the shapes on the left side weigh the same as the number on the right. Each level now generates fresh values and totals. Select a shape, type its value, and hit <b>CHECK</b> when every box is filled.': 'Cada pista es una balanza: las formas del lado izquierdo pesan lo mismo que el número de la derecha. Cada nivel genera nuevos valores y totales. Selecciona una forma, escribe su valor y pulsa <b>COMPROBAR</b> cuando todas las casillas estén llenas.',
      'Use <b>arrow keys</b> or <b>WASD</b> to hop. Each round picks a rule (even, odd, multiples, primes…). Snack the numbers that match — wrong number costs <b>2 seconds</b>. Grab glowing gold <b>clocks</b> for bonus time. Fill the belly, then leap to the lily pad to win the round.': 'Usa las <b>flechas</b> o <b>WASD</b> para saltar. Cada ronda elige una regla (pares, impares, múltiplos, primos…). Come los números correctos; un número incorrecto cuesta <b>2 segundos</b>. Toma <b>relojes</b> dorados brillantes para ganar tiempo. Llena la barriga y salta al nenúfar para ganar la ronda.',
      'Click anywhere to launch a player missile from the nearest silo. It arcs up, lands at your click, and explodes — destroying any enemy missile or MIRV caught in the blast. Each silo holds 10 missiles; reload between waves. Lose all 6 cities and it\'s game over.': 'Haz clic en cualquier lugar para lanzar un misil desde el silo más cercano. Sube en arco, cae donde hiciste clic y explota, destruyendo cualquier misil enemigo o MIRV atrapado en la explosión. Cada silo tiene 10 misiles; recarga entre oleadas. Si pierdes las 6 ciudades, se acaba la partida.',
      'Hop the pyramid with <b>arrow keys</b> or <b>WASD</b>. Visit every tile to clear it Q*bert-style. A few interior tiles are <b style="color:#ff8a3d">math tiles</b> with a value — descending hops (<b style="color:#5cd97a">SE/SW</b>) add <b>+1</b>, ascending hops (<b style="color:#ff5c7c">NE/NW</b>) subtract <b>−1</b>. Bring every math tile to <b>0</b>. Dodge the <b style="color:#e2434b">red balls</b> tumbling down from the apex, and watch for the <b style="color:#a45cd9">snake</b> that hatches at the top and chases you.': 'Salta por la pirámide con las <b>flechas</b> o <b>WASD</b>. Visita cada casilla para limpiarla al estilo Q*bert. Algunas casillas interiores son <b style="color:#ff8a3d">casillas matemáticas</b> con valor: los saltos descendentes (<b style="color:#5cd97a">SE/SW</b>) suman <b>+1</b>, los ascendentes (<b style="color:#ff5c7c">NE/NW</b>) restan <b>−1</b>. Lleva cada casilla matemática a <b>0</b>. Esquiva las <b style="color:#e2434b">bolas rojas</b> que caen desde la cima y cuidado con la <b style="color:#a45cd9">serpiente</b> que nace arriba y te persigue.',
      'Drift through space and gun down asteroids stamped with arithmetic expressions. The HUD shows a <b style="color:#ffd24d">target answer</b>. Shoot only the rocks whose expression evaluates to that number. Each correct hit rolls a new target. Wrong shots cost <b style="color:#5cd97a">shield</b> — lose all shield and you lose a <b style="color:#ff5c7c">life</b>. Survive long enough to clear the level.': 'Deriva por el espacio y dispara a asteroides marcados con expresiones aritméticas. El HUD muestra una <b style="color:#ffd24d">respuesta objetivo</b>. Dispara solo a las rocas cuya expresión valga ese número. Cada acierto genera un nuevo objetivo. Los disparos incorrectos cuestan <b style="color:#5cd97a">escudo</b>; sin escudo pierdes una <b style="color:#ff5c7c">vida</b>. Sobrevive lo suficiente para completar el nivel.',
      'Move with <b>arrow keys</b> or <b>WASD</b>. Apples scatter the board, each with a number. Eat only the ones matching the <b style="color:#5cd97a">active rule</b> (evens, primes, in-order, etc.) to grow and score. A <b style="color:#ff5c7c">wrong apple</b> shrinks you by one segment. Crashing into the wall or yourself ends the run.': 'Muévete con las <b>flechas</b> o <b>WASD</b>. Hay manzanas con números por todo el tablero. Come solo las que cumplan la <b style="color:#5cd97a">regla activa</b> (pares, primos, en orden, etc.) para crecer y puntuar. Una <b style="color:#ff5c7c">manzana incorrecta</b> te encoge un segmento. Chocar contra una pared o contra ti mismo termina la partida.',
      'Moles pop up from holes with numbers stuck to their fur. <b>Click only the ones matching the active rule</b> (evens, primes, multiples…). Wrong-mole bonks cost a <b style="color:#ff5c7c">miss</b>. Moles duck back after a couple of seconds — letting too many <b style="color:#ff5c7c">correct</b> ones escape is a miss too. Use up all 3 misses or the timer hits zero and you\'re out.': 'Los topos salen de los agujeros con números pegados al pelaje. <b>Haz clic solo en los que cumplan la regla activa</b> (pares, primos, múltiplos…). Golpear un topo incorrecto cuesta un <b style="color:#ff5c7c">fallo</b>. Los topos se esconden tras unos segundos; dejar escapar demasiados <b style="color:#ff5c7c">correctos</b> también cuenta como fallo. Si gastas los 3 fallos o el tiempo llega a cero, pierdes.',
      'Click a tile, then click an adjacent tile to <b>swap them</b>. A line of <b>3+ tiles in a row or column</b> whose values <b>all match the active rule</b> clears and scores. <b>Right-click</b> a cell to toggle a cue mark for <b style="color:#ff5c7c">-25 points</b>. The <b>hint</b> button shows one playable swap and costs <b style="color:#5cd9ff">1 move</b>.': 'Haz clic en una ficha y luego en una adyacente para <b>intercambiarlas</b>. Una línea de <b>3 o más fichas</b> en fila o columna cuyos valores <b>cumplan todos la regla activa</b> desaparece y suma puntos. <b>Clic derecho</b> en una celda para poner una marca por <b style="color:#ff5c7c">-25 puntos</b>. El botón <b>pista</b> muestra un intercambio posible y cuesta <b style="color:#5cd9ff">1 movimiento</b>.',
      '<b>Drag</b> a tile toward a neighbor to slice it over and swap, or <b>tap</b> a tile and then tap an adjacent one. A line of <b>3+ tiles in a row or column</b> whose values <b>all match the active rule</b> clears and scores. <b>Right-click</b> a cell to toggle a cue mark for <b style="color:#ff5c7c">-25 points</b>. The <b>hint</b> button shows one playable swap and costs <b style="color:#5cd9ff">1 move</b>.': '<b>Arrastra</b> una ficha hacia una vecina para intercambiarla, o <b>toca</b> una ficha y luego una adyacente. Una línea de <b>3 o más fichas</b> en fila o columna cuyos valores <b>cumplan todos la regla activa</b> desaparece y suma puntos. <b>Clic derecho</b> en una celda para poner una marca por <b style="color:#ff5c7c">-25 puntos</b>. El botón <b>pista</b> muestra un intercambio posible y cuesta <b style="color:#5cd9ff">1 movimiento</b>.',
      'Bubbles enter from the left carrying a number and travel through <b>three sequential redirect gates</b>. At each gate click <b>TOP / MID / BOT</b> to switch the route (keys: <b>Q W E</b> for gate&nbsp;1, <b>A S D</b> for gate&nbsp;2, <b>Z X C</b> for gate&nbsp;3). MID is short, TOP/BOT are long detours that expose bubbles to more towers. Place <b>operator towers</b> near the path — each tower fires <b>once per path cell it covers</b>: a straight stretch&nbsp;=&nbsp;<b>1</b> hit, an inside corner&nbsp;=&nbsp;<b>2</b>, an inside U-turn&nbsp;=&nbsp;<b>3</b>. The hover preview shows the exact ×N for the active route. Reduce every bubble to <b>0</b> before it reaches the base. Survive <b>5 waves</b> to level up.': 'Las burbujas entran por la izquierda con un número y atraviesan <b>tres compuertas de redirección secuenciales</b>. En cada compuerta haz clic en <b>ARRIBA / MEDIO / ABAJO</b> para cambiar la ruta (teclas: <b>Q W E</b> para compuerta&nbsp;1, <b>A S D</b> para compuerta&nbsp;2, <b>Z X C</b> para compuerta&nbsp;3). MEDIO es corto; ARRIBA/ABAJO son rodeos largos que exponen las burbujas a más torres. Coloca <b>torres operadoras</b> cerca del camino: cada torre dispara <b>una vez por casilla de camino cubierta</b>. Tramo recto&nbsp;=&nbsp;<b>1</b> golpe, esquina interior&nbsp;=&nbsp;<b>2</b>, giro en U interior&nbsp;=&nbsp;<b>3</b>. La vista previa al pasar el cursor muestra el ×N exacto de la ruta activa. Reduce cada burbuja a <b>0</b> antes de que llegue a la base. Sobrevive <b>5 oleadas</b> para subir de nivel.',
      'type': 'teclear',
      'arcade': 'arcade',
      'click': 'clic',
      'puzzle': 'puzzle',
      'logic': 'lógica',
      'dodge': 'esquivar',
      'timing': 'ritmo',
      'aim': 'apuntar',
      'defense': 'defensa',
      'maze': 'laberinto',
      'jump': 'saltar',
      'shoot': 'disparar',
      'snake': 'serpiente',
      'rules': 'reglas',
      'whack': 'golpear',
      'swap': 'intercambiar',
      'match': 'combinar',
      'strategy': 'estrategia',
      'reflex': 'reflejos',
      'place': 'colocar',
      'mobile ok': 'compatible móvil',
      'pc only': 'solo PC',
      'Score': 'Puntos',
      'Level': 'Nivel',
      'Targets': 'Objetivos',
      'Wave': 'Oleada',
      'Round': 'Ronda',
      'Lives': 'Vidas',
      'Time': 'Tiempo',
      'Misses': 'Fallos',
      'Shield': 'Escudo',
      'Length': 'Longitud',
      'Speed': 'Velocidad',
      'Detonations': 'Detonaciones',
      'Moves': 'Movimientos',
      'Gold': 'Oro',
      'Base HP': 'Vida base',
      'Bonus': 'Bonus',
      'Solved': 'Resueltos',
      'of': 'de',
      'Rule': 'Regla',
      'Target Answer': 'Respuesta objetivo',
      'Match a line of': 'Forma una línea de',
      'Whack only': 'Golpea solo',
      'SPD Bonus': 'Bonus vel.',
      'START': 'EMPEZAR',
      'LAUNCH': 'LANZAR',
      'SLITHER': 'REPTAR',
      'START WHACKING': 'EMPEZAR A GOLPEAR',
      'DEFEND': 'DEFENDER',
      'START WAVE': 'INICIAR OLEADA',
      'RESET': 'REINICIAR',
      'NEW PUZZLE': 'NUEVO PUZZLE',
      'CHECK ↵': 'COMPROBAR ↵',
      'Tweaks': 'Ajustes',
      'Hint (H)': 'Pista (H)',
      'Hint (-1 move)': 'Pista (-1 movimiento)',
      'Open tweaks panel': 'Abrir panel de ajustes',
      'EASY': 'FÁCIL',
      'NORMAL': 'NORMAL',
      'HARD': 'DIFÍCIL',
      'MED': 'MEDIO',
      'INFERNO': 'INFIERNO',
      'ROTATE': 'GIRAR',
      'MOUSE': 'RATÓN',
      'SOLID': 'SÓLIDO',
      'WRAP': 'BUCLE',
      'ON': 'ON',
      'OFF': 'OFF',
      'TWILIGHT': 'CREPÚSCULO',
      'DAWN': 'AMANECER',
      'STORM': 'TORMENTA',
      'Difficulty': 'Dificultad',
      'Falling speed': 'Velocidad de caída',
      'Spawn rate': 'Frecuencia',
      'Allow negative numbers': 'Permitir números negativos',
      'Enemy speed': 'Velocidad enemiga',
      'Bomb timer': 'Temporizador bomba',
      'Hard mode (no chain bonus warning)': 'Modo difícil (sin aviso de cadena)',
      'Ship speed': 'Velocidad de nave',
      'Control mode': 'Modo de control',
      'Target timer': 'Temporizador objetivo',
      'Operations': 'Operaciones',
      'River speed': 'Velocidad del río',
      'Spawn speed': 'Velocidad de aparición',
      'Blast radius': 'Radio de explosión',
      'Min line length': 'Longitud mínima',
      'click moles that match the rule — leave the rest alone': 'golpea los topos que cumplen la regla y deja los demás',
      'route each bubble through the path that drains it to zero': 'guía cada burbuja por la ruta que la reduce a cero',
      'cargo edition': 'edición carga',
      'clear-the-clutter math arcade': 'arcade matemático para limpiar el desorden',
      'slither · eat what the rule says · grow long': 'repta · come lo que diga la regla · crece',
      'eat 10 numbers that match the rule — before time runs out': 'come 10 números que cumplen la regla antes de que acabe el tiempo',
      'defend Planet Numero from operation-ships': 'defiende el planeta Numero de naves-operación',
      'shoot only the rocks that match the target answer': 'dispara solo a rocas que igualen la respuesta objetivo',
      'hop the pyramid · balance the puzzle tiles to zero': 'salta por la pirámide · lleva las fichas a cero',
      'protect the friendly cities from the meteor swarm': 'protege las ciudades amigas de la lluvia de meteoritos',
      'visual algebra puzzles · deduce each shape\'s value': 'puzzles de álgebra visual · deduce el valor de cada forma',
      'swap adjacent tiles · clear lines that match the rule': 'intercambia fichas adyacentes · limpia líneas válidas',
      'type answer': 'escribir respuesta',
      'negative sign': 'signo negativo',
      'delete': 'borrar',
      'submit': 'enviar',
      'fire': 'disparar',
      'pause': 'pausa',
      'thrust forward': 'impulsar',
      'rotate ship': 'girar nave',
      'fire bullet': 'disparar bala',
      'hyperspace jump': 'salto hiperespacial',
      'hop frog': 'saltar rana',
      'move snake': 'mover serpiente',
      'alt controls': 'controles alternativos',
      'destroy a matching box': 'destruir caja válida',
      'type defuse / mothership answer': 'escribir desarme / respuesta nave nodriza',
      'submit answer': 'enviar respuesta',
      'delete digit': 'borrar dígito',
      'launch missile at cursor': 'lanzar misil al cursor',
      'fire from left / center / right silo': 'disparar desde silo izquierdo / central / derecho',
      'select an answer box': 'seleccionar respuesta',
      'cycle answer boxes': 'recorrer respuestas',
      'type value': 'escribir valor',
      'check answers': 'comprobar respuestas',
      'hint': 'pista',
      'new puzzle': 'nuevo puzzle',
      'reset level': 'reiniciar nivel',
      'PAUSED': 'PAUSA',
      'GAME OVER': 'FIN DE PARTIDA',
      'Level Clear!': '¡Nivel superado!',
      'Wave Clear!': '¡Oleada superada!',
      'Correct!': '¡Correcto!',
      'Wrong!': '¡Incorrecto!',
      'Paratroopers': 'Paracaidistas',
      'TROOPERS': 'CAIDISTAS',
      'Visual differentiation': 'Diferenciación visual',
      'Defend your turret against falling paratroopers and helicopters. Shoot down only the target letters (**p** vs **q**, **b** vs **d**) while letting the friendly ones escape in the rescue truck!': 'Defiende tu torreta de paracaidistas y helicópteros. ¡Derriba solo las letras objetivo y deja que las aliadas escapen en el camión de rescate!',
      'visual action training · distinguish letter reversals': 'entrenamiento visual de acción · distinguir inversiones de letras',
      'Aim and fire your base turret! Helicopters fly across the sky, dropping paratroopers. At each level, you must shoot down <b>only the target letters</b> while letting the friendly ones land safely so they can run into the <b>Rescue Truck</b>!': '¡Apunta y dispara tu torreta! Helicópteros cruzan el cielo soltando paracaidistas. En cada nivel debes derribar <b>solo las letras objetivo</b>, ¡dejando que las aliadas aterricen a salvo y corran al <b>camión de rescate</b>!',
      '⚠️ <b>SABOTAGE STACKING:</b> Landing 4 bad paratroopers on either side of the turret will blow you up!': '⚠️ <b>PILAS DE SABOTAJE:</b> ¡Si 4 paracaidistas enemigos aterrizan a cualquier lado de la torreta explotarás!',
      'mission briefing': 'resumen de misión',
      'LEVEL': 'NIVEL',
      'COMMENCE': 'COMENZAR',
      'BASE DESTROYED': 'BASE DESTRUIDA',
      'Defenders overrun!': '¡Defensores superados!',
      'DEFEND AGAIN': 'DEFENDER DE NUEVO',
      'READY': 'LISTO',
      'RESCUE': 'RESCATE',
      'paratroopers-briefing-help': 'Dispara a los objetivos malos para defender tu base y sumar puntos. Evita disparar a los buenos: deben aterrizar y escapar en el <b>camión de rescate</b> para darte puntos extra.',
      'Zap bad targets to defend your base and score points! Avoid shooting good ones — they must land safely and escape in the <b>Rescue Truck</b> to reward you bonus points.': 'Dispara a los objetivos malos para defender tu base y sumar puntos. Evita disparar a los buenos: deben aterrizar y escapar en el <b>camión de rescate</b> para darte puntos extra.',
      'Zap bad targets to defend your base and score points! Avoid shooting good ones — they must land safely and escape in the **Rescue Truck** to reward you bonus points.': 'Dispara a los objetivos malos para defender tu base y sumar puntos. Evita disparar a los buenos: deben aterrizar y escapar en el <b>camión de rescate</b> para darte puntos extra.',
      'Shoot ONLY "p" paratroopers! Save "q" & ALL helicopters.': '¡Dispara SOLO paracaidistas "p"! Salva "q" y TODOS los helicópteros.',
      'Shoot ONLY "q" paratroopers! Save "p" & ALL helicopters.': '¡Dispara SOLO paracaidistas "q"! Salva "p" y TODOS los helicópteros.',
      'Shoot ONLY "b" helicopters! Save "d" & ALL paratroopers.': '¡Dispara SOLO helicópteros "b"! Salva "d" y TODOS los paracaidistas.',
      'Shoot ONLY "d" helicopters! Save "b" & ALL paratroopers.': '¡Dispara SOLO helicópteros "d"! Salva "b" y TODOS los paracaidistas.',
      'Shoot "p" paratroopers & "b" helicopters! Save "q" & "d".': '¡Dispara paracaidistas "p" y helicópteros "b"! Salva "q" y "d".',
      'Shoot "q" paratroopers & "d" helicopters! Save "p" & "b".': '¡Dispara paracaidistas "q" y helicópteros "d"! Salva "p" y "b".',
      'Shoot "p" paratroopers · save "q" + helicopters': 'Dispara "p" · salva "q" + helicópteros',
      'Shoot "q" paratroopers · save "p" + helicopters': 'Dispara "q" · salva "p" + helicópteros',
      'Shoot "b" helicopters · save "d" + paratroopers': 'Dispara heli "b" · salva "d" + paracaidistas',
      'Shoot "d" helicopters · save "b" + paratroopers': 'Dispara heli "d" · salva "b" + paracaidistas',
      'Shoot paratrooper "p" + helicopter "b"': 'Dispara paracaidista "p" + heli "b"',
      'Shoot paratrooper "q" + helicopter "d"': 'Dispara paracaidista "q" + heli "d"',
      'SHOOT p': 'DISPARA p',
      'SHOOT q': 'DISPARA q',
      'SHOOT HELI b': 'DISPARA HELI b',
      'SHOOT HELI d': 'DISPARA HELI d',
      'SHOOT p & b': 'DISPARA p & b',
      'SHOOT q & d': 'DISPARA q & d',
      '⚡ Shoot ONLY "p" paratroopers! Save "q" & ALL helicopters. ⚡': '⚡ ¡DISPARA SOLO PARACAIDISTAS "p"! SALVA "q" Y TODOS LOS HELICÓPTEROS. ⚡',
      '⚡ Shoot ONLY "q" paratroopers! Save "p" & ALL helicopters. ⚡': '⚡ ¡DISPARA SOLO PARACAIDISTAS "q"! SALVA "p" Y TODOS LOS HELICÓPTEROS. ⚡',
      '⚡ Shoot ONLY "b" helicopters! Save "d" & ALL paratroopers. ⚡': '⚡ ¡DISPARA SOLO HELICÓPTEROS "b"! SALVA "d" Y TODOS LOS PARACAIDISTAS. ⚡',
      '⚡ Shoot ONLY "d" helicopters! Save "b" & ALL paratroopers. ⚡': '⚡ ¡DISPARA SOLO HELICÓPTEROS "d"! SALVA "b" Y TODOS LOS PARACAIDISTAS. ⚡',
      '⚡ Shoot "p" paratroopers & "b" helicopters! Save "q" & "d". ⚡': '⚡ ¡DISPARA PARACAIDISTAS "p" Y HELICÓPTEROS "b"! SALVA "q" Y "d". ⚡',
      '⚡ Shoot "q" paratroopers & "d" helicopters! Save "p" & "b". ⚡': '⚡ ¡DISPARA PARACAIDISTAS "q" Y HELICÓPTEROS "d"! SALVA "p" Y "b". ⚡',
      'Turret sabotaged! Landed paratroopers blew up the base!': '¡Torreta saboteada! ¡Los paracaidistas derribados destruyeron la base!',
      'Shot down friendly rescue fleet!': '¡Derribaste la flota aliada de rescate!',
      'Shot down friendly paratroopers!': '¡Derribaste a paracaidistas aliados!',
      'BOOM +50!': '¡BOOM +50!',
      'RESCUE DAMAGE! −1♥ −30': '¡DAÑO RESCATE! −1♥ −30',
      'HIT +10': '¡IMPACTO +10!',
      'FRIENDLY FIRE! −1♥ −15': '¡FUEGO AMIGO! −1♥ −15',
      'RESCUE +20!': '¡RESCATADO +20!',
      'POP!': '¡POP!',
      'CRASH!': '¡CRASH!',
      'CLANG!': '¡CLANG!',
      'CRUSH!': '¡APLASTADO!',
      'LEVEL CLEAR': 'NIVEL SUPERADO',
      'LEVEL CLEAR!': '¡NIVEL SUPERADO!',
      'Next briefing incoming': 'Siguiente misión'
    }
  };

  const dict = map[lang] || {};
  const dynamic = {
    fr: {
      rules: {
        'EVEN NUMBERS': 'NOMBRES PAIRS',
        'ODD NUMBERS': 'NOMBRES IMPAIRS',
        'MULTIPLES of 3': 'MULTIPLES DE 3',
        'MULTIPLES of 5': 'MULTIPLES DE 5',
        'MULTIPLES OF 2': 'MULTIPLES DE 2',
        'MULTIPLES OF 3': 'MULTIPLES DE 3',
        'MULTIPLES OF 5': 'MULTIPLES DE 5',
        'PRIMES': 'NOMBRES PREMIERS',
        'PRIME NUMBERS': 'NOMBRES PREMIERS',
        'VALUES ≥ 7': 'VALEURS ≥ 7',
        'Eat anything': 'Mangez tout',
        'Eat EVEN numbers': 'Mangez les nombres PAIRS',
        'Eat ODD numbers': 'Mangez les nombres IMPAIRS',
        'Eat MULTIPLES of 3': 'Mangez les MULTIPLES DE 3',
        'Eat MULTIPLES of 5': 'Mangez les MULTIPLES DE 5',
        'Eat PRIMES': 'Mangez les NOMBRES PREMIERS',
        'Eat in ASCENDING order': 'Mangez dans l’ordre CROISSANT',
        'Eat in DESCENDING order': 'Mangez dans l’ordre DÉCROISSANT',
        'DESTROY IF ODD': 'DÉTRUIRE SI IMPAIR',
        'DESTROY IF EVEN': 'DÉTRUIRE SI PAIR',
        'DESTROY IF MULTIPLE OF 3': 'DÉTRUIRE SI MULTIPLE DE 3',
        'DESTROY IF MULTIPLE OF 4': 'DÉTRUIRE SI MULTIPLE DE 4',
        'DESTROY IF MULTIPLE OF 5': 'DÉTRUIRE SI MULTIPLE DE 5',
        'DESTROY IF PRIME': 'DÉTRUIRE SI PREMIER',
        'DESTROY IF RESULT = 0': 'DÉTRUIRE SI RÉSULTAT = 0',
        'DESTROY IF RESULT > 10': 'DÉTRUIRE SI RÉSULTAT > 10',
        'DESTROY IF RESULT > 20': 'DÉTRUIRE SI RÉSULTAT > 20',
        'DESTROY IF RESULT < 5': 'DÉTRUIRE SI RÉSULTAT < 5',
        'DESTROY IF CONTAINS −': 'DÉTRUIRE SI CONTIENT −',
        'DESTROY IF EXACTLY 2 OPERANDS': 'DÉTRUIRE SI EXACTEMENT 2 OPÉRANDES',
        'DESTROY IF EXACTLY 3 OPERANDS': 'DÉTRUIRE SI EXACTEMENT 3 OPÉRANDES',
        'DESTROY IF ≥4 OPERANDS': 'DÉTRUIRE SI ≥4 OPÉRANDES',
        '1 visit exactly — revisit resets': '1 visite exactement — revisiter réinitialise',
        '1 visit per tile': '1 visite par tuile'
      },
      exact: {
        'Best': 'Meilleur',
        'Best Combo': 'Meilleur combo',
        'PLAY AGAIN': 'REJOUER',
        'out of moves!': 'plus de coups !',
        'NEW NUMBERS!': 'NOUVEAUX NOMBRES !',
        'SHUFFLE!': 'MÉLANGE !',
        'HINT  -1 MOVE': 'INDICE  -1 COUP',
        'EAT': 'MANGEZ',
        'Cleared': 'Éliminés',
        'Defused': 'Désamorcées',
        'Kills': 'Victoires',
        'NO AMMO': 'PLUS DE MUNITIONS',
        'BONUS CITY': 'VILLE BONUS',
        'WRONG!': 'FAUX !',
        'ESCAPED!': 'ÉCHAPPÉE !',
        'DEFUSED!': 'DÉSAMORCÉE !',
        'MOTHERSHIP!': 'VAISSEAU-MÈRE !',
        'OVERLOAD!': 'SURCHARGE !',
        'LANDING…': 'ATTERRISSAGE…',
        'ALL CLEAR — LEVEL COMPLETE': 'TOUT EST FAIT — NIVEAU TERMINÉ',
        'wall!': 'mur !',
        'self bite!': 'mordu vous-même !',
        'shrunk away!': 'rétréci jusqu’au bout !',
        'too many misses!': 'trop de ratés !',
        'too many escapes!': 'trop d’échappées !',
        'base destroyed!': 'base détruite !',
        'Fill in all answer boxes first.': 'Remplissez d’abord toutes les cases de réponse.',
        'No more hints! Try checking your math.': 'Plus d’indices ! Revérifiez vos calculs.'
      }
    },
    es: {
      rules: {
        'EVEN NUMBERS': 'NÚMEROS PARES',
        'ODD NUMBERS': 'NÚMEROS IMPARES',
        'MULTIPLES of 3': 'MÚLTIPLOS DE 3',
        'MULTIPLES of 5': 'MÚLTIPLOS DE 5',
        'MULTIPLES OF 2': 'MÚLTIPLOS DE 2',
        'MULTIPLES OF 3': 'MÚLTIPLOS DE 3',
        'MULTIPLES OF 5': 'MÚLTIPLOS DE 5',
        'PRIMES': 'NÚMEROS PRIMOS',
        'PRIME NUMBERS': 'NÚMEROS PRIMOS',
        'VALUES ≥ 7': 'VALORES ≥ 7',
        'Eat anything': 'Come cualquier cosa',
        'Eat EVEN numbers': 'Come números PARES',
        'Eat ODD numbers': 'Come números IMPARES',
        'Eat MULTIPLES of 3': 'Come MÚLTIPLOS DE 3',
        'Eat MULTIPLES of 5': 'Come MÚLTIPLOS DE 5',
        'Eat PRIMES': 'Come NÚMEROS PRIMOS',
        'Eat in ASCENDING order': 'Come en orden ASCENDENTE',
        'Eat in DESCENDING order': 'Come en orden DESCENDENTE',
        'DESTROY IF ODD': 'DESTRUIR SI IMPAR',
        'DESTROY IF EVEN': 'DESTRUIR SI PAR',
        'DESTROY IF MULTIPLE OF 3': 'DESTRUIR SI MÚLTIPLO DE 3',
        'DESTROY IF MULTIPLE OF 4': 'DESTRUIR SI MÚLTIPLO DE 4',
        'DESTROY IF MULTIPLE OF 5': 'DESTRUIR SI MÚLTIPLO DE 5',
        'DESTROY IF PRIME': 'DESTRUIR SI PRIMO',
        'DESTROY IF RESULT = 0': 'DESTRUIR SI RESULTADO = 0',
        'DESTROY IF RESULT > 10': 'DESTRUIR SI RESULTADO > 10',
        'DESTROY IF RESULT > 20': 'DESTRUIR SI RESULTADO > 20',
        'DESTROY IF RESULT < 5': 'DESTRUIR SI RESULTADO < 5',
        'DESTROY IF CONTAINS −': 'DESTRUIR SI CONTIENE −',
        'DESTROY IF EXACTLY 2 OPERANDS': 'DESTRUIR SI EXACTAMENTE 2 OPERANDOS',
        'DESTROY IF EXACTLY 3 OPERANDS': 'DESTRUIR SI EXACTAMENTE 3 OPERANDOS',
        'DESTROY IF ≥4 OPERANDS': 'DESTRUIR SI ≥4 OPERANDOS',
        '1 visit exactly — revisit resets': '1 visita exacta — revisitar reinicia',
        '1 visit per tile': '1 visita por casilla'
      },
      exact: {
        'Best': 'Mejor',
        'Best Combo': 'Mejor combo',
        'PLAY AGAIN': 'JUGAR DE NUEVO',
        'out of moves!': 'sin movimientos',
        'NEW NUMBERS!': '¡NUEVOS NÚMEROS!',
        'SHUFFLE!': '¡MEZCLA!',
        'HINT  -1 MOVE': 'PISTA  -1 MOVIMIENTO',
        'EAT': 'COME',
        'Cleared': 'Eliminados',
        'Defused': 'Desarmadas',
        'Kills': 'Bajas',
        'NO AMMO': 'SIN MUNICIÓN',
        'BONUS CITY': 'CIUDAD BONUS',
        'WRONG!': '¡INCORRECTO!',
        'ESCAPED!': '¡ESCAPÓ!',
        'DEFUSED!': '¡DESARMADA!',
        'MOTHERSHIP!': '¡NAVE NODRIZA!',
        'OVERLOAD!': '¡SOBRECARGA!',
        'LANDING…': 'ATERRIZANDO…',
        'ALL CLEAR — LEVEL COMPLETE': 'TODO LIMPIO — NIVEL COMPLETADO',
        'wall!': '¡pared!',
        'self bite!': '¡te mordiste!',
        'shrunk away!': '¡te encogiste del todo!',
        'too many misses!': '¡demasiados fallos!',
        'too many escapes!': '¡demasiados escapes!',
        'base destroyed!': '¡base destruida!',
        'Fill in all answer boxes first.': 'Primero rellena todas las casillas de respuesta.',
        'No more hints! Try checking your math.': '¡No quedan pistas! Revisa tus cálculos.'
      }
    }
  };
  const reverse = {};
  for (const locale of Object.keys(map)) {
    for (const [key, value] of Object.entries(map[locale])) reverse[value] = key;
  }

  function baseText(value) {
    return reverse[value] || value;
  }

  function dynamicText(value) {
    const pack = dynamic[lang];
    if (!pack) return null;
    if (pack.exact[value]) return pack.exact[value];
    if (pack.rules[value]) return pack.rules[value];

    let match = value.match(/^(\d+\+\s*)(.+)$/);
    if (match && pack.rules[match[2]]) return match[1] + pack.rules[match[2]];

    match = value.match(/^LEVEL (\d+): (.+)$/);
    if (match) {
      const rule = pack.rules[match[2]] || match[2];
      return lang === 'fr' ? `NIVEAU ${match[1]} : ${rule}` : `NIVEL ${match[1]}: ${rule}`;
    }

    match = value.match(/^LEVEL (\d+) CLEAR\s+\+(\d+)$/);
    if (match) {
      return lang === 'fr' ? `NIVEAU ${match[1]} RÉUSSI  +${match[2]}` : `NIVEL ${match[1]} SUPERADO  +${match[2]}`;
    }

    match = value.match(/^LEVEL (\d+)$/);
    if (match) return lang === 'fr' ? `NIVEAU ${match[1]}` : `NIVEL ${match[1]}`;

    match = value.match(/^LEVEL CLEAR\s+\+(.+)$/);
    if (match) return lang === 'fr' ? `NIVEAU RÉUSSI  +${match[1]}` : `NIVEL SUPERADO  +${match[1]}`;

    match = value.match(/^WAVE (\d+)$/);
    if (match) return lang === 'fr' ? `VAGUE ${match[1]}` : `OLEADA ${match[1]}`;

    match = value.match(/^WAVE (\d+)…$/);
    if (match) return lang === 'fr' ? `VAGUE ${match[1]}…` : `OLEADA ${match[1]}…`;

    match = value.match(/^START WAVE (\d+)$/);
    if (match) return lang === 'fr' ? `LANCER LA VAGUE ${match[1]}` : `INICIAR OLEADA ${match[1]}`;

    match = value.match(/^WAVE CLEAR\s+\+(.+)$/);
    if (match) return lang === 'fr' ? `VAGUE RÉUSSIE  +${match[1]}` : `OLEADA SUPERADA  +${match[1]}`;

    match = value.match(/^WAVE (\d+) CLEAR\s+\+(.+)$/);
    if (match) return lang === 'fr' ? `VAGUE ${match[1]} RÉUSSIE  +${match[2]}` : `OLEADA ${match[1]} SUPERADA  +${match[2]}`;

    match = value.match(/^COMBO ×(\d+)!$/);
    if (match) return lang === 'fr' ? `COMBO ×${match[1]} !` : `¡COMBO ×${match[1]}!`;

    match = value.match(/^SPLASH x(\d+)!$/);
    if (match) return lang === 'fr' ? `ÉCRASÉ x${match[1]} !` : `¡APLASTADO x${match[1]}!`;

    match = value.match(/^MISS −(.+)$/);
    if (match) return lang === 'fr' ? `RATÉ −${match[1]}` : `FALLO −${match[1]}`;

    match = value.match(/^SPEED UP! (.+)$/);
    if (match) return lang === 'fr' ? `VITESSE + ! ${match[1]}` : `¡MÁS VELOCIDAD! ${match[1]}`;

    match = value.match(/^NEW RULE: (.+)$/);
    if (match) {
      const rule = pack.rules[match[1]] || match[1];
      return lang === 'fr' ? `NOUVELLE RÈGLE : ${rule}` : `NUEVA REGLA: ${rule}`;
    }

    match = value.match(/^EAT (\d+) MORE!$/);
    if (match) return lang === 'fr' ? `ENCORE ${match[1]} !` : `¡COME ${match[1]} MÁS!`;

    match = value.match(/^EAT (.+)$/);
    if (match) {
      const rule = pack.rules[match[1]] || match[1];
      return lang === 'fr' ? `MANGEZ ${rule}` : `COME ${rule}`;
    }

    match = value.match(/^food (\d+)\/(\d+)\s+·\s+combo ×(\d+)$/);
    if (match) {
      return lang === 'fr'
        ? `repas ${match[1]}/${match[2]}  ·  combo ×${match[3]}`
        : `comida ${match[1]}/${match[2]}  ·  combo ×${match[3]}`;
    }

    match = value.match(/^combo ×(\d+)\s+·\s+best ×(\d+)$/);
    if (match) {
      return lang === 'fr'
        ? `combo ×${match[1]}  ·  meilleur ×${match[2]}`
        : `combo ×${match[1]}  ·  mejor ×${match[2]}`;
    }

    match = value.match(/^L(\d+): (.+)$/);
    if (match) {
      const rule = pack.rules[match[2]] || match[2];
      return lang === 'fr' ? `N${match[1]} : ${rule}` : `N${match[1]}: ${rule}`;
    }

    match = value.match(/^(\d+) visits exactly — revisit resets$/);
    if (match) {
      return lang === 'fr'
        ? `${match[1]} visites exactement — revisiter réinitialise`
        : `${match[1]} visitas exactas — revisitar reinicia`;
    }

    match = value.match(/^(\d+) visits per tile$/);
    if (match) {
      return lang === 'fr' ? `${match[1]} visites par tuile` : `${match[1]} visitas por casilla`;
    }

    match = value.match(/^(\d+)\/(\d+) eaten$/);
    if (match) return lang === 'fr' ? `${match[1]}/${match[2]} mangés` : `${match[1]}/${match[2]} comidos`;

    match = value.match(/^level (\d+) clear$/);
    if (match) return lang === 'fr' ? `niveau ${match[1]} réussi` : `nivel ${match[1]} superado`;

    match = value.match(/^Not quite — check (.+)\.$/);
    if (match) return lang === 'fr' ? `Pas tout à fait — vérifiez ${match[1]}.` : `Casi — revisa ${match[1]}.`;

    return null;
  }

  function tr(value) {
    if (!value || lang === 'en') return baseText(value);
    const key = baseText(value);
    return dict[key] || dynamicText(key) || key;
  }

  window.MathArcadeI18n = { lang, t: tr };

  if (window.CanvasRenderingContext2D) {
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      const translated = typeof text === 'string' ? tr(text) : text;
      if (arguments.length >= 4) return originalFillText.call(this, translated, x, y, maxWidth);
      return originalFillText.call(this, translated, x, y);
    };
    CanvasRenderingContext2D.prototype.strokeText = function (text, x, y, maxWidth) {
      const translated = typeof text === 'string' ? tr(text) : text;
      if (arguments.length >= 4) return originalStrokeText.call(this, translated, x, y, maxWidth);
      return originalStrokeText.call(this, translated, x, y);
    };
  }

  function translateTextNode(node) {
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const translated = tr(trimmed);
    if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
  }

  function translateElement(el) {
    if (!el || el.nodeType !== 1 || el.closest('.lang-switcher')) return;
    const key = el.getAttribute('data-i18n');
    if (key) {
      const translated = tr(key);
      if (translated !== key && el.innerHTML !== translated) el.innerHTML = translated;
      return;
    }
    if (el.childNodes.length && Array.from(el.childNodes).some((child) => child.nodeType === 1)) {
      const html = el.innerHTML.trim().replace(/\s+/g, ' ');
      const translated = tr(html);
      if (translated !== html) {
        el.innerHTML = translated;
        return;
      }
    }
    for (const attr of ['title', 'aria-label']) {
      if (el.hasAttribute(attr)) el.setAttribute(attr, tr(el.getAttribute(attr)));
    }
    for (const node of el.childNodes) {
      if (node.nodeType === 3) translateTextNode(node);
      else if (node.nodeType === 1) translateElement(node);
    }
  }

  function updateLinks() {
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href === 'LICENSE') return;
      const url = new URL(href, window.location.href);
      if (lang === 'en') url.searchParams.delete('lang');
      else url.searchParams.set('lang', lang);
      a.setAttribute('href', url.pathname.split('/').pop() === '' ? url.pathname + url.search : url.pathname.replace(location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1), '') + url.search);
    });
  }

  function addSwitcher() {
    if (document.querySelector('.lang-switcher')) return;
    const style = document.createElement('style');
    style.textContent = '.lang-switcher{position:fixed;right:14px;bottom:14px;z-index:9999;display:flex;gap:4px;padding:5px;background:rgba(5,6,20,.78);border:2px solid rgba(255,244,220,.75);border-radius:999px;box-shadow:0 4px 0 rgba(0,0,0,.45);font-family:Fredoka,Arial,sans-serif}.lang-switcher button{border:0;border-radius:999px;padding:6px 9px;background:transparent;color:#fff4dc;font-weight:800;font-size:12px;letter-spacing:.04em;cursor:pointer}.lang-switcher button.active{background:#ffd24d;color:#0a0e1e}.lang-switcher button:focus-visible{outline:2px solid #7ad1ff;outline-offset:2px}';
    document.head.appendChild(style);
    const wrap = document.createElement('div');
    wrap.className = 'lang-switcher';
    wrap.setAttribute('aria-label', 'Language');
    for (const code of supported) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = code.toUpperCase();
      btn.className = code === lang ? 'active' : '';
      btn.addEventListener('click', () => {
        localStorage.setItem('mathArcadeLang', code);
        const url = new URL(window.location.href);
        if (code === 'en') url.searchParams.delete('lang');
        else url.searchParams.set('lang', code);
        window.location.href = url.toString();
      });
      wrap.appendChild(btn);
    }
    document.body.appendChild(wrap);
  }

  let translating = false;
  function applyTranslations() {
    if (translating) return;
    translating = true;
    document.title = tr(document.title);
    translateElement(document.body);
    updateLinks();
    translating = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    addSwitcher();
    applyTranslations();
    const observer = new MutationObserver(() => applyTranslations());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
