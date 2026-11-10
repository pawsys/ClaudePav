#!/usr/bin/env python3
"""Validate the generated modality files written by the generation lanes.

Each lane writes therapy-space/data/generated/<lane>.json:
  {"lane": "<lane id>", "modalities": [{"id", "name", "tagline", "whatItIs", "coreIdea",
   "whatYouDo", "whoItsFor", "cautions", "tweet"}, ...]}

Usage (from the repository root):
  python3 -B therapy-space/scripts/check_generated.py              all files in the folder
  python3 -B therapy-space/scripts/check_generated.py --only lane-03 lane-04
                                                                  just these files (lane ids or paths)
  python3 -B therapy-space/scripts/check_generated.py --complete   also require all 630 ids
  python3 -B therapy-space/scripts/check_generated.py --self-test  fixture test of this checker
Options: --generated DIR (default therapy-space/data/generated), --points FILE (default
therapy-space/data/points.json), --anchors DIR (default therapy-space/data/anchors; used
for alsoKnownAs names when present).

Rules, each with the problem code it reports:
  json, keys, type   valid JSON; {"lane", "modalities"} at the top; exactly the nine keys per
                     modality, every value a non-empty string
  lane               "lane" equals the file name without .json, lowercase letters, digits, hyphens
  id-unknown         id is a generated id in points.json
  id-duplicate       each id appears once across all checked files
  name-words         name has 2 to 5 words
  name-duplicate     names are unique across all checked files (case and punctuation ignored)
  name-taken         name differs from every established name, shortName and alsoKnownAs,
                     and from a list of well-known existing therapies and practices
  name-acronym       name does not contain the acronym of an established or well-known method
  tagline-words      tagline has at most 12 words
  sentences          whatItIs 2 to 3, coreIdea 1 to 2, whatYouDo 2 to 3, whoItsFor 1 to 2,
                     cautions 1 to 2 sentences (counted approximately)
  tweet-length       at most 260 by X's weighted count (twitter-text 3.1.0: code points in
                     U+0000-10FF, U+2000-200D, U+2010-201F, U+2032-2037 count 1, everything else
                     2, each emoji sequence 2, each URL 23; text NFC-normalized first). A URL is
                     anything starting http:// or https://, or a domain (www. included) that ends
                     in one of the top-level domains twitter-text 3.1.0 lists, as on X: example.de
                     and notes.health are URLs, Node.js, foo.json and breath.Then are not
  tweet-hashtags     at most one hashtag
  tweet-emoji        at most one emoji. A flag, keycap, skin-tone or tag sequence counts as one,
                     and so does a ZWJ sequence made of parts X joined in twitter-text 3.1.0
                     (U+2764 U+FE0F U+200D U+1F525 is still two). Symbols X draws as emoji count
                     even without U+FE0F (for example U+2600, the sun), except the copyright,
                     registered and trademark signs, which count only when U+FE0F follows them;
                     U+FE0E (text style) stops any of them counting. Non-BMP symbols count only
                     when Unicode marks them Emoji (U+1F004 does, U+1F0A1 does not)
  tweet-new          the tweet signals a new concept: new, novel, concept, idea, what if,
                     imagine, picture this, suppose, invented, imagined, proposed, speculative,
                     experimental, untested, prototype, hypothetical or thought experiment
  tweet-claim        no claim that it treats, cures, heals or fixes anything. Caught: any form
                     of cure or heal, "guaranteed", "proven", "clinically/scientifically
                     proven" (or tested, backed...), "can treat" (or will, may, helps...),
                     "fix/fixes/fixed/fixing your" (or my, the...), "fixes", "relief from
                     anxiety", an effect verb (treat, fix, fixed, fixing, relieve, reverse, beat,
                     end, eliminate...) on a condition ("treat your anxiety"), "treats" after a
                     subject ("it treats"), and "treatment", "remedy", "fix for" or a condition
                     plus "fix" when the tweet calls the modality one ("a new anxiety
                     treatment", "the ultimate stress remedy", "your new burnout remedy", "your
                     fix for burnout", "a 10-minute anxiety fix"). Not caught, so caveats pass:
                     - a negator in the same clause that governs the phrase. A clause ends at
                       . ! ? ; : , or "but", except a comma in a list of denied effects ("not
                       designed to treat, cure or prevent"). Negators: not, never, any n't word
                       (with or without the apostrophe), cannot, hardly, no, zero, without,
                       lacks, neither, nothing, nobody, no one, none, and "far from", "nowhere
                       near", "rather than", "instead of" before a short phrase. A negator
                       governs only what it denies, so these stay claims: what is not needed
                       ("no pills needed to cure anxiety", "you don't need therapy to heal"),
                       a new clause ("without pills it heals", "and it heals", "because it
                       heals"), who knows ("not everyone knows it heals", "nobody told you a
                       walk could heal"), comparisons ("nothing heals grief like this"),
                       emphasis ("no wonder", "no other", "never before", "not only", "never
                       fails to", "don't wait to"), double negatives ("nothing it can't heal")
                       and a caveat taken back ("..., but it does"). Denials that pass: "no
                       proof it heals", "nobody has tested whether it heals", "nothing here is
                       proven", "no one should use it to treat anxiety", "no need to fix"
                     - someone else's care: "any treatment for", "about treatment for", "in
                       treatment for", "a substitute for treatment", "keep your treatment",
                       "treatment plan", "doctors treat anxiety", "therapy can heal"
                     - "treats" as a noun ("dog treats") or idiom ("treats the walk like a
                       game"), "quick fixes" as a noun, "fixes nothing", "fix your gaze", "a
                       fixed sleep schedule", "the healing professions", "healing takes time"
                     - a negated verb after it ("Healing isn't promised") and a question
                       answered no ("Proven? No.", "Clinically tested? Not yet.", "Heals? Who
                       knows.")
                     Synonyms outside treat, cure, heal and fix ("reduces", "resolves") are not
                     checked
  tweet-mention      no @mentions, with the ASCII or full-width at sign (the generation brief
                     allows none)
  tweet-link         no links (the generation brief allows none)
  dash               no em or en dash (or look-alike) in any string, keys included

Exit code 0 when every checked file passes, 1 on any problem (or when no files are found).
"""
import argparse
import json
import re
import sys
import tempfile
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_points as bp  # noqa: E402
from check_data import count_sentences, count_words, find_dashes  # noqa: E402

MODALITY_KEYS = ["id", "name", "tagline", "whatItIs", "coreIdea", "whatYouDo", "whoItsFor",
                 "cautions", "tweet"]
SENTENCE_RANGES = {"whatItIs": (2, 3), "coreIdea": (1, 2), "whatYouDo": (2, 3),
                   "whoItsFor": (1, 2), "cautions": (1, 2)}
NAME_WORDS = (2, 5)
TAGLINE_MAX_WORDS = 12
TWEET_MAX = 260
LANE_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")

# Well-known existing therapies and practices a generated name must not reuse. Not complete:
# it backs up the rule that names are original, alongside the established names.
KNOWN_PRACTICES = [
    "Internal Family Systems", "Ideal Parent Figure", "Ideal Parent Figure Protocol",
    "Cognitive Behavioral Therapy", "Cognitive Behavioural Therapy", "Cognitive Therapy",
    "Acceptance and Commitment Therapy", "Coherence Therapy", "Depth-Oriented Brief Therapy",
    "Focusing", "Focusing-Oriented Therapy", "Aletheia Coaching", "Integral Coaching",
    "Eye Movement Desensitization and Reprocessing", "Dialectical Behavior Therapy",
    "Mindfulness-Based Stress Reduction", "Mindfulness-Based Cognitive Therapy",
    "Compassion Focused Therapy", "Compassion-Focused Therapy", "Emotionally Focused Therapy",
    "Emotion-Focused Therapy", "Schema Therapy", "Somatic Experiencing",
    "Sensorimotor Psychotherapy", "Hakomi", "Hakomi Method", "Brainspotting",
    "Accelerated Experiential Dynamic Psychotherapy", "Psychodynamic Therapy", "Psychoanalysis",
    "Gestalt Therapy", "Narrative Therapy", "Solution-Focused Brief Therapy",
    "Motivational Interviewing", "Interpersonal Psychotherapy", "Exposure and Response Prevention",
    "Prolonged Exposure", "Cognitive Processing Therapy", "Imagery Rescripting",
    "Rational Emotive Behavior Therapy", "Logotherapy", "Existential Therapy",
    "Person-Centered Therapy", "Client-Centered Therapy", "Art Therapy", "Dance Movement Therapy",
    "Drama Therapy", "Psychodrama", "Music Therapy", "Play Therapy", "Sandplay Therapy",
    "Ecotherapy", "Forest Bathing", "Shinrin-yoku", "Wilderness Therapy", "Adventure Therapy",
    "Horticultural Therapy", "Equine-Assisted Psychotherapy", "Equine Therapy", "Pet Therapy",
    "Animal-Assisted Therapy", "Yoga", "Yoga Nidra", "Tai Chi", "Qigong", "Baduanjin", "Pilates",
    "Feldenkrais Method", "Alexander Technique", "Rolfing", "Holotropic Breathwork",
    "Wim Hof Method", "Transcendental Meditation", "Zazen", "Shikantaza", "Mindful Self-Compassion",
    "Loving-Kindness Meditation", "Body Scan", "Progressive Muscle Relaxation",
    "Autogenic Training", "Biofeedback", "Neurofeedback", "Laughter Yoga", "Ecstatic Dance",
    "5Rhythms", "Authentic Movement", "Nonviolent Communication", "Circling", "Authentic Relating",
    "Voice Dialogue", "Family Constellations", "Safe and Sound Protocol",
    "Trauma Releasing Exercises", "Tension and Trauma Releasing Exercises", "Social Prescribing",
    "Guided Imagery and Music", "Bonny Method", "See Hear Feel", "Sensory Awareness",
    "Do Nothing", "Metta", "Vipassana", "Jhana", "Tabata", "CrossFit", "Parkrun",
    "High-Intensity Interval Training", "Interval Training", "Strength Training",
    "Resistance Training", "Endurance Training", "Running Therapy", "Nature Therapy",
]
KNOWN_ACRONYMS = ["EMDR", "DBT", "MBSR", "MBCT", "CFT", "EFT", "IPT", "ERP", "CPT", "AEDP",
                  "ISTDP", "REBT", "SFBT", "NVC", "MSC", "PMR", "GIM", "AAT", "MICT", "DOBT",
                  "ACT", "CBT", "IFS", "IPF", "TRE", "HIIT", "HIT", "MBT"]

# twitter-text v3 weights.
WEIGHT_ONE_RANGES = [(0x0000, 0x10FF), (0x2000, 0x200D), (0x2010, 0x201F), (0x2032, 0x2037)]
URL_WEIGHT = 23
EMOJI_WEIGHT = 2

# Emoji data (Unicode emoji-data): BMP characters shown as emoji by default, and BMP
# characters that become emoji only with U+FE0F or a skin-tone modifier after them.
EMOJI_PRESENTATION_BMP = [
    (0x231A, 0x231B), (0x23E9, 0x23EC), (0x23F0, 0x23F0), (0x23F3, 0x23F3), (0x25FD, 0x25FE),
    (0x2614, 0x2615), (0x2648, 0x2653), (0x267F, 0x267F), (0x2693, 0x2693), (0x26A1, 0x26A1),
    (0x26AA, 0x26AB), (0x26BD, 0x26BE), (0x26C4, 0x26C5), (0x26CE, 0x26CE), (0x26D4, 0x26D4),
    (0x26EA, 0x26EA), (0x26F2, 0x26F3), (0x26F5, 0x26F5), (0x26FA, 0x26FA), (0x26FD, 0x26FD),
    (0x2705, 0x2705), (0x270A, 0x270B), (0x2728, 0x2728), (0x274C, 0x274C), (0x274E, 0x274E),
    (0x2753, 0x2755), (0x2757, 0x2757), (0x2795, 0x2797), (0x27B0, 0x27B0), (0x27BF, 0x27BF),
    (0x2B1B, 0x2B1C), (0x2B50, 0x2B50), (0x2B55, 0x2B55),
]
EMOJI_TEXT_DEFAULT_BMP = [
    (0x00A9, 0x00A9), (0x00AE, 0x00AE), (0x203C, 0x203C), (0x2049, 0x2049), (0x2122, 0x2122),
    (0x2139, 0x2139), (0x2194, 0x2199), (0x21A9, 0x21AA), (0x2328, 0x2328), (0x23CF, 0x23CF),
    (0x23ED, 0x23EF), (0x23F1, 0x23F2), (0x23F8, 0x23FA), (0x24C2, 0x24C2), (0x25AA, 0x25AB),
    (0x25B6, 0x25B6), (0x25C0, 0x25C0), (0x25FB, 0x25FC), (0x2600, 0x2604), (0x260E, 0x260E),
    (0x2611, 0x2611), (0x2618, 0x2618), (0x261D, 0x261D), (0x2620, 0x2620), (0x2622, 0x2623),
    (0x2626, 0x2626), (0x262A, 0x262A), (0x262E, 0x262F), (0x2638, 0x263A), (0x2640, 0x2640),
    (0x2642, 0x2642), (0x265F, 0x2660), (0x2663, 0x2663), (0x2665, 0x2666), (0x2668, 0x2668),
    (0x267B, 0x267B), (0x267E, 0x267E), (0x2692, 0x2692), (0x2694, 0x2697), (0x2699, 0x2699),
    (0x269B, 0x269C), (0x26A0, 0x26A0), (0x26A7, 0x26A7), (0x26B0, 0x26B1), (0x26C8, 0x26C8),
    (0x26CF, 0x26CF), (0x26D1, 0x26D1), (0x26D3, 0x26D3), (0x26E9, 0x26E9), (0x26F0, 0x26F1),
    (0x26F4, 0x26F4), (0x26F7, 0x26F9), (0x2702, 0x2702), (0x2708, 0x2709), (0x270C, 0x270D),
    (0x270F, 0x270F), (0x2712, 0x2712), (0x2714, 0x2714), (0x2716, 0x2716), (0x271D, 0x271D),
    (0x2721, 0x2721), (0x2733, 0x2734), (0x2744, 0x2744), (0x2747, 0x2747), (0x2763, 0x2764),
    (0x27A1, 0x27A1), (0x2934, 0x2935), (0x2B05, 0x2B07), (0x3030, 0x3030), (0x303D, 0x303D),
    (0x3297, 0x3297), (0x3299, 0x3299),
]
# Emoji code points outside the BMP (Unicode emoji-data, Emoji=Yes), apart from the regional
# indicators, which pair into flags. Neighbors such as playing cards or enclosed letters are not emoji.
EMOJI_SMP = [
    (0x1F004, 0x1F004), (0x1F0CF, 0x1F0CF), (0x1F170, 0x1F171), (0x1F17E, 0x1F17F),
    (0x1F18E, 0x1F18E), (0x1F191, 0x1F19A), (0x1F201, 0x1F202), (0x1F21A, 0x1F21A),
    (0x1F22F, 0x1F22F), (0x1F232, 0x1F23A), (0x1F250, 0x1F251), (0x1F300, 0x1F321),
    (0x1F324, 0x1F393), (0x1F396, 0x1F397), (0x1F399, 0x1F39B), (0x1F39E, 0x1F3F0),
    (0x1F3F3, 0x1F3F5), (0x1F3F7, 0x1F4FD), (0x1F4FF, 0x1F53D), (0x1F549, 0x1F54E),
    (0x1F550, 0x1F567), (0x1F56F, 0x1F570), (0x1F573, 0x1F57A), (0x1F587, 0x1F587),
    (0x1F58A, 0x1F58D), (0x1F590, 0x1F590), (0x1F595, 0x1F596), (0x1F5A4, 0x1F5A5),
    (0x1F5A8, 0x1F5A8), (0x1F5B1, 0x1F5B2), (0x1F5BC, 0x1F5BC), (0x1F5C2, 0x1F5C4),
    (0x1F5D1, 0x1F5D3), (0x1F5DC, 0x1F5DE), (0x1F5E1, 0x1F5E1), (0x1F5E3, 0x1F5E3),
    (0x1F5E8, 0x1F5E8), (0x1F5EF, 0x1F5EF), (0x1F5F3, 0x1F5F3), (0x1F5FA, 0x1F64F),
    (0x1F680, 0x1F6C5), (0x1F6CB, 0x1F6D2), (0x1F6D5, 0x1F6D7), (0x1F6DC, 0x1F6E5),
    (0x1F6E9, 0x1F6E9), (0x1F6EB, 0x1F6EC), (0x1F6F0, 0x1F6F0), (0x1F6F3, 0x1F6FC),
    (0x1F7E0, 0x1F7EB), (0x1F7F0, 0x1F7F0), (0x1F90C, 0x1F93A), (0x1F93C, 0x1F945),
    (0x1F947, 0x1F9FF), (0x1FA70, 0x1FA7C), (0x1FA80, 0x1FA89), (0x1FA8F, 0x1FAC6),
    (0x1FACE, 0x1FADC), (0x1FADF, 0x1FAE9), (0x1FAF0, 0x1FAF8),
]
# Code points that may follow a ZWJ inside one emoji in twitter-text 3.1.0, whose emoji data is
# about Unicode Emoji 12: families, couples, genders, jobs, hair, the rainbow and pirate flags,
# service dog and people holding hands. Later sequences, such as the heart on fire, count there
# as separate emoji joined by a ZWJ, so they count that way here too.
ZWJ_JOINABLE = {
    0x2620, 0x2640, 0x2642, 0x2695, 0x2696, 0x2708, 0x2764, 0x1F308, 0x1F33E, 0x1F373, 0x1F393,
    0x1F3A4, 0x1F3A8, 0x1F3EB, 0x1F3ED, 0x1F466, 0x1F467, 0x1F468, 0x1F469, 0x1F48B, 0x1F4BB,
    0x1F4BC, 0x1F527, 0x1F52C, 0x1F5E8, 0x1F680, 0x1F692, 0x1F91D, 0x1F9AF, 0x1F9B0, 0x1F9B1,
    0x1F9B2, 0x1F9B3, 0x1F9BA, 0x1F9BC, 0x1F9BD, 0x1F9D1,
}
VS15, VS16, ZWJ, KEYCAP = 0xFE0E, 0xFE0F, 0x200D, 0x20E3
KEYCAP_BASES = {ord(c) for c in "0123456789#*"}
# The copyright, registered and trademark signs are drawn as emoji only when U+FE0F follows.
TEXT_STYLE_ONLY = {0x00A9, 0x00AE, 0x2122}

# Top-level domains twitter-text 3.1.0 accepts for a URL written without http(s)://
# (its validGTLD and validCCTLD lists, ASCII entries only: 1164 generic, 255 country).
# A bare domain counts as a URL only when it ends in one of these, as on X.
GENERIC_TLDS = (
    "aaa aarp abarth abb abbott abbvie abc able abogado abudhabi academy accenture accountant "
    "accountants aco active actor adac ads adult aeg aero aetna afamilycompany afl africa agakhan "
    "agency aig aigo airbus airforce airtel akdn alfaromeo alibaba alipay allfinanz allstate ally "
    "alsace alstom americanexpress americanfamily amex amfam amica amsterdam analytics android "
    "anquan anz aol apartments app apple aquarelle arab aramco archi army arpa art arte asda asia "
    "associates athleta attorney auction audi audible audio auspost author auto autos avianca aws "
    "axa azure baby baidu banamex bananarepublic band bank bar barcelona barclaycard barclays "
    "barefoot bargains baseball basketball bauhaus bayern bbc bbt bbva bcg bcn beats beauty beer "
    "bentley berlin best bestbuy bet bharti bible bid bike bing bingo bio biz black blackfriday "
    "blanco blockbuster blog bloomberg blue bms bmw bnl bnpparibas boats boehringer bofa bom bond "
    "boo book booking boots bosch bostik boston bot boutique box bradesco bridgestone broadway "
    "broker brother brussels budapest bugatti build builders business buy buzz bzh cab cafe cal "
    "call calvinklein cam camera camp cancerresearch canon capetown capital capitalone car caravan "
    "cards care career careers cars cartier casa case caseih cash casino cat catering catholic cba "
    "cbn cbre cbs ceb center ceo cern cfa cfd chanel channel charity chase chat cheap chintai chloe "
    "christmas chrome chrysler church cipriani circle cisco citadel citi citic city cityeats claims "
    "cleaning click clinic clinique clothing cloud club clubmed coach codes coffee college cologne "
    "com comcast commbank community company compare computer comsec condos construction consulting "
    "contact contractors cooking cookingchannel cool coop corsica country coupon coupons courses "
    "cpa credit creditcard creditunion cricket crown crs cruise cruises csc cuisinella cymru cyou "
    "dabur dad dance data date dating datsun day dclk dds deal dealer deals degree delivery dell "
    "deloitte delta democrat dental dentist desi design dev dhl diamonds diet digital direct "
    "directory discount discover dish diy dnp docs doctor dodge dog doha domains doosan dot "
    "download drive dtv dubai duck dunlop duns dupont durban dvag dvr earth eat eco edeka edu "
    "education email emerck energy engineer engineering enterprises epost epson equipment ericsson "
    "erni esq estate esurance etisalat eurovision eus events everbank exchange expert exposed "
    "express extraspace fage fail fairwinds faith family fan fans farm farmers fashion fast fedex "
    "feedback ferrari ferrero fiat fidelity fido film final finance financial fire firestone "
    "firmdale fish fishing fit fitness flickr flights flir florist flowers flsmidth fly foo food "
    "foodnetwork football ford forex forsale forum foundation fox free fresenius frl frogans "
    "frontdoor frontier ftr fujitsu fujixerox fun fund furniture futbol fyi gal gallery gallo "
    "gallup game games gap garden gay gbiz gdn gea gent genting george ggee gift gifts gives giving "
    "glade glass gle global globo gmail gmbh gmo gmx godaddy gold goldpoint golf goo goodhands "
    "goodyear goog google gop got gov grainger graphics gratis green gripe grocery group guardian "
    "gucci guge guide guitars guru hair hamburg hangout haus hbo hdfc hdfcbank health healthcare "
    "help helsinki here hermes hgtv hiphop hisamitsu hitachi hiv hkt hockey holdings holiday "
    "homedepot homegoods homes homesense honda honeywell horse hospital host hosting hot hoteles "
    "hotels hotmail house how hsbc htc hughes hyatt hyundai ibm icbc ice icu ieee ifm iinet ikano "
    "imamat imdb immo immobilien inc industries infiniti info ing ink institute insurance insure "
    "int intel international intuit investments ipiranga irish iselect ismaili ist istanbul itau "
    "itv iveco iwc jaguar java jcb jcp jeep jetzt jewelry jio jlc jll jmp jnj jobs joburg jot joy "
    "jpmorgan jprs juegos juniper kaufen kddi kerryhotels kerrylogistics kerryproperties kfh kia "
    "kim kinder kindle kitchen kiwi koeln komatsu kosher kpmg kpn krd kred kuokgroup kyoto lacaixa "
    "ladbrokes lamborghini lamer lancaster lancia lancome land landrover lanxess lasalle lat latino "
    "latrobe law lawyer lds lease leclerc lefrak legal lego lexus lgbt liaison lidl life "
    "lifeinsurance lifestyle lighting like lilly limited limo lincoln linde link lipsy live living "
    "lixil llc llp loan loans locker locus loft lol london lotte lotto love lpl lplfinancial ltd "
    "ltda lundbeck lupin luxe luxury macys madrid maif maison makeup man management mango map "
    "market marketing markets marriott marshalls maserati mattel mba mcd mcdonalds mckinsey med "
    "media meet melbourne meme memorial men menu meo merckmsd metlife miami microsoft mil mini mint "
    "mit mitsubishi mlb mls mma mobi mobile mobily moda moe moi mom monash money monster montblanc "
    "mopar mormon mortgage moscow moto motorcycles mov movie movistar msd mtn mtpc mtr museum "
    "mutual mutuelle nab nadex nagoya name nationwide natura navy nba nec net netbank netflix "
    "network neustar new newholland news next nextdirect nexus nfl ngo nhk nico nike nikon ninja "
    "nissan nissay nokia northwesternmutual norton now nowruz nowtv nra nrw ntt nyc obi observer "
    "off office okinawa olayan olayangroup oldnavy ollo omega one ong onion onl online onyourside "
    "ooo open oracle orange org organic orientexpress origins osaka otsuka ott ovh page "
    "pamperedchef panasonic panerai paris pars partners parts party passagens pay pccw pet pfizer "
    "pharmacy phd philips phone photo photography photos physio piaget pics pictet pictures pid pin "
    "ping pink pioneer pizza place play playstation plumbing plus pnc pohl poker politie porn post "
    "pramerica praxi press prime pro prod productions prof progressive promo properties property "
    "protection pru prudential pub pwc qpon quebec quest qvc racing radio raid read realestate "
    "realtor realty recipes red redstone redumbrella rehab reise reisen reit reliance ren rent "
    "rentals repair report republican rest restaurant review reviews rexroth rich richardli ricoh "
    "rightathome ril rio rip rmit rocher rocks rodeo rogers room rsvp rugby ruhr run rwe ryukyu "
    "saarland safe safety sakura sale salon samsclub samsung sandvik sandvikcoromant sanofi sap "
    "sapo sarl sas save saxo sbi sbs sca scb schaeffler schmidt scholarships school schule schwarz "
    "science scjohnson scor scot search seat secure security seek select sener services ses seven "
    "sew sex sexy sfr shangrila sharp shaw shell shia shiksha shoes shop shopping shouji show "
    "showtime shriram silk sina singles site ski skin sky skype sling smart smile sncf soccer "
    "social softbank software sohu solar solutions song sony soy space spiegel sport spot "
    "spreadbetting srl srt stada staples star starhub statebank statefarm statoil stc stcgroup "
    "stockholm storage store stream studio study style sucks supplies supply support surf surgery "
    "suzuki swatch swiftcover swiss sydney symantec systems tab taipei talk taobao target "
    "tatamotors tatar tattoo tax taxi tci tdk team tech technology tel telecity telefonica temasek "
    "tennis teva thd theater theatre tiaa tickets tienda tiffany tips tires tirol tjmaxx tjx tkmaxx "
    "tmall today tokyo tools top toray toshiba total tours town toyota toys trade trading training "
    "travel travelchannel travelers travelersinsurance trust trv tube tui tunes tushu tvs ubank ubs "
    "uconnect unicom university uno uol ups vacations vana vanguard vegas ventures verisign "
    "versicherung vet viajes video vig viking villas vin vip virgin visa vision vista vistaprint "
    "viva vivo vlaanderen vodka volkswagen volvo vote voting voto voyage vuelos wales walmart "
    "walter wang wanggou warman watch watches weather weatherchannel webcam weber website wed "
    "wedding weibo weir whoswho wien wiki williamhill win windows wine winners wme wolterskluwer "
    "woodside work works world wow wtc wtf xbox xerox xfinity xihuan xin xperia xxx xyz yachts "
    "yahoo yamaxun yandex yodobashi yoga yokohama you youtube yun zappos zara zero zip zippo zone "
    "zuerich "
).split()
COUNTRY_TLDS = (
    "ac ad ae af ag ai al am an ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo "
    "bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm "
    "do dz ec ee eg eh er es et eu fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs "
    "gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp "
    "kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms "
    "mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps "
    "pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st su sv sx sy sz "
    "tc td tf tg th tj tk tl tm tn to tp tr tt tv tw tz ua ug uk um us uy uz va vc ve vg vi vn vu "
    "wf ws ye yt za zm zw "
).split()

_TLD_ALTERNATION = "|".join(sorted(set(GENERIC_TLDS) | set(COUNTRY_TLDS), key=lambda t: (-len(t), t)))
URL_RE = re.compile(
    r"(?<![A-Za-z0-9@$#\U0000FF20\U0000FF03])https?://\S+"
    r"|(?<![A-Za-z0-9@$#\U0000FF20\U0000FF03_./-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+"
    r"(?:" + _TLD_ALTERNATION + r")(?![a-z0-9-])(?:/\S*)?",
    re.IGNORECASE)
URL_TRAILING = ".,;:!?)]}'\"\U00002019\U0000201D"
HASHTAG_RE = re.compile(r"(?<![\w&])[#\U0000FF03](?![\U0000FE0F\U000020E3])(\w+)")
MENTION_RE = re.compile(r"(?<![A-Za-z0-9_!#$%&*@\U0000FF20])[@\U0000FF20][A-Za-z0-9_]{1,20}(?![@\U0000FF20])")
NOVELTY_RE = re.compile(
    r"(?i)\b(?:new|novel|concepts?|ideas?|what\s+if|imagine|imagining|"
    r"picture\s+(?:this|a|an|yourself)|suppose|invented|imagined|proposed|proposal|speculative|"
    r"experimental|untested|prototype|hypothetical|thought\s+experiment)\b")

# ---- claim detection (tweet-claim)
# Conditions that a claim verb can act on: "treat your anxiety", "fix low mood", "beat stress".
CONDITIONS = (
    "anxiety anxieties depression stress burnout insomnia trauma traumas ptsd cptsd pain grief "
    "panic worry worries mood moods loneliness addiction addictions ocd adhd sleep sleeplessness "
    "fatigue exhaustion illness illnesses disease diseases disorder disorders symptom symptoms "
    "wound wounds phobia phobias rumination overthinking sadness anger rage shame guilt fear fears "
    "tension headache headaches migraine migraines psychosis dementia heartbreak procrastination "
    "perfectionism dread despair nerves blues injury injuries inflammation everything").split()
CONDITION_WORDS = set(CONDITIONS) - {"everything"}
_DETERMINER = r"(?:your|the|any|all|my|their|our|his|her|this|that|these|those|its|every)"
_FREE_WORD = (r"(?:(?!(?:of|for|to|with|and|or|in|on|at|from|by|as|into|about|if|when|while|"
              r"than)\b)[a-z']+\s+)")
_CONDITION = r"(?:" + "|".join(CONDITIONS) + r")"
_EFFECT_VERB = (r"(?:treat|treats|treated|treating|fix|fixes|fixed|fixing|relieve|relieves|relieved|"
                r"relieving|reverse|reverses|reversed|beat|beats|overcome|overcomes|end|ends|stop|"
                r"stops|eliminate|eliminates|eradicate|eradicates|cure|cures|heal|heals)")
_ON_CONDITION = r"\s+(?:" + _DETERMINER + r"\s+)?" + _FREE_WORD + r"?" + _CONDITION + r"\b"
CLAIM_RE = re.compile(
    r"(?P<evidence>\b(?:clinically|scientifically|medically)\s+"
    r"(?:proven|tested|validated|shown|backed|approved|effective|significant|designed)\b)"
    r"|(?P<relief>\brelief\s+(?:from|for|of)" + _ON_CONDITION + r")"
    r"|(?P<noun_for>\bfix(?:es)?\s+for\b)"
    r"|(?P<cond_fix>\b(?:" + "|".join(sorted(CONDITION_WORDS)) + r")\s+fix(?:es)?\b)"
    r"|(?P<noun>\b(?:treatments?|remed(?:y|ies))\b)"
    r"|(?P<quick_fix>\bquick\s+fix(?:es)?\b)"
    r"|(?P<modal>\b(?:can|will|may|might|could|helps?|helping)\s+(?:treat|fix|heal|cure|relieve|"
    r"reverse)\b)"
    r"|(?P<fix_you>\bfix(?:es)?\s+(?:your|you|my|me|our|us|the|any|every|all|everything)\b"
    r"|\bfix(?:ed|ing)\s+(?:your|you|my|me|our|us|everything)\b)"
    r"|(?P<verb>\b" + _EFFECT_VERB + _ON_CONDITION + r")"
    r"|(?P<fixes>\bfixes\b)"
    r"|(?P<treats>\btreats\b)"
    r"|(?P<word>\b(?:cure[sd]?|curing|curative|heal(?:s|ed|ing)?|guarantee[sd]?|proven|"
    r"eliminates?|eradicates?)\b)",
    re.IGNORECASE)

# Negators, by how far their scope reaches (see _negation_governs).
ADVERB_NEGATORS = {"not", "never", "nor", "cannot", "nope", "hardly", "scarcely", "dont", "doesnt",
                   "isnt", "arent", "wasnt", "werent", "hasnt", "havent", "hadnt", "didnt", "wont",
                   "cant", "couldnt", "wouldnt", "shouldnt", "aint"}
DETERMINER_NEGATORS = {"no", "zero", "without", "lack", "lacks", "lacking", "neither"}
PRONOUN_NEGATORS = {"nothing", "nobody", "noone", "none"}
NEGATORS = ADVERB_NEGATORS | DETERMINER_NEGATORS | PRONOUN_NEGATORS
# Two-word negators, which reach only a short noun phrase: "an idea rather than a cure".
PHRASE_NEGATORS = {("rather", "than"), ("instead", "of"), ("far", "from"), ("nowhere", "near")}
# Words that answer a question about a claim in the negative ("Proven? Untested.").
NEGATIVE_ANSWERS = NEGATORS | {"untested", "unproven", "unclear", "unknown", "maybe", "perhaps"}
# Negator plus next word that stress a claim instead of denying it: "no wonder it heals",
# "no other walk heals", "never before has", "not only does it heal", "nothing else heals".
EMPHATIC = {"no": {"wonder", "doubt", "other", "question"}, "never": {"before"},
            "not": {"only", "just", "merely", "simply"}, "nothing": {"else"}, "nobody": {"else"},
            "none": {"else"}, "wont": {"believe"}, "wouldnt": {"believe"}}
# "not everyone knows it heals": the negator is about who, not about the claim.
QUANTIFIERS = {"everyone", "everybody", "all", "every", "many", "most", "anyone", "anybody"}
# Verbs whose negation denies the claim that follows: "nobody has tested whether it heals".
DENIAL_VERBS = {"claim", "claims", "claimed", "claiming", "say", "says", "said", "saying", "promise",
                "promises", "promised", "guarantee", "guarantees", "guaranteed", "prove", "proves",
                "proved", "proven", "show", "shows", "showed", "shown", "test", "tests", "tested",
                "study", "studies", "studied", "check", "checked", "verify", "verified", "find",
                "finds", "found", "measure", "measured", "suggest", "suggests", "suggested", "think",
                "thinks", "argue", "argues", "know", "knows", "knew", "pretend", "pretends",
                "pretended", "pretending", "promising", "testing", "showing", "suggesting",
                "guaranteeing", "tell", "tells", "telling", "swear", "swears", "insist", "insists",
                "assert", "asserts", "meant", "designed", "intended", "supposed"}
# Negator plus next word that stress a claim: "never fails to heal", "never doubt that it heals",
# "don't wait to heal your trauma".
EMPHATIC_VERBS = {"fail", "fails", "failed", "doubt", "wait", "hesitate"}
EASIER = {"easier", "simpler", "better", "faster", "quicker"}  # "never been easier to heal"
# Verbs that take the claim as a fact: "you'd never guess it heals", "never knew a walk could heal".
FACTIVE_VERBS = {"know", "knows", "knew", "realize", "realized", "realise", "realised", "guess",
                 "guessed", "imagine", "imagined", "notice", "noticed", "suspect", "suspected"}
# Nouns whose negation denies the claim that follows: "no proof it heals", "no claims that it heals".
EPISTEMIC_NOUNS = {"claim", "claims", "promise", "promises", "proof", "proofs", "evidence",
                   "guarantee", "guarantees", "data", "study", "studies", "research", "trial",
                   "trials", "sign", "signs", "suggestion", "reason", "way", "idea", "telling",
                   "saying", "knowing", "word", "pretending", "pretence", "pretense"}
# "no pills needed to cure anxiety", "you don't need therapy to heal": the negator is about what is
# needed, and the purpose after "to" is still claimed.
NEED_WORDS = {"need", "needs", "needed", "require", "requires", "required", "necessary", "involved",
              "take", "takes", "took"}
SUBJECT_WORDS = {"it", "this", "they", "you", "we", "i", "he", "she", "there"}
TAIL_SUBJECTS = SUBJECT_WORDS - {"this", "there"}  # "treat this as a cure": "this" is the object
SCOPE_ENDERS = {"how", "why"}
# A new clause after the negator: "and it heals", "and still heals", "because it heals".
COORDINATORS = {"and", "or", "so", "yet", "then"}
SUBORDINATORS = {"because", "since", "once", "when", "after", "until", "although", "though",
                 "whereas", "while"}
PROHIBITING = {"should", "must", "ought"}  # "nobody should use it to treat anxiety"
# Words skipped between a pronoun negator and its verb: "nothing here is", "none of this has ever".
SKIPPABLE = {"has", "have", "had", "is", "are", "was", "were", "be", "been", "can", "could", "will",
             "would", "should", "may", "might", "must", "does", "do", "did", "ever", "yet", "really",
             "actually", "truly", "even", "here", "there", "so", "far", "seriously", "properly",
             "formally", "else"}
COMPARATIVES = {"like", "better", "faster", "quicker", "more", "quite", "compares", "rivals", "beats"}
# Comma lists of denied effects stay in one clause: "not designed to treat, cure or prevent".
LIST_ITEMS = {"treat", "treats", "cure", "cures", "heal", "heals", "fix", "fixes", "prevent",
              "prevents", "diagnose", "diagnoses", "mitigate", "mitigates", "relieve", "relieves",
              "reverse", "reverses", "resolve", "resolves", "manage", "address", "remedy",
              "remedies", "treatment", "treatments", "substitute", "replacement", "solution",
              "designed", "tested", "proven", "approved", "intended", "meant", "validated",
              "studied", "shown", "evaluated"}
LIST_LINKS = {"or", "and", "nor", "a", "an", "even", "any", "to"}
LIST_EFFECTS = {"treat", "treats", "cure", "cures", "heal", "heals", "fix", "fixes", "prevent",
                "prevents", "diagnose", "diagnoses", "mitigate", "mitigates", "relieve", "relieves",
                "reverse", "reverses", "resolve", "resolves", "manage", "address", "remedy",
                "treatment", "or", "and", "nor", "a", "an"}
# Someone else doing the treating: "doctors treat anxiety", "medication can help".
AGENTS = {"doctor", "doctors", "therapist", "therapists", "clinician", "clinicians", "psychiatrist",
          "psychiatrists", "physician", "physicians", "nurse", "nurses", "counselor", "counselors",
          "counsellor", "counsellors", "professional", "professionals", "specialist", "specialists",
          "medication", "medications", "medicine", "medicines", "drug", "drugs", "treatment",
          "treatments", "therapy", "therapies", "experts", "time"}
AGENT_MODALS = {"can", "will", "may", "might", "could", "should", "would", "does", "do", "often",
                "usually"}
# Words that make "a ... treatment" someone's own care rather than this modality.
OWNED = {"your", "any", "my", "their", "our", "his", "her", "existing", "current", "usual",
         "ongoing", "other", "standard", "regular", "prescribed", "own"}
COPULAS = {"is", "as", "it's", "its", "becomes", "become", "be"}
# "Meet the new remedy", "Introducing the fix for".
PRESENTING = {"meet", "try", "introducing", "presenting", "discover", "welcome"}
# Words allowed between the determiner and "treatment", "remedy" or "fix": "a new anxiety
# treatment", "the ultimate stress remedy", "a 10-minute anxiety fix".
NOUN_MODIFIERS = CONDITION_WORDS | {
    "new", "natural", "gentle", "ultimate", "perfect", "simple", "quick", "easy", "fast", "daily",
    "real", "true", "best", "little", "holistic", "powerful", "effective", "drug", "free", "home",
    "minute", "minutes", "day", "week", "one", "two", "three", "five", "ten", "fifteen", "twenty",
    "thirty", "go", "favorite", "favourite", "secret", "weekly", "nightly", "morning", "evening"}
# "treatment plan", "treatment options": a medical compound, not a name for this modality.
TREATMENT_COMPOUNDS = {"plan", "plans", "option", "options", "team", "teams", "center", "centers",
                       "centre", "centres", "program", "programs", "programme", "provider",
                       "providers", "goals", "history"}
# "quick fixes", "easy fixes": the noun, not the verb.
FIX_NOUN_MODIFIERS = {"quick", "easy", "fast", "simple", "instant", "miracle", "cheap", "temporary",
                      "magic", "little", "small", "few", "some", "any", "no"}
# "fix your gaze", "fix the date": fixing something that is not a condition.
FIX_PLAIN_OBJECTS = {"gaze", "eyes", "eye", "attention", "focus", "sights", "stare", "hair", "bike",
                     "tea", "coffee", "dinner", "lunch", "breakfast", "meal", "drink", "schedule",
                     "date", "time", "spot", "position", "place", "feet", "hands", "posture",
                     "route", "pace", "start"}
# "a fixed sleep schedule": the adjective, not the verb.
FIXED_ADJ_BEFORE = {"a", "an", "the", "at", "on", "in", "of", "with", "by", "for", "to"}
FIXED_ADJ_AFTER = {"schedule", "schedules", "time", "times", "routine", "routines", "hours",
                   "pattern", "patterns", "window", "windows"}
# Words before "treats" that make it the verb ("it treats", "this practice treats").
TREATS_SUBJECTS = {"it", "this", "that", "which", "who", "walk", "practice", "idea", "concept",
                   "method", "session", "ritual", "approach", "program", "programme", "exercise",
                   "game", "routine", "movement", "music", "play", "breathing", "breathwork",
                   "walking", "running", "sport", "class", "protocol", "technique", "also",
                   "gently", "directly", "really", "actually", "simply", "quietly", "naturally"}
CLAUSE_BREAK = re.compile(r"[.!?;:,]|\bbut\b", re.IGNORECASE)
_WORD_RE = re.compile(r"[a-z0-9']+", re.IGNORECASE)
_NEGATED_COPULA_AFTER = re.compile(
    r"\s*(?:(?:is|are|was|were)\s+(?:not|never)\b|(?:isn't|aren't|wasn't|weren't|won't)\b)",
    re.IGNORECASE)
# "No one expected it to heal trauma, but it does": the caveat is taken back.
_REVERSAL = re.compile(r"\bbut\s+(?:it|this|that|they|the\s+\w+)\s+(?:really\s+)?(?:does|did|do|will|"
                       r"can|could|works|worked)\b", re.IGNORECASE)


# ---------------------------------------------------------------- tweet measures

def _in(cp, ranges):
    return any(lo <= cp <= hi for lo, hi in ranges)


def _emoji_element(cps, i):
    """Length in code points of the emoji element starting at i, or 0 if there is none."""
    cp = cps[i]
    nxt = cps[i + 1] if i + 1 < len(cps) else None
    if 0x1F1E6 <= cp <= 0x1F1FF:  # regional indicators pair into flags
        return 2 if nxt is not None and 0x1F1E6 <= nxt <= 0x1F1FF else 1
    if cp in KEYCAP_BASES:
        if nxt == VS16 and i + 2 < len(cps) and cps[i + 2] == KEYCAP:
            return 3
        return 2 if nxt == KEYCAP else 0
    if _in(cp, EMOJI_SMP) or _in(cp, EMOJI_PRESENTATION_BMP):
        if nxt == VS15:
            return 0
    elif _in(cp, EMOJI_TEXT_DEFAULT_BMP):
        # X draws these as emoji even without U+FE0F, unless text style is asked for (U+FE0E);
        # the copyright, registered and trademark signs need U+FE0F.
        if nxt == VS15 or (cp in TEXT_STYLE_ONLY and nxt != VS16):
            return 0
    else:
        return 0
    j = i + 1
    if j < len(cps) and cps[j] == VS16:
        j += 1
    if j < len(cps) and 0x1F3FB <= cps[j] <= 0x1F3FF:
        j += 1
    while j < len(cps) and 0xE0020 <= cps[j] <= 0xE007F:  # tag sequences (subdivision flags)
        j += 1
    return j - i


def emoji_spans(text):
    """[(start, end)] of each emoji, in code point indexes, with known ZWJ sequences joined."""
    cps = [ord(c) for c in text]
    spans, i = [], 0
    while i < len(cps):
        n = _emoji_element(cps, i)
        if n == 0:
            i += 1
            continue
        j = i + n
        while j + 1 < len(cps) and cps[j] == ZWJ and cps[j + 1] in ZWJ_JOINABLE:
            m = _emoji_element(cps, j + 1)
            if m == 0:
                break
            j += 1 + m
        spans.append((i, j))
        i = j
    return spans


def url_spans(text):
    spans = []
    for match in URL_RE.finditer(text):
        start, end = match.span()
        while end > start and text[end - 1] in URL_TRAILING:
            end -= 1
        spans.append((start, end))
    return spans


def _char_weight(char):
    return 1 if _in(ord(char), WEIGHT_ONE_RANGES) else 2


def _plain_weight(text):
    total, pos = 0, 0
    for start, end in emoji_spans(text) + [(len(text), len(text))]:
        total += sum(_char_weight(c) for c in text[pos:start])
        if end > start:
            total += EMOJI_WEIGHT
        pos = end
    return total


def weighted_length(text):
    text = unicodedata.normalize("NFC", text)
    total, pos = 0, 0
    for start, end in url_spans(text):
        total += _plain_weight(text[pos:start]) + URL_WEIGHT
        pos = end
    return total + _plain_weight(text[pos:])


def hashtags(text):
    return [m.group(1) for m in HASHTAG_RE.finditer(text) if re.search(r"[^\W\d_]", m.group(1))]


def _words(text):
    return [w.lower() for w in _WORD_RE.findall(text)]


def _is_negation(word, words=NEGATORS):
    return word in words or word.endswith("n't")


def _negator_key(word):
    return word.replace("'", "") if word.endswith("n't") else word


def _scope_words(head):
    """Words of the clause that ends where the phrase starts. A clause ends at . ! ? ; : , or
    "but", except a comma inside a list of denied effects: in "not designed to treat, cure or
    prevent" the words before "cure" reach back to "not"."""
    end, words = len(head), []
    for brk in reversed(list(CLAUSE_BREAK.finditer(head))):
        seg = _words(head[brk.end():end])
        words = seg + words
        prev = _words(head[:brk.start()])[-1:]
        listed = prev and prev[0] in LIST_ITEMS and all(w in LIST_ITEMS or w in LIST_LINKS for w in seg)
        # "it is not, and is not meant to be, a cure": the comma closes an aside.
        aside = prev and prev[0] in {"be", "is", "are", "was", "were"} and set(seg) <= {"a", "an", "the"}
        if brk.group(0) == "," and (listed or aside):
            end = brk.start()
            continue
        return words
    return _words(head[:end]) + words


def _purpose_after_need(mid, need_first_ok):
    """True for "pills needed to cure", "need therapy to heal", "take long to heal": the phrase is
    the purpose of what is (not) needed, so it is still claimed. "no need to fix" is not."""
    for j, w in enumerate(mid):
        if w in NEED_WORDS and "to" in mid[j + 1:]:
            k = mid.index("to", j + 1)
            if k > j + 1 or (need_first_ok and j > 0):
                return True
    return False


def _pronoun_governs(rest, after_clause):
    """Scope of "nothing", "nobody", "no one", "none" and "not everyone": True when it denies the
    phrase, as in "nothing here is proven" or "nobody has tested whether it heals"."""
    rest = list(rest)
    if rest[:1] and rest[0] in {"of", "in", "about", "from", "on"}:
        rest = rest[2:]  # "none of this", "nothing in it", "nothing about it"
    skipped = set()
    while rest and rest[0] in SKIPPABLE:
        skipped.add(rest[0])
        rest = rest[1:]
    if not rest:  # the negator is the subject of the phrase: "nothing heals grief"
        return not (COMPARATIVES & set(_words(after_clause)[:8])) and "as well" not in after_clause
    if skipped & PROHIBITING:
        return True
    verb, tail = rest[0], rest[1:]
    if verb in DENIAL_VERBS:
        if verb in ("know", "knows", "knew"):
            return bool({"whether", "if"} & set(tail[:2]))  # "nobody knows yet whether"
        return True
    if verb in FACTIVE_VERBS:
        return False
    return len(tail) <= 3 and "to" not in tail and not (TAIL_SUBJECTS & set(tail))


def _negation_governs(word, mid, after_clause):
    """Does the negator `word`, followed by the words `mid` and then the phrase, deny the phrase?"""
    key = _negator_key(word)
    if mid[:1] and mid[0] in EMPHATIC.get(key, ()):
        return None  # not a denial at all; look further back
    if key in ADVERB_NEGATORS and (mid[:1] and mid[0] in EMPHATIC_VERBS or (
            mid[:1] == ["been"] and mid[1:2] and mid[1] in EASIER)):
        return None
    if SCOPE_ENDERS & set(mid):
        return False
    if any((a in COORDINATORS and (b in SUBJECT_WORDS or b == "still"))
           or (a in SUBORDINATORS and b in SUBJECT_WORDS) for a, b in zip(mid, mid[1:])):
        return False
    if key == "no" and mid[:1] == ["one"]:
        return False if _purpose_after_need(mid[1:], True) else _pronoun_governs(mid[1:], after_clause)
    if key in PRONOUN_NEGATORS:
        return False if _purpose_after_need(mid, True) else _pronoun_governs(mid, after_clause)
    if key in ("not", "hardly", "scarcely") and mid[:1] and mid[0] in QUANTIFIERS:
        rest = mid[1:]
        if mid[0] in ("all", "every", "many", "most") and rest[:1] and not (
                {rest[0]} & (SKIPPABLE | DENIAL_VERBS | FACTIVE_VERBS)):
            rest = rest[1:]  # "not all studies show"
        return False if _purpose_after_need(rest, True) else _pronoun_governs(rest, after_clause)
    if key in DETERMINER_NEGATORS:
        if mid[:1] == ["need"]:
            return True  # "no need to fix anything"
        if _purpose_after_need(mid, True):
            return False
        if (EPISTEMIC_NOUNS | DENIAL_VERBS) & set(mid):
            return True
        return not (SUBJECT_WORDS & set(mid))  # "without pills it cures anxiety" is a claim
    # Adverb negators: not, never, n't, cannot, hardly.
    if _purpose_after_need(mid, False):
        return False
    for j, w in enumerate(mid):
        if w in FACTIVE_VERBS and mid[j + 1:j + 2] not in (["whether"], ["if"]):
            return False  # "you'd never guess it heals"
    return True


def _negated(before, after_clause):
    """True when a negator before the phrase, in the same clause, denies it. The nearest negator
    decides, skipping emphatic ones such as "no wonder". A run of effects just before the phrase
    ("treat, heal or" before "cure") does not use up the 10-word reach."""
    words = list(before)
    while words and words[-1] in LIST_EFFECTS:
        words.pop()
    window = words[-10:]
    for i in range(len(window) - 1, -1, -1):
        word, mid = window[i], window[i + 1:]
        if i > 0 and (window[i - 1], word) in PHRASE_NEGATORS:
            if len(mid) <= 3 and not (SUBJECT_WORDS & set(mid)):
                return True
            return False
        if not _is_negation(word):
            continue
        verdict = _negation_governs(word, mid, after_clause)
        if verdict is None:
            continue
        for j in range(max(0, i - 3), i):  # "nothing it can't heal", "no reason it won't heal"
            k = _negator_key(window[j])
            if k in PRONOUN_NEGATORS or (k in DETERMINER_NEGATORS and window[j + 1] not in SUBJECT_WORDS):
                return False
        return verdict
    return False


def _describes_the_modality(before, kind, phrase, after):
    """For "treatment", "remedy" and "fix": True when the tweet calls the modality one ("a new
    anxiety treatment", "this treatment", "it is a remedy for", "your new burnout remedy", "your fix
    for burnout"), False when it is someone's own care ("any treatment for", "about treatment for",
    "in treatment for", "not a substitute for treatment", "keep your treatment", "a treatment
    plan")."""
    rest, zone = list(before), []
    while rest and len(zone) < 4:
        if rest[-2:] == ["go", "to"]:  # "your go-to stress fix"
            zone += [rest.pop(), rest.pop()]
        elif rest[-1] in NOUN_MODIFIERS or rest[-1].isdigit():
            zone.append(rest.pop())
        else:
            break
    p1, p2, p3 = ([""] * 3 + rest)[-1], ([""] * 3 + rest)[-2], ([""] * 3 + rest)[-3]
    following = _words(after[:24])[:1]
    noun = _words(phrase)[-1] if kind != "noun_for" else "fix"
    if kind == "noun" and following and following[0] in TREATMENT_COMPOUNDS:
        return False
    if kind == "quick_fix" and re.match(r"\s+for\b", after, re.IGNORECASE):
        return True
    if p1 in {"a", "an", "this"}:
        return True
    if kind in ("noun", "noun_for", "cond_fix") and p1 in COPULAS:
        return True
    if p2 in {"a", "an", "this"} and p1 not in OWNED and p1 not in {"for", "of", "to", "from"}:
        return True
    if p1 == "the" and (p2 == "" or p2 in COPULAS or p2 in PRESENTING):
        return True
    if p1 in {"your", "my", "our"} and noun in {"fix", "remedy", "treatment"} and (
            "new" in zone or noun != "treatment"):
        return True  # "your new burnout remedy", "your fix for burnout", not "your treatment"
    if p1.endswith("'s") and p1 not in {"it's", "that's", "what's", "there's", "here's"} and (
            p2 == "" or p2 in COPULAS):
        return True
    return p2 == "the" and p1 not in OWNED and (p3 == "" or p3 in COPULAS)


def claims(text):
    """Claim phrases in a tweet that are not denied or about someone else; see tweet-claim."""
    text = text.replace("\U00002019", "'")
    found = []
    for match in CLAIM_RE.finditer(text):
        kind, phrase = match.lastgroup, match.group(0)
        head, after = text[:match.start()], text[match.end():]
        before = _scope_words(head)
        brk = CLAUSE_BREAK.search(after)
        after_clause = after[:brk.start()] if brk else after
        following = _words(after[:24])[:1]
        lowered = phrase.lower()
        if kind in ("noun", "noun_for", "quick_fix", "cond_fix") and not _describes_the_modality(
                before, kind, phrase, after):
            continue
        if kind == "fixes" and before and before[-1] in FIX_NOUN_MODIFIERS:
            continue
        if kind == "fix_you" and following and following[0] in FIX_PLAIN_OBJECTS:
            continue
        if kind == "verb" and lowered.startswith("fixed") and (
                (before and before[-1] in FIXED_ADJ_BEFORE)
                or (following and following[0] in FIXED_ADJ_AFTER)):
            continue
        if kind == "word" and lowered.startswith("heal") and after.startswith("-"):
            continue  # "heal-the-world anthems"
        if kind == "word" and lowered == "healing" and following and following[0].startswith("profession"):
            continue  # "the healing professions"
        if kind == "word" and lowered == "healing" and not before and re.match(
                r"\s+(?:takes|needs|requires)\s+(?:time|support|patience|work|effort|care|help)\b",
                after, re.IGNORECASE):
            continue  # "Healing takes time and support", a truism, not a claim about the modality
        if kind == "treats":
            # The verb only ("it treats the whole person"), never the noun ("dog treats"), and not
            # the "treats the walk like a game" idiom.
            if not before or before[-1] not in TREATS_SUBJECTS:
                continue
            if {"as", "like"} & set(_words(after_clause)[:6]):
                continue
        sentence_end = re.search(r"[.!?]", after)
        if not _REVERSAL.search(after[:sentence_end.start()] if sentence_end else after) and _negated(
                before, after_clause):
            continue
        if kind in ("modal", "fix_you", "verb", "word", "fixes", "treats"):
            if before and before[-1] in AGENTS:
                continue
            if len(before) >= 2 and before[-2] in AGENTS and before[-1] in AGENT_MODALS:
                continue
            if following and following[0] in {"nothing", "none", "nobody", "noone", "no"}:
                continue
        if _NEGATED_COPULA_AFTER.match(after_clause):
            continue
        if brk and brk.group(0) == "?":
            rest = after[brk.end():]
            nxt = CLAUSE_BREAK.search(rest)
            answer = _words(rest[:nxt.start()] if nxt else rest)[:3]
            if any(_is_negation(w, NEGATIVE_ANSWERS) for w in answer) or answer[:2] == ["who", "knows"]:
                continue
        found.append(phrase)
    return found


def name_key(name):
    text = unicodedata.normalize("NFKD", name).lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


# ---------------------------------------------------------------- checking

def reference_names(points_doc, anchors_dir):
    """Names a generated modality may not take, and acronyms it may not contain."""
    taken = {name_key(n): n for n in KNOWN_PRACTICES}
    acronyms = set(KNOWN_ACRONYMS)
    for entry in points_doc.get("established", []):
        for key in ("name", "shortName"):
            value = entry.get(key)
            if isinstance(value, str):
                taken[name_key(value)] = value
        short = entry.get("shortName")
        if isinstance(short, str) and re.fullmatch(r"[A-Z]{2,6}", short):
            acronyms.add(short)
        if anchors_dir is not None:
            path = Path(anchors_dir) / f"{entry.get('id')}.json"
            if path.is_file():
                try:
                    doc = json.loads(path.read_text(encoding="utf-8"))
                    for alias in doc.get("alsoKnownAs", []):
                        if isinstance(alias, str):
                            taken[name_key(alias)] = alias
                except (json.JSONDecodeError, AttributeError):
                    pass
    taken.pop("", None)
    return taken, acronyms


def check_files(paths, points_doc, anchors_dir=None):
    """Check lane files. Returns (problems, stats); a problem is (file, item, code, message)."""
    problems = []
    valid_ids = {g.get("id") for g in points_doc.get("generated", []) if isinstance(g, dict)}
    taken, acronyms = reference_names(points_doc, anchors_dir)
    seen_ids, seen_names = {}, {}
    stats = {"files": {}, "ids": set(), "tweet_lengths": []}

    for path in paths:
        path = Path(path)
        fname = path.name

        def problem(item, code, message):
            problems.append((fname, item, code, message))

        stats["files"][fname] = 0
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            problem("-", "json", f"file not found: {path}")
            continue
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            problem("-", "json", f"not valid JSON: {exc}")
            continue
        if not isinstance(doc, dict) or set(doc) != {"lane", "modalities"}:
            problem("-", "keys", 'top level must be an object with exactly "lane" and "modalities"')
            continue
        lane = doc["lane"]
        if not isinstance(lane, str) or not LANE_RE.fullmatch(lane) or lane != path.stem:
            problem("-", "lane", f"lane {lane!r} must be the file name without .json "
                                 f"({path.stem!r}), in lowercase letters, digits and hyphens")
        for where, label in find_dashes(doc):
            problem("-", "dash", f"{label} in {where}")
        modalities = doc["modalities"]
        if not isinstance(modalities, list) or not modalities:
            problem("-", "type", "modalities must be a non-empty list")
            continue
        stats["files"][fname] = len(modalities)

        for n, mod in enumerate(modalities):
            if not isinstance(mod, dict):
                problem(f"#{n}", "type", "each modality must be an object")
                continue
            mid = mod.get("id")
            item = mid if isinstance(mid, str) else f"#{n}"
            missing = [k for k in MODALITY_KEYS if k not in mod]
            extra = [k for k in mod if k not in MODALITY_KEYS]
            if missing or extra:
                problem(item, "keys", f"keys differ (missing {missing}, extra {extra})")
            bad_types = [k for k in MODALITY_KEYS if k in mod and
                         not (isinstance(mod[k], str) and mod[k].strip())]
            if bad_types:
                problem(item, "type", f"must be non-empty strings: {bad_types}")
            text = {k: mod[k] for k in MODALITY_KEYS if k in mod and k not in bad_types}

            if "id" in text:
                if mid not in valid_ids:
                    problem(item, "id-unknown", f"id {mid!r} is not a generated id in points.json")
                elif mid in seen_ids:
                    problem(item, "id-duplicate", f"id also used in {seen_ids[mid]}")
                else:
                    seen_ids[mid] = fname
                    stats["ids"].add(mid)

            if "name" in text:
                name = text["name"]
                words = count_words(name)
                if not NAME_WORDS[0] <= words <= NAME_WORDS[1]:
                    problem(item, "name-words", f"name {name!r} has {words} word(s), expected "
                                                f"{NAME_WORDS[0]} to {NAME_WORDS[1]}")
                key = name_key(name)
                if key in taken:
                    problem(item, "name-taken", f"name {name!r} is the name of an existing "
                                                f"practice ({taken[key]!r})")
                if key in seen_names:
                    problem(item, "name-duplicate", f"name {name!r} also used in {seen_names[key]}")
                else:
                    seen_names[key] = f"{fname} ({item})"
                used = sorted(a for a in acronyms if re.search(rf"(?<![A-Za-z]){a}(?![A-Za-z])", name))
                if used:
                    problem(item, "name-acronym", f"name {name!r} contains the acronym of an "
                                                  f"existing method: {used}")

            if "tagline" in text and count_words(text["tagline"]) > TAGLINE_MAX_WORDS:
                problem(item, "tagline-words", f"tagline has {count_words(text['tagline'])} words, "
                                               f"at most {TAGLINE_MAX_WORDS} allowed")
            for key, (lo, hi) in SENTENCE_RANGES.items():
                if key in text:
                    count = count_sentences(text[key])
                    if not lo <= count <= hi:
                        problem(item, "sentences", f"{key} has about {count} sentences, "
                                                   f"expected {lo} to {hi}")

            if "tweet" in text:
                tweet = text["tweet"]
                length = weighted_length(tweet)
                stats["tweet_lengths"].append(length)
                if length > TWEET_MAX:
                    problem(item, "tweet-length", f"tweet weighted length {length} is over {TWEET_MAX}")
                tags = hashtags(tweet)
                if len(tags) > 1:
                    problem(item, "tweet-hashtags", f"tweet has {len(tags)} hashtags {tags}, at most 1")
                emojis = emoji_spans(unicodedata.normalize("NFC", tweet))
                if len(emojis) > 1:
                    problem(item, "tweet-emoji", f"tweet has {len(emojis)} emoji, at most 1")
                if not NOVELTY_RE.search(tweet):
                    problem(item, "tweet-new", "tweet does not signal that this is a new concept "
                                               "(say new concept, idea, what if, imagine, untested "
                                               "and so on)")
                said = claims(tweet)
                if said:
                    problem(item, "tweet-claim", f"tweet claims a treatment effect: {said}")
                mentions = MENTION_RE.findall(tweet)
                if mentions:
                    problem(item, "tweet-mention", f"tweet has @mentions {mentions}; none allowed")
                nfc = unicodedata.normalize("NFC", tweet)
                links = [nfc[a:b] for a, b in url_spans(nfc)]
                if links:
                    problem(item, "tweet-link", f"tweet has links {links}; none allowed")
    return problems, stats


def print_summary(paths, problems, stats, total_ids, complete):
    by_file = {}
    for fname, *_ in problems:
        by_file[fname] = by_file.get(fname, 0) + 1
    for path in paths:
        fname = Path(path).name
        count = by_file.get(fname, 0)
        status = "OK" if count == 0 else f"{count} problem{'s' if count != 1 else ''}"
        print(f"  {fname}: {stats['files'].get(fname, 0)} modalities, {status}")
    covered = len(stats["ids"])
    note = "" if complete or covered == total_ids else f" ({total_ids - covered} not written yet)"
    print(f"  ids covered: {covered} of {total_ids}{note}")
    if stats["tweet_lengths"]:
        lengths = stats["tweet_lengths"]
        print(f"  tweet weighted length: max {max(lengths)}, mean {sum(lengths) / len(lengths):.1f} "
              f"(limit {TWEET_MAX})")
    for fname, item, code, message in problems:
        print(f"FAIL {fname} [{item}] {code}: {message}")


# ---------------------------------------------------------------- self-test

def _fixture_modality(mid, name, **changes):
    mod = {
        "id": mid,
        "name": name,
        "tagline": "A slow walk that pairs breath with open attention.",
        "whatItIs": f"{name} is a new concept for a slow outdoor walk. It pairs steady breathing "
                    "with open, curious attention to sound.",
        "coreIdea": "Gentle movement can make room for whatever you feel.",
        "whatYouDo": "You walk slowly for twenty minutes and match your steps to your breath. "
                     "Every few minutes you pause and name one thing you can hear.",
        "whoItsFor": "People who want a calm, simple practice they can do alone, e.g. on a lunch break.",
        "cautions": "It is an untested idea, so stop if it feels unpleasant and keep any care you "
                    "already have.",
        "tweet": f"New concept: {name}, a slow walk that pairs breath with open attention. Not a "
                 "treatment, just an idea to try on a quiet afternoon \U0001F30A #SlowWalk",
    }
    mod.update(changes)
    return mod


# Claim detector test sentences. The first blocks are the reviewers' and dispatcher's examples
# word for word; the rest guard against regressions (true claims the earlier checker caught).
SELF_TEST_CAVEATS = [
    # Reviewer round 2 and 3: honest caveats that must pass.
    "A new idea, not a substitute for treatment.",
    "New concept to try alongside treatment, not instead of it.",
    "A new, clinically untested idea.",
    "This is not a cure.",
    "Not a quick fix, just a new idea to try.",
    "No claims that it heals anything.",
    "It won't fix your problems, but it might be fun.",
    "Not therapy and not a treatment for anything.",
    "We make no promise it will heal you.",
    "It is not meant to treat anything.",
    "There's zero proof it heals.",
    "Untested and unproven: just an idea.",
    "Don't expect a cure: it's just a new idea.",
    "It hasn't been proven to do anything.",
    "Nothing here is clinically proven.",
    "None of this is proven, it's a new idea.",
    "Nobody has tested whether it heals anything.",
    "It doesn't cure anything and isn't medical advice.",
    "This isn't a remedy for anything, just a new concept.",
    "Talk to your doctor; this idea is not a cure.",
    "A new idea for people who aren't looking for a cure.",
    "Bring dog treats: a new idea for shelter walks.",
    "You get treated to a sunrise: a new idea for early walks.",
    "Proven? No. New? Yes.",
    "A new idea. It has not been tested and is not proven.",
    "Keep up any treatment for depression; this is just a new idea.",
    "Ask your doctor about treatment for anxiety first.",
    "Already in treatment for PTSD? Check with your therapist before trying it.",
    # Further caveats and non-claims.
    "Not a treatment, just an idea to try on a quiet afternoon.",
    "Forget quick fixes: this is slow, steady practice.",
    "No miracle cures here, just a new walk.",
    "Healing isn't promised; it's a new idea.",
    "Is it a cure? No, it's a new idea.",
    "Can it heal? Nobody knows yet.",
    "Clinically tested? Not yet.",
    "Doctors treat anxiety; this is just a new walk.",
    "Therapy can heal, and this walk is not therapy.",
    "Ask your doctor about the best treatment for you.",
    "An idea, rather than a cure.",
    "It fixes nothing, it just slows you down.",
    "Treat it as an experiment, not a cure.",
    "Treat yourself to ten quiet minutes.",
    "A treat for the senses: a new idea.",
    "It won't cure anything, but it might be fun.",
    "No promises, no guarantees: just a new walk.",
    "Results not guaranteed, it's an untested idea.",
    "If you are in treatment for depression, ask your clinician first.",
    "Use it alongside, not instead of, any treatment for anxiety.",
    "Stop if you feel pain, and check with a doctor first.",
    "End the day with ten minutes of stillness.",
    "A treatment plan is up to your doctor; this is a new idea.",
    "This is a walk, not a treatment.",
    "Folk remedies inspired it, but it is untested.",
    "Quick fixes are tempting; this new idea is slow.",
    "Dogs love treats, and so will you: a new idea for shelter walks.",
    "It treats the walk like a game.",
    # Reviewer round 4, findings 1 and 6, word for word: negated lists and missing negators.
    "Not designed to treat, cure or prevent any condition.",
    "This doesn't diagnose, treat, cure or prevent anything.",
    "Can't treat, cure, or fix anything: it's a new idea.",
    "It won't treat, heal, or cure anything.",
    "It is not a treatment, cure, or fix.",
    "Not intended to diagnose, treat or cure anything.",
    "It does not treat or cure anything.",
    "Far from a cure", "Hardly a cure", "Nowhere near a cure", "Far from proven",
    "Healing takes time and support; this is just a new idea.",
    "The healing professions inspired it, but it is untested.",
    "Heal-the-world anthems ...",
    "Fix your gaze on the horizon",
    "Heals? Who knows.",
    # Negation scope: denials that must stay denied.
    "You don't need to fix anything: just walk, a new idea.",
    "No need to heal anything, it's a new idea.",
    "Nobody can promise it heals anything.",
    "No one knows if it heals anything.",
    "Nobody knows yet whether it heals anything.",
    "No one claims it heals anything; it is a new idea.",
    "Nobody pretends it heals anything.",
    "Nobody has shown it cures anything.",
    "Not all studies show it heals; this is a new idea.",
    "No studies show it heals.",
    "No test has shown it heals.",
    "Nothing cures anxiety overnight, and this is just a new idea.",
    "Nothing in it is meant to cure anxiety.",
    "None of this has been shown to heal anything.",
    "We don't claim it heals anything.",
    "It is not designed, tested or proven to treat anything.",
    "Not evaluated, tested or proven to treat any condition.",
    "It is not, and is not meant to be, a cure.",
    "It's far from proven to relieve, treat, or cure insomnia.",
    "It has never been tested to see if it can heal, fix or cure anything.",
    "No one should treat this as a cure.",
    "Nobody should use it to treat anxiety.",
    "No one should tell you it heals.",
    "No one wants a quick fix; this is slow.",
    "There's no way to know if it heals anything.",
    "Don't expect it to heal anything.",
    "Hardly anyone claims it heals.",
    "No, it doesn't cure anything.",
    "No it doesn't cure anything, it's a new idea.",
    "Neither a cure nor a treatment: a new idea.",
    "Keep up your anxiety treatment; this is just a new idea.",
    "Ask your doctor about anxiety treatment first.",
    "Keep a fixed sleep schedule: a new idea for night owls.",
    "Fix the date and invite a friend: a new idea.",
]
SELF_TEST_CLAIMS = [
    # Reviewer round 3: claims, including the 10 that came after a caveat or negation.
    "It cures stress.", "It can treat anxiety.", "A treatment for low mood.",
    "Clinically proven calm.", "Healing walks for everyone.", "It fixes your sleep.",
    "Not medical advice, but it heals trauma.",
    "No gym needed: this new walk heals anxiety.",
    "Instead of pills, it heals.",
    "Without drugs, it cures anxiety.",
    "Use it alongside therapy to cure insomnia.",
    "Never feel stuck again: it fixes your mood.",
    "No talking needed. The body heals itself.",
    "Not a pill. Not therapy. It cures burnout.",
    "Shake it out without words: the body heals itself.",
    "Treat your anxiety with this new walk.",
    "Fix anxiety in ten minutes with this new idea.",
    "It relieves depression, a new concept.",
    "A natural remedy for anxiety.",
    "Helps treat PTSD.",
    "Guaranteed calm in a week.",
    "Proven to calm you down.",
    "Scientifically backed new idea.",
    "It's a cure for burnout.",
    # Further claims, and words the earlier checker caught on their own.
    "This new walk will fix you.",
    "Relief from anxiety in minutes.",
    "Reverse burnout with this new idea.",
    "Beat stress with a new walk.",
    "The new treatment for insomnia.",
    "It's the remedy for burnout.",
    "Not just calming: it treats insomnia.",
    "It heals not only the body but the mind.",
    "Is it proven? Yes, no doubt.",
    "Rest is treatment for burnout.",
    "Unlike therapy, it treats anxiety.",
    "It treats the whole person.",
    "This treatment calms the mind.",
    "A natural remedy.",
    "Nature's remedy for stress.",
    "It fixes the root cause.",
    "Clinically effective and gentle.",
    "It eliminates the need for pills.",
    "Healed in a week.",
    # Reviewer round 4, findings 2, 3 and 4, word for word: fix forms, condition nouns, scope.
    "Fixing burnout, one breath at a time.",
    "Fixing your anxiety, one walk at a time.",
    "It fixed my anxiety in a week.",
    "Fixed my sleep in a week: a new idea.",
    "It's been fixing my mood for months. New concept.",
    "A new anxiety treatment.",
    "The new insomnia treatment you can do at home.",
    "The ultimate stress remedy.",
    "Your new burnout remedy.",
    "Meet your new burnout remedy.",
    "A 10-minute anxiety fix: a new idea.",
    "A new PTSD fix.",
    "A gentle depression fix.",
    "Your fix for burnout.", "My fix for burnout.", "Our fix for burnout.",
    "Nothing heals grief like this new walk.",
    "No meds required to heal your trauma.",
    "No therapist needed to cure insomnia.",
    "No pills needed to cure anxiety.",
    "No drugs required to treat depression.",
    "No other idea treats anxiety this well.",
    "Not everyone knows it heals anxiety.",
    "Nobody told you a walk could heal trauma.",
    "No wonder it heals trauma so fast.",
    "Never before has a walk healed trauma.",
    "No one expected it to heal trauma, but it does.",
    # Negation scope: the negator governs something else, so the claim stands.
    "Without any pills it heals anxiety.",
    "You don't need therapy to heal trauma.",
    "It doesn't take long to heal your trauma.",
    "No one heals trauma like this walk.",
    "Nothing cures anxiety faster.",
    "You'd never guess it heals trauma.",
    "Never knew a walk could heal trauma.",
    "Hardly anyone knows it heals trauma.",
    "Not only does it heal trauma, it calms you.",
    "It's not just a cure, it's a new way of life.",
    "You won't believe it heals trauma.",
    "It never fails to heal trauma.",
    "Never doubt that it heals.",
    "Don't wait to heal your trauma: try this new walk.",
    "It's never been easier to heal your trauma.",
    "There's nothing it can't heal.",
    "There's no reason it can't heal you.",
    "No pills or therapy and still heals anxiety.",
    "No gym and no pills, and it heals anxiety.",
    "Never stressed again because it heals your nerves.",
    "You won't need pills once it heals your anxiety.",
    "Doctors can't believe how fast it heals.",
    "It's not supposed to heal anything, but it does.",
    "Not a gimmick, a real cure.",
    "Your new go-to stress fix.",
    "This is my anxiety fix: a new idea.",
]


def self_test():
    """Run the checker on tiny fixture files and confirm it passes the good one and catches
    every rule in the bad one. Returns 0 when the checker behaves as expected."""
    failures = []

    # Expected values from a run of twitter-text 3.1.0 (parseTweet weightedLength, extractUrls)
    # and twemoji-parser (emoji count): (text, weight, urls, emoji count).
    parity = [
        ("a" * 260, 260, [], 0),
        ("\U000000A9 2026", 6, [], 0), ("\U000000AE 2026", 6, [], 0), ("\U00002122 2026", 7, [], 0),
        ("\U00002122\U0000FE0F 2026", 7, [], 1), ("\U000000A9\U0000FE0F 2026", 7, [], 1),
        ("\U00002600 sunny", 8, [], 1), ("\U00002600\U0000FE0F sunny", 8, [], 1),
        ("\U00002600\U0000FE0E sunny", 10, [], 0), ("\U00002764 love", 7, [], 1),
        ("\U00002194 arrows", 9, [], 1), ("\U00002660 spade", 8, [], 1), ("\U0000203C wow", 6, [], 1),
        ("\U00002B50 star", 7, [], 1), ("\U0001F30A and \U00002600\U0000FE0F", 9, [], 2),
        ("\U0001F468\U0000200D\U0001F469\U0000200D\U0001F467", 2, [], 1),
        ("\U0001F1F5\U0001F1F1", 2, [], 1), ("\U0001F44B\U0001F3FD hi", 5, [], 1),
        ("\U0001F3F3\U0000FE0F\U0000200D\U0001F308", 2, [], 1),
        ("\U00002764\U0000FE0F\U0000200D\U0001F525", 5, [], 2),
        ("1\U0000FE0F\U000020E3 one", 6, [], 1),
        ("\U0001F3F4\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F scot", 7, [], 1),
        ("\U0001F004 mahjong", 10, [], 1), ("\U0001F0A1 card", 7, [], 0), ("\U0001F170 blood", 8, [], 1),
        ("\U0001F10D x", 4, [], 0),
        ("caf\U000000E9 \U0000201Cquotes\U0000201D \U00002026", 16, [], 0),
        ("\U000065E5\U0000672C", 4, [], 0), ("\U000000A0nbsp", 5, [], 0), ("\U00002028ls", 4, [], 0),
        ("e\U00000301 combining", 11, [], 0),
        ("see https://example.com/a/very/long/path/that/keeps/going.", 28,
         ["https://example.com/a/very/long/path/that/keeps/going"], 0),
        ("go to example.de now", 33, ["example.de"], 0), ("notes.health", 23, ["notes.health"], 0),
        ("x.com", 23, ["x.com"], 0), ("t.co/abc", 23, ["t.co/abc"], 0),
        ("www.example.com/x", 23, ["www.example.com/x"], 0),
        ("(see example.org).", 30, ["example.org"], 0),
        ("visit foo.json today", 20, [], 0), ("breath.Then rest", 16, [], 0),
        ("wait...then", 11, [], 0), ("Node.js rocks", 13, [], 0), ("example.comfy", 13, [], 0),
        ("mail me at a@b.co please", 24, [], 0), ("U.S. and e.g. stuff", 19, [], 0),
    ]
    for text, weight, urls, n_emoji in parity:
        nfc = unicodedata.normalize("NFC", text)
        got = (weighted_length(text), [nfc[a:b] for a, b in url_spans(nfc)], len(emoji_spans(nfc)))
        if got != (weight, urls, n_emoji):
            failures.append(f"twitter-text parity for {text[:24]!r}: got {got}, expected "
                            f"{(weight, urls, n_emoji)}")
    tag_cases = [("one #Calm and #two and a#nottag and #123", ["Calm", "two"]),
                 ("#mental_health #self-care #caf\U000000E9 #1stStep",
                  ["mental_health", "self", "caf\U000000E9", "1stStep"]),
                 ("\U0000FF03fullhash tag", ["fullhash"])]
    for text, want in tag_cases:
        if hashtags(text) != want:
            failures.append(f"hashtags of {text!r}: {hashtags(text)}, expected {want}")
    mention_cases = [("ask @someone, meet @ 7, mail a@b", ["@someone"]),
                     ("\U0000FF20fullwidth", ["\U0000FF20fullwidth"])]
    for text, want in mention_cases:
        if MENTION_RE.findall(text) != want:
            failures.append(f"mentions in {text!r}: {MENTION_RE.findall(text)}, expected {want}")
    for text in SELF_TEST_CAVEATS:
        if claims(text):
            failures.append(f"caveat flagged as a claim: {text!r} -> {claims(text)}")
    for text in SELF_TEST_CLAIMS:
        if not claims(text):
            failures.append(f"claim not caught: {text!r}")
    openers = ["What if your weekly run ended with ten quiet minutes of noticing sounds?",
               "Imagine a run that ends in silence.", "An idea: walk slowly.", "New concept: rest."]
    for text in openers:
        if not NOVELTY_RE.search(text):
            failures.append(f"new-concept opener not recognized: {text!r}")
    print(f"self-test: tweet measures {'ok' if not failures else 'FAILED'} "
          f"({len(parity)} twitter-text parity cases, {len(tag_cases)} hashtag and "
          f"{len(mention_cases)} mention cases, {len(SELF_TEST_CAVEATS)} caveats that must pass, "
          f"{len(SELF_TEST_CLAIMS)} claims that must be caught, {len(openers)} openers)")

    points = {
        "version": 1,
        "established": [
            {"id": "alpha", "name": "Alpha Practice", "shortName": "APX"},
            {"id": "beta", "name": "Beta Method", "shortName": "Beta"},
        ],
        "generated": [{"id": f"alpha__beta__{k}"} for k in (1, 3, 5)],
    }
    good = {"lane": "good", "modalities": [
        _fixture_modality("alpha__beta__1", "Quiet Harbor Walk",
                          tweet="What if your weekly walk ended with ten quiet minutes of noticing "
                                "sounds? Quiet Harbor Walk: something to try alongside treatment, "
                                "not instead of it \U0001F30A #SlowWalk"),
        _fixture_modality("alpha__beta__3", "Lantern Step Practice",
                          tweet="New concept: Lantern Step Practice, a clinically untested idea for "
                                "slow evening walks. Not a substitute for treatment. \U00002600"),
    ]}
    long_tweet = "A new idea for slow mornings. " + "Breathe, notice, rest. " * 12
    bad = {"lane": "not-the-file-name", "modalities": [
        _fixture_modality("alpha__beta__1", "Beta Method", extra="not allowed"),   # id-duplicate with good
        _fixture_modality("alpha__gamma__9", "Walk",                              # unknown id, 1 word
                          tagline="This tagline keeps going well past the twelve word limit that "
                                  "the contract sets for it",
                          tweet="New idea: a slow walk. Thoughts, @someone? More at example.org"),
        _fixture_modality("alpha__beta__5", "APX Breath Loop",
                          whatItIs="One. Two. Three. Four. Five.",
                          coreIdea="Rest \U00002014 then move.",
                          tweet=long_tweet + "It cures stress fast. \U0001F30A\U0001F31E #One #Two"),
        _fixture_modality("alpha__beta__3", "quiet harbor WALK!", cautions=7,     # name dup, type
                          tweet="Try this walk today, it heals everything."),     # no new, claim
    ]}
    expected_bad = {"keys", "lane", "id-unknown", "name-words", "name-taken", "name-acronym",
                    "tagline-words", "sentences", "tweet-length", "tweet-hashtags", "tweet-emoji",
                    "tweet-new", "tweet-claim", "tweet-mention", "tweet-link", "dash", "type"}

    with tempfile.TemporaryDirectory(prefix="check-generated-") as tmp:
        folder = Path(tmp)
        good_path, bad_path = folder / "good.json", folder / "bad.json"
        good_path.write_text(json.dumps(good, ensure_ascii=False, indent=2), encoding="utf-8")
        bad_path.write_text(json.dumps(bad, ensure_ascii=False, indent=2), encoding="utf-8")

        problems, _ = check_files([good_path], points)
        print(f"self-test: good fixture alone: {len(problems)} problems (expected 0)")
        for p in problems:
            failures.append(f"false alarm on the good fixture: {p}")

        problems, _ = check_files([bad_path], points)
        codes = {p[2] for p in problems}
        missed = expected_bad - codes
        print(f"self-test: bad fixture alone: {len(problems)} problems, codes caught: "
              f"{', '.join(sorted(codes))}")
        if missed:
            failures.append(f"bad fixture: rules not caught: {sorted(missed)}")

        problems, _ = check_files([good_path, bad_path], points)
        codes = {p[2] for p in problems}
        cross = {"id-duplicate", "name-duplicate"}
        print(f"self-test: good and bad together: cross-file codes caught: "
              f"{', '.join(sorted(codes & cross)) or 'none'}")
        if not cross <= codes:
            failures.append(f"cross-file duplicates not caught: {sorted(cross - codes)}")

        broken = folder / "broken.json"
        broken.write_text('{"lane": "broken", "modalities": [', encoding="utf-8")
        problems, _ = check_files([broken], points)
        if {p[2] for p in problems} != {"json"}:
            failures.append("invalid JSON was not reported as a json problem")
        print("self-test: invalid JSON file reported as json problem: "
              f"{'yes' if {p[2] for p in problems} == {'json'} else 'no'}")

    for message in failures:
        print(f"SELF-TEST FAIL: {message}")
    print("SELF-TEST PASSED" if not failures else f"SELF-TEST FAILED ({len(failures)} failures)")
    return 0 if not failures else 1


# ---------------------------------------------------------------- main

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--generated", type=Path, default=bp.DATA_DIR / "generated")
    parser.add_argument("--points", type=Path, default=bp.DATA_DIR / "points.json")
    parser.add_argument("--anchors", type=Path, default=bp.DATA_DIR / "anchors")
    parser.add_argument("--only", nargs="+", metavar="LANE_OR_FILE",
                        help="check only these files: lane ids (file names without .json) or paths")
    parser.add_argument("--complete", action="store_true",
                        help="also fail unless all generated ids in points.json are covered")
    parser.add_argument("--self-test", action="store_true", help="run the fixture test and exit")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    try:
        points_doc = json.loads(args.points.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"check_generated: cannot read points file {args.points}: {exc}")
        return 1
    if args.only:
        paths = []
        for item in args.only:
            candidate = Path(item)
            if candidate.suffix != ".json":
                candidate = args.generated / f"{item}.json"
            paths.append(candidate)
    else:
        paths = sorted(args.generated.glob("*.json")) if args.generated.is_dir() else []
    if not paths:
        print(f"check_generated: no generated files found in {args.generated}")
        return 1

    anchors = args.anchors if args.anchors.is_dir() else None
    problems, stats = check_files(paths, points_doc, anchors)
    total_ids = sum(1 for g in points_doc.get("generated", []) if isinstance(g, dict))
    scope = f"subset of {len(paths)}" if args.only else f"all {len(paths)}"
    print(f"check_generated: {scope} file(s) in {args.generated}, "
          f"{sum(stats['files'].values())} modalities")
    if args.complete and len(stats["ids"]) < total_ids:
        missing = sorted({g["id"] for g in points_doc["generated"]} - stats["ids"])
        problems.append(("-", "-", "incomplete", f"{len(missing)} generated ids have no modality, "
                                                 f"for example {missing[:3]}"))
    print_summary(paths, problems, stats, total_ids, args.complete)
    print("RESULT: PASS" if not problems else f"RESULT: FAIL ({len(problems)} problems)")
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main())
