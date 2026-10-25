import { Product, Additive, UserAccount, GeoAd, GroqApiLog } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    barcode: '4001686301524',
    name: 'Haribo Goldbears (100g)',
    brand: 'Haribo',
    imageUrl: 'https://images.openfoodfacts.org/images/products/400/168/630/1524/front_en.175.400.jpg',
    ingredientsRaw: 'Glucose syrup, sugar, gelatin (pork), dextrose, fruit juice from fruit juice concentrate: apple, strawberry, raspberry, orange, lemon, pineapple; acid: citric acid; fruit and plant concentrates; flavouring; glazing agents: white and yellow beeswax, carnauba wax.',
    detectedAdditives: ['E441', 'E330', 'E901', 'E903'],
    aiStatus: 'HARAM',
    manualStatus: 'HARAM',
    isOverridden: false,
    moderatorNote: 'Contains porcine gelatin (E441 derived from pork). Strictly prohibited.',
    verifiedBy: 'Sheikh Amin (Mufti)',
    scansCount: 1420,
    lastScannedAt: '2026-10-23T21:40:00Z',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'prod-2',
    barcode: '7622210449283',
    name: 'Oreo Original Sandwich Biscuits',
    brand: 'Mondelez / Oreo',
    imageUrl: 'https://images.openfoodfacts.org/images/products/762/221/044/9283/front_en.445.400.jpg',
    ingredientsRaw: 'Wheat flour, sugar, palm oil, rapeseed oil, fat reduced cocoa powder 4.3%, wheat starch, glucose-fructose syrup, raising agents (ammonium carbonates, potassium carbonates, sodium carbonates), salt, emulsifier (soya lecithins E322), acidity regulator (sodium hydroxide), flavouring (vanillin).',
    detectedAdditives: ['E503', 'E501', 'E500', 'E322', 'E524'],
    aiStatus: 'HALAL',
    manualStatus: 'HALAL',
    isOverridden: true,
    moderatorNote: 'All ingredients are 100% plant-based. Soya lecithin is plant sourced. Halal certified in UK & EU distribution.',
    verifiedBy: 'Food Technologist Tariq',
    scansCount: 3892,
    lastScannedAt: '2026-10-23T22:15:00Z',
    createdAt: '2026-08-15T12:00:00Z',
  },
  {
    id: 'prod-3',
    barcode: '0028400064088',
    name: 'Doritos Nacho Cheese Flavored Tortilla Chips',
    brand: 'Frito-Lay / Doritos',
    imageUrl: 'https://images.openfoodfacts.org/images/products/002/840/006/4088/front_en.112.400.jpg',
    ingredientsRaw: 'Corn, vegetable oil (corn, canola, and/or sunflower oil), maltodextrin (made from corn), salt, cheddar cheese (milk, cheese cultures, salt, enzymes [animal/microbial]), whey, monosodium glutamate (E621), buttermilk, romano cheese, whey protein concentrate, onion powder, natural and artificial flavors.',
    detectedAdditives: ['E621', 'E160b', 'E110', 'E129'],
    aiStatus: 'MUSHBOOH',
    manualStatus: 'MUSHBOOH',
    isOverridden: false,
    moderatorNote: 'Enzymes used in cheese cultures may be animal derived (calf rennet). Awaiting manufacturer batch verification for US production.',
    scansCount: 2150,
    lastScannedAt: '2026-10-23T20:05:00Z',
    createdAt: '2026-09-10T14:30:00Z',
  },
  {
    id: 'prod-4',
    barcode: '3017620422003',
    name: 'Nutella Hazelnut Spread with Cocoa',
    brand: 'Ferrero',
    imageUrl: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.447.400.jpg',
    ingredientsRaw: 'Sugar, palm oil, hazelnuts (13%), skimmed milk powder (8.7%), fat-reduced cocoa (7.4%), emulsifier: lecithins (soya), vanillin.',
    detectedAdditives: ['E322'],
    aiStatus: 'HALAL',
    manualStatus: 'HALAL',
    isOverridden: true,
    moderatorNote: 'Vegetarian recipe. Emulsifier is soya lecithin (plant origin). Verified by Halal Food Council Europe (HFCE).',
    verifiedBy: 'Admin Team',
    scansCount: 4510,
    lastScannedAt: '2026-10-23T22:30:00Z',
    createdAt: '2026-07-20T08:00:00Z',
  },
  {
    id: 'prod-5',
    barcode: '5000159461122',
    name: 'Skittles Fruits Chewy Sweets',
    brand: 'Wrigley / Mars',
    imageUrl: 'https://images.openfoodfacts.org/images/products/500/015/946/1122/front_en.214.400.jpg',
    ingredientsRaw: 'Sugar, glucose syrup, palm fat, acid: citric acid, malic acid; dextrin, maltodextrin, flavourings, modified starch, acidity regulator: trisodium citrate; colours: E162, E163, E170, E160a, E100, E132, E133; glazing agent: carnauba wax.',
    detectedAdditives: ['E330', 'E296', 'E331', 'E162', 'E163', 'E170', 'E160a', 'E100', 'E132', 'E133', 'E903'],
    aiStatus: 'HALAL',
    manualStatus: 'HALAL',
    isOverridden: true,
    moderatorNote: 'Gelatin and Carmine (E120) free formula in current UK/EU recipe. Suitable for vegetarian and halal diets.',
    verifiedBy: 'Sheikh Amin (Mufti)',
    scansCount: 1980,
    lastScannedAt: '2026-10-23T19:12:00Z',
    createdAt: '2026-08-05T11:20:00Z',
  },
  {
    id: 'prod-6',
    barcode: '8901030383793',
    name: 'Lays Classic Salted Potato Chips',
    brand: 'Lays / PepsiCo',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/038/3793/front_en.28.400.jpg',
    ingredientsRaw: 'Selected potatoes, edible vegetable oil (palmolein), salt.',
    detectedAdditives: [],
    aiStatus: 'HALAL',
    manualStatus: 'HALAL',
    isOverridden: false,
    moderatorNote: 'Pure 3-ingredient product: potatoes, vegetable oil, salt. 100% Halal.',
    scansCount: 5240,
    lastScannedAt: '2026-10-23T22:45:00Z',
    createdAt: '2026-06-12T09:15:00Z',
  }
];

export const INITIAL_ADDITIVES: Additive[] = [
  {
    id: 'add-1',
    code: 'E120',
    nameEn: 'Cochineal / Carmine / Carminic Acid',
    status: 'HARAM',
    source: 'Animal',
    category: 'Natural Red Colouring',
    translations: {
      en: {
        name: 'Carmine / Cochineal',
        description: 'Natural red dye extracted from crushed dried female cochineal insects (Dactylopius coccus).',
        halalReason: 'Majority of Islamic scholars (Hanafi, Shafi\'i, Hanbali) deem insects non-permissible for consumption (except locusts), making E120 Haram in mainstream certification.'
      },
      bn: {
        name: 'কারমাইন / কোচিনিল (E120)',
        description: 'স্ত্রী কোচিনিল পোকা চূর্ণ করে লাল রঙের প্রাকৃতিক ডাই প্রস্তুত করা হয়।',
        halalReason: 'অধিকাংশ ফিকহবিদদের মতে (হানাফী, শাফেয়ী ও হাম্বলী) পঙ্গপাল ব্যতীত অন্যান্য কীট-পতঙ্গ খাওয়া নিষিদ্ধ। তাই এটি হারাম হিসেবে বিবেচিত।'
      },
      ar: {
        name: 'الكارمين / القرمز (E120)',
        description: 'صبغة حمراء طبيعية تستخرج من حشرات القرمز المجففة.',
        halalReason: 'يحرم جمهور الفقهاء أكل الحشرات غير الجراد لعدم تذكيتها، ولذا تصنف كصبغة محرمة لدى غالبية هيئات الحلال.'
      },
      ur: {
        name: 'کارمائن / کوچینیل (E120)',
        description: 'مادہ کوچینیل کیڑوں کو پیس کر سرخ رنگ کا مادہ حاصل کیا جاتا ہے۔',
        halalReason: 'جمہور علماء اور حنفی فقہ کے مطابق ٹڈی کے علاوہ دیگر کیڑے کھانا حرام ہے، لہٰذا E120 خوراک میں حرام مانا جاتا ہے۔'
      },
      tr: {
        name: 'Karmin / Koşinil (E120)',
        description: 'Kırmızı rengi veren kurutulmuş koşinil böceklerinden elde edilen pigment.',
        halalReason: 'İslam alimlerinin çoğunluğuna göre böceklerin tüketimi caiz görülmediğinden helal sertifikalarında haram kabul edilir.'
      },
      id: {
        name: 'Karmin (E120)',
        description: 'Pewarna merah alami yang diperoleh dari serangga kutu daun Cochineal.',
        halalReason: 'Meskipun sebagian fatwa membolehkan, mayoritas lembaga sertifikasi internasional mengkategorikannya syubhat atau haram jika ada alternatif nabati.'
      },
      fr: {
        name: 'Acide carminique / Cochenille',
        description: 'Colorant rouge issu du broyage d\'insectes cochenilles femelles séchées.',
        halalReason: 'Interdit selon l\'école hanafite et la majorité des auditeurs halal en raison de l\'origine insecte.'
      },
      de: {
        name: 'Echtes Karmin / Cochenille',
        description: 'Roter Farbstoff, der aus getrockneten Schildläusen gewonnen wird.',
        halalReason: 'Aufgrund der Insektenherkunft von den meisten Halal-Zertifizierungsstellen als nicht halal (Haram) eingestuft.'
      },
      es: {
        name: 'Carmín / Cochinilla',
        description: 'Colorante natural rojo derivado de insectos cochinilla hembra desecados.',
        halalReason: 'Considerado Haram por la mayoría de las autoridades islámicas debido a su origen de insecto.'
      },
      it: {
        name: 'Cocciniglia / Carminio',
        description: 'Colorante naturale ottenuto da insetti cocciniglia essiccati.',
        halalReason: 'Classificato come non conforme Halal poiché derivato da insetti non ammessi per l\'alimentazione.'
      },
      pt: {
        name: 'Carmim de Cochonilha',
        description: 'Corante vermelho natural extraído de insetos cochonilha.',
        halalReason: 'Classificado como Haram pelas principais autoridades islâmicas devido à origem de inseto.'
      },
      ru: {
        name: 'Кармин / Кошениль',
        description: 'Красный краситель, получаемый из высушенных самок насекомых кошенили.',
        halalReason: 'Большинство исламских богословов считают его харамом из-за происхождения из насекомых.'
      },
      hi: {
        name: 'कारमाइन / कोचिनियल (E120)',
        description: 'मादा कोचिनियल कीड़ों से निकाला जाने वाला प्राकृतिक लाल रंग।',
        halalReason: 'कीड़ों से प्राप्त होने के कारण अधिकांश हलाल नियमों के तहत इसे हराम माना जाता है।'
      },
      zh: {
        name: '胭脂红 / 胭脂虫红 (E120)',
        description: '从雌性胭脂虫干燥粉碎中提取的天然红色色素。',
        halalReason: '因其昆虫来源，根据主流伊斯兰法学观点被归为非清真（Haram）。'
      }
    },
    updatedAt: '2026-10-20T10:00:00Z'
  },
  {
    id: 'add-2',
    code: 'E471',
    nameEn: 'Mono- and diglycerides of fatty acids',
    status: 'MUSHBOOH',
    source: 'Doubtful',
    category: 'Emulsifier & Stabiliser',
    translations: {
      en: {
        name: 'Mono- & Diglycerides (E471)',
        description: 'Fatty acid compound used to blend water and oils in baked goods, ice creams, and chocolates.',
        halalReason: 'Can be synthesized from either vegetable oils (palm, sunflower) or animal fats (pork tallow, non-halal beef). Unless explicitly certified vegetarian/halal, it is Mushbooh.'
      },
      bn: {
        name: 'মনো- ও ডাইগ্লিসারাইডস (E471)',
        description: 'তেল ও জলীয় উপাদান মেশানোর ইমালসিফায়ার হিসেবে বেকারি ও চকলেট পণ্যে ব্যবহৃত হয়।',
        halalReason: 'এটি উদ্ভিজ্জ তেল (পাম/সূর্যমুখী) অথবা প্রাণিজ চর্বি (শূকর বা জবাইহীন গরু) উভয় থেকেই তৈরি হতে পারে। উৎস নিশ্চিত না হওয়া পর্যন্ত এটি সন্দেহজনক (মাশবুহ)।'
      },
      ar: {
        name: 'أحادي وثنائي الجليسريد (E471)',
        description: 'مستحلب يمزج الدهون بالماء في المخبوزات والحلويات.',
        halalReason: 'مصدره قد يكون نباتياً أو دهون حيوانية (كالخنزير أو غير المذكى)، لذا يصنف كمشتبه به (مشبوه) إلا بتوضيح شهادة الحلال.'
      },
      ur: {
        name: 'مونو اور ڈائی گلیسرائیڈز (E471)',
        description: 'بیکری اشیاء اور آئس کریم میں تیل اور پانی کو ملانے والا ایملسیفائر۔',
        halalReason: 'یہ سبزیوں کے تیل یا جانوروں کی چربی (بشمول سور کی چربی) دونوں سے بن سکتا ہے، اس لیے مشبوہ ہے۔'
      },
      tr: {
        name: 'Yağ Asitlerinin Mono ve Digliseritleri (E471)',
        description: 'Unlu mamullerde ve dondurmalarda kullanılan emülgatör.',
        halalReason: 'Bitkisel veya hayvansal (domuz/sığır iç yağı) kaynaklı olabildiği için menşei belirtilmedikçe şüphelidir.'
      },
      id: {
        name: 'Mono dan Digliserida (E471)',
        description: 'Pengemulsi yang umum digunakan pada roti, margarin, dan cokelat.',
        halalReason: 'Bisa bersumber dari nabati maupun hewani (babi/sapi). Bersifat syubhat tanpa logo halal resmi.'
      },
      fr: {
        name: 'Mono- et diglycérides d\'acides gras',
        description: 'Émulsifiant d\'origine végétale ou animale présent dans la biscuiterie et les margarines.',
        halalReason: 'Douteux (Mushbooh) car peut provenir de graisses porcines ou bovines non certifiées.'
      },
      de: {
        name: 'Mono- und Diglyceride von Speisefettsäuren',
        description: 'Emulgator für Backwaren, Margarine und Eiscreme.',
        halalReason: 'Mushbooh (zweifelhaft), da der Rohstoff pflanzlich oder tierischen Ursprungs (auch Schwein) sein kann.'
      },
      es: {
        name: 'Mono y diglicéridos de ácidos grasos',
        description: 'Emulsionante utilizado en pastelería y margarinas.',
        halalReason: 'Dudoso (Mushbooh) por su origen potencialmente animal o porcino salvo especificación vegetal.'
      },
      it: {
        name: 'Mono e digliceridi degli acidi grassi',
        description: 'Emulsionante comune in prodotti da forno e salse.',
        halalReason: 'Dubbio (Mushbooh): può derivare da grassi vegetali o animali.'
      },
      pt: {
        name: 'Mono e diglicerídeos de ácidos graxos',
        description: 'Emulsificante usado em pães e sobremesas.',
        halalReason: 'Duvidoso (Mushbooh), podendo ter origem vegetal ou suína/bovina.'
      },
      ru: {
        name: 'Моно- и диглицериды жирных кислот',
        description: 'Эмульгатор для кондитерских изделий и соусов.',
        halalReason: 'Сомнительный (Мушбух): может производиться как из растительных масел, так и из свиного жира.'
      },
      hi: {
        name: 'मोनो और डिग्लिसराइड्स (E471)',
        description: 'बेकरी उत्पादों में प्रयोग होने वाला इमल्सीफायर।',
        halalReason: 'पौधों के तेल या पशु चर्बी दोनों से बन सकता है, इसलिए संदिग्ध (मुशबूह) है।'
      },
      zh: {
        name: '单双甘油脂肪酸酯 (E471)',
        description: '烘焙食品和冰淇淋中常用的乳化剂。',
        halalReason: '可能源于植物油或动物脂肪（甚至猪油），来源未注明时属于存疑（Mushbooh）。'
      }
    },
    updatedAt: '2026-10-22T14:20:00Z'
  },
  {
    id: 'add-3',
    code: 'E441',
    nameEn: 'Gelatine',
    status: 'HARAM',
    source: 'Animal',
    category: 'Gelling Agent',
    translations: {
      en: {
        name: 'Gelatin (E441)',
        description: 'Colloidal protein obtained by prolonged boiling of animal skin, cartilage, and bones.',
        halalReason: 'Over 80% of European/American food gelatine is made from pig skins (porcine). Bovine gelatin is only halal if slaughtered according to Islamic rites with strict separation.'
      },
      bn: {
        name: 'জেলাটিন (E441)',
        description: 'প্রাণীর ত্বক, তরুণাস্থি এবং হাড় দীর্ঘ সময় সিদ্ধ করে তৈরি করা জেল জাতীয় প্রোটিন।',
        halalReason: 'বিশ্বের প্রায় ৮০% খাদ্য জেলাটিন শূকরের চামড়া থেকে প্রস্তুত করা হয়। একমাত্র ইসলামিক পদ্ধতিতে জবাইকৃত হালাল পশুর জেলাটিন ব্যতীত সাধারণ জেলাটিন হারাম।'
      },
      ar: {
        name: 'الجيلاتين (E441)',
        description: 'مادة بروتينية جيلاتينية تستخرج من جلود وعظام الحيوانات.',
        halalReason: 'محرم إذا استخرج من الخنزير أو حيوان غير مذكى ذكاة شرعية، وهو الغالب في الأغذية المصنعة عالمياً.'
      },
      ur: {
        name: 'جیلیٹن (E441)',
        description: 'جانوروں کی کھال اور ہڈیوں کو پکا کر حاصل کیا جانے والا جیلی دار مادہ۔',
        halalReason: 'یورپ اور مغرب میں جیلیٹن کا بڑا ذریعہ سور ہے، لہٰذا بغیر تصدیق شدہ حلال ذبیحہ کے یہ قطعی حرام ہے۔'
      },
      tr: {
        name: 'Jelatin (E441)',
        description: 'Hayvan derisi ve kemiklerinden elde edilen jelleştirici protein.',
        halalReason: 'Çoğunlukla domuz kaynaklı üretildiğinden, İslami usullere göre kesilmiş sığır jelatini ibaresi yoksa haramdır.'
      },
      id: {
        name: 'Gelatin (E441)',
        description: 'Bahan pembentuk gel dari tulang dan kulit hewan.',
        halalReason: 'Berasal dari babi atau sapi non-halal jika tidak memiliki sertifikasi halal resmi.'
      },
      fr: {
        name: 'Gélatine alimentaire',
        description: 'Agent gélifiant extrait de peaux ou d\'os d\'animaux (majoritairement porcin en Europe).',
        halalReason: 'Haram sauf si certifiée 100% bovine avec abattage rituel islamique.'
      },
      de: {
        name: 'Speisegelatine',
        description: 'Geliermittel aus tierischem Bindegewebe (häufig Schweineschwarten).',
        halalReason: 'Haram, da in Westeuropa meist Schweinegelatine verwendet wird.'
      },
      es: {
        name: 'Gelatina',
        description: 'Agente gelificante de origen animal.',
        halalReason: 'Haram en su forma general por provenir de cerdos salvo que se declare expresamente halal/bovino ritual.'
      },
      it: {
        name: 'Gelatina',
        description: 'Proteina addensante derivata da pelle e ossa animali.',
        halalReason: 'Haram se ottenuta da suini o animali non macellati ritualmente.'
      },
      pt: {
        name: 'Gelatina',
        description: 'Gelificante derivado de colágeno animal.',
        halalReason: 'Haram na maioria dos casos pelo uso frequente de pele de porco.'
      },
      ru: {
        name: 'Желатин',
        description: 'Желирующее вещество животного происхождения.',
        halalReason: 'Харам, если произведен из свинины или животных, забитых не по шариату.'
      },
      hi: {
        name: 'जिलेटिन (E441)',
        description: 'जानवरों की हड्डियों व त्वचा से प्राप्त जेली कारक।',
        halalReason: 'सूअर या गैर-हलाल जानवरों से प्राप्त होने पर हराम माना जाता है।'
      },
      zh: {
        name: '明胶 (E441)',
        description: '从动物结缔组织中提取的胶冻剂。',
        halalReason: '商业明胶大部分来自猪皮，非清真屠宰的牛骨明胶亦不可食用，判定为非清真（Haram）。'
      }
    },
    updatedAt: '2026-10-18T09:00:00Z'
  },
  {
    id: 'add-4',
    code: 'E100',
    nameEn: 'Curcumin / Turmeric',
    status: 'HALAL',
    source: 'Plant',
    category: 'Natural Yellow Colouring',
    translations: {
      en: {
        name: 'Curcumin (E100)',
        description: 'Natural yellow color extracted from the rhizomes of the turmeric plant (Curcuma longa).',
        halalReason: '100% plant-derived natural herb extract. Fully permissible (Halal).'
      },
      bn: {
        name: 'কারকিউমিন / হলুদ গুঁড়ো (E100)',
        description: 'হলুদ গাছের মূল থেকে নিষ্কাশিত খাঁটি প্রাকৃতিক হলুদ রঙ।',
        halalReason: 'শতভাগ উদ্ভিদজাত ও প্রাকৃতিক উপাদান। সম্পূর্ণ হালাল ও নিরাপদ।'
      },
      ar: {
        name: 'الكركمين (E100)',
        description: 'صبغة صفراء طبيعية تستخرج من نبات الكركم.',
        halalReason: 'نباتي 100% ومباح شرعاً دون أي شبهة.'
      },
      ur: {
        name: 'کرکیومین / ہلدی (E100)',
        description: 'ہلدی کے پودے سے حاصل شدہ خالص قدرتی پیلا رنگ۔',
        halalReason: 'مکمل نباتاتی ماخذ ہے اور بلا شک و شبہ حلال ہے۔'
      },
      tr: {
        name: 'Kurkumin (E100)',
        description: 'Zerdeçal kökünden elde edilen doğal sarı renklendirici.',
        halalReason: 'Tamamen bitkisel kökenlidir ve helaldir.'
      },
      id: {
        name: 'Kurkumin (E100)',
        description: 'Pewarna kuning alami dari tanaman kunyit.',
        halalReason: '100% nabati dan halal dikonsumsi.'
      },
      fr: {
        name: 'Curcumine',
        description: 'Colorant jaune naturel extrait du curcuma.',
        halalReason: '100% d\'origine végétale, licite et certifié Halal.'
      },
      de: {
        name: 'Kurkumin',
        description: 'Natürlicher gelber Farbstoff aus Gelbwurz (Kurkuma).',
        halalReason: 'Pflanzlich und ohne Einschränkung halal.'
      },
      es: {
        name: 'Curcumina',
        description: 'Colorante vegetal extraído de la raíz de cúrcuma.',
        halalReason: 'Totalmente vegetal y permitido (Halal).'
      },
      it: {
        name: 'Curcumina',
        description: 'Colorante giallo estratto dalla pianta di curcuma.',
        halalReason: 'Totalmente vegetale e consentito.'
      },
      pt: {
        name: 'Curcumina',
        description: 'Corante amarelo extraído da cúrcuma.',
        halalReason: '100% de origem vegetal, portanto Halal.'
      },
      ru: {
        name: 'Куркумин',
        description: 'Натуральный краситель из корней куркумы.',
        halalReason: '100% растительный продукт, халяль.'
      },
      hi: {
        name: 'करक्यूमिन (E100)',
        description: 'हल्दी से प्राप्त प्राकृतिक पीला रंग।',
        halalReason: 'पूर्णतः वनस्पति स्रोत, हलाल है।'
      },
      zh: {
        name: '姜黄素 (E100)',
        description: '从姜黄植物根茎中提取的天然黄色素。',
        halalReason: '100%植物来源，完全清真合法（Halal）。'
      }
    },
    updatedAt: '2026-10-15T08:00:00Z'
  }
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-1',
    deviceId: 'DEV-8F92-41A3-BC81',
    name: 'Tariqul Islam',
    email: 'tariqul.islam@example.com',
    country: 'Bangladesh 🇧🇩',
    isPremium: true,
    isBanned: false,
    totalScans: 312,
    lastActiveAt: '2026-10-23T22:34:00Z',
    createdAt: '2026-06-10T11:00:00Z',
  },
  {
    id: 'user-2',
    deviceId: 'DEV-1C90-848D-2104',
    name: 'Hamza Farooq',
    email: 'hamza.f@example.co.uk',
    country: 'United Kingdom 🇬🇧',
    isPremium: true,
    isBanned: false,
    totalScans: 894,
    lastActiveAt: '2026-10-23T21:12:00Z',
    createdAt: '2026-05-18T14:20:00Z',
  },
  {
    id: 'user-3',
    deviceId: 'DEV-AA45-9011-EE54',
    name: 'Nour El-Din',
    email: 'nour.eg@example.com',
    country: 'Egypt 🇪🇬',
    isPremium: false,
    isBanned: false,
    totalScans: 64,
    lastActiveAt: '2026-10-23T18:50:00Z',
    createdAt: '2026-09-22T08:15:00Z',
  },
  {
    id: 'user-4',
    deviceId: 'DEV-44BB-1229-301C',
    name: 'Spam Bot Scraper 09',
    country: 'Anonymous Proxy 🌐',
    isPremium: false,
    isBanned: true,
    banReason: 'Abusive automated bot requests exceeding 400 scans/min without user agent.',
    totalScans: 12450,
    lastActiveAt: '2026-10-22T14:02:00Z',
    createdAt: '2026-10-22T13:40:00Z',
  },
  {
    id: 'user-5',
    deviceId: 'DEV-FF12-8871-3321',
    name: 'Fatima Al-Zahra',
    email: 'fatima.uae@example.ae',
    country: 'United Arab Emirates 🇦🇪',
    isPremium: true,
    isBanned: false,
    totalScans: 540,
    lastActiveAt: '2026-10-23T20:10:00Z',
    createdAt: '2026-07-04T16:00:00Z',
  }
];

export const INITIAL_GEO_ADS: GeoAd[] = [
  {
    id: 'ad-1',
    title: 'Medina Halal Gourmet Supermarket - 15% OFF',
    sponsorName: 'Medina Group UK',
    bannerImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    targetUrl: 'https://medinahalal.co.uk/offers',
    latitude: 51.5074,
    longitude: -0.1278,
    radiusKm: 15.0,
    locationName: 'London & Greater London, UK',
    isActive: true,
    impressionCount: 14820,
    clickCount: 1240,
    startDate: '2026-10-01T00:00:00Z',
  },
  {
    id: 'ad-2',
    title: 'Fresh Bengal Grass-Fed Halal Meat & Deli',
    sponsorName: 'Bengal Agro Foods',
    bannerImageUrl: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=800&q=80',
    targetUrl: 'https://bengalmeat.com',
    latitude: 23.8103,
    longitude: 90.4125,
    radiusKm: 25.0,
    locationName: 'Dhaka Metropolitan Area, BD',
    isActive: true,
    impressionCount: 38940,
    clickCount: 4120,
    startDate: '2026-09-15T00:00:00Z',
  },
  {
    id: 'ad-3',
    title: 'Al-Barakah Turkish & Mediterranean Spices',
    sponsorName: 'Al-Barakah Global',
    bannerImageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
    targetUrl: 'https://albarakah.ae/promo',
    latitude: 25.2048,
    longitude: 55.2708,
    radiusKm: 20.0,
    locationName: 'Dubai & Sharjah, UAE',
    isActive: true,
    impressionCount: 22100,
    clickCount: 1980,
    startDate: '2026-10-10T00:00:00Z',
  },
  {
    id: 'ad-4',
    title: 'New York Halal Butcher & Grill Paterson',
    sponsorName: 'Paterson Halal Prime',
    bannerImageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    targetUrl: 'https://patersonhalal.com',
    latitude: 40.7128,
    longitude: -74.0060,
    radiusKm: 30.0,
    locationName: 'New York Tri-State Area, USA',
    isActive: false,
    impressionCount: 8430,
    clickCount: 610,
    startDate: '2026-08-01T00:00:00Z',
  }
];

export const INITIAL_GROQ_LOGS: GroqApiLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-10-23T22:52:10Z',
    endpoint: '/api/v1/scan',
    model: 'openai/gpt-oss-120b',
    barcode: '4001686301524',
    promptTokens: 412,
    completionTokens: 89,
    latencyMs: 380,
    statusCode: 200,
    status: 'SUCCESS',
    userDeviceId: 'DEV-8F92-41A3-BC81',
  },
  {
    id: 'log-2',
    timestamp: '2026-10-23T22:49:33Z',
    endpoint: '/api/v1/scan-ocr',
    model: 'qwen/qwen3.8-27b',
    promptTokens: 890,
    completionTokens: 142,
    latencyMs: 640,
    statusCode: 200,
    status: 'SUCCESS',
    userDeviceId: 'DEV-1C90-848D-2104',
  },
  {
    id: 'log-3',
    timestamp: '2026-10-23T22:45:12Z',
    endpoint: '/api/v1/scan',
    model: 'openai/gpt-oss-120b',
    barcode: '7622210449283',
    promptTokens: 520,
    completionTokens: 0,
    latencyMs: 120,
    statusCode: 429,
    status: 'RATE_LIMITED',
    errorMessage: 'Rate limit exceeded for organization groq-prod-tier-2: 300 TPM reached. Retried with exponential backoff.',
    userDeviceId: 'DEV-AA45-9011-EE54',
  },
  {
    id: 'log-4',
    timestamp: '2026-10-23T22:41:05Z',
    endpoint: '/api/v1/scan',
    model: 'openai/gpt-oss-120b',
    barcode: '0028400064088',
    promptTokens: 460,
    completionTokens: 110,
    latencyMs: 410,
    statusCode: 200,
    status: 'SUCCESS',
    userDeviceId: 'DEV-FF12-8871-3321',
  },
  {
    id: 'log-5',
    timestamp: '2026-10-23T22:38:18Z',
    endpoint: '/api/v1/scan-ocr',
    model: 'qwen/qwen3.8-27b',
    promptTokens: 1150,
    completionTokens: 0,
    latencyMs: 3200,
    statusCode: 504,
    status: 'ERROR',
    errorMessage: 'Groq vision inference timeout after 3000ms. Fallback triggered: local regex ingredient parser.',
    userDeviceId: 'DEV-8F92-41A3-BC81',
  }
];
