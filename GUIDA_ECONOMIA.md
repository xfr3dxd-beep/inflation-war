# 💰 Guida all'Economia — Inflation War

> Questa guida spiega nel dettaglio come funzionano i prezzi, l'inflazione e il sistema economico di Inflation War. Usala come riferimento durante i match per pianificare la spesa del tuo team.

---

## Come Leggere le Tabelle

| Colonna | Significato |
|---------|-------------|
| **Prezzo Base** | Il costo della prima unità acquistata nel team |
| **Inflazione** | Come cambia il prezzo ad ogni acquisto successivo nel team |
| **Tasso** | Il valore numerico dell'inflazione (quanto aumenta) |
| **Soglia** | Se presente, le prime N unità costano il prezzo base prima che l'inflazione inizi |
| **Spazio** | Housing space occupato nell'esercito |

### Tipi di Inflazione

- **🔒 Fisso** — Il prezzo non cambia mai. La 1ª, 2ª, 10ª unità costano tutte uguale.
- **📈 Lineare** — Ogni unità successiva costa un po' di più: `Prezzo Base + (N × Tasso)`, dove N = numero di unità già comprate nel team.
- **📈📈 Esponenziale** — Ogni unità successiva costa molto di più: `Prezzo Base × Tasso^N`. Il prezzo esplode rapidamente.

> ⚠️ L'inflazione conta gli acquisti di **tutto il team**, non solo i tuoi personali. Coordinatevi!

---

## 🗡️ Truppe (Troop)

Le truppe sono la base del vostro esercito. **Limite: 352 housing space** per giocatore.

### Truppe a Prezzo Fisso
Queste truppe costano sempre lo stesso, indipendentemente da quante ne compra il team.

| Truppa | 💰 Prezzo | Spazio | Note |
|--------|-----------|--------|------|
| Barbarian | 1 | 1 | — |
| Archer | 1 | 1 | — |
| Goblin | 1 | 1 | — |
| Wall Breaker | 1 | 2 | — |
| Minion | 2 | 2 | — |
| Wizard | 2 | 4 | — |
| Bowler | 3 | 6 | — |
| Giant | 3 | 5 | — |
| Headhunter | 3 | 6 | — |
| Hog Rider | 3 | 5 | — |
| Miner | 3 | 6 | — |
| Balloon | 5 | 5 | — |
| Golem | 5 | 30 | — |
| P.E.K.K.A | 6 | 25 | — |
| Baby Dragon | 6 | 10 | — |
| Healer | 7 | 14 | — |
| Ice Golem | 7 | 15 | — |

### Truppe con Inflazione
Queste truppe diventano più costose ad ogni acquisto del team.

| Truppa | 💰 Base | Tipo Inflazione | Tasso | Soglia | Spazio | Esempi Prezzo (1°→2°→3°→4°) |
|--------|---------|-----------------|-------|--------|--------|----------------------------|
| Valkyrie | 3 | 📈 Lineare | +1 | — | 8 | 3 → 4 → 5 → 6 |
| Dragon | 4 | 📈 Lineare | +2 | — | 20 | 4 → 6 → 8 → 10 |
| Root Rider | 4 | 📈 Lineare | +2 | — | 20 | 4 → 6 → 8 → 10 |
| Lava Hound | 5 | 📈 Lineare | +3 | — | 30 | 5 → 8 → 11 → 14 |
| Witch | 5 | 📈 Lineare | +1 | — | 12 | 5 → 6 → 7 → 8 |
| Yeti | 5 | 📈 Lineare | +2 | — | 18 | 5 → 7 → 9 → 11 |
| Druid | 7 | 📈 Lineare | +1 | — | 16 | 7 → 8 → 9 → 10 |
| Electro Titan | 8 | 📈 Lineare | +2 | — | 32 | 8 → 10 → 12 → 14 |
| Furnace | 9 | 📈 Lineare | +1 | — | 18 | 9 → 10 → 11 → 12 |
| Apprentice Warden | 10 | 📈 Lineare | +4 | — | 20 | 10 → 14 → 18 → 22 |
| Thrower | 3 | 📈 Lineare | +4 | ⏳ 1 | 16 | 3 → **3** → 7 → 11 |
| Dragon Rider | 3 | 📈 Lineare | +4 | ⏳ 2 | 25 | 3 → 3 → **3** → 7 |
| Electro Dragon | 6 | 📈 Lineare | +3 | ⏳ 2 | 30 | 6 → 6 → **6** → 9 |
| Meteor Golem | 10 | 📈 Lineare | +8 | ⏳ 1 | 40 | 10 → **10** → 18 → 26 |

> Le truppe con il simbolo ⏳ hanno inflazione ritardata: le prime unità (fino alla soglia) costano il prezzo base.

---

## 💎 Super Truppe (Super Troop)

Le super truppe sono versioni potenziate. Seguono le stesse regole di spazio delle truppe normali (**352 housing space** condivisi).

### Super Truppe a Prezzo Fisso

| Super Truppa | 💰 Prezzo | Spazio |
|-------------|-----------|--------|
| Sneaky Goblin | 3 | 3 |
| Super Giant | 4 | 10 |
| Super Minion | 4 | 12 |
| Super Wizard | 4 | 10 |
| Super Hog Rider | 5 | 12 |
| Super Miner | 6 | 24 |
| Ice Hound | 7 | 40 |

### Super Truppe con Inflazione

| Super Truppa | 💰 Base | Tipo | Tasso | Soglia | Spazio | Esempi Prezzo |
|-------------|---------|------|-------|--------|--------|---------------|
| Super Barbarian | 3 | 📈 Lineare | +1 | — | 5 | 3 → 4 → 5 → 6 |
| Super Valkyrie | 4 | 📈 Lineare | +1 | — | 20 | 4 → 5 → 6 → 7 |
| Super Archer | 4 | 📈 Lineare | +1 | — | 12 | 4 → 5 → 6 → 7 |
| Inferno Dragon | 5 | 📈 Lineare | +1 | — | 15 | 5 → 6 → 7 → 8 |
| Super Dragon | 8 | 📈 Lineare | +3 | — | 40 | 8 → 11 → 14 → 17 |
| Super Witch | 8 | 📈 Lineare | +5 | — | 40 | 8 → 13 → 18 → 23 |
| Super Bowler | 9 | 📈 Lineare | +5 | — | 30 | 9 → 14 → 19 → 24 |
| Super Yeti | 10 | 📈 Lineare | +5 | — | 35 | 10 → 15 → 20 → 25 |
| Rocket Balloon | 3 | 📈 Lineare | +1 | ⏳ 2 | 8 | 3 → 3 → **3** → 4 |
| Super Wall Breaker | 3 | 📈 Lineare | +2 | ⏳ 1 | 8 | 3 → **3** → 5 → 7 |

---

## 🔮 Incantesimi (Spell)

**Limite: 11 housing space** per giocatore. Ogni incantesimo occupa da 1 a 3 spazi.

### Incantesimi a Prezzo Fisso

| Incantesimo | 💰 Prezzo | Spazio |
|------------|-----------|--------|
| Bat Spell | 5 | 1 |
| Haste Spell | 5 | 1 |

### Incantesimi con Inflazione

| Incantesimo | 💰 Base | Tasso | Soglia | Spazio | Esempi Prezzo |
|------------|---------|-------|--------|--------|---------------|
| Ice Block Spell | 5 | +1 | — | 1 | 5 → 6 → 7 → 8 |
| Invisibility Spell | 5 | +1 | — | 1 | 5 → 6 → 7 → 8 |
| Lightning Spell | 5 | +1 | — | 1 | 5 → 6 → 7 → 8 |
| Poison Spell | 5 | +1 | — | 1 | 5 → 6 → 7 → 8 |
| Freeze Spell | 5 | +2 | — | 1 | 5 → 7 → 9 → 11 |
| Totem Spell | 5 | +2 | — | 1 | 5 → 7 → 9 → 11 |
| Skeleton Spell | 5 | +2 | ⏳ 1 | 1 | 5 → **5** → 7 → 9 |
| Earthquake Spell | 5 | +2 | ⏳ 2 | 1 | 5 → 5 → **5** → 7 |
| Rage Spell | 10 | +1 | ⏳ 2 | 2 | 10 → 10 → **10** → 11 |
| Healing Spell | 10 | +2 | — | 2 | 10 → 12 → 14 → 16 |
| Jump Spell | 10 | +1 | — | 2 | 10 → 11 → 12 → 13 |
| Overgrowth Spell | 10 | +5 | — | 2 | 10 → 15 → 20 → 25 |
| Recall Spell | 10 | +5 | — | 2 | 10 → 15 → 20 → 25 |
| Revive Spell | 10 | +6 | — | 2 | 10 → 16 → 22 → 28 |
| Clone Spell | 10 | +8 | — | 3 | 10 → 18 → 26 → 34 |

> Tutti gli incantesimi con inflazione usano il modello **lineare**.

---

## 🏰 Macchine d'Assedio (Siege)

**Limite: 3 housing space** per giocatore. Ogni macchina occupa 1 spazio.

### A Prezzo Base 5

| Macchina | 💰 Base | Tipo | Tasso | Esempi Prezzo |
|----------|---------|------|-------|---------------|
| Wall Wrecker | 5 | 📈 Lineare | +2 | 5 → 7 → 9 → 11 |
| Stone Slammer | 5 | 📈 Lineare | +2 | 5 → 7 → 9 → 11 |
| Battle Drill | 5 | 📈 Lineare | +2 | 5 → 7 → 9 → 11 |
| Battle Blimp | 5 | 📈📈 Esponenziale | ×2 | 5 → 10 → 20 → 40 |

### A Prezzo Base 10

| Macchina | 💰 Base | Tipo | Tasso | Esempi Prezzo |
|----------|---------|------|-------|---------------|
| Flame Flinger | 10 | 📈📈 Esponenziale | ×3 | 10 → 30 → 90 → 270 |
| Log Launcher | 10 | 📈📈 Esponenziale | ×4 | 10 → 40 → 160 → 640 |
| Siege Barracks | 10 | 📈📈 Esponenziale | ×4 | 10 → 40 → 160 → 640 |
| Troop Launcher | 10 | 📈📈 Esponenziale | ×4 | 10 → 40 → 160 → 640 |

> ⚠️ Le macchine a inflazione esponenziale diventano **estremamente costose** dopo il 2° acquisto nel team. Pianificate con attenzione!

---

## ⚔️ Equipaggiamento Eroe (Equipment)

L'equipaggiamento si assegna agli eroi. Ogni giocatore può avere **massimo 2 equipaggiamenti per eroe** e **non può comprare lo stesso equipaggiamento due volte**. L'inflazione si calcola a livello di team.

### Legenda Eroi
| Sigla | Eroe |
|-------|------|
| BK | Barbarian King |
| AQ | Archer Queen |
| GW | Grand Warden |
| RC | Royal Champion |
| MP | Minion Prince |
| DD | Drago |

### Equipaggiamenti a Prezzo Fisso (💰 5 — Non inflazionano)

| Equipaggiamento | Eroe |
|----------------|------|
| Barbarian Puppet | BK |
| Vampstache | BK |
| Archer Puppet | AQ |

### Equipaggiamenti Base 5 — Inflazione Esponenziale (×2)
Il prezzo raddoppia ad ogni acquisto nel team: 5 → 10 → 20 → 40...

| Equipaggiamento | Eroe |
|----------------|------|
| Earthquake Boots | BK |
| Giant Gauntlet | BK |
| Rage Vial | BK |
| Frozen Arrow | AQ |
| Giant Arrow | AQ |
| Healer Puppet | AQ |
| Healing Tome | GW |
| Heroic Torch | GW |
| Haste Vial | RC |
| Seeking Shield | RC |
| Noble Iron | MP |

### Equipaggiamento Base 5 — Inflazione Esponenziale (×3)

| Equipaggiamento | Eroe | Esempi Prezzo |
|----------------|------|---------------|
| Stick Horse | BK | 5 → 15 → 45 → 135 |

### Equipaggiamenti Base 5 — Inflazione Lineare (+2)

| Equipaggiamento | Eroe | Esempi Prezzo |
|----------------|------|---------------|
| Hog Rider Doll | RC | 5 → 7 → 9 → 11 |
| Invisibility Vial | AQ | 5 → 7 → 9 → 11 |
| Lavaloon Puppet | GW | 5 → 7 → 9 → 11 |
| Royal Gem | RC | 5 → 7 → 9 → 11 |

### Equipaggiamenti Base 10 — Inflazione Esponenziale (×4)
Il prezzo si quadruplica: 10 → 40 → 160 → 640...

| Equipaggiamento | Eroe |
|----------------|------|
| Action Figure | AQ |
| Magic Mirror | AQ |
| Electro Boots | RC |
| Rocket Spear | RC |
| Eternal Tome | GW |
| Fireball | GW |
| Rage Gem | GW |
| Snake Bracelet | BK |
| Spiky Ball | BK |
| Dark Orb | MP |
| Meteor Staff | MP |

### Equipaggiamenti Base 10 — Inflazione Esponenziale (×3)

| Equipaggiamento | Eroe | Esempi Prezzo |
|----------------|------|---------------|
| Dark Crown | MP | 10 → 30 → 90 → 270 |
| Henchman | MP | 10 → 30 → 90 → 270 |
| Life Gem | GW | 10 → 30 → 90 → 270 |
| Metal Pants | MP | 10 → 30 → 90 → 270 |
| Snow Flake | RC | 10 → 30 → 90 → 270 |

### Equipaggiamenti Drago (DD) — Base 35 — Inflazione Lineare

| Equipaggiamento | Tasso | Esempi Prezzo |
|----------------|-------|---------------|
| Fire Heart | +12 | 35 → 47 → 59 → 71 |
| Flame Breath | +12 | 35 → 47 → 59 → 71 |
| Stun Blast | +10 | 35 → 45 → 55 → 65 |

---

## 🐾 Pet (Animali degli Eroi)

I Pet sono **completamente gratuiti** (💰 0 Gold) ma hanno regole speciali:
- Ogni giocatore può avere **1 solo pet per eroe**.
- **Non puoi comprare lo stesso pet due volte** sullo stesso giocatore.
- Quando compri un pet, devi scegliere **a quale eroe assegnarlo**.
- I pet **non possono** essere messi nel Clan Castle.

| Pet |
|-----|
| Angry Jelly |
| Diggy |
| Electro Owl |
| Frosty |
| Greedy Raven |
| L.A.S.S.I |
| Mighty Yak |
| Phoenix |
| Poison Lizard |
| Sneezy |
| Spirit Fox |
| Unicorn |

---

## 📊 Consigli Strategici

### 💡 Gestione del Budget
1. **Comunicatevi** — Con soli 100 Gold per 3 giocatori, ogni acquisto conta. Discutete la strategia prima di spendere.
2. **Diversificate** — L'inflazione punisce chi compra le stesse unità. Se tutti vogliono il Dragon, il 3° costerà tantissimo.
3. **Attenzione all'esponenziale** — Le macchine d'assedio e molti equipaggiamenti hanno inflazione esponenziale. Il 2° acquisto è gestibile, il 3° è devastante.
4. **Sfruttate i prezzi fissi** — Truppe come Barbarian, Archer, Golem, P.E.K.K.A costano sempre uguale. Usatele per riempire spazio a costo prevedibile.
5. **Usate il CC** — Il Clan Castle è gratis! Riempitelo sempre (55 truppe + 4 spell).
6. **Sfruttate le soglie** — Oggetti con inflazione ritardata (⏳) sono un'opportunità: le prime unità costano poco.

### 🧮 Calcolo Rapido

**Inflazione Lineare:**
> Prezzo N-esimo = Prezzo Base + (N × Tasso)
> dove N = numero di unità già comprate nel team (partendo da 0)

**Inflazione Esponenziale:**
> Prezzo N-esimo = Prezzo Base × Tasso^N
> dove N = numero di unità già comprate nel team (partendo da 0)

**Con Soglia di Ritardo:**
> Se il team ha comprato meno unità della soglia, il prezzo è quello base.
> L'inflazione inizia solo dopo aver superato la soglia.

---

> *Ultimo aggiornamento: Marzo 2026*
> *Tutti i prezzi e le formule sono visibili in tempo reale sul sito durante i match.*
