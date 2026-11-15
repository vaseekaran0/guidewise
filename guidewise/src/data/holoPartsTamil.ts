import type { HoloModelId } from './holoParts.js';

export const HOLO_MODELS_TA: Record<HoloModelId, { title: string; subtitle: string }> = {
  dna: {
    title: 'DNA இரட்டைச் சுருள் (Double Helix)',
    subtitle: '14 இணைப்புகள் · எதிர்-இணை B-வடிவ கல்வி 3D ஹாலோகிராம்',
  },
  rna: {
    title: 'RNA ஒற்றை இழை & மடிப்பு',
    subtitle: 'ஒற்றை-இழை mRNA அமைப்பு, Codon மற்றும் Hairpin வளையம்',
  },
  crispr: {
    title: 'CRISPR-Cas9 மூலக்கூறு அமைப்பு',
    subtitle: 'இரு-பிரிவு நொதி · Guide RNA R-வளையம் · PAM சரிபார்ப்பு & வெட்டு இடம்',
  },
};

export const DNA_VS_RNA_CALLOUTS_TA: Record<string, { title: string; detail: string }> = {
  strands: {
    title: 'இரட்டைச் சுருள் vs ஒற்றை இழை',
    detail:
      'DNA-வில் நீண்டகால நிலைப்புத்தன்மைக்கு இரு எதிர்-இணை இழைகள் உள்ளன; RNA ஒரே நெகிழ்வான இழையாக இருப்பதால் பல்வேறு வடிவங்களாக மடிய முடியும்.',
  },
  bases: {
    title: 'தைமின் (T) vs யூராசில் (U)',
    detail:
      'DNA A, T, G, C எழுத்துகளைப் பயன்படுத்துகிறது. RNA-வில் T-க்கு பதிலாக யூராசில் (U) உள்ளது; அதுவும் அடினின் (A) உடன் இணையும்.',
  },
  sugar: {
    title: "டீஆக்ஸிரைபோஸ் vs ரைபோஸ் (2'-OH)",
    detail:
      "DNA-வின் டீஆக்ஸிரைபோஸ் சர்க்கரையில் 2'-OH ஆக்சிஜன் இல்லாததால் அது மிகவும் வலிமையானது. RNA ரைபோஸில் 2'-OH இருப்பதால் தற்காலிகத் தூதராகச் செயல்படுகிறது.",
  },
};

export const HOLO_PARTS_TA: Record<
  string,
  { name: string; explanation: string; keyFact: string }
> = {
  // DNA parts
  'dna-backbone': {
    name: 'சர்க்கரை-பாஸ்பேட் முதுகெலும்பு (Backbone)',
    explanation:
      'DNA ஏணியின் இரு வெளிப்புறத் தண்டவாளங்கள். சர்க்கரையும் பாஸ்பேட்டும் மாறி மாறி இணைந்து உள்ளே உள்ள காரங்களைப் பாதுகாக்கின்றன.',
    keyFact: 'வலுவான பாஸ்போடைஎஸ்டர் பிணைப்புகள் இந்த வெளிப்புறத் தண்டை உறுதியாகப் பிடித்துள்ளன.',
  },
  'dna-sugar': {
    name: 'டீஆக்ஸிரைபோஸ் சர்க்கரை (Deoxyribose)',
    explanation:
      "5-கார்பன் கொண்ட சர்க்கரை வளையம். RNA-வின் ரைபோஸை விட ஒரு ஆக்சிஜன் குறைவாக இருப்பதால் 'டீஆக்ஸி' எனப் பெயர் பெற்றது; இதிலிருந்துதான் DNA என்ற பெயர் வந்தது.",
    keyFact: "வினைத்திறன் கொண்ட 2'-OH இல்லாததால் DNA எளிதில் சிதையாமல் நிலைத்திருக்கும்.",
  },
  'dna-phosphate': {
    name: 'பாஸ்பேட் தொகுதி (PO4⁻)',
    explanation:
      'ஒரு சர்க்கரையை அடுத்த சர்க்கரையுடன் இணைக்கும் பாலம். இதுவே DNA-வுக்கு எதிர்மறை (negative) மின்னூட்டத்தைத் தருகிறது.',
    keyFact: 'நடுவில் பாஸ்பரஸ் அணுவும் சுற்றி நான்கு ஆக்சிஜன் அணுக்களும் உள்ளன.',
  },
  'dna-bases': {
    name: 'நைட்ரஜன் காரங்கள் (A, T, G, C)',
    explanation:
      'A, T, G, C ஆகிய நான்கு எழுத்துகள். இவற்றின் வரிசையே உயிரினத்தின் மரபணுக் குறியீடாகும்.',
    keyFact: 'பியூரின்கள் (A, G) இரட்டை வளையம்; பைரிமிடின்கள் (T, C) ஒற்றை வளையம் கொண்டவை.',
  },
  'dna-at': {
    name: 'A–T இணைப்பு (2 ஹைட்ரஜன் பிணைப்புகள்)',
    explanation:
      'அடினின் (A) எப்போதும் தைமின் (T) உடன் 2 ஹைட்ரஜன் பிணைப்புகள் மூலம் இணைகிறது.',
    keyFact: 'இரட்டை-வளைய A-வும் ஒற்றை-வளைய T-யும் இணைவதால் சுருளின் அகலம் சீராக இருக்கும்.',
  },
  'dna-gc': {
    name: 'G–C இணைப்பு (3 ஹைட்ரஜன் பிணைப்புகள்)',
    explanation:
      'குவானின் (G) மற்றும் சைட்டோசின் (C) ஆகியவை 3 ஹைட்ரஜன் பிணைப்புகளால் இணைவதால் A–T-யை விட அதிக உறுதியுடன் இருக்கும்.',
    keyFact: 'G–C நிறைந்த பகுதிகளைப் பிரிக்கச் சற்று அதிக ஆற்றல் தேவைப்படும்.',
  },
  'dna-hbonds': {
    name: 'ஹைட்ரஜன் பிணைப்புகள்',
    explanation:
      'ஏணியின் நடுவில் உள்ள மென்மையான பிணைப்புகள். இரு இழைகளையும் சேர்த்து வைக்கும் அதேவேளை DNA படிக்கும்போது ஜிப் போல எளிதில் பிரிக்க உதவும்.',
    keyFact: 'தனித்தனியே மென்மையானவை என்றாலும் லட்சக்கணக்கில் சேர்ந்து குரோமோசோமை உறுதியாக்குகின்றன.',
  },
  'dna-grooves': {
    name: 'பெரிய & சிறிய பள்ளங்கள் (Major & Minor Grooves)',
    explanation:
      'சுருளில் உள்ள இரு சுழல் இடைவெளிகள். புரதங்கள் DNA-வைத் திறக்காமலேயே இந்தப் பள்ளங்கள் வழியாகக் காரங்களைத் தொட்டுப் படிக்கின்றன.',
    keyFact: 'Major groove வழியாக Cas9 போன்ற புரதங்கள் வரிசையைத் துல்லியமாக அடையாளம் காண்கின்றன.',
  },
  'dna-ends': {
    name: "5' மற்றும் 3' முனைகள் (எதிர்-இணை திசை)",
    explanation:
      "இரு இழைகளும் எதிர் திசைகளில் ஓடுகின்றன: ஒன்று 5' → 3' திசையிலும், மற்றொன்று 3' → 5' திசையிலும் இருக்கும்.",
    keyFact: "PAM வரிசை எப்போதும் இலக்கு இடத்திற்கு அடுத்து 3' பக்கத்தில் 5'→3' திசையில் சரிபார்க்கப்படும்.",
  },

  // RNA parts
  'rna-strand': {
    name: 'ஒற்றை இழை (Single Strand)',
    explanation:
      'RNA பொதுவாக ஒரே இழையாக இருப்பதால் தனக்குத் தானே மடிந்து சிக்கலான செயல் வடிவங்களை உருவாக்க முடியும்.',
    keyFact: 'ஒற்றை-இழை guide RNA மடிந்து Cas9 புரதத்திற்குள் சரியாகப் பொருந்துகிறது.',
  },
  'rna-ribose': {
    name: "ரைபோஸ் சர்க்கரை (கூடுதல் 2'-OH)",
    explanation:
      "DNA-வின் டீஆக்ஸிரைபோஸை விட இதில் ஒரு கூடுதல் OH தொகுதி உள்ளது; இது RNA-வை நெகிழ்வானதாக்குகிறது ஆனால் நிலைப்புத்தன்மை சற்றுக் குறைவு.",
    keyFact: "2'-ஹைட்ராக்சில் தொகுதியே ரைபோஸை DNA சர்க்கரையிலிருந்து வேறுபடுத்துகிறது.",
  },
  'rna-phosphate': {
    name: 'பாஸ்பேட் முதுகெலும்பு',
    explanation:
      'DNA-வில் உள்ளதைப் போலவே ரைபோஸ் சர்க்கரைகளை ஒன்றோடு ஒன்று இணைத்து நீண்ட சங்கிலியாக மாற்றுகிறது.',
    keyFact: "ஒரு ரைபோஸின் 3' கார்பனை அடுத்த ரைபோஸின் 5' கார்பனுடன் இணைக்கிறது.",
  },
  'rna-uracil': {
    name: 'யூராசில் (U) — தைமினுக்குப் பதில்',
    explanation:
      'RNA-வில் தைமின் (T)-க்கு பதிலாக யூராசில் (U) உள்ளது. U எப்போதும் அடினின் (A) உடன் இணையும்.',
    keyFact: 'GuideWise சிமுலேட்டரில் U என உள்ளிட்டால் DNA பொருத்தத்திற்காக தானாகவே T என மாற்றப்படும்.',
  },
  'rna-bases': {
    name: 'RNA காரங்கள் (A, U, G, C)',
    explanation:
      'RNA-வின் நான்கு எழுத்துகள் A, U, G, C. ஒற்றை இழையில் இருப்பதால் இவை வெளிப்படையாகப் பொருந்தத் தயாராக இருக்கும்.',
    keyFact: 'திறந்திருக்கும் இந்த RNA காரங்கள் திறக்கப்பட்ட இலக்கு DNA-வுடன் சுத்தமாக இணையும்.',
  },
  'rna-codon': {
    name: 'கோடான் (Codon · 3-எழுத்து குறியீடு)',
    explanation:
      'ஒன்றாகப் படிக்கப்படும் மூன்று RNA எழுத்துகள். ஒவ்வொரு கோடானும் புரதத்தை உருவாக்கும் ஒரு அமினோ அமிலத்தைக் குறிக்கும்.',
    keyFact: 'உதாரணமாக AUG என்பது புரத உருவாக்கத்தைத் தொடங்கும் start கோடான் ஆகும்.',
  },
  'rna-cap': {
    name: "5' மூடி (5' Cap பாதுகாப்பு)",
    explanation:
      'mRNA-வின் தொடக்க முனையில் உள்ள பாதுகாப்பு மூடி. நொதிகள் RNA-வைச் சிதைக்காமல் பாதுகாக்கிறது.',
    keyFact: 'ரைபோசோம்கள் mRNA தொடக்கத்தை அடையாளம் காண இது உதவுகிறது.',
  },
  'rna-polya': {
    name: 'பாலி-A வால் (Poly-A Tail)',
    explanation:
      'mRNA-வின் இறுதியில் பல A எழுத்துகள் இணைந்த பாதுகாப்பு வால் பகுதி.',
    keyFact: 'வால் நீளமாக இருந்தால் mRNA நீண்ட நேரம் சிதையாமல் செயல்படும்.',
  },
  'rna-hairpin': {
    name: 'ஹேர்பின் வளையம் (Hairpin Loop)',
    explanation:
      'ஒற்றை RNA இழை பின்னால் மடிந்து தன்னுடைய மற்றொரு பகுதியுடன் தானே இணைந்துகொள்ளும் அமைப்பு.',
    keyFact: 'CRISPR guide RNA-வில் உள்ள ஹேர்பின் கைப்பிடியே Cas9 புரதத்துடன் உறுதியாகப் பூட்டப்படுகிறது.',
  },

  // CRISPR parts
  'cas9-protein': {
    name: 'Cas9 புரதம் (மூலக்கூறு கத்தரிக்கோல்)',
    explanation:
      'மூலக்கூறு கத்தரிக்கோல். Guide RNA வழிகாட்டும் இடத்தில் மட்டுமே DNA-வை வெட்டும் நொதி.',
    keyFact: 'Guide RNA வந்து இணையும் வரை Cas9 செயலற்ற நிலையிலேயே இருக்கும்.',
  },
  'cas9-rec': {
    name: 'REC பிரிவு (அடையாளப் பகுதி)',
    explanation:
      'அடையாளம் காணும் (Recognition) பகுதி. Guide RNA மற்றும் இலக்கு DNA இரண்டையும் உள்ளே பிடித்துப் பொருத்தத்தைச் சரிபார்க்கும்.',
    keyFact: 'PAM அருகிலுள்ள 10-bp seed பகுதி சரியாகப் பொருந்துகிறதா என உணர்கிறது.',
  },
  'cas9-nuc': {
    name: 'NUC பிரிவு (வெட்டு & PAM படிப்பி)',
    explanation:
      'நியூக்ளியேஸ் (Nuclease) பகுதி. இதில் இரண்டு வெட்டும் பிளேடுகளும் (HNH, RuvC) PAM-ஐப் படிக்கும் பகுதியும் உள்ளன.',
    keyFact: 'PAM-படிக்கும் பகுதி, HNH மற்றும் RuvC அனைத்தும் NUC பிரிவில் உள்ளன.',
  },
  'cas9-hnh': {
    name: 'HNH வெட்டுப் பகுதி (இலக்கு இழை)',
    explanation:
      'Guide RNA-வுடன் பொருந்திய DNA இழையைத் துல்லியமாக வெட்டும் கத்திப் பகுதி.',
    keyFact: 'Seed மற்றும் முழு வரிசையும் பொருந்திய பிறகே HNH வெட்டும் நிலைக்குத் திரும்பும்.',
  },
  'cas9-ruvc': {
    name: 'RuvC வெட்டுப் பகுதி (எதிர் இழை)',
    explanation:
      'மற்றொரு (தனித்து விலக்கப்பட்ட) DNA இழையை வெட்டும் இரண்டாவது கத்திப் பகுதி.',
    keyFact: 'HNH உடன் இணைந்து இரு இழைகளிலும் இரட்டை வெட்டு (double-strand break) ஏற்படுத்துகிறது.',
  },
  'cas9-grna': {
    name: 'வழிகாட்டி RNA (Guide RNA)',
    explanation:
      'Cas9 எங்கு செல்ல வேண்டும் என வழிகாட்டும் சிறிய RNA. இதன் ~20 எழுத்துகள் DNA-வைத் தேடும்; scaffold பகுதி Cas9-ஐப் பிடித்திருக்கும்.',
    keyFact: 'PAM அருகிலுள்ள கடைசி 10 எழுத்துகள் seed பகுதி; இங்கு தவறு வந்தால் அபராதம் 3 மடங்கு.',
  },
  'cas9-pam': {
    name: 'PAM (NGG) — முதல் சோதனை அடையாளம்',
    explanation:
      'இலக்கு இடத்திற்கு உடனடியாக அடுத்து உள்ள சிறிய DNA சமிக்ஞை. Cas9 முதலில் இதையே தேடும். PAM இல்லையென்றால் வெட்டு இல்லை.',
    keyFact: 'சரியான PAM இல்லாவிட்டால் 0 தவறு இருந்தாலும் GuideWise மதிப்பெண் 0.0 ஆகும்.',
  },
  'cas9-rloop': {
    name: 'இலக்கு DNA & R-வளையம் (R-loop)',
    explanation:
      'Guide RNA ஒரு DNA இழையுடன் இணையும்போது, மற்றொரு DNA இழை பக்கவாட்டில் விலக்கப்பட்டு திறந்த குமிழி (R-loop) உருவாகிறது.',
    keyFact: 'R-loop திறப்பு PAM முனையில் தொடங்கி 5′ பக்கமாக நகர்கிறது.',
  },
  'cas9-cut': {
    name: 'வெட்டு இடம் (PAM-க்கு 3 bp முன்)',
    explanation:
      'சரியான PAM வரிசைக்கு சுமார் 3 கார இணைகளுக்கு (bp) முன்பாக இரு DNA இழைகளும் வெட்டப்படுகின்றன.',
    keyFact: 'DNA இரு துண்டுகளாகப் பிரிந்து மீண்டும் சேரும் 3D வெட்டு அனிமேஷனைப் பார்க்கலாம்.',
  },
};

export const HOLO_QUIZ_TA: Record<
  string,
  { question: string; options: string[]; explanation: string }
> = {
  'dna-q1': {
    question: 'A–T இணையை விட G–C இணைப்பு ஏன் அதிக உறுதியுடன் பிணைந்துள்ளது?',
    options: [
      'G–C-யில் 3 ஹைட்ரஜன் பிணைப்புகள் உள்ளன; A–T-யில் 2 மட்டுமே உள்ளன',
      'G–C நடுவில் சகப்பிணைப்பு (covalent bond) உள்ளது',
      'G–C-யில் தைமினுக்குப் பதில் யூராசில் உள்ளது',
      'G–C-யில் பாஸ்பேட் தொகுதி இல்லை',
    ],
    explanation:
      'குவானின் மற்றும் சைட்டோசின் நடுவில் 3 ஹைட்ரஜன் பிணைப்புகளைப் பகிர்ந்துகொள்வதால் 2-பிணைப்பு A–T-யை விட அதிக உறுதி கிடைக்கிறது.',
  },
  'dna-q2': {
    question: "Deoxyribonucleic Acid என்பதில் 'Deoxy' எதைக் குறிக்கிறது?",
    options: [
      'ஒரு காரத்திற்கு இரண்டு கூடுதல் பாஸ்பேட் வளையங்கள்',
      "RNA ரைபோஸை விட 5-கார்பன் சர்க்கரையில் ஒரு ஆக்சிஜன் அணு குறைவாக இருப்பது",
      'சிறிய பள்ளத்தில் ஹைட்ரஜன் பிணைப்பு இல்லாமை',
      "இரு இழைகளும் ஒரே 5'→3' திசையில் செல்வது",
    ],
    explanation:
      "டீஆக்ஸிரைபோஸில் ரைபோஸில் உள்ள 2'-OH ஆக்சிஜன் அணு இல்லாததால் DNA நீண்டகால நிலைப்புத்தன்மை பெறுகிறது.",
  },
  'dna-q3': {
    question: 'DNA சுருளைப் பிரிக்காமலேயே புரதங்கள் கார வரிசையைப் படிக்க உதவும் வெளிப்புற அமைப்பு எது?',
    options: [
      "5' மூடி (5' cap)",
      'பெரிய மற்றும் சிறிய பள்ளங்கள் (Major & minor grooves)',
      'பாலி-A வால்',
      'பாஸ்பேட் எதிர் மின்னூட்டம்',
    ],
    explanation:
      'சுருளின் ஓரத்தில் உள்ள Major மற்றும் Minor grooves வழியாகக் காரங்களின் வேதியியல் அமைப்பைப் புரதங்கள் படிக்கின்றன.',
  },
  'rna-q1': {
    question: 'RNA-வில் தைமின் (T)-க்கு பதிலாகப் பயன்படுத்தப்படும் காரம் எது?',
    options: ['குவானின் (G)', 'யூராசில் (U)', 'சைட்டோசின் (C)', 'அடினின் (A)'],
    explanation:
      'RNA-வில் தைமினுக்கு (T) பதிலாக யூராசில் (U) உள்ளது; இது அடினின் (A) உடன் இணையும்.',
  },
  'rna-q2': {
    question: 'ஒரு கோடான் (Codon) எத்தனை RNA எழுத்துகளால் ஆனது?',
    options: ['2 எழுத்துகள்', '3 எழுத்துகள்', '5 எழுத்துகள்', '20 எழுத்துகள்'],
    explanation:
      'அடுத்தடுத்து வரும் 3 RNA எழுத்துகள் சேர்ந்து ஒரு கோடான் எனப்படும்; இது ஒரு அமினோ அமிலத்தைக் குறிக்கும்.',
  },
  'rna-q3': {
    question: 'ஒற்றை இழையாக உள்ள RNA எப்படி ஹேர்பின் வளையத்தை (Hairpin Loop) உருவாக்குகிறது?',
    options: [
      'பின்னால் மடிந்து தன் சொந்த இழையின் பொருந்தும் காரங்களுடன் தானே இணைகிறது',
      'நியூக்ளியஸிலிருந்து இரண்டாவது DNA இழையைக் கடன் வாங்குகிறது',
      "5' மூடியும் பாலி-A வாலும் நேரடியாக இணைகின்றன",
      'பாஸ்பேட் தொகுதிகள் வட்டமாக விலகுகின்றன',
    ],
    explanation:
      'ஒரே RNA இழையில் உள்ள எதிர்-பொருந்தும் பகுதிகள் மடிந்து தண்டும் வளையமுமாக இணைகின்றன.',
  },
  'crispr-q1': {
    question: '20-nt guide RNA முழுமையாகப் பொருந்தினாலும் (0 தவறு), சரியான PAM இல்லாவிட்டால் என்ன நடக்கும்?',
    options: [
      'Cas9 முழு வேகத்தில் வெட்டும்',
      'Cas9 DNA-வைத் திறக்க முடியாது — வெட்டு இல்லை (மதிப்பெண் 0.0)',
      'HNH மட்டும் இரட்டை வேகத்தில் வெட்டும்',
      'RNA தானாகவே DNA ஆக மாறும்',
    ],
    explanation:
      'NGG போன்ற சரியான PAM இருந்தால் மட்டுமே Cas9 DNA சுருளைத் திறந்து guide RNA-வைச் சோதிக்கும்; இல்லையெனில் மதிப்பெண் 0.0.',
  },
  'crispr-q2': {
    question: 'சரியான PAM வரிசைக்கு எங்கே Cas9 இரு இழைகளையும் வெட்டுகிறது?',
    options: [
      'PAM-க்கு சுமார் 3 கார இணைகளுக்கு (bp) முன்பாக',
      'PAM-க்கு 15 கார இணைகளுக்குப் பிறகு',
      'NGG எழுத்துகளின் நடுவில்',
      'gRNA scaffold நுனியில்',
    ],
    explanation:
      'HNH மற்றும் RuvC ஆகிய இரு வெட்டுப் பகுதிகளும் PAM வரிசைக்கு 3 bp முன்பாக இரு இழைகளையும் வெட்டுகின்றன.',
  },
  'crispr-q3': {
    question: 'DNA இழைகளை வெட்டும் இரண்டு Cas9 பிரிவுகள் எவை?',
    options: [
      "REC பிரிவு மற்றும் 5' மூடி",
      'HNH பகுதி மற்றும் RuvC பகுதி',
      'பாலி-A வால் மற்றும் ரைபோஸ் வளையம்',
      'Major groove மற்றும் Minor groove',
    ],
    explanation:
      'HNH பகுதி guide RNA உடன் இணைந்த இழையையும், RuvC பகுதி விலக்கப்பட்ட எதிர் இழையையும் வெட்டுகின்றன.',
  },
};

import type { HoloLanguage, HoloModelMeta, HoloPartDef, HoloQuizQuestion } from './holoParts.js';

export function getHoloModelText(meta: HoloModelMeta, lang: HoloLanguage) {
  if (lang === 'ta') return HOLO_MODELS_TA[meta.id];
  if (lang === 'tanglish') return { title: meta.titleTanglish, subtitle: meta.subtitleTanglish };
  return { title: meta.title, subtitle: meta.subtitle };
}

export function getHoloPartText(part: HoloPartDef, lang: HoloLanguage) {
  if (lang === 'ta' && HOLO_PARTS_TA[part.id]) return HOLO_PARTS_TA[part.id];
  if (lang === 'tanglish') {
    return {
      name: part.nameTanglish,
      explanation: part.explanationTanglish,
      keyFact: part.keyFactTanglish,
    };
  }
  return { name: part.name, explanation: part.explanation, keyFact: part.keyFact };
}

export function getHoloCalloutText(
  callout: { id: string; title: string; titleTanglish: string; detail: string; detailTanglish: string },
  lang: HoloLanguage
) {
  if (lang === 'ta' && DNA_VS_RNA_CALLOUTS_TA[callout.id]) return DNA_VS_RNA_CALLOUTS_TA[callout.id];
  if (lang === 'tanglish') return { title: callout.titleTanglish, detail: callout.detailTanglish };
  return { title: callout.title, detail: callout.detail };
}

export function getHoloQuizText(q: HoloQuizQuestion, lang: HoloLanguage) {
  if (lang === 'ta' && HOLO_QUIZ_TA[q.id]) return HOLO_QUIZ_TA[q.id];
  if (lang === 'tanglish') {
    return {
      question: q.questionTanglish,
      options: q.optionsTanglish,
      explanation: q.explanationTanglish,
    };
  }
  return { question: q.question, options: q.options, explanation: q.explanation };
}

