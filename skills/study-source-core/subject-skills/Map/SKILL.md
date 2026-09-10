---
name: map-study
description: Subject-specific Mapping & Cartography layer for study-source-core. Defines Map knowledge architecture (12 Domain DNA types, Dual-Theatre Framework for World Map & Indian Map), 7-step spatial thinking flow, coordinate/perimeter/directional models, river basin confluences, protected area overlays, strategic chokepoints, 12 cartographic error categories, conditional performance outputs, and domain audit checks.
---

# Map & Cartography Subject Skill (`map-study`)

## 1. Subject Mission & Core Inheritance

`map-study` is the specialized Mapping, Cartography, and Spatial Geography domain layer for `study-source-core`.

This Skill inherits all universal rules, source boundary policy, source execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation from `study-source-core`.

This document defines ONLY the subject-specific knowledge architecture, memory selection logic, performance architecture, domain audit rules, visual learning grammar, and conditional output contracts for Map Study.

### Primary Objective
Mapping is a **SPATIAL ANCHOR + DIRECTIONAL SEQUENCE + PERIMETER TOPOLOGY + HYDROGRAPHIC DRAINAGE + STRATEGIC CHOKEPOINT + MULTI-LAYER OVERLAY** discipline. The central goal is NOT "memorize disconnected location names", but:  
`Anchor Coordinates / Grids → Frame Spatial Bounding Box → Sequence Directional Orders (N/S/E/W) → Trace Perimeter Adjacencies → Map Hydrographic Confluences → Overlay Conservation & Strategic Assets → Eliminate Examiner Traps`

> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from `study-source-core`. Do not duplicate core definitions here.*

---

## 2. Map Knowledge Architecture (12 Domain DNA Types)

Categorize all source content into 12 Domain DNA Types:

1. **Coordinate & Grid DNA**: Latitudinal/Longitudinal positions, Equator ($0^\circ$), Tropics ($23.5^\circ\text{ N/S}$), Prime Meridian ($0^\circ$), Indian Standard Meridian ($82.5^\circ\text{ E}$), Arctic/Antarctic circles, antipodes, timezone offsets.
2. **Border & Perimeter Adjacency DNA**: Landlocked / double-landlocked countries, enclaves/exclaves, borderline treaties (Radcliffe, McMahon, Durand, $38^{\text{th}}$ / $49^{\text{th}}$ Parallel, Blue Line, Line of Control, LAC), clockwise/counter-clockwise perimeter scans.
3. **Directional & Spatial Ordering DNA**: Linear directional sequences ($\text{North}\to\text{South}, \text{South}\to\text{North}, \text{West}\to\text{East}, \text{East}\to\text{West}$) of mountain peaks, passes, rivers, islands, ports, and national parks.
4. **Physiographic / Geomorphic Relief DNA**: Mountain ranges, peaks, passes (La / Ghats), plateaus, valleys, plains, deserts, trenches, rift valleys, volcanic zones (Ring of Fire).
5. **Hydrographic & Drainage DNA**: River origins, courses, left vs right bank tributaries, confluences (Prayags), waterfalls, dams/multipurpose projects, deltas/estuaries, transboundary paths.
6. **Maritime, Coastal & Chokepoint DNA**: Straits, channels, gulfs, bays, marginal seas, canals (Suez, Panama, Kiel, Kra), maritime chokepoints (Malacca, Hormuz, Bab-el-Mandeb, Bosphorus, Gibraltar), ocean currents (warm/cold).
7. **Ecological & Conservation Site DNA**: National Parks, Tiger Reserves, Biosphere Reserves, Ramsar Wetland Sites, Wildlife Corridors, UNESCO World Natural Heritage Sites, Coral Reefs, Mangroves.
8. **Resource, Industrial & Infrastructure DNA**: Mineral belts, oil/gas basins, coalfields, nuclear power plants, major ports, freight corridors (DFC), national waterways, industrial nodes.
9. **Geopolitical & Strategic Hotspot DNA**: Disputed territories, international water treaties (Indus Waters Treaty, Mekong Agreement), strategic naval bases, geopolitical flashpoints, "Places in News".
10. **Urban, Capital & Cultural Geography DNA**: Capital cities, relative latitude/longitude alignments, ancient trade routes (Silk Road, Uttarapath, Dakshinapatha), tribal habitats, GI tag clusters.
11. **Cartographic Anomaly & Spatial Exception DNA**: Transcontinental countries (Turkey, Russia, Egypt), rivers crossing equator/tropics twice (Congo, Limpopo, Mahi), unique rift valley drainage (Narmada, Tapi, Jordan River), unique channel coordinates ($8^\circ, 9^\circ, 10^\circ$ Channels).
12. **Thematic / Synthetic Overlay DNA**: Multi-variable spatial intersections (e.g. *River course $\cap$ Mountain pass $\cap$ National Park $\cap$ State boundary*).

---

## 3. Dual-Theatre Cartographic Framework (World & Indian Map)

Treat both theatres with their specialized spatial structures:

### A. Indian Mapping Engine (भारत का मानचित्र अध्ययन)

#### 1. Physiographic & Relief Architecture
- **Himalayas (North-to-South & West-to-East)**:
  - *Parallel Ranges (N to S)*: Trans-Himalayas (Karakoram $\to$ Ladakh $\to$ Zaskar) $\to$ Greater Himalayas (Himadri) $\to$ Lesser Himalayas (Pir Panjal, Dhauladhar, Mussoorie, Nag Tibba, Mahabharat) $\to$ Outer Himalayas (Shiwaliks) $\to$ Purvanchal (Patkai Bum, Naga Hills, Manipur Hills, Mizo/Lushai Hills, Garo-Khasi-Jaintia).
  - *Key Himalayan Passes*:
    - **J&K / Ladakh**: Burzil, Zoji La, Banihal, Khardung La, Chang La, Photu La.
    - **Himachal Pradesh**: Rohtang, Shipki La (Sutlej entry), Bara-lacha La.
    - **Uttarakhand**: Lipulekh, Mana Pass, Niti Pass, Muling La.
    - **Sikkim**: Nathu La, Jelep La (Chumbi Valley route).
    - **Arunachal Pradesh**: Bomdi La, Diphu Pass, Dihang Pass, Pangsau Pass.
- **Peninsular Ranges & Passes**:
  - *Ranges (N to S)*: Aravali (Guru Shikhar) $\to$ Vindhya $\to$ Satpura (Dhupgarh) $\to$ Ajanta $\to$ Balaghat $\to$ Western Ghats (Sahyadri - Anamudi, Doddabetta) $\to$ Eastern Ghats (Jindhagada, Mahendragiri) $\to$ Nilgiris $\to$ Anaimalai $\to$ Cardamom Hills.
  - *Peninsular Passes (Ghats N to S)*: Thal Ghat (Mumbai-Nashik), Bhor Ghat (Mumbai-Pune), Pal Ghat (Kochi-Coimbatore / Nilgiri-Anaimalai gap), Shencottah Gap (Kollam-Madurai / Anaimalai-Cardamom gap).
- **Islands & Coastal Channels**:
  - Andaman & Nicobar: North Andaman (Saddle Peak) $\to$ Middle $\to$ South (Port Blair) $\to$ *Duncan Passage* $\to$ Little Andaman $\to$ **$10^\circ$ Channel** $\to$ Car Nicobar $\to$ Great Nicobar (Indira Point / $6^\circ 45'\text{ N}$) $\to$ *Grand Channel* $\to$ Sumatra (Indonesia).
  - Lakshadweep: Amindivi $\to$ Cannanore $\to$ **$9^\circ$ Channel** $\to$ Minicoy $\to$ **$8^\circ$ Channel** $\to$ Maldives.
  - *Coco Channel*: North Andaman & Coco Islands (Myanmar).
  - *Palk Strait / Adam's Bridge (Ram Setu)*: Tamil Nadu (India) & Jaffna Peninsula (Sri Lanka).

#### 2. Drainage & Hydrographic Architecture
- **Indus River System**: Indus (Mansarovar / Bokhar Chu) $\to$ Jhelum (Verinag) $\to$ Chenab (Bara-lacha La / Chandra+Bhaga) $\to$ Ravi (Rohtang) $\to$ Beas (Beas Kund) $\to$ Satluj (Rakas Lake).
- **Ganga River System & Panch Prayag**:
  - *Panch Prayag (Downstream order on Alaknanda)*:
    1. **Vishnuprayag**: Alaknanda + Dhauliganga
    2. **Nandaprayag**: Alaknanda + Nandakini
    3. **Karnaprayag**: Alaknanda + Pindar
    4. **Rudraprayag**: Alaknanda + Mandakini
    5. **Devprayag**: Alaknanda + Bhagirathi $\implies$ **Ganga**
  - *Left Bank Tributaries (W to E)*: Ramganga $\to$ Gomti $\to$ Ghaghara $\to$ Gandak $\to$ Kosi $\to$ Mahananda.
  - *Right Bank Tributaries*: Yamuna (Chambal, Sindh, Betwa, Ken), Son, Damodar.
- **Brahmaputra System**: Yarlung Tsangpo (Angsi Glacier) $\to$ Namcha Barwa U-turn $\to$ Siang/Dihang $\to$ Confluence with Dibang & Lohit (Assam Entry) $\to$ Majuli Island $\to$ Subansiri, Manas, Teesta $\to$ Jamuna (Bangladesh).
- **Peninsular East-Flowing Rivers (North to South)**: Subarnarekha $\to$ Baitarani $\to$ Brahmani $\to$ Mahanadi $\to$ Rushikulya $\to$ Godavari $\to$ Krishna $\to$ Pennar $\to$ Palar $\to$ Cauvery $\to$ Vaigai $\to$ Tamraparni.
- **Peninsular West-Flowing Rivers (North to South)**: Luni $\to$ Sabarmati $\to$ Mahi $\to$ Narmada (Amarkantak) $\to$ Tapi (Multai) $\to$ Mandovi $\to$ Zuari $\to$ Sharavati (Jog Falls) $\to$ Bharatapuzha $\to$ Periyar $\to$ Pamba.

#### 3. Political, Border & Latitudinal Alignments
- **Tropic of Cancer ($23.5^\circ\text{ N}$)**: 8 States (West to East): **Gujarat $\to$ Rajasthan $\to$ Madhya Pradesh $\to$ Chhattisgarh $\to$ Jharkhand $\to$ West Bengal $\to$ Tripura $\to$ Mizoram**.
- **Indian Standard Meridian ($82^\circ 30'\text{ E}$)**: 5 States (North to South): **Uttar Pradesh $\to$ Madhya Pradesh $\to$ Chhattisgarh $\to$ Odisha $\to$ Andhra Pradesh**.
- *Intersection Point*: Surajpur / Koriya (Chhattisgarh).
- **International Land Border Lengths (Decreasing Order)**: Bangladesh ($4,096.7\text{ km}$) $\to$ China ($3,488\text{ km}$) $\to$ Pakistan ($3,323\text{ km}$) $\to$ Nepal ($1,751\text{ km}$) $\to$ Myanmar ($1,643\text{ km}$) $\to$ Bhutan ($699\text{ km}$) $\to$ Afghanistan ($106\text{ km}$).
- **State Neighbor Matrices**:
  - States touching Bangladesh (5): WB, Assam, Meghalaya, Tripura, Mizoram.
  - States touching Myanmar (4): Arunachal Pradesh, Nagaland, Manipur, Mizoram.
  - States touching China (4 States + 1 UT): Ladakh (UT), HP, Uttarakhand, Sikkim, Arunachal Pradesh.
  - States touching Nepal (5): Uttarakhand, UP, Bihar, WB, Sikkim.
  - States touching Bhutan (4): Sikkim, WB, Assam, Arunachal Pradesh.

#### 4. Protected Areas & Infrastructure Overlays
- **Major National Parks / Tiger Reserves / Biosphere Reserves**: Mapped strictly to *State + Mountain Range + Associated River* (e.g. Jim Corbett $\leftrightarrow$ Ramganga; Kaziranga $\leftrightarrow$ Brahmaputra; Silent Valley $\leftrightarrow$ Kunthi River / Nilgiris; Keoladeo $\leftrightarrow$ Gambhir & Banganga).
- **Major Ports (N to S)**:
  - *West Coast*: Kandla (Deendayal) $\to$ Mumbai $\to$ JNPT (Nhava Sheva) $\to$ Mormugao $\to$ New Mangalore $\to$ Cochin.
  - *East Coast*: Kolkata / Haldia $\to$ Paradip $\to$ Visakhapatnam $\to$ Ennore (Kamarajar) $\to$ Chennai $\to$ VO Chidambaranar (Tuticorin).

---

### B. World Mapping Engine (विश्व का मानचित्र अध्ययन)

#### 1. Global Reference Grids & Passing Countries
- **Equator ($0^\circ$) - 13 Countries**:
  - *South America (3)*: Ecuador, Colombia, Brazil.
  - *Africa (7)*: Sao Tome & Principe, Gabon, Republic of the Congo, Democratic Republic of the Congo (DRC), Uganda, Kenya, Somalia.
  - *Asia / Oceania (3)*: Maldives, Indonesia, Kiribati.
  - *Water bodies crossed*: Pacific Ocean, Atlantic Ocean, Indian Ocean.
- **Tropic of Cancer ($23.5^\circ\text{ N}$) - 16 Countries**:
  - *North America (2)*: Mexico, Bahamas.
  - *Africa (7)*: Western Sahara, Mauritania, Mali, Algeria, Niger, Libya, Egypt.
  - *Asia (7)*: Saudi Arabia, UAE, Oman, India, Bangladesh, Myanmar, China, Taiwan (disputed/island).
- **Tropic of Capricorn ($23.5^\circ\text{ S}$) - 10 Countries**:
  - *South America (4)*: Chile, Argentina, Paraguay, Brazil (Note: Brazil is crossed by both Equator & Tropic of Capricorn).
  - *Africa (5)*: Namibia, Botswana, South Africa, Mozambique, Madagascar.
  - *Oceania (1)*: Australia.
- **Prime Meridian ($0^\circ\text{ Longitude}$) - 8 Countries**:
  - *Europe (3)*: United Kingdom, France, Spain.
  - *Africa (5)*: Algeria, Mali, Burkina Faso, Togo, Ghana.
  - *Intersection of Equator & Prime Meridian*: Gulf of Guinea (Atlantic Ocean).

#### 2. Marginal Seas & Perimeter Neighbor Scans (Clockwise / Counter-Clockwise)
- **Black Sea**: Surrounded by 6 countries (**ROBUGE / Turkey, Georgia, Russia, Ukraine, Romania, Bulgaria**). Connected to Sea of Azov via *Kerch Strait*; connected to Sea of Marmara via *Bosphorus Strait*; connected to Aegean/Mediterranean via *Dardanelles Strait*.
- **Caspian Sea**: Largest lake/enclosed sea. Surrounded by 5 countries (**TARIK: Turkmenistan, Azerbaijan, Russia, Iran, Kazakhstan**).
- **Mediterranean Sea**: Surrounded by 21+ countries across Europe, Asia, Africa. Bordering countries in Levant (Asia): Syria, Lebanon, Israel, Palestine (Gaza).
- **Red Sea**: Surrounded by 6 countries (**DESSEY: Djibouti, Eritrea, Saudi Arabia, Sudan, Egypt, Yemen**).
- **Baltic Sea**: Surrounded by 9 countries (Sweden, Finland, Russia, Estonia, Latvia, Lithuania, Poland, Germany, Denmark).
- **Persian Gulf**: Iran, Iraq, Kuwait, Saudi Arabia, Bahrain, Qatar, UAE, Oman.
- **Dead Sea**: Bordered by Jordan, Israel, West Bank. Lowest land elevation on Earth.
- **Aral Sea**: Between Kazakhstan and Uzbekistan (heavily shrunk).

#### 3. Maritime Chokepoints, Straits & Strategic Canals
- **Strait of Malacca**: Connects Andaman Sea (Indian Ocean) & South China Sea (Pacific Ocean); separates Malay Peninsula & Sumatra (Indonesia).
- **Strait of Hormuz**: Connects Persian Gulf & Gulf of Oman; separates Iran & Arabian Peninsula (Oman/Musandam). Vital oil transit chokepoint.
- **Bab-el-Mandeb Strait** ("Gate of Tears"): Connects Red Sea & Gulf of Aden; separates Djibouti/Eritrea (Africa) & Yemen (Asia).
- **Bosphorus Strait**: Separates European Turkey (Thrace/Istanbul) & Asian Turkey (Anatolia); connects Black Sea & Sea of Marmara.
- **Dardanelles Strait**: Connects Sea of Marmara & Aegean Sea (Mediterranean).
- **Strait of Gibraltar**: Connects Mediterranean Sea & Atlantic Ocean; separates Spain/Europe & Morocco/Africa.
- **Dover Strait**: Connects English Channel & North Sea; separates UK & France.
- **Palk Strait**: Connects Bay of Bengal & Palk Bay / Gulf of Mannar; separates India & Sri Lanka.
- **Bering Strait**: Connects Arctic Ocean (Chukchi Sea) & Pacific Ocean (Bering Sea); separates Russia (Asia) & Alaska (USA/North America).
- **Torres Strait**: Separates New Guinea & Australia.
- **Cook Strait**: Separates North Island & South Island of New Zealand.
- **Canals**:
  - *Suez Canal* (Egypt): Connects Mediterranean Sea & Red Sea.
  - *Panama Canal*: Connects Atlantic Ocean (Caribbean Sea) & Pacific Ocean.
  - *Kiel Canal* (Germany): Connects North Sea & Baltic Sea.

#### 4. Continents, Mountain Ranges, Rivers & Deserts
- **Major Mountain Ranges**: Andes (South America - Mt Aconcagua), Rockies (North America - Mt Denali/McKinley), Alps (Europe - Mont Blanc), Urals (Europe/Asia divide), Atlas (Africa - Mt Toubkal), Himalayas (Asia - Mt Everest), Great Dividing Range (Australia - Mt Kosciuszko), Caucasus (Mt Elbrus).
- **Major World Rivers**:
  - *Nile*: Longest river; originates Lake Victoria / White Nile & Blue Nile (Lake Tana); confluence at Khartoum (Sudan); drains into Mediterranean.
  - *Amazon*: Largest discharge; originates Peruvian Andes; drains into Atlantic.
  - *Danube*: Originates Black Forest (Germany); passes through 4 capitals (Vienna, Bratislava, Budapest, Belgrade); drains into Black Sea.
  - *Congo*: Crosses Equator twice; second largest discharge.
  - *Limpopo*: Crosses Tropic of Capricorn twice.
  - *Mekong*: Originates Tibetan Plateau; passes through China, Myanmar, Laos, Thailand, Cambodia, Vietnam $\to$ South China Sea.
  - *Yangtze*: Longest river in Asia; Three Gorges Dam.

---

## 4. The 7-Step Spatial Thinking Flow

Every mapping topic, whether Indian or Global, must be structured through the 7-Step Spatial Thinking Flow:

```
1. COORDINATE / GRID ANCHORING  ──► Establish Lat/Long, Equator/Tropic/Meridian context
2. BOUNDING BOX & EXTENT        ──► Identify North-South & East-West spatial envelope
3. DIRECTIONAL ORDERING         ──► Sequence features (N→S, S→N, W→E, E→W)
4. PERIMETER ADJACENCY MATRIX   ──► Execute clockwise/counter-clockwise border scan
5. HYDROGRAPHIC DRAINAGE TRACING──► Map upstream→downstream, bank tributaries, confluences
6. MULTI-LAYER SPATIAL OVERLAY  ──► Correlate Terrain ∩ River ∩ Conservation/Border/Resource
7. TRAP / ANOMALY ELIMINATION   ──► Verify exceptions, deceptive alignments, examiner traps
```

---

## 5. Map Note Architecture (`[Chapter]_Notes.md`)

A Map note is a **spatial, topological, and relational knowledge model**:

### Flexible Section Architecture
```markdown
# [Chapter / Region Title] ([मानचित्र अध्याय का नाम])

## 1. Spatial Scope & Coordinate Anchors (स्थानिक दायरा एवं ग्रिड संदर्भ)
- Regional classification (India Physiography / River Basin / World Continent / Marginal Sea / Strategic Chokepoint).
- Governing coordinates, Bounding Box (Lat/Long extents), and reference lines (Equator, Tropic of Cancer/Capricorn, Prime Meridian, IST).

## 2. Directional & Spatial Ordering Matrices (दिशात्मक एवं अनुक्रमिक तालिकाएँ)
- North-to-South ($\text{N}\to\text{S}$) and West-to-East ($\text{W}\to\text{E}$) ordered tables of ranges, passes, peaks, ports, and cities.
- Ascending/Descending elevation or channel degree tables.

## 3. Perimeter Adjacencies & Border Matrices (सीमावर्ती देश एवं परिधि स्कैन)
- Clockwise / Counter-clockwise scan tables of surrounding nations/states for waterbodies or regions.
- Landlocked status, enclaves, and international borderline classifications.

## 4. Hydrography, Confluences & Drainage Networks (नदी तंत्र, संगम एवं अपवाह)
- River origins, courses, step-by-step downstream confluences (Prayags), left-bank vs right-bank tributaries.
- Dams, waterfalls, deltas/estuaries, and transboundary sharing mechanisms.

## 5. Physiographic Relief, Passes & Chokepoints (स्थलाकृतिक उच्चावच, दर्रे एवं चोकपॉइंट्स)
- Mountain passes connecting X to Y, straits separating A & B while connecting Seas 1 & 2.

## 6. Protected Areas & Strategic Resource Overlays (संरक्षित क्षेत्र एवं रणनीतिक संसाधन)
- Multi-layer intersection matrix: *Feature $\leftrightarrow$ State/Country $\leftrightarrow$ River/Range $\leftrightarrow$ Ecological Significance*.
- Mineral belts, energy corridors, and major ports.

## 7. Cartographic Anomalies, Exceptions & Examiner Traps (मानचित्र अपवाद एवं भ्रम निवारण)
- Deceptive spatial alignments (e.g. London being further North than NYC; Myanmar bordering states).
- Rivers crossing tropics twice; transcontinental territories; double-landlocked countries.

## 8. Source-Grounded Mnemonics & Memory Anchors (स्मरण सूत्र)
- Acronyms and spatial memory devices (e.g. TARIK, SEED, GRMCJWBTM, BACHPAN).

## 9. 5-Minute Quick Revision Zone (त्वरित मानचित्र पुनरावृत्ति)
- Top 10 Directional Orders, Top 10 Pass Connections, Top 5 Channel Degrees, Top 5 Border Rings.
```

---

## 6. Map Memory Architecture (Anki Selection Rules)

### A. Basic Flashcards (`[Chapter]_Basic.tsv`)
- **Focus**: Atomic spatial retrieval (Single facts, direct pairings, pass connections, channel numbers).
  - *Pass $\rightarrow$ Connection*: "थाल घाट (Thal Ghat) किन दो शहरों को जोड़ता है? | मुंबई और नासिक (Mumbai to Nashik)"
  - *Channel $\rightarrow$ Separation*: "10 डिग्री चैनल (10° Channel) किन द्वीपों को अलग करता है? | अंडमान को निकोबार से (Little Andaman & Car Nicobar)"
  - *Strait $\rightarrow$ Connection & Separation*: "मलक्का जलडमरूमध्य (Strait of Malacca) किन जल निकायों को जोड़ता है? | अंडमान सागर (हिंद महासागर) और दक्षिण चीन सागर (प्रशांत महासागर)"
  - *Confluence Point*: "अलकनंदा और मंदाकिनी नदी का संगम कहाँ होता है? | रुद्रप्रयाग (Rudraprayag)"
  - *Coordinate / Reference Line*: "भारत में मानक समय रेखा ($82.5^\circ\text{ E}$) और कर्क रेखा ($23.5^\circ\text{ N}$) एक दूसरे को किस राज्य में काटती हैं? | छत्तीसगढ़ (Chhattisgarh - कोरिया/सूरजपुर जिला)"
  - *Border Treaties*: "डूरंड रेखा (Durand Line) किन देशों के बीच की अंतरराष्ट्रीय सीमा है? | पाकिस्तान और अफगानिस्तान"

### B. Cloze Flashcards (`[Chapter]_Cloze.tsv`)
- **Focus**: Directional sequences, perimeter lists, multi-state alignments, and tributary orders.
  - *Directional Sequence*: `हिमालय की श्रेणियों का उत्तर से दक्षिण सही क्रम है: {{c1::काराकोरम}} $\to$ {{c2::लद्दाख}} $\to$ {{c3::जास्कर}} $\to$ {{c4::पीर पंजाल}}।`
  - *Tropic of Cancer States*: `कर्क रेखा भारत के 8 राज्यों से गुजरती है: गुजरात, राजस्थान, मध्य प्रदेश, छत्तीसगढ़, झारखंड, {{c1::पश्चिम बंगाल}}, {{c2::त्रिपुरा}} और {{c3::मिजोरम}}।`
  - *Sea Perimeter Neighbors*: `कैस्पियन सागर (Caspian Sea) की सीमा 5 देशों (TARIK) से लगती है: तुर्कमेनिस्तान, {{c1::अज़रबैजान}}, {{c2::रूस}}, {{c3::ईरान}} और {{c4::कज़ाकिस्तान}}।`
  - *Left Bank Tributaries*: `गंगा की बाईं ओर की प्रमुख सहायक नदियों का पश्चिम से पूर्व क्रम है: रामगंगा $\to$ गोमती $\to$ {{c1::घाघरा}} $\to$ {{c2::गंडक}} $\to$ {{c3::कोसी}} $\to$ महानंदा।`
  - *Peninsular River Order*: `पूर्वी तट पर गिरने वाली प्रायद्वीपीय नदियों का उत्तर से दक्षिण क्रम है: स्वर्णरेखा $\to$ महानदी $\to$ {{c1::गोदावरी}} $\to$ {{c2::कृष्णा}} $\to$ {{c3::पेन्नार}} $\to$ {{c4::कावेरी}}।`

### STRICT ANKI EXCLUSIONS FOR MAP STUDY
- **NEVER put large 20-country unfiltered lists into a single Basic card**.
- **NEVER put vague questions like "Write a note on African rivers" into Anki**.
- **Always keep cloze deletions atomic and directionally ordered**.

---

## 7. Map Performance Architecture (Conditional Layer)

When the chapter contains complex spatial problem patterns, directional sorting exercises, border intersection questions, or deceptive coordinate alignments, generate **`[Chapter]_ProblemPatterns.md`**:

### A. Spatial Problem Topologies & Elimination Algorithms

#### 1. Directional Sorting Algorithm ($\text{N}\to\text{S} / \text{W}\to\text{E}$)
```text
IF [Sorting Mountain Passes / Peaks]:
  1. Group by State/Range (Ladakh -> HP -> Uttarakhand -> Sikkim -> Arunachal).
  2. Apply Latitude Grid Check (e.g. Leh is North of Srinagar).
  3. Arrange along West-to-East or North-to-South transect.
```

#### 2. Border Adjacency & Landlocked Elimination Algorithm
```text
IF [Testing Border Neighbors]:
  1. Identify Landlocked vs Coastal Status.
  2. Check for Narrow Corridors (e.g. Siliguri Corridor / Chicken's Neck separating Bihar from Assam).
  3. Execute Clockwise Scan from 12 o'clock position to verify missing nations.
```

#### 3. Latitude / Longitude Alignment Deception Algorithm
```text
IF [Comparing Latitudes of Cities / Capitals]:
  1. Avoid relying on mental preconceptions (e.g., Chennai is East of Bengaluru, but Bengaluru is further South than Chennai? Check exact coordinates).
  2. Project onto reference line (e.g., Tropic of Cancer: Bhopal vs Ranchi vs Gandhinagar vs Kolkata).
```

### B. 12-Category Cartographic Error Log Taxonomy
1. *Directional Sequence Inversion* (Swapping North-to-South with South-to-North order).
2. *Tributary Bank Confusion* (Confusing Left Bank vs Right Bank tributaries).
3. *Latitudinal / Longitudinal Misalignment* (Assuming city A is south of B when it is north; e.g. London vs NYC latitude).
4. *Perimeter Neighbor Omission* (Missing a landlocked border neighbor during perimeter scan).
5. *Waterbody Connection Inversion* (Confusing which seas a strait connects vs which landmasses it separates).
6. *Channel / Degree Mismatch* (Confusing $8^\circ, 9^\circ, 10^\circ$ Channels or Duncan Passage).
7. *Drainage Outlet Error* (Confusing East-flowing/Bay of Bengal vs West-flowing/Arabian Sea outlets).
8. *State / Country Boundary Misattribution* (Believing a state touches an international border when separated by a corridor).
9. *Protected Area Overlay Error* (Misattributing a National Park to the wrong state/river/mountain range).
10. *Pass / Route Mismatch* (Confusing which valleys/cities a mountain pass connects).
11. *Landlocked / Coastal Classification Error* (Overlooking double-landlocked countries like Uzbekistan or Liechtenstein).
12. *Disputed / Geopolitical Misidentification* (Confusing cease-fire lines, international borders, or conflict flashpoints).

---

## 8. Subject-Specific Output Extensions

---

## 9. Subject Domain Audit

In addition to Core technical validation, perform Map Domain Audit:
1. **Directional Sequence Integrity**: Are all $\text{N}\to\text{S}$ and $\text{W}\to\text{E}$ sequences 100% physically and cartographically verified?
2. **Left vs Right Bank Precision**: Are river tributaries accurately categorized from the perspective of the river's flow (source to mouth)?
3. **Perimeter Adjacency Completeness**: Are all bordering countries of marginal seas/lakes mapped without accidental omissions?
4. **Channel & Coordinate Accuracy**: Are degree numbers ($8^\circ, 9^\circ, 10^\circ, 23.5^\circ, 82.5^\circ$) exact and paired with the correct landmasses?
5. **Multi-Layer Overlay Consistency**: Are National Parks, rivers, and states verified for geographic coherence?

---

## 10. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs identify high-frequency map patterns:
  - *Repeated Indian Map PYQs*: Tropic of Cancer states, Himalayan pass connectivity, Peninsular river order ($\text{N}\to\text{S}$), Left/Right bank tributaries of Ganga/Godavari/Brahmaputra, National Parks $\cap$ Rivers, Andaman & Nicobar channels.
  - *Repeated World Map PYQs*: Bordering countries of Black Sea / Caspian Sea / Mediterranean / Red Sea, Straits of Malacca / Hormuz / Bab-el-Mandeb / Bosphorus, Equator & Tropic passing nations, African Rift Valley lakes, Places in News.
- PYQ analysis feeds `[Chapter]_ProblemPatterns.md` under `Examiner Traps & Testability`.
- PYQ data MUST NOT alter static physical coordinates or authentic border definitions in `[Chapter]_Notes.md`.

---

## 11. Exceptions & Cartographic Anomalies

Structure cartographic exceptions explicitly in Notes and Cards:
`STANDARD SPATIAL RULE → EXPECTED LOCATION / FLOW → CARTOGRAPHIC ANOMALY → PHYSICAL / GEOPOLITICAL REASON → EXAM IMPLICATION`  
*(Example: Standard: Indian peninsular rivers flow East $\rightarrow$ Anomaly: Narmada and Tapi flow West into Arabian Sea $\rightarrow$ Reason: Linear faulting / Rift valley terrain $\rightarrow$ Implication: Formation of Estuaries instead of Deltas).*  
*(Example: Standard: Rivers flow in one general direction $\rightarrow$ Anomaly: Congo River crosses the Equator twice, Limpopo River crosses the Tropic of Capricorn twice, Mahi River crosses the Tropic of Cancer twice $\rightarrow$ Reason: Loop drainage course across coordinate lines).*

---

## 12. Visual Map Architecture (MindMap)

### A. Natural Map Types & Knowledge Structures
- **Regional Hierarchies**: Continent $\to$ Sub-region $\to$ Nations / Physiographic zones $\to$ **Hierarchy / Radial Map**.
- **Directional Sequences & Linear Flows**: Mountain chains ($\text{N}\to\text{S}$), River courses (Source $\to$ Confluences $\to$ Mouth) $\to$ **Process / Linear Map**.
- **Perimeter Ring Networks**: Marginal Seas $\leftrightarrow$ Bordering Nations $\to$ **Perimeter / Concept Map**.
- **Multi-Layer Protected Area Overlays**: State $\to$ Basin $\to$ National Park $\to$ **Concept / Network Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Sequential River Flow & Tributary Sequences**: NEVER force into an unordered radial tree. Map as a **Directional Flow / Hierarchy Map**.
- ❌ **Unordered Coordinate Dumps**: Do NOT place large unstructured tables in map nodes. Keep nodes concise (2–5 words in Hindi + English parentheses).

### C. Subject-Specific Semantics
- **Node Semantics**: Feature name, mountain pass, river, sea, country in Hindi + English parentheses `( )` (2–5 words).
- **Edge Semantics**: `connects` (जोड़ता है), `separates` (अलग करता है), `flows into` (में गिरती है), `tributary of` (की सहायक नदी), `borders` (की सीमा पर है), `located at` (पर स्थित है).

---

## 13. Subject-Specific Visual Learning Grammar (NotebookLM Slide Decks)

```yaml
visual_learning_grammar:
  dominant_structures:
    - spatial orientation
    - directional linear sequence
    - perimeter scan
    - hydrographic dendritic network
    - multi-layer overlay
    - chokepoint corridor
    - bounding box envelope
  preferred_visual_forms:
    - schematic maps
    - directional sequence strips (N->S / W->E)
    - perimeter circular loops (clockwise waterbody scans)
    - river basin dendritic trees with left/right bank branchings
    - cross-sectional relief profiles (elevation & passes)
    - split-screen regional comparisons
  preferred_narrative_modes:
    - macro-to-micro spatial zoom
    - perimeter walk
    - upstream-to-downstream journey
    - cardinal transect (North-to-South / West-to-East scan)
  high_value_visual_opportunities:
    - Himalayan mountain ranges & passes stepped transect (Trans -> Greater -> Lesser -> Shiwalik)
    - Alaknanda Panch Prayag confluence tree with tributary flows
    - Peninsular river north-to-south discharge matrix along East Coast
    - Marginal sea perimeter ring diagrams with bordering nation badges (Black Sea, Caspian Sea, Red Sea)
    - Maritime chokepoints & strategic straits schematic callouts (Malacca, Hormuz, Bab-el-Mandeb, Bosphorus)
    - Tropic of Cancer & IST meridian intersection grid across Indian states
  visual_anti_patterns:
    - text-only lists of locations without spatial coordinates or relative direction
    - non-functional decorative art maps without topological precision
    - unstructured coordinate dumps without spatial bounding context
    - confusing left vs right river bank branchings
```

### Domain Visual Reasoning
- **Spatial Anchoring First**: Every slide must ground the learner in the cardinal directions ($\text{N/S/E/W}$) and latitude/longitude context before presenting features.
- **Directional Clarity**: Use explicit arrow strips ($\implies$) to demonstrate sequence order ($\text{N}\to\text{S}$ or $\text{W}\to\text{E}$).
- **Perimeter Ring Callouts**: For waterbodies (Black Sea, Red Sea), arrange bordering nations in a structured clockwise loop starting from 12 o'clock.
- **Dendritic Drainage Hierarchies**: Distinguish left-bank vs right-bank tributaries with clear dual-column or bifurcated branch layouts.

---

## 14. Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect maps, atlas plates, satellite photos, and topological diagrams natively when relevant. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
