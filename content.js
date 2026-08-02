(() => {
  // --- CONSTANTS & CONFIGURATION ---
  const BTN_ID = "quickvint-gen-btn";
  const PHONE_BTN_ID = "quickvint-phone-btn";
  const BATCH_BTN_ID = "quickvint-batch-btn";
  const UPLOAD_CHOICE_MODAL_ID = "quickvint-upload-choice-modal";
  const REPORT_BTN_ID = "quickvint-report-btn";
  const REPORT_MODAL_ID = "quickvint-report-modal";
  const DESCRIPTION_FOOTER_MODAL_ID = "quickvint-description-footer-modal";
  const EMOJI_TOGGLE_ID = "quickvint-emoji-toggle";
  const HASHTAGS_TOGGLE_ID = "quickvint-hashtags-toggle";
  const DESCRIPTION_FOOTER_BTN_ID = "quickvint-description-footer-btn";
  const DESCRIPTION_FOOTER_EDIT_BTN_ID = "quickvint-description-footer-edit-btn";
  const DESCRIPTION_FOOTER_STORAGE_KEY = "descriptionFooterText";
  const DESCRIPTION_FOOTER_MAX_LENGTH = 240;
  const DESCRIPTION_FOOTER_INCLUDE_DEFAULT = true;
  const DESCRIPTION_LENGTH_TOGGLE_ID = "quickvint-description-length-toggle";
  const DESCRIPTION_LENGTH_STORAGE_KEY = "descriptionLength";
  const OUTPUT_SHAPE_TOGGLE_ID = "quickvint-output-shape-toggle";
  const OUTPUT_SHAPE_STORAGE_KEY = "useBulletPoints";
  const HASHTAGS_STORAGE_KEY = "useHashtags";
  const SIGN_IN_BTN_ID = "quickvint-signin-btn";
  const WARDROBE_REWRITE_WIDGET_ID = "quickvint-wardrobe-rewrite-widget";
  const WARDROBE_REWRITE_COLLAPSED_KEY =
    "quickvintWardrobeRewriteCollapsed";
  const DESCRIPTION_APPLY_PROMPT_ID = "quickvint-description-apply-prompt";
  const LIMIT_FOLLOWUP_MODAL_ID = "quickvint-limit-followup-modal";
  const TITLE_LANGUAGE_SELECT_ID = "quickvint-title-language-select";
  const DESCRIPTION_LANGUAGE_SELECT_ID = "quickvint-description-language-select";
  const MODAL_ID = "quickvint-phone-modal";
  const BATCH_MODAL_ID = "quickvint-batch-modal";
  const API_BASE = "https://autolister.app";
  const PHONE_API_BASE = "https://autolister.app";
  const PHONE_UPLOAD_PAGE = `${PHONE_API_BASE}/phone-upload`;
  const PHONE_UPLOAD_API = `${PHONE_API_BASE}/api/phone-upload`;
  const DOM_CANARY_CONFIG = globalThis.QUICKVINT_DOM_CANARY || {};
  const DOM_CANARY_CHECK = "vinted_listing_field_injection";
  const MAX_GENERATE_REQUEST_BODY_BYTES = 3_800_000;
  const MANUAL_STORAGE_UPLOAD_WAIT_MS = 12000;
  const MAX_PHONE_UPLOAD_PREVIEWS = 7;
  const BATCH_POLL_INTERVAL_MS = 3000;
  const BATCH_UPLOAD_STALE_MS = 15000;
  const BATCH_UPLOAD_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
  const BATCH_SIGNED_URL_TTL_MS = 60 * 60 * 1000;
  const BATCH_SIGNED_URL_REFRESH_SAFETY_MS = 15 * 60 * 1000;
  const BATCH_ESTIMATED_ITEM_DURATION_MS = 2 * 60 * 1000;
  const BATCH_UPLOAD_WAIT_TIMEOUT_MS = 60000;
  const EMOJI_RETRY_PROMPT_HANDLED_KEY = "quickvintEmojiRetryPromptHandled";
  const INLINE_LANGUAGE_HINT_DONE_KEY = "quickvintInlineLanguageHintDone";
  const LANGUAGE_PREFERENCE_TOUCHED_KEY = "quickvintLanguagePreferenceTouched";
  const OFFER_DISMISSED_KEY_PREFIX = "quickvintOfferDismissed";
  const OFFER_LAST_SHOWN_KEY_PREFIX = "quickvintOfferLastShown";
  const LIMIT_PAYWALL_SEEN_KEY_PREFIX = "quickvintLimitPaywallSeen";
  const OFFER_SHOW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  const FREE_LIMIT_OFFER_COPY_KEY = "free_limit";
  const STARTER_DAILY_LIMIT_OFFER_COPY_KEY = "starter_daily_limit";
  const STARTER_DAILY_PRO_CAMPAIGN_KEY = "starter_daily_pro_offer_v1";
  const FREE_LIFETIME_LIMIT = 5;
  const LIMIT_FOLLOWUP_COUPON_CODE = "LISTFASTER20";
  const LIMIT_FOLLOWUP_CLOSE_DELAY_MS = 10 * 1000;
  const STARTER_DAILY_LIMIT_CLOSE_DELAY_MS = 650;
  const LIMIT_FOLLOWUP_RETURN_DELAY_MS = 250;
  const STARTER_DAILY_LIMIT_RETURN_DELAY_MS = 250;
  const USER_USAGE_SNAPSHOT_STORAGE_KEY = "quickvintUserUsageSnapshot";
  const OPEN_SETTINGS_ON_NEXT_POPUP_KEY = "quickvintOpenSettingsOnNextPopup";
  const EMOJI_SEQUENCE_REGEX =
    /(?:[0-9#*]\uFE0F?\u20E3)|(?:[\u{1F1E6}-\u{1F1FF}]{2})|(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier})?(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier})?)*/gu;
  const SELECTORS = {
    title: 'input[data-testid="title--input"]',
    description: 'textarea[data-testid="description--input"]',
    mediaGrid: '[data-testid="media-upload-grid"], [data-testid="media-select-grid"]',
    mediaPhotoBox: '.photo-box, [class*="__photo-box"]:not([class*="__photo-box__"])',
    mediaImageWrapper: '[data-testid^="image-wrapper-"]',
    mediaImage:
      '[data-testid^="image-wrapper-"] img.web_ui__Image__content, .photo-box__image-container img.web_ui__Image__content, img[alt^="Uploaded photo"]',
    mediaAddPhotosButton:
      '[data-testid="add-photos-icon-button"], button[aria-label="Add photos"]',
    fileInput:
      '[data-testid="media-upload"] input[data-testid="add-photos-input"][type="file"], input[data-testid="add-photos-input"][type="file"], input[type="file"][name="photos"]',
  };
  const LANGUAGE_OPTIONS = [
    { code: "en", name: "English", shortName: "EN", flag: "gb", flagAlt: "UK Flag", flagEmoji: "🇬🇧" },
    { code: "fr", name: "Français", shortName: "FR", flag: "fr", flagAlt: "French Flag", flagEmoji: "🇫🇷" },
    { code: "cz", name: "Čeština", shortName: "CZ", flag: "cz", flagAlt: "Czech Flag", flagEmoji: "🇨🇿" },
    { code: "da", name: "Dansk", shortName: "DA", flag: "dk", flagAlt: "Danish Flag", flagEmoji: "🇩🇰" },
    { code: "nl", name: "Nederlands", shortName: "NL", flag: "nl", flagAlt: "Dutch Flag", flagEmoji: "🇳🇱" },
    { code: "de", name: "Deutsch", shortName: "DE", flag: "de", flagAlt: "German Flag", flagEmoji: "🇩🇪" },
    { code: "el", name: "Ελληνικά", shortName: "EL", flag: "gr", flagAlt: "Greek Flag", flagEmoji: "🇬🇷" },
    { code: "hr", name: "Hrvatski", shortName: "HR", flag: "hr", flagAlt: "Croatian Flag", flagEmoji: "🇭🇷" },
    { code: "fi", name: "Suomeksi", shortName: "FI", flag: "fi", flagAlt: "Finnish Flag", flagEmoji: "🇫🇮" },
    { code: "hu", name: "Magyar", shortName: "HU", flag: "hu", flagAlt: "Hungarian Flag", flagEmoji: "🇭🇺" },
    { code: "it", name: "Italiano", shortName: "IT", flag: "it", flagAlt: "Italian Flag", flagEmoji: "🇮🇹" },
    { code: "lt", name: "Lietuvių", shortName: "LT", flag: "lt", flagAlt: "Lithuanian Flag", flagEmoji: "🇱🇹" },
    { code: "pl", name: "Polski", shortName: "PL", flag: "pl", flagAlt: "Polish Flag", flagEmoji: "🇵🇱" },
    { code: "pt", name: "Português", shortName: "PT", flag: "pt", flagAlt: "Portuguese Flag", flagEmoji: "🇵🇹" },
    { code: "ro", name: "Română", shortName: "RO", flag: "ro", flagAlt: "Romanian Flag", flagEmoji: "🇷🇴" },
    { code: "es", name: "Español", shortName: "ES", flag: "es", flagAlt: "Spanish Flag", flagEmoji: "🇪🇸" },
    { code: "sk", name: "Slovenčina", shortName: "SK", flag: "sk", flagAlt: "Slovak Flag", flagEmoji: "🇸🇰" },
    { code: "sv", name: "Svenska", shortName: "SV", flag: "se", flagAlt: "Swedish Flag", flagEmoji: "🇸🇪" },
  ];
  const LIMIT_FOLLOWUP_COPY = {
    en: {
      brandSub: "Vinted listing assistant",
      kicker: "5 free listings used",
      title: "Keep listing without waiting",
      body: "You used your 5 free listings. This offer keeps your next listings moving today.",
      discount: "20% off your first month",
      offerSub: "Use at checkout",
      noAccount: "No Vinted account connection needed",
      stripe: "Secure Stripe checkout. Cancel anytime.",
      primary: "View plans & use offer",
      secondary: "Maybe later",
      feedback: "🎁 Share feedback for free listings",
      close: "Close offer",
      copyCoupon: "Copy coupon code",
      copied: "Copied",
      feedbackPlaceholder: "What would make AutoLister worth upgrading for you?",
    },
    fr: {
      brandSub: "Assistant d'annonces Vinted",
      kicker: "5 annonces gratuites utilisées",
      title: "Continuez à publier sans attendre",
      body: "Vous avez utilisé vos 5 annonces gratuites. Cette offre vous aide à continuer aujourd'hui.",
      discount: "-20 % sur votre premier mois",
      offerSub: "À utiliser au paiement",
      noAccount: "Aucune connexion à votre compte Vinted",
      stripe: "Paiement sécurisé avec Stripe. Annulable à tout moment.",
      primary: "Voir les abonnements",
      secondary: "Plus tard",
      feedback: "🎁 Donner un avis pour des annonces gratuites",
      close: "Fermer l'offre",
      copyCoupon: "Copier le code promo",
      copied: "Copié",
      feedbackPlaceholder: "Qu'est-ce qui rendrait AutoLister utile pour vous ?",
    },
    cz: {
      brandSub: "Asistent pro inzeráty na Vinted",
      kicker: "5 bezplatných inzerátů využito",
      title: "Pokračujte bez čekání",
      body: "Využili jste svých 5 bezplatných inzerátů. Tato nabídka vám pomůže pokračovat ještě dnes.",
      discount: "20 % sleva na první měsíc",
      offerSub: "Použijte u platby",
      noAccount: "Bez připojení účtu Vinted",
      stripe: "Bezpečná platba přes Stripe. Zrušení kdykoliv.",
      primary: "Zobrazit plány",
      secondary: "Později",
      feedback: "🎁 Sdílet zpětnou vazbu za bezplatné inzeráty",
      close: "Zavřít nabídku",
      copyCoupon: "Zkopírovat slevový kód",
      copied: "Zkopírováno",
      feedbackPlaceholder: "Co by pro vás udělalo AutoLister užitečnějším?",
    },
    da: {
      brandSub: "Assistent til Vinted-annoncer",
      kicker: "5 gratis annoncer brugt",
      title: "Fortsæt uden at vente",
      body: "Du har brugt dine 5 gratis annoncer. Dette tilbud hjælper dig videre i dag.",
      discount: "20 % rabat på din første måned",
      offerSub: "Brug ved betaling",
      noAccount: "Ingen forbindelse til din Vinted-konto",
      stripe: "Sikker betaling med Stripe. Opsig når som helst.",
      primary: "Se planer",
      secondary: "Måske senere",
      feedback: "🎁 Del feedback for gratis annoncer",
      close: "Luk tilbud",
      copyCoupon: "Kopiér rabatkode",
      copied: "Kopieret",
      feedbackPlaceholder: "Hvad ville gøre AutoLister værd at opgradere til?",
    },
    nl: {
      brandSub: "Assistent voor Vinted-advertenties",
      kicker: "5 gratis advertenties gebruikt",
      title: "Blijf plaatsen zonder wachten",
      body: "Je hebt je 5 gratis advertenties gebruikt. Deze aanbieding helpt je vandaag verder.",
      discount: "20% korting op je eerste maand",
      offerSub: "Gebruik bij het afrekenen",
      noAccount: "Geen koppeling met je Vinted-account nodig",
      stripe: "Veilig afrekenen via Stripe. Altijd opzegbaar.",
      primary: "Bekijk plannen",
      secondary: "Misschien later",
      feedback: "🎁 Deel feedback voor gratis advertenties",
      close: "Aanbieding sluiten",
      copyCoupon: "Kortingscode kopiëren",
      copied: "Gekopieerd",
      feedbackPlaceholder: "Wat zou AutoLister voor jou de upgrade waard maken?",
    },
    de: {
      brandSub: "Assistent für Vinted-Angebote",
      kicker: "5 kostenlose Angebote genutzt",
      title: "Weiter einstellen ohne Warten",
      body: "Du hast deine 5 kostenlosen Angebote genutzt. Dieses Angebot hilft dir, heute weiterzumachen.",
      discount: "20 % Rabatt auf den ersten Monat",
      offerSub: "Beim Checkout verwenden",
      noAccount: "Keine Verbindung zu deinem Vinted-Konto nötig",
      stripe: "Sichere Zahlung über Stripe. Jederzeit kündbar.",
      primary: "Tarife ansehen",
      secondary: "Vielleicht später",
      feedback: "🎁 Feedback teilen für kostenlose Angebote",
      close: "Angebot schließen",
      copyCoupon: "Gutscheincode kopieren",
      copied: "Kopiert",
      feedbackPlaceholder: "Was würde AutoLister für dich upgrade-würdig machen?",
    },
    el: {
      brandSub: "Βοηθός αγγελιών Vinted",
      kicker: "Χρησιμοποιήθηκαν 5 δωρεάν αγγελίες",
      title: "Συνέχισε χωρίς αναμονή",
      body: "Χρησιμοποίησες τις 5 δωρεάν αγγελίες σου. Αυτή η προσφορά σε βοηθά να συνεχίσεις σήμερα.",
      discount: "20% έκπτωση στον πρώτο μήνα",
      offerSub: "Χρήση στο checkout",
      noAccount: "Δεν χρειάζεται σύνδεση με Vinted",
      stripe: "Ασφαλής πληρωμή με Stripe. Ακύρωση όποτε θέλεις.",
      primary: "Δες τα πλάνα",
      secondary: "Ίσως αργότερα",
      feedback: "🎁 Στείλε σχόλια για δωρεάν αγγελίες",
      close: "Κλείσιμο προσφοράς",
      copyCoupon: "Αντιγραφή κωδικού",
      copied: "Αντιγράφηκε",
      feedbackPlaceholder: "Τι θα έκανε το AutoLister πιο χρήσιμο για εσένα;",
    },
    hr: {
      brandSub: "Asistent za Vinted oglase",
      kicker: "5 besplatnih oglasa iskorišteno",
      title: "Nastavi objavljivati bez čekanja",
      body: "Iskoristili ste svojih 5 besplatnih oglasa. Ova ponuda vam pomaže nastaviti danas.",
      discount: "20% popusta na prvi mjesec",
      offerSub: "Upotrijebi pri plaćanju",
      noAccount: "Nije potrebno povezivanje Vinted računa",
      stripe: "Sigurno plaćanje putem Stripea. Otkažite bilo kada.",
      primary: "Pogledaj planove",
      secondary: "Možda kasnije",
      feedback: "🎁 Pošalji povratnu informaciju za besplatne oglase",
      close: "Zatvori ponudu",
      copyCoupon: "Kopiraj kupon",
      copied: "Kopirano",
      feedbackPlaceholder: "Što bi AutoLister učinilo vrijednim nadogradnje?",
    },
    fi: {
      brandSub: "Vinted-ilmoitusten apuri",
      kicker: "5 ilmaista ilmoitusta käytetty",
      title: "Jatka ilman odottamista",
      body: "Olet käyttänyt 5 ilmaista ilmoitustasi. Tämä tarjous auttaa jatkamaan tänään.",
      discount: "20 % alennus ensimmäisestä kuukaudesta",
      offerSub: "Käytä kassalla",
      noAccount: "Vinted-tiliä ei tarvitse yhdistää",
      stripe: "Turvallinen Stripe-maksu. Peru milloin tahansa.",
      primary: "Katso paketit",
      secondary: "Ehkä myöhemmin",
      feedback: "🎁 Jaa palaute ja saa ilmaisia ilmoituksia",
      close: "Sulje tarjous",
      copyCoupon: "Kopioi kuponkikoodi",
      copied: "Kopioitu",
      feedbackPlaceholder: "Mikä tekisi AutoListerista sinulle päivittämisen arvoisen?",
    },
    hu: {
      brandSub: "Vinted hirdetéssegéd",
      kicker: "5 ingyenes hirdetés felhasználva",
      title: "Folytasd várakozás nélkül",
      body: "Felhasználtad az 5 ingyenes hirdetésedet. Ez az ajánlat segít ma tovább haladni.",
      discount: "20% kedvezmény az első hónapra",
      offerSub: "Használd fizetéskor",
      noAccount: "Nem kell Vinted-fiókot csatlakoztatni",
      stripe: "Biztonságos Stripe fizetés. Bármikor lemondható.",
      primary: "Csomagok megtekintése",
      secondary: "Talán később",
      feedback: "🎁 Visszajelzés ingyenes hirdetésekért",
      close: "Ajánlat bezárása",
      copyCoupon: "Kuponkód másolása",
      copied: "Másolva",
      feedbackPlaceholder: "Mitől érné meg számodra az AutoLister frissítése?",
    },
    it: {
      brandSub: "Assistente per annunci Vinted",
      kicker: "5 annunci gratis usati",
      title: "Continua a pubblicare senza attese",
      body: "Hai usato i tuoi 5 annunci gratis. Questa offerta ti aiuta a continuare oggi.",
      discount: "20% di sconto sul primo mese",
      offerSub: "Usalo al checkout",
      noAccount: "Nessun collegamento al tuo account Vinted",
      stripe: "Pagamento sicuro con Stripe. Puoi annullare quando vuoi.",
      primary: "Vedi i piani",
      secondary: "Forse dopo",
      feedback: "🎁 Lascia un feedback per annunci gratis",
      close: "Chiudi offerta",
      copyCoupon: "Copia codice sconto",
      copied: "Copiato",
      feedbackPlaceholder: "Cosa renderebbe AutoLister utile per te?",
    },
    lt: {
      brandSub: "Vinted skelbimų asistentas",
      kicker: "5 nemokami skelbimai panaudoti",
      title: "Tęskite be laukimo",
      body: "Panaudojote 5 nemokamus skelbimus. Šis pasiūlymas padės tęsti šiandien.",
      discount: "20 % nuolaida pirmajam mėnesiui",
      offerSub: "Naudokite atsiskaitant",
      noAccount: "Nereikia prijungti Vinted paskyros",
      stripe: "Saugus mokėjimas per Stripe. Atšaukti galite bet kada.",
      primary: "Peržiūrėti planus",
      secondary: "Gal vėliau",
      feedback: "🎁 Palikite atsiliepimą už nemokamus skelbimus",
      close: "Uždaryti pasiūlymą",
      copyCoupon: "Kopijuoti kupono kodą",
      copied: "Nukopijuota",
      feedbackPlaceholder: "Kas padarytų AutoLister vertą atnaujinimo jums?",
    },
    pl: {
      brandSub: "Asystent ogłoszeń Vinted",
      kicker: "Wykorzystano 5 darmowych ogłoszeń",
      title: "Dodawaj dalej bez czekania",
      body: "Wykorzystano 5 darmowych ogłoszeń. Ta oferta pomoże Ci kontynuować dzisiaj.",
      discount: "20% zniżki na pierwszy miesiąc",
      offerSub: "Użyj przy płatności",
      noAccount: "Bez łączenia konta Vinted",
      stripe: "Bezpieczna płatność Stripe. Anuluj w każdej chwili.",
      primary: "Zobacz plany",
      secondary: "Może później",
      feedback: "🎁 Podziel się opinią za darmowe ogłoszenia",
      close: "Zamknij ofertę",
      copyCoupon: "Kopiuj kod rabatowy",
      copied: "Skopiowano",
      feedbackPlaceholder: "Co sprawiłoby, że AutoLister byłby wart przejścia na plan płatny?",
    },
    pt: {
      brandSub: "Assistente de anúncios Vinted",
      kicker: "5 anúncios grátis usados",
      title: "Continue sem esperar",
      body: "Usou os seus 5 anúncios grátis. Esta oferta ajuda-o a continuar hoje.",
      discount: "20% de desconto no primeiro mês",
      offerSub: "Use no checkout",
      noAccount: "Não precisa de ligar a sua conta Vinted",
      stripe: "Pagamento seguro com Stripe. Cancele quando quiser.",
      primary: "Ver planos",
      secondary: "Talvez depois",
      feedback: "🎁 Dê feedback por anúncios grátis",
      close: "Fechar oferta",
      copyCoupon: "Copiar código promocional",
      copied: "Copiado",
      feedbackPlaceholder: "O que tornaria o AutoLister útil para si?",
    },
    ro: {
      brandSub: "Asistent pentru anunțuri Vinted",
      kicker: "5 anunțuri gratuite folosite",
      title: "Continuă fără să aștepți",
      body: "Ai folosit cele 5 anunțuri gratuite. Această ofertă te ajută să continui azi.",
      discount: "20% reducere în prima lună",
      offerSub: "Folosește la plată",
      noAccount: "Nu trebuie conectat contul Vinted",
      stripe: "Plată sigură prin Stripe. Anulezi oricând.",
      primary: "Vezi planurile",
      secondary: "Poate mai târziu",
      feedback: "🎁 Trimite feedback pentru anunțuri gratuite",
      close: "Închide oferta",
      copyCoupon: "Copiază codul promoțional",
      copied: "Copiat",
      feedbackPlaceholder: "Ce ar face AutoLister util pentru tine?",
    },
    es: {
      brandSub: "Asistente para anuncios de Vinted",
      kicker: "5 anuncios gratis usados",
      title: "Sigue publicando sin esperar",
      body: "Has usado tus 5 anuncios gratis. Esta oferta te ayuda a seguir hoy.",
      discount: "20% de descuento el primer mes",
      offerSub: "Úsalo al pagar",
      noAccount: "No necesitas conectar tu cuenta de Vinted",
      stripe: "Pago seguro con Stripe. Cancela cuando quieras.",
      primary: "Ver planes",
      secondary: "Quizá luego",
      feedback: "🎁 Envía feedback por anuncios gratis",
      close: "Cerrar oferta",
      copyCoupon: "Copiar código descuento",
      copied: "Copiado",
      feedbackPlaceholder: "¿Qué haría que AutoLister merezca la pena para ti?",
    },
    sk: {
      brandSub: "Asistent pre inzeráty na Vinted",
      kicker: "5 bezplatných inzerátov použitých",
      title: "Pokračujte bez čakania",
      body: "Použili ste 5 bezplatných inzerátov. Táto ponuka vám pomôže pokračovať ešte dnes.",
      discount: "20 % zľava na prvý mesiac",
      offerSub: "Použiť pri platbe",
      noAccount: "Bez pripojenia účtu Vinted",
      stripe: "Bezpečná platba cez Stripe. Zrušenie kedykoľvek.",
      primary: "Zobraziť plány",
      secondary: "Možno neskôr",
      feedback: "🎁 Pošlite spätnú väzbu za bezplatné inzeráty",
      close: "Zavrieť ponuku",
      copyCoupon: "Kopírovať kupón",
      copied: "Skopírované",
      feedbackPlaceholder: "Čo by pre vás urobilo AutoLister užitočnejším?",
    },
    sv: {
      brandSub: "Assistent för Vinted-annonser",
      kicker: "5 gratis annonser använda",
      title: "Fortsätt utan att vänta",
      body: "Du har använt dina 5 gratis annonser. Det här erbjudandet hjälper dig fortsätta idag.",
      discount: "20% rabatt första månaden",
      offerSub: "Använd i kassan",
      noAccount: "Ingen koppling till ditt Vinted-konto behövs",
      stripe: "Säker betalning med Stripe. Avsluta när som helst.",
      primary: "Se planer",
      secondary: "Kanske senare",
      feedback: "🎁 Dela feedback för gratis annonser",
      close: "Stäng erbjudande",
      copyCoupon: "Kopiera rabattkod",
      copied: "Kopierat",
      feedbackPlaceholder: "Vad skulle göra AutoLister värt att uppgradera för dig?",
    },
  };
  const LIMIT_FOLLOWUP_COPY_OVERRIDES = {
    [STARTER_DAILY_LIMIT_OFFER_COPY_KEY]: {
      en: {
        kicker: "Starter daily limit reached",
        title: "Need more listings today?",
        body: "You hit today's Starter limit. Use this offer for Pro if you want to keep listing with higher daily limits.",
        primary: "Upgrade to Pro & use offer",
        feedback: "Tell us what limit you need",
        feedbackPlaceholder: "What daily limit would fit the way you sell?",
      },
      fr: {
        kicker: "Limite quotidienne Starter atteinte",
        title: "Besoin de plus d'annonces aujourd'hui ?",
        body: "Vous avez atteint la limite Starter du jour. Utilisez cette offre pour passer à Pro et continuer avec des limites plus hautes.",
        primary: "Passer à Pro",
        feedback: "Dites-nous la limite voulue",
        feedbackPlaceholder: "Quelle limite quotidienne conviendrait à votre façon de vendre ?",
      },
      cz: {
        kicker: "Denní limit Starter dosažen",
        title: "Potřebujete dnes více inzerátů?",
        body: "Dosáhli jste dnešního limitu Starter. Použijte tuto nabídku na Pro, pokud chcete pokračovat s vyššími denními limity.",
        primary: "Přejít na Pro",
        feedback: "Řekněte nám, jaký limit potřebujete",
        feedbackPlaceholder: "Jaký denní limit by odpovídal vašemu prodeji?",
      },
      da: {
        kicker: "Starter-dagsgrænse nået",
        title: "Har du brug for flere annoncer i dag?",
        body: "Du har ramt dagens Starter-grænse. Brug tilbuddet på Pro, hvis du vil fortsætte med højere dagsgrænser.",
        primary: "Opgrader til Pro",
        feedback: "Fortæl os hvilken grænse du har brug for",
        feedbackPlaceholder: "Hvilken dagsgrænse passer til din måde at sælge på?",
      },
      nl: {
        kicker: "Starter-daglimiet bereikt",
        title: "Vandaag meer advertenties nodig?",
        body: "Je hebt de Starter-limiet van vandaag bereikt. Gebruik deze aanbieding voor Pro als je door wilt met hogere daglimieten.",
        primary: "Upgrade naar Pro",
        feedback: "Vertel welke limiet je nodig hebt",
        feedbackPlaceholder: "Welke daglimiet past bij hoe jij verkoopt?",
      },
      de: {
        kicker: "Starter-Tageslimit erreicht",
        title: "Heute mehr Angebote nötig?",
        body: "Du hast das heutige Starter-Limit erreicht. Nutze dieses Angebot für Pro, wenn du mit höheren Tageslimits weitermachen möchtest.",
        primary: "Auf Pro upgraden",
        feedback: "Sag uns, welches Limit du brauchst",
        feedbackPlaceholder: "Welches Tageslimit passt zu deiner Verkaufsweise?",
      },
      el: {
        kicker: "Έφτασες το ημερήσιο όριο Starter",
        title: "Χρειάζεσαι περισσότερες αγγελίες σήμερα;",
        body: "Έφτασες το σημερινό όριο Starter. Χρησιμοποίησε την προσφορά για Pro αν θέλεις να συνεχίσεις με υψηλότερα ημερήσια όρια.",
        primary: "Αναβάθμιση σε Pro",
        feedback: "Πες μας τι όριο χρειάζεσαι",
        feedbackPlaceholder: "Ποιο ημερήσιο όριο ταιριάζει στον τρόπο που πουλάς;",
      },
      hr: {
        kicker: "Dosegnut dnevni limit Startera",
        title: "Trebate više oglasa danas?",
        body: "Dosegnuli ste današnji Starter limit. Iskoristite ponudu za Pro ako želite nastaviti s višim dnevnim limitima.",
        primary: "Nadogradi na Pro",
        feedback: "Recite nam koji limit trebate",
        feedbackPlaceholder: "Koji bi dnevni limit odgovarao vašem načinu prodaje?",
      },
      fi: {
        kicker: "Starterin päivärajasi täyttyi",
        title: "Tarvitsetko lisää ilmoituksia tänään?",
        body: "Tämän päivän Starter-raja tuli täyteen. Käytä tarjous Pro-pakettiin, jos haluat jatkaa suuremmilla päivärajolla.",
        primary: "Päivitä Prohon",
        feedback: "Kerro meille tarvitsemasi raja",
        feedbackPlaceholder: "Mikä päiväraja sopisi tapaasi myydä?",
      },
      hu: {
        kicker: "Elérted a Starter napi limitet",
        title: "Ma még több hirdetés kell?",
        body: "Elérted a mai Starter limitet. Használd ezt az ajánlatot Pro csomagra, ha magasabb napi limittel folytatnád.",
        primary: "Váltás Pro csomagra",
        feedback: "Mondd el, milyen limit kell",
        feedbackPlaceholder: "Milyen napi limit illene az értékesítési szokásaidhoz?",
      },
      it: {
        kicker: "Limite giornaliero Starter raggiunto",
        title: "Ti servono altri annunci oggi?",
        body: "Hai raggiunto il limite Starter di oggi. Usa questa offerta per Pro se vuoi continuare con limiti giornalieri più alti.",
        primary: "Passa a Pro",
        feedback: "Dicci quale limite ti serve",
        feedbackPlaceholder: "Quale limite giornaliero si adatta al tuo modo di vendere?",
      },
      lt: {
        kicker: "Starter dienos limitas pasiektas",
        title: "Reikia daugiau skelbimų šiandien?",
        body: "Pasiekėte šiandienos Starter limitą. Naudokite šį Pro pasiūlymą, jei norite tęsti su didesniais dienos limitais.",
        primary: "Atnaujinti į Pro",
        feedback: "Pasakykite, kokio limito reikia",
        feedbackPlaceholder: "Koks dienos limitas tiktų jūsų pardavimo būdui?",
      },
      pl: {
        kicker: "Dzienny limit Starter osiągnięty",
        title: "Potrzebujesz dziś więcej ogłoszeń?",
        body: "Osiągnięto dzisiejszy limit Starter. Użyj tej oferty na Pro, jeśli chcesz kontynuować z wyższymi limitami dziennymi.",
        primary: "Przejdź na Pro",
        feedback: "Powiedz, jakiego limitu potrzebujesz",
        feedbackPlaceholder: "Jaki dzienny limit pasuje do Twojego sposobu sprzedaży?",
      },
      pt: {
        kicker: "Limite diário Starter atingido",
        title: "Precisa de mais anúncios hoje?",
        body: "Atingiu o limite Starter de hoje. Use esta oferta para Pro se quiser continuar com limites diários mais altos.",
        primary: "Mudar para Pro",
        feedback: "Diga-nos o limite de que precisa",
        feedbackPlaceholder: "Que limite diário combina com a forma como vende?",
      },
      ro: {
        kicker: "Limita zilnică Starter atinsă",
        title: "Ai nevoie de mai multe anunțuri azi?",
        body: "Ai atins limita Starter de azi. Folosește această ofertă pentru Pro dacă vrei să continui cu limite zilnice mai mari.",
        primary: "Treci la Pro",
        feedback: "Spune-ne ce limită ai nevoie",
        feedbackPlaceholder: "Ce limită zilnică se potrivește modului tău de vânzare?",
      },
      es: {
        kicker: "Límite diario de Starter alcanzado",
        title: "¿Necesitas más anuncios hoy?",
        body: "Has alcanzado el límite Starter de hoy. Usa esta oferta para Pro si quieres seguir con límites diarios más altos.",
        primary: "Pasar a Pro",
        feedback: "Dinos qué límite necesitas",
        feedbackPlaceholder: "¿Qué límite diario encaja con tu forma de vender?",
      },
      sk: {
        kicker: "Denný limit Starter dosiahnutý",
        title: "Potrebujete dnes viac inzerátov?",
        body: "Dosiahli ste dnešný limit Starter. Použite túto ponuku na Pro, ak chcete pokračovať s vyššími dennými limitmi.",
        primary: "Prejsť na Pro",
        feedback: "Povedzte nám, aký limit potrebujete",
        feedbackPlaceholder: "Aký denný limit by sedel vášmu predaju?",
      },
      sv: {
        kicker: "Starter-dagsgräns nådd",
        title: "Behöver du fler annonser idag?",
        body: "Du har nått dagens Starter-gräns. Använd erbjudandet för Pro om du vill fortsätta med högre dagsgränser.",
        primary: "Uppgradera till Pro",
        feedback: "Berätta vilken gräns du behöver",
        feedbackPlaceholder: "Vilken dagsgräns passar hur du säljer?",
      },
    },
  };
  const DESCRIPTION_FOOTER_COPY = {
    en: {
      title: "Saved note",
      label: "Description note",
      placeholder: "Smoke-free home. Happy to bundle items.",
      bullets: [
        "Appears on every future listing",
        "Added before hashtags",
        "No links or contact details",
      ],
      locked: "Available during the free trial and on Pro or Business.",
      includeLabel: "Use on this listing",
      skipped: "Saved note is off for this listing.",
      saved: "Saved note updated.",
      cleared: "Saved note cleared.",
      clear: "Clear",
      cancel: "Cancel",
      save: "Save",
      close: "Close saved note form",
    },
    fr: {
      title: "Note enregistrée",
      label: "Note de description",
      placeholder: "Maison non-fumeur. Regroupement possible.",
      bullets: ["Ajoutée à chaque future annonce", "Placée avant les hashtags", "Pas de liens ni coordonnées"],
      locked: "Disponible avec l'essai gratuit et les offres Pro ou Business.",
      includeLabel: "Utiliser pour cette annonce",
      skipped: "La note est désactivée pour cette annonce.",
      saved: "Note enregistrée.",
      cleared: "Note supprimée.",
      clear: "Effacer",
      cancel: "Annuler",
      save: "Enregistrer",
      close: "Fermer la note enregistrée",
    },
    cz: {
      title: "Uložená poznámka",
      label: "Poznámka k popisu",
      placeholder: "Nekuřácká domácnost. Ráda sloučím více věcí.",
      bullets: ["Zobrazí se u každého dalšího inzerátu", "Přidá se před hashtagy", "Bez odkazů a kontaktních údajů"],
      locked: "Dostupné ve zkušební verzi zdarma a v tarifech Pro nebo Business.",
      includeLabel: "Použít u tohoto inzerátu",
      skipped: "Poznámka je pro tento inzerát vypnutá.",
      saved: "Poznámka uložena.",
      cleared: "Poznámka vymazána.",
      clear: "Vymazat",
      cancel: "Zrušit",
      save: "Uložit",
      close: "Zavřít uloženou poznámku",
    },
    da: {
      title: "Gemt note",
      label: "Note til beskrivelse",
      placeholder: "Røgfrit hjem. Samler gerne varer.",
      bullets: ["Vises på alle fremtidige annoncer", "Tilføjes før hashtags", "Ingen links eller kontaktoplysninger"],
      locked: "Tilgængelig i gratis prøveperiode og på Pro eller Business.",
      includeLabel: "Brug på denne annonce",
      skipped: "Noten er slået fra for denne annonce.",
      saved: "Note gemt.",
      cleared: "Note ryddet.",
      clear: "Ryd",
      cancel: "Annuller",
      save: "Gem",
      close: "Luk gemt note",
    },
    nl: {
      title: "Opgeslagen notitie",
      label: "Notitie voor beschrijving",
      placeholder: "Rookvrij huis. Bundelen is mogelijk.",
      bullets: ["Verschijnt bij elke toekomstige advertentie", "Komt voor de hashtags", "Geen links of contactgegevens"],
      locked: "Beschikbaar tijdens de gratis proefperiode en met Pro of Business.",
      includeLabel: "Gebruiken voor deze advertentie",
      skipped: "Notitie staat uit voor deze advertentie.",
      saved: "Notitie opgeslagen.",
      cleared: "Notitie gewist.",
      clear: "Wissen",
      cancel: "Annuleren",
      save: "Opslaan",
      close: "Opgeslagen notitie sluiten",
    },
    de: {
      title: "Gespeicherte Notiz",
      label: "Notiz für Beschreibung",
      placeholder: "Rauchfreier Haushalt. Kombiversand möglich.",
      bullets: ["Erscheint bei jedem künftigen Angebot", "Wird vor Hashtags eingefügt", "Keine Links oder Kontaktdaten"],
      locked: "Verfügbar im kostenlosen Test und mit Pro oder Business.",
      includeLabel: "Für dieses Angebot verwenden",
      skipped: "Notiz ist für dieses Angebot deaktiviert.",
      saved: "Notiz gespeichert.",
      cleared: "Notiz gelöscht.",
      clear: "Löschen",
      cancel: "Abbrechen",
      save: "Speichern",
      close: "Gespeicherte Notiz schließen",
    },
    el: {
      title: "Αποθηκευμένη σημείωση",
      label: "Σημείωση περιγραφής",
      placeholder: "Σπίτι χωρίς καπνό. Μπορώ να συνδυάσω προϊόντα.",
      bullets: ["Εμφανίζεται σε κάθε μελλοντική αγγελία", "Μπαίνει πριν από τα hashtags", "Χωρίς links ή στοιχεία επικοινωνίας"],
      locked: "Διαθέσιμο στη δωρεάν δοκιμή και στα Pro ή Business.",
      includeLabel: "Χρήση σε αυτή την αγγελία",
      skipped: "Η σημείωση είναι απενεργοποιημένη για αυτή την αγγελία.",
      saved: "Η σημείωση αποθηκεύτηκε.",
      cleared: "Η σημείωση διαγράφηκε.",
      clear: "Διαγραφή",
      cancel: "Άκυρο",
      save: "Αποθήκευση",
      close: "Κλείσιμο αποθηκευμένης σημείωσης",
    },
    hr: {
      title: "Spremljena napomena",
      label: "Napomena za opis",
      placeholder: "Dom bez dima. Mogu spojiti više artikala.",
      bullets: ["Pojavljuje se na svakoj budućoj objavi", "Dodaje se prije hashtagova", "Bez linkova ili kontakt podataka"],
      locked: "Dostupno u besplatnoj probi i na Pro ili Business planu.",
      includeLabel: "Koristi na ovoj objavi",
      skipped: "Napomena je isključena za ovu objavu.",
      saved: "Napomena spremljena.",
      cleared: "Napomena obrisana.",
      clear: "Obriši",
      cancel: "Odustani",
      save: "Spremi",
      close: "Zatvori spremljenu napomenu",
    },
    fi: {
      title: "Tallennettu huomautus",
      label: "Kuvaustekstiin lisättävä huomautus",
      placeholder: "Savuton koti. Yhdistelen mielelläni tuotteita.",
      bullets: ["Näkyy jokaisessa tulevassa ilmoituksessa", "Lisätään ennen hashtageja", "Ei linkkejä tai yhteystietoja"],
      locked: "Saatavilla ilmaisessa kokeilussa sekä Pro- tai Business-tilillä.",
      includeLabel: "Käytä tässä ilmoituksessa",
      skipped: "Huomautus on pois päältä tässä ilmoituksessa.",
      saved: "Huomautus tallennettu.",
      cleared: "Huomautus tyhjennetty.",
      clear: "Tyhjennä",
      cancel: "Peruuta",
      save: "Tallenna",
      close: "Sulje tallennettu huomautus",
    },
    hu: {
      title: "Mentett megjegyzés",
      label: "Leírás megjegyzése",
      placeholder: "Dohányfüstmentes otthon. Több terméket is össze tudok vonni.",
      bullets: ["Minden jövőbeli hirdetésben megjelenik", "A hashtagek elé kerül", "Nincsenek linkek vagy elérhetőségek"],
      locked: "Elérhető az ingyenes próba alatt, valamint Pro vagy Business csomaggal.",
      includeLabel: "Használat ennél a hirdetésnél",
      skipped: "A megjegyzés ki van kapcsolva ennél a hirdetésnél.",
      saved: "Megjegyzés mentve.",
      cleared: "Megjegyzés törölve.",
      clear: "Törlés",
      cancel: "Mégse",
      save: "Mentés",
      close: "Mentett megjegyzés bezárása",
    },
    it: {
      title: "Nota salvata",
      label: "Nota per la descrizione",
      placeholder: "Casa senza fumo. Posso unire più articoli.",
      bullets: ["Compare in ogni annuncio futuro", "Viene aggiunta prima degli hashtag", "Niente link o contatti"],
      locked: "Disponibile nella prova gratuita e con Pro o Business.",
      includeLabel: "Usa in questo annuncio",
      skipped: "La nota è disattivata per questo annuncio.",
      saved: "Nota salvata.",
      cleared: "Nota eliminata.",
      clear: "Cancella",
      cancel: "Annulla",
      save: "Salva",
      close: "Chiudi nota salvata",
    },
    lt: {
      title: "Išsaugota pastaba",
      label: "Aprašymo pastaba",
      placeholder: "Namai be dūmų. Galiu sujungti kelias prekes.",
      bullets: ["Rodoma kiekviename būsimame skelbime", "Pridedama prieš grotažymes", "Be nuorodų ar kontaktų"],
      locked: "Pasiekiama nemokamos bandomosios versijos metu ir su Pro arba Business.",
      includeLabel: "Naudoti šiame skelbime",
      skipped: "Pastaba šiame skelbime išjungta.",
      saved: "Pastaba išsaugota.",
      cleared: "Pastaba išvalyta.",
      clear: "Išvalyti",
      cancel: "Atšaukti",
      save: "Išsaugoti",
      close: "Uždaryti išsaugotą pastabą",
    },
    pl: {
      title: "Zapisana notatka",
      label: "Notatka do opisu",
      placeholder: "Dom bez dymu. Chętnie połączę kilka rzeczy.",
      bullets: ["Pojawia się w każdej przyszłej ofercie", "Dodawana przed hashtagami", "Bez linków i danych kontaktowych"],
      locked: "Dostępne w darmowej wersji próbnej oraz w Pro lub Business.",
      includeLabel: "Użyj w tej ofercie",
      skipped: "Notatka jest wyłączona dla tej oferty.",
      saved: "Notatka zapisana.",
      cleared: "Notatka usunięta.",
      clear: "Wyczyść",
      cancel: "Anuluj",
      save: "Zapisz",
      close: "Zamknij zapisaną notatkę",
    },
    pt: {
      title: "Nota guardada",
      label: "Nota da descrição",
      placeholder: "Casa sem fumo. Posso juntar artigos.",
      bullets: ["Aparece em todos os anúncios futuros", "É adicionada antes das hashtags", "Sem links ou contactos"],
      locked: "Disponível no teste gratuito e nos planos Pro ou Business.",
      includeLabel: "Usar neste anúncio",
      skipped: "A nota está desativada neste anúncio.",
      saved: "Nota guardada.",
      cleared: "Nota apagada.",
      clear: "Limpar",
      cancel: "Cancelar",
      save: "Guardar",
      close: "Fechar nota guardada",
    },
    ro: {
      title: "Notă salvată",
      label: "Notă pentru descriere",
      placeholder: "Casă fără fum. Pot grupa articole.",
      bullets: ["Apare la fiecare anunț viitor", "Este adăugată înainte de hashtaguri", "Fără linkuri sau date de contact"],
      locked: "Disponibil în perioada gratuită și pe Pro sau Business.",
      includeLabel: "Folosește la acest anunț",
      skipped: "Nota este dezactivată pentru acest anunț.",
      saved: "Notă salvată.",
      cleared: "Notă ștearsă.",
      clear: "Șterge",
      cancel: "Anulează",
      save: "Salvează",
      close: "Închide nota salvată",
    },
    es: {
      title: "Nota guardada",
      label: "Nota para la descripción",
      placeholder: "Casa sin humo. Puedo agrupar artículos.",
      bullets: ["Aparece en todos los anuncios futuros", "Se añade antes de los hashtags", "Sin enlaces ni datos de contacto"],
      locked: "Disponible en la prueba gratuita y en Pro o Business.",
      includeLabel: "Usar en este anuncio",
      skipped: "La nota está desactivada para este anuncio.",
      saved: "Nota guardada.",
      cleared: "Nota eliminada.",
      clear: "Borrar",
      cancel: "Cancelar",
      save: "Guardar",
      close: "Cerrar nota guardada",
    },
    sk: {
      title: "Uložená poznámka",
      label: "Poznámka k popisu",
      placeholder: "Nefajčiarska domácnosť. Rada spojím viac vecí.",
      bullets: ["Zobrazí sa pri každom budúcom inzeráte", "Pridá sa pred hashtagy", "Bez odkazov a kontaktných údajov"],
      locked: "Dostupné v bezplatnej skúšobnej verzii a v Pro alebo Business.",
      includeLabel: "Použiť v tomto inzeráte",
      skipped: "Poznámka je pre tento inzerát vypnutá.",
      saved: "Poznámka uložená.",
      cleared: "Poznámka vymazaná.",
      clear: "Vymazať",
      cancel: "Zrušiť",
      save: "Uložiť",
      close: "Zavrieť uloženú poznámku",
    },
    sv: {
      title: "Sparad notis",
      label: "Notis till beskrivning",
      placeholder: "Rökfritt hem. Samfraktar gärna.",
      bullets: ["Visas på varje framtida annons", "Läggs till före hashtags", "Inga länkar eller kontaktuppgifter"],
      locked: "Tillgängligt under gratis testperiod och med Pro eller Business.",
      includeLabel: "Använd i denna annons",
      skipped: "Notisen är avstängd för denna annons.",
      saved: "Notis sparad.",
      cleared: "Notis rensad.",
      clear: "Rensa",
      cancel: "Avbryt",
      save: "Spara",
      close: "Stäng sparad notis",
    },
  };
  const UPLOAD_CHOICE_COPY = {
    en: {
      title: "How many items do you want to sell?",
      singleLabel: "1 item",
      singleNote: "Add photos to this page",
      multipleLabel: "Multiple items",
      multipleNote: "Create new listings",
      multipleCurrentListingNote: "Create new listings. This listing will not change.",
      close: "Close upload choices",
    },
    fr: {
      title: "Combien d'articles voulez-vous vendre ?",
      singleLabel: "1 article",
      singleNote: "Ajouter des photos à cette page",
      multipleLabel: "Plusieurs articles",
      multipleNote: "Créer de nouvelles annonces",
      multipleCurrentListingNote: "Créer de nouvelles annonces. Cette annonce ne changera pas.",
      close: "Fermer les choix d'import",
    },
    cz: {
      title: "Kolik položek chcete prodat?",
      singleLabel: "1 položka",
      singleNote: "Přidat fotky na tuto stránku",
      multipleLabel: "Více položek",
      multipleNote: "Vytvořit nové inzeráty",
      multipleCurrentListingNote: "Vytvořit nové inzeráty. Tento inzerát se nezmění.",
      close: "Zavřít výběr nahrání",
    },
    da: {
      title: "Hvor mange varer vil du sælge?",
      singleLabel: "1 vare",
      singleNote: "Føj fotos til denne side",
      multipleLabel: "Flere varer",
      multipleNote: "Opret nye annoncer",
      multipleCurrentListingNote: "Opret nye annoncer. Denne annonce ændres ikke.",
      close: "Luk uploadvalg",
    },
    nl: {
      title: "Hoeveel items wil je verkopen?",
      singleLabel: "1 item",
      singleNote: "Voeg foto's toe aan deze pagina",
      multipleLabel: "Meerdere items",
      multipleNote: "Nieuwe advertenties maken",
      multipleCurrentListingNote: "Nieuwe advertenties maken. Deze advertentie verandert niet.",
      close: "Uploadkeuzes sluiten",
    },
    de: {
      title: "Wie viele Artikel möchtest du verkaufen?",
      singleLabel: "1 Artikel",
      singleNote: "Fotos zu dieser Seite hinzufügen",
      multipleLabel: "Mehrere Artikel",
      multipleNote: "Neue Angebote erstellen",
      multipleCurrentListingNote: "Neue Angebote erstellen. Dieses Angebot bleibt unverändert.",
      close: "Upload-Auswahl schließen",
    },
    el: {
      title: "Πόσα προϊόντα θέλετε να πουλήσετε;",
      singleLabel: "1 προϊόν",
      singleNote: "Προσθήκη φωτογραφιών σε αυτή τη σελίδα",
      multipleLabel: "Πολλά προϊόντα",
      multipleNote: "Δημιουργία νέων αγγελιών",
      multipleCurrentListingNote: "Δημιουργία νέων αγγελιών. Αυτή η αγγελία δεν θα αλλάξει.",
      close: "Κλείσιμο επιλογών ανεβάσματος",
    },
    hr: {
      title: "Koliko predmeta želite prodati?",
      singleLabel: "1 predmet",
      singleNote: "Dodaj fotografije na ovu stranicu",
      multipleLabel: "Više predmeta",
      multipleNote: "Izradi nove objave",
      multipleCurrentListingNote: "Izradi nove objave. Ova objava se neće promijeniti.",
      close: "Zatvori odabir učitavanja",
    },
    fi: {
      title: "Kuinka monta tuotetta haluat myydä?",
      singleLabel: "1 tuote",
      singleNote: "Lisää kuvia tälle sivulle",
      multipleLabel: "Useita tuotteita",
      multipleNote: "Luo uusia ilmoituksia",
      multipleCurrentListingNote: "Luo uusia ilmoituksia. Tämä ilmoitus ei muutu.",
      close: "Sulje latausvalinnat",
    },
    hu: {
      title: "Hány terméket szeretnél eladni?",
      singleLabel: "1 termék",
      singleNote: "Fotók hozzáadása ehhez az oldalhoz",
      multipleLabel: "Több termék",
      multipleNote: "Új hirdetések létrehozása",
      multipleCurrentListingNote: "Új hirdetések létrehozása. Ez a hirdetés nem változik.",
      close: "Feltöltési lehetőségek bezárása",
    },
    it: {
      title: "Quanti articoli vuoi vendere?",
      singleLabel: "1 articolo",
      singleNote: "Aggiungi foto a questa pagina",
      multipleLabel: "Più articoli",
      multipleNote: "Crea nuovi annunci",
      multipleCurrentListingNote: "Crea nuovi annunci. Questo annuncio non cambierà.",
      close: "Chiudi scelte di caricamento",
    },
    lt: {
      title: "Kiek prekių norite parduoti?",
      singleLabel: "1 prekė",
      singleNote: "Pridėti nuotraukas į šį puslapį",
      multipleLabel: "Kelios prekės",
      multipleNote: "Kurti naujus skelbimus",
      multipleCurrentListingNote: "Kurti naujus skelbimus. Šis skelbimas nepasikeis.",
      close: "Uždaryti įkėlimo pasirinkimus",
    },
    pl: {
      title: "Ile rzeczy chcesz sprzedać?",
      singleLabel: "1 rzecz",
      singleNote: "Dodaj zdjęcia do tej strony",
      multipleLabel: "Wiele rzeczy",
      multipleNote: "Utwórz nowe oferty",
      multipleCurrentListingNote: "Utwórz nowe oferty. Ta oferta się nie zmieni.",
      close: "Zamknij wybór przesyłania",
    },
    pt: {
      title: "Quantos artigos quer vender?",
      singleLabel: "1 artigo",
      singleNote: "Adicionar fotos a esta página",
      multipleLabel: "Vários artigos",
      multipleNote: "Criar novos anúncios",
      multipleCurrentListingNote: "Criar novos anúncios. Este anúncio não muda.",
      close: "Fechar opções de carregamento",
    },
    ro: {
      title: "Câte articole vrei să vinzi?",
      singleLabel: "1 articol",
      singleNote: "Adaugă poze pe această pagină",
      multipleLabel: "Mai multe articole",
      multipleNote: "Creează anunțuri noi",
      multipleCurrentListingNote: "Creează anunțuri noi. Acest anunț nu se schimbă.",
      close: "Închide opțiunile de încărcare",
    },
    es: {
      title: "¿Cuántos artículos quieres vender?",
      singleLabel: "1 artículo",
      singleNote: "Añadir fotos a esta página",
      multipleLabel: "Varios artículos",
      multipleNote: "Crear nuevos anuncios",
      multipleCurrentListingNote: "Crear nuevos anuncios. Este anuncio no cambiará.",
      close: "Cerrar opciones de subida",
    },
    sk: {
      title: "Koľko položiek chcete predať?",
      singleLabel: "1 položka",
      singleNote: "Pridať fotky na túto stránku",
      multipleLabel: "Viac položiek",
      multipleNote: "Vytvoriť nové inzeráty",
      multipleCurrentListingNote: "Vytvoriť nové inzeráty. Tento inzerát sa nezmení.",
      close: "Zavrieť výber nahrávania",
    },
    sv: {
      title: "Hur många varor vill du sälja?",
      singleLabel: "1 vara",
      singleNote: "Lägg till foton på denna sida",
      multipleLabel: "Flera varor",
      multipleNote: "Skapa nya annonser",
      multipleCurrentListingNote: "Skapa nya annonser. Denna annons ändras inte.",
      close: "Stäng uppladdningsval",
    },
  };
  const WAND_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <path d="M454.321,219.727l-38.766-51.947l20.815-61.385c2.046-6.032,0.489-12.704-4.015-17.208 c-4.504-4.504-11.175-6.061-17.208-4.015l-61.384,20.815l-51.951-38.766c-5.103-3.809-11.929-4.392-17.605-1.499 c-5.676,2.893-9.217,8.755-9.136,15.125l0.829,64.815l-52.923,37.426c-5.201,3.678-7.863,9.989-6.867,16.282 c0.996,6.291,5.479,11.471,11.561,13.363l43.844,13.63L14.443,483.432c-6.535,6.534-6.535,17.131,0,23.666s17.131,6.535,23.666,0 l257.073-257.072l13.629,43.843c2.172,6.986,8.638,11.768,15.984,11.768c5.375,0,10.494-2.595,13.66-7.072l37.426-52.923 l64.815,0.828c6.322,0.051,12.233-3.462,15.125-9.136S458.131,224.833,454.321,219.727z"></path> <polygon points="173.373,67.274 160.014,42.848 146.656,67.274 122.23,80.632 146.656,93.992 160.014,118.417 173.373,93.992 197.799,80.632 "></polygon> <polygon points="362.946,384.489 352.14,364.731 341.335,384.489 321.577,395.294 341.335,406.1 352.14,425.856 362.946,406.1 382.703,395.294 "></polygon> <polygon points="378.142,19.757 367.337,0 356.531,19.757 336.774,30.563 356.531,41.369 367.337,61.126 378.142,41.369 397.9,30.563 "></polygon> <polygon points="490.635,142.513 484.167,130.689 477.701,142.513 465.876,148.979 477.701,155.446 484.167,167.27 490.635,155.446 502.458,148.979 "></polygon> <polygon points="492.626,294.117 465.876,301.951 439.128,294.117 446.962,320.865 439.128,347.615 465.876,339.781 492.626,347.615 484.791,320.865 "></polygon> </svg>`;
  /*!
   * LDRS Mirage loader, adapted from https://github.com/GriffinJohnston/ldrs
   * Copyright (c) 2022 Griffin Johnston. MIT License.
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, subject to inclusion of this notice. The Software is
   * provided "AS IS", without warranty of any kind.
   */
  function mirageLoaderSvg(filterId) {
    return `<span class="quickvint-mirage" aria-hidden="true"><svg viewBox="0 0 30 6.9" role="presentation" focusable="false" style="filter:url(#${filterId})" xmlns="http://www.w3.org/2000/svg"><circle class="dot" cx="0" cy="3.45" r="3.45"/><circle class="dot" cx="0" cy="3.45" r="3.45"/><circle class="dot" cx="0" cy="3.45" r="3.45"/><circle class="dot" cx="0" cy="3.45" r="3.45"/><circle class="dot" cx="0" cy="3.45" r="3.45"/><defs><filter id="${filterId}"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="ooze"/><feBlend in="SourceGraphic" in2="ooze"/></filter></defs></svg></span>`;
  }
  const PHONE_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>`;
  const BATCH_ICON_SVG = `<svg data-icon="upload" fill="none" viewBox="0 0 24 24" stroke="#ffffff" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/></svg>`;
  const BATCH_ARROW_UP_SVG = `<svg class="batch-direction-icon" aria-hidden="true" focusable="false" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"/></svg>`;
  const BATCH_ARROW_DOWN_SVG = `<svg class="batch-direction-icon" aria-hidden="true" focusable="false" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"/></svg>`;
  const REPORT_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 14.4 13 20H9.5L8.2 13.6"/></svg>`;
  const PLAN_LIMITS = {
    free: { name: "Free", daily: null, monthly: 5, price: "Free" },
    starter: { name: "Starter", daily: 10, monthly: 75, price: "€3.99/mo" },
    pro: { name: "Pro", daily: 25, monthly: 250, price: "€9.99/mo" },
    business: { name: "Business", daily: 60, monthly: 600, price: "€19.99/mo" },
  };
  const CREDIT_PACK = {
    name: "One-time credits",
    price: "€5.99",
    limits: "20 extra listings",
  };
  const SUPPORT_EMAIL = "support@autolister.app";
  const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";
  const TAILORED_LIMITS_CONTACT_URL =
    `mailto:${SUPPORT_EMAIL}?subject=AutoLister%20AI%20tailored%20limits`;
  const ACCOUNT_REVIEW_CONTACT_URL =
    `mailto:${SUPPORT_EMAIL}?subject=AutoLister%20AI%20account%20review`;
  const GENERATION_OUTPUT_EDIT_SUMMARY_IDLE_MS = 20 * 1000;
  const GENERATION_OUTPUT_EDIT_TRACKING_TTL_MS = 5 * 60 * 1000;
  const GENERATION_OUTPUT_EDIT_MAX_SUMMARIES = 3;
  const CAPTURED_PROMPT_UPLOAD_TTL_MS = 30 * 60 * 1000;
  const PHONE_UPLOAD_PENDING_GENERATE_BLOCK_MS = 5 * 60 * 1000;
  const MANUAL_STORAGE_COMPRESSION_RETRY_DELAYS_MS = [250];
  const MANUAL_STORAGE_UPLOAD_CONCURRENCY = 3;
  const MANUAL_STORAGE_UPLOAD_RETRY_DELAYS_MS = [700, 1500];
  const PRIMARY_BUTTON_BACKGROUND =
    "linear-gradient(135deg, #5b54f0 0%, #4338ca 100%)";
  const languageDefaults = window.AutoListerLanguageDefaults;

  // --- STATE ---
  let generateBtn = null;
  let phoneBtn = null;
  let batchBtn = null;
  let reportBtn = null;
  let emojiToggleBtn = null;
  let hashtagsToggleBtn = null;
  let descriptionFooterBtn = null;
  let descriptionFooterEditBtn = null;
  let descriptionLengthToggle = null;
  let outputShapeToggleBtn = null;
  let signInBtn = null;
  let isBusy = false;
  let generateBusyLabel = "Generating";
  let isAuthenticated = null;
  let pollInterval = null;
  let downloadedFiles = new Set();
  let pendingPhoneFiles = new Set();
  let isPhoneUploadPollInFlight = false;
  let activePhoneUploadSessionId = null;
  let lastPhoneUploadState = null;
  let lastPhoneUploadBlockedTrackKey = null;
  let lastPhoneUploadReadyTrackKey = null;
  let isPhoneUploadGenerateInFlight = false;
  let phoneUploadPreviewUrls = [];
  let displayedPhoneUploadPreviewCount = 0;
  let phoneUploadPreviewTimer = null;
  let phoneUploadAutoCloseTimer = null;
  let inlineLanguageListenersBound = false;
  let activeDescriptionApplyPromptCleanup = null;
  let activeLimitFollowupOfferCleanup = null;
  let activeGenerationOutputEditCleanup = null;
  let batchUploadSessionId = null;
  let batchPollInterval = null;
  let batchAutoCloseTimer = null;
  let batchRemoteFiles = [];
  let batchRemoteFileKeys = new Set();
  let batchMarkedGroups = [];
  let batchSelectedPhotoKeys = new Set();
  let batchIsComplete = false;
  let batchPhotoTileByKey = new Map();
  let batchGroupRowById = new Map();
  let batchNextGroupId = 1;
  let batchLastFileCount = 0;
  let batchLastFileChangeAt = 0;
  let batchSignedUrlsListedAt = 0;
  let batchProgressGroups = [];
  let batchProgressStatus = null;
  let batchGenerationCapacity = null;
  let batchCapacityLoading = false;
  let batchInputSource = null;
  let batchComputerUploadPromise = null;
  let batchComputerUploadAbortController = null;
  let listingToolsReadyTracked = false;
  let signedOutToolsReadyTracked = false;
  let eventQueue = [];
  let eventFlushTimer = null;
  let batchTabStatusTimer = null;
  let emojiToggleSyncTimer = null;
  let hashtagsToggleSyncTimer = null;
  let descriptionFooterSyncTimer = null;
  let descriptionLengthSyncTimer = null;
  let outputShapeToggleSyncTimer = null;
  let extensionContextInvalidated = false;
  let isBatchPollInFlight = false;
  let batchImagePreloadUrls = new Set();
  let batchImagePreloadCache = new Map();
  let pendingGenerationOffer = null;
  let pendingLimitFollowupOffer = null;
  let descriptionFooterListingKey = "";
  let descriptionFooterIncludeForListing = DESCRIPTION_FOOTER_INCLUDE_DEFAULT;
  const limitFollowupOfferChecked = new Set();
  let limitFollowupRescueTimer = null;
  let limitFollowupReturnTimer = null;
  let starterDailyLimitReturnTimer = null;
  let limitOfferPaywallCheckoutStarted = false;
  let activeFloatingPromptType = null;
  let activePaywallCleanup = null;
  let limitFollowupResumeListenersBound = false;
  let capturedPromptUpload = null;
  let suppressNextFileInputCapture = false;
  const boundPromptUploadFileInputs = new WeakSet();
  const capturedPromptUploadFileSignatures = new WeakMap();
  const boundPromptUploadMediaGrids = new WeakSet();

  // --- HELPER FUNCTIONS ---

  function showToast(message, type = "error", action = null, autoHide = true) {
    clearPaywallPositioning();
    let toast = document.getElementById("quickvint-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "quickvint-toast";
      document.body.appendChild(toast);
    }
    resetToastPosition(toast);

    const icon = type === "success" ? "✅" : type === "info" ? "ℹ️" : "⚠️";
    let messageHtml = `<span class="toast-message-text">${escapeHtml(message)}</span>`;

    if (action && action.text && typeof action.onClick === "function") {
      messageHtml += `
        <div class="toast-actions">
          <button type="button" class="toast-link primary toast-action-button">
            <span>${escapeHtml(action.text)}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
      `;
      if (action.secondaryText && action.secondaryUrl) {
        messageHtml += `
          <a class="toast-link secondary" href="${action.secondaryUrl}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(action.secondaryText)}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        `;
      }
      messageHtml += "</div>";
    } else if (action && action.text && action.url) {
      messageHtml += `
        <div class="toast-actions">
          <a class="toast-link primary" href="${action.url}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(action.text)}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
      `;
      if (action.secondaryText && action.secondaryUrl) {
        messageHtml += `
          <a class="toast-link secondary" href="${action.secondaryUrl}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(action.secondaryText)}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        `;
      }
      messageHtml += "</div>";
    }

    // Updated HTML structure with close button
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">${messageHtml}</div>
      <button class="toast-close" aria-label="Close">×</button>
    `;

    function hideToast() {
      toast.classList.remove("visible");
      if (window.quickvintToastTimeout)
        clearTimeout(window.quickvintToastTimeout);
      if (window.quickvintToastVisibilityTimeout)
        clearTimeout(window.quickvintToastVisibilityTimeout);
      window.quickvintToastVisibilityTimeout = setTimeout(() => {
        if (!toast.classList.contains("visible")) {
          toast.style.visibility = "hidden";
        }
      }, 300);
    }

    const hasStructuredActions =
      action && action.text && (action.url || typeof action.onClick === "function");
    toast.className = `${type}${hasStructuredActions ? " has-actions" : ""}`;
    toast.style.visibility = "visible"; // Ensure it's visible for the transition

    // Add close handler
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.onclick = hideToast;
    }

    const actionButton = toast.querySelector(".toast-action-button");
    if (actionButton && action && typeof action.onClick === "function") {
      actionButton.onclick = () => {
        hideToast();
        action.onClick();
      };
    }

    // Force reflow
    toast.offsetHeight;

    toast.classList.add("visible");

    if (window.quickvintToastTimeout)
      clearTimeout(window.quickvintToastTimeout);
    if (window.quickvintToastVisibilityTimeout)
      clearTimeout(window.quickvintToastVisibilityTimeout);

    // Only auto-hide if autoHide is true and there is NO action.
    // If there IS an action or autoHide is false, it stays until manually closed.
    if (autoHide && !action) {
      window.quickvintToastTimeout = setTimeout(hideToast, 4000);
    }
  }

  function createAnalyticsClientId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function getClientAnalyticsContext() {
    const userAgent = navigator.userAgent || "";
    const isIos = /iPhone|iPad|iPod/i.test(userAgent);
    const isOrion =
      Boolean(window.KAGI) ||
      /Orion/i.test(userAgent) ||
      (isIos && typeof chrome !== "undefined" && Boolean(chrome.runtime?.id));
    return {
      clientBrowser: isOrion ? "orion" : "other",
      clientPlatform: isIos
        ? "ios"
        : /Android/i.test(userAgent)
          ? "android"
          : "desktop",
    };
  }

  async function getAnalyticsClientId() {
    const data = await chrome.storage.local.get(ANALYTICS_CLIENT_ID_KEY);
    if (data[ANALYTICS_CLIENT_ID_KEY]) {
      return data[ANALYTICS_CLIENT_ID_KEY];
    }
    const analyticsClientId = createAnalyticsClientId();
    await chrome.storage.local.set({ [ANALYTICS_CLIENT_ID_KEY]: analyticsClientId });
    return analyticsClientId;
  }

  function buildEventPayload(event, context, userProfile, analyticsClientId) {
    return {
      event,
      source: "extension_content",
      page: `${window.location.origin}${window.location.pathname}`,
      plan: userProfile?.subscription_tier || "free",
      context: {
        ...context,
        ...getClientAnalyticsContext(),
        analyticsClientId,
      },
      extensionVersion: chrome.runtime.getManifest().version,
    };
  }

  async function flushGrowthEvents() {
    if (eventFlushTimer) {
      clearTimeout(eventFlushTimer);
      eventFlushTimer = null;
    }
    if (!eventQueue.length) return;

    const queuedEvents = eventQueue.splice(0, eventQueue.length);
    try {
      const analyticsClientId = await getAnalyticsClientId();
      const { supabaseSession, userProfile } = await chrome.storage.local.get([
        "supabaseSession",
        "userProfile",
      ]);
      const headers = { "Content-Type": "application/json" };
      if (supabaseSession?.access_token) {
        headers.Authorization = `Bearer ${supabaseSession.access_token}`;
      }

      fetch(`${API_BASE}/api/events/track`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          events: queuedEvents.map((item) =>
            buildEventPayload(
              item.event,
              item.context,
              userProfile,
              analyticsClientId,
            ),
          ),
        }),
      }).catch(() => {});
    } catch (err) {
      // Analytics must never block listing creation.
    }
  }

  function trackGrowthEvent(event, context = {}) {
    try {
      eventQueue.push({ event, context });

      if (eventQueue.length >= 8) {
        if (!eventFlushTimer) {
          eventFlushTimer = setTimeout(flushGrowthEvents, 0);
        }
        return;
      }

      if (!eventFlushTimer) {
        eventFlushTimer = setTimeout(flushGrowthEvents, 1200);
      }
    } catch (err) {
      // Analytics must never block listing creation.
    }
  }

  async function sendImmediateGrowthEvent(event, context = {}) {
    const analyticsClientId = await getAnalyticsClientId();
    const { supabaseSession, userProfile } = await chrome.storage.local.get([
      "supabaseSession",
      "userProfile",
    ]);
    const headers = { "Content-Type": "application/json" };
    if (supabaseSession?.access_token) {
      headers.Authorization = `Bearer ${supabaseSession.access_token}`;
    }

    const response = await fetch(`${API_BASE}/api/events/track`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        events: [
          buildEventPayload(event, context, userProfile, analyticsClientId),
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Report could not be sent.");
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clearLimitFollowupRescueTimer() {
    if (!limitFollowupRescueTimer) return;
    window.clearTimeout(limitFollowupRescueTimer);
    limitFollowupRescueTimer = null;
  }

  function clearLimitFollowupReturnTimer() {
    if (!limitFollowupReturnTimer) return;
    window.clearTimeout(limitFollowupReturnTimer);
    limitFollowupReturnTimer = null;
  }

  function clearStarterDailyLimitReturnTimer() {
    if (!starterDailyLimitReturnTimer) return;
    window.clearTimeout(starterDailyLimitReturnTimer);
    starterDailyLimitReturnTimer = null;
  }

  function clearPaywallPositioning() {
    if (!activePaywallCleanup) return;
    activePaywallCleanup();
    activePaywallCleanup = null;
  }

  function resetToastPosition(toast) {
    if (!toast) return;
    toast.style.left = "";
    toast.style.top = "";
    toast.style.right = "";
    toast.style.bottom = "";
    toast.style.width = "";
  }

  function getFloatingPromptAnchor(anchorInput) {
    const descriptionBox = anchorInput?.closest("label") || anchorInput;
    const titleInput = document.querySelector(SELECTORS.title);
    const titleBox = titleInput?.closest("label") || titleInput;
    return titleBox?.parentElement || descriptionBox?.parentElement || descriptionBox;
  }

  function positionAnchoredFloatingCard(element, anchorInput, preferredWidth) {
    if (!element) return;
    if (window.matchMedia("(max-width: 520px)").matches) {
      element.style.width = "auto";
      element.style.left = "12px";
      element.style.right = "12px";
      element.style.top = "16px";
      element.style.bottom = "auto";
      return;
    }

    const anchor = getFloatingPromptAnchor(anchorInput);
    const anchorRect = anchor?.getBoundingClientRect();
    const margin = 12;
    const gap = 12;
    const width = Math.min(preferredWidth, window.innerWidth - margin * 2);
    const height = element.offsetHeight || 420;
    let left = window.innerWidth - width - margin;
    let top = 80;

    if (anchorRect) {
      const rightSpace = window.innerWidth - anchorRect.right;
      left =
        rightSpace >= width + gap + margin
          ? anchorRect.right + gap
          : Math.max(margin, window.innerWidth - width - margin);
      top = Math.max(
        margin,
        Math.min(anchorRect.top, window.innerHeight - height - margin),
      );
    }

    element.style.width = `${Math.round(width)}px`;
    element.style.left = `${Math.round(left)}px`;
    element.style.top = `${Math.round(top)}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
  }

  function checkPendingLimitFollowupOnResume(reason) {
    if (!pendingLimitFollowupOffer) return;
    maybeShowPendingPrompts({ reason });
  }

  function bindLimitFollowupResumeListeners() {
    if (limitFollowupResumeListenersBound) return;
    limitFollowupResumeListenersBound = true;

    window.addEventListener("focus", () => {
      checkPendingLimitFollowupOnResume("window_focus");
    });
    window.addEventListener("pageshow", () => {
      checkPendingLimitFollowupOnResume("page_show");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkPendingLimitFollowupOnResume("visibility_visible");
      }
    });
  }

  function getRescueOfferCopyKey(limitCode, currentTier) {
    const tier = normalizeTier(currentTier);
    if (limitCode === "free_lifetime_limit") {
      return FREE_LIMIT_OFFER_COPY_KEY;
    }
    if (limitCode === "daily_limit" && tier === "starter") {
      return STARTER_DAILY_LIMIT_OFFER_COPY_KEY;
    }
    return null;
  }

  function getOfferCampaignKey(copyKey = FREE_LIMIT_OFFER_COPY_KEY) {
    return copyKey === STARTER_DAILY_LIMIT_OFFER_COPY_KEY
      ? STARTER_DAILY_PRO_CAMPAIGN_KEY
      : "limit_followup_offer_v1";
  }

  async function queueLocalLimitFollowupOffer(
    reason,
    copyKey = FREE_LIMIT_OFFER_COPY_KEY,
  ) {
    const campaignKey = getOfferCampaignKey(copyKey);
    const isStarterDailyOffer = copyKey === STARTER_DAILY_LIMIT_OFFER_COPY_KEY;
    const offer = {
      campaignKey,
      copyKey,
      couponCode: isStarterDailyOffer ? "" : LIMIT_FOLLOWUP_COUPON_CODE,
      discountLabel: isStarterDailyOffer
        ? "Pro: 25/day and 250/month"
        : LIMIT_FOLLOWUP_COPY.en.discount,
      pricingUrl: await getPricingUrl(),
      limitHitAt: new Date().toISOString(),
      ...(isStarterDailyOffer
        ? {
            tier: "pro",
            checkoutType: "subscription",
          }
        : {}),
    };

    if (await isOfferLocallyDismissed(offer)) return;
    if (await wasOfferShownRecently(offer)) return;

    pendingLimitFollowupOffer = offer;
    trackGrowthEvent("limit_followup_offer_loaded", {
      reason,
      campaignKey: offer.campaignKey,
      source:
        copyKey === STARTER_DAILY_LIMIT_OFFER_COPY_KEY
          ? "client_starter_daily_limit_paywall"
          : "client_free_limit_paywall",
    });
    maybeShowPendingPrompts({ allowDuringDraft: true, reason });
  }

  function scheduleLimitFollowupRescueCheck(
    reason,
    copyKey = FREE_LIMIT_OFFER_COPY_KEY,
  ) {
    clearLimitFollowupRescueTimer();
    limitFollowupRescueTimer = window.setTimeout(() => {
      limitFollowupRescueTimer = null;
      if (limitOfferPaywallCheckoutStarted) return;
      trackGrowthEvent("limit_followup_rescue_check", { reason, copyKey });
      queueLocalLimitFollowupOffer(reason, copyKey);
    }, copyKey === STARTER_DAILY_LIMIT_OFFER_COPY_KEY
      ? STARTER_DAILY_LIMIT_CLOSE_DELAY_MS
      : LIMIT_FOLLOWUP_CLOSE_DELAY_MS);
  }

  function scheduleLimitFollowupReturnCheck() {
    clearStarterDailyLimitReturnTimer();
    starterDailyLimitReturnTimer = window.setTimeout(() => {
      starterDailyLimitReturnTimer = null;
      maybeFetchAndShowLimitFollowupOffer({
        reason: "starter_daily_limit_return",
        onlyCopyKey: STARTER_DAILY_LIMIT_OFFER_COPY_KEY,
        allowDuringDraft: true,
      });
    }, STARTER_DAILY_LIMIT_RETURN_DELAY_MS);

    clearLimitFollowupReturnTimer();
    limitFollowupReturnTimer = window.setTimeout(() => {
      limitFollowupReturnTimer = null;
      maybeFetchAndShowLimitFollowupOffer({
        reason: "return_after_paywall",
        onlyCopyKey: FREE_LIMIT_OFFER_COPY_KEY,
      });
    }, LIMIT_FOLLOWUP_RETURN_DELAY_MS);
  }

  function showLimitPaywall({
    title,
    message,
    options = [],
    trustNote,
    actionText,
    actionUrl,
    secondaryActionText,
    secondaryActionUrl,
    limitCode,
    currentTier,
  }) {
    removeDescriptionApplyPrompt();
    if (activeLimitFollowupOfferCleanup) {
      activeLimitFollowupOfferCleanup("cancel");
    }
    clearPaywallPositioning();
    const rescueOfferCopyKey = getRescueOfferCopyKey(limitCode, currentTier);
    if (rescueOfferCopyKey) {
      limitOfferPaywallCheckoutStarted = false;
      clearLimitFollowupRescueTimer();
      markLimitPaywallSeenLocally(rescueOfferCopyKey).catch(() => {});
    }

    trackGrowthEvent("paywall_shown", {
      title,
      optionCount: options.length,
      actionText,
      limitCode: limitCode || null,
    });

    let toast = document.getElementById("quickvint-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "quickvint-toast";
      document.body.appendChild(toast);
    }

    const logoUrl = chrome.runtime.getURL("icons/icon48.png");
    const optionsHtml = options.length
      ? `
        <div class="paywall-options">
          ${options
            .map((option, index) => {
              const isSelectable = option.selectable !== false;
              return `
                <button
                  class="paywall-option${option.featured ? " featured" : ""}${option.muted ? " muted" : ""}"
                  type="button"
                  data-paywall-option-index="${index}"
                  ${isSelectable ? "" : "disabled"}
                >
                  <div class="paywall-option-main">
                    <span class="paywall-option-name">${escapeHtml(option.name)}</span>
                    ${
                      option.badge
                        ? `<span class="paywall-option-badge${option.badge.toLowerCase() === "most popular" ? " most-popular" : ""}">${escapeHtml(option.badge)}</span>`
                        : ""
                    }
                  </div>
                  <div class="paywall-option-side">
                    <span class="paywall-option-price">${escapeHtml(option.price)}</span>
                    <span class="paywall-option-limits">${escapeHtml(option.limits)}</span>
                  </div>
                </button>
              `;
            })
            .join("")}
        </div>
      `
      : "";
    const trustHtml = trustNote
      ? `<div class="paywall-trust">${escapeHtml(trustNote)}</div>`
      : "";

    toast.innerHTML = `
      <div class="paywall-body">
        <div class="paywall-header">
          <img class="paywall-logo" src="${logoUrl}" alt="" aria-hidden="true">
          <div>
            <div class="paywall-kicker">AutoLister AI</div>
            <div class="paywall-title">${escapeHtml(title)}</div>
          </div>
        </div>
        <div class="paywall-message">${escapeHtml(message)}</div>
        ${optionsHtml}
        ${
          !options.length && actionText
            ? `<button class="paywall-action" type="button">
                <span>${escapeHtml(actionText)}</span>
                <span aria-hidden="true">→</span>
              </button>`
            : ""
        }
        ${
          secondaryActionText && secondaryActionUrl
            ? `<a class="paywall-secondary-action" href="${secondaryActionUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(secondaryActionText)}</a>`
            : ""
        }
        ${trustHtml}
      </div>
      <button class="toast-close paywall-close" aria-label="Close">×</button>
    `;

    toast.className = "paywall";
    toast.style.visibility = "visible";
    activeFloatingPromptType = "paywall";

    const anchorInput = getPromptAnchorInput();
    const onReposition = () => positionAnchoredFloatingCard(toast, anchorInput, 430);
    onReposition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    activePaywallCleanup = () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      if (activeFloatingPromptType === "paywall") {
        activeFloatingPromptType = null;
      }
      resetToastPosition(toast);
    };

    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        toast.classList.remove("visible");
        clearPaywallPositioning();
        if (window.quickvintToastTimeout)
          clearTimeout(window.quickvintToastTimeout);
        trackGrowthEvent("paywall_closed", {
          title,
          optionCount: options.length,
          actionText,
          limitCode: limitCode || null,
        });
        if (rescueOfferCopyKey && !limitOfferPaywallCheckoutStarted) {
          scheduleLimitFollowupRescueCheck("paywall_closed", rescueOfferCopyKey);
        }
      };
    }

    const actionBtn = toast.querySelector(".paywall-action");
    const optionButtons = Array.from(
      toast.querySelectorAll("[data-paywall-option-index]"),
    );

    async function openPaywallOption(option, triggerButton) {
      if (!option || triggerButton?.dataset.checkoutPending === "true") return;

      if (!option.checkoutType) {
        trackGrowthEvent("paywall_action_click", {
          action: "external_link",
          tier: option.tier || null,
        });
        window.open(option.actionUrl || actionUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const optionNameEl = triggerButton?.querySelector(".paywall-option-name");
      const previousOptionName = optionNameEl?.textContent || "";
      const checkoutWindow = window.open("about:blank", "_blank");
      if (triggerButton) {
        triggerButton.dataset.checkoutPending = "true";
        triggerButton.disabled = true;
      }
      optionButtons.forEach((button) => {
        if (button !== triggerButton) button.disabled = true;
      });
      if (actionBtn) actionBtn.disabled = true;
      if (optionNameEl) optionNameEl.textContent = "Opening checkout...";

      trackGrowthEvent("checkout_start", {
        source: "extension_paywall",
        tier: option.tier,
        checkoutType: option.checkoutType,
      });

      try {
        const checkoutUrl = await createCheckoutForPaywall(option);
        if (rescueOfferCopyKey) {
          limitOfferPaywallCheckoutStarted = true;
          clearLimitFollowupRescueTimer();
        }
        trackGrowthEvent("checkout_opened", {
          source: "extension_paywall",
          tier: option.tier,
          checkoutType: option.checkoutType,
        });
        if (checkoutWindow) {
          checkoutWindow.location.href = checkoutUrl;
        } else {
          window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        if (checkoutWindow) checkoutWindow.close();
        console.error("Paywall checkout error:", error);
        if (rescueOfferCopyKey && !limitOfferPaywallCheckoutStarted) {
          scheduleLimitFollowupRescueCheck("checkout_failed", rescueOfferCopyKey);
        }
        clearPaywallPositioning();
        trackGrowthEvent("checkout_failed", {
          source: "extension_paywall",
          tier: option.tier,
          checkoutType: option.checkoutType,
          reason: error.reason || null,
          status: error.status || null,
          message: error.message || "Unable to open the payment page.",
        });
        showToast(
          error.message || "Unable to open the payment page. Please try again.",
          "error",
        );
      } finally {
        if (triggerButton) {
          delete triggerButton.dataset.checkoutPending;
          triggerButton.disabled = false;
        }
        optionButtons.forEach((button) => {
          const optionIndex = Number(button.dataset.paywallOptionIndex);
          const buttonOption = options[optionIndex];
          button.disabled = buttonOption?.selectable === false;
        });
        if (actionBtn) actionBtn.disabled = false;
        if (optionNameEl) optionNameEl.textContent = previousOptionName;
      }
    }

    optionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const optionIndex = Number(button.dataset.paywallOptionIndex);
        const option = options[optionIndex];
        trackGrowthEvent("paywall_option_select", {
          tier: option?.tier || null,
          checkoutType: option?.checkoutType || null,
        });
        openPaywallOption(option, button);
      });
    });

    if (actionBtn) {
      actionBtn.addEventListener("click", async () => {
        if (actionBtn.dataset.checkoutPending === "true") return;

        if (!actionUrl) {
          showToast("Unable to open the payment page. Please try again.", "error");
          return;
        }

        if (!options.length) {
          trackGrowthEvent("paywall_action_click", {
            action: "external_link",
            tier: null,
          });
          window.open(actionUrl, "_blank", "noopener,noreferrer");
          return;
        }
      });
    }

    toast.offsetHeight;
    toast.classList.add("visible");

    if (window.quickvintToastTimeout)
      clearTimeout(window.quickvintToastTimeout);
  }

  function resolveListingLanguagePreferences(storage = {}) {
    return languageDefaults.resolveListingLanguagePreferences(storage);
  }

  function resolveLanguageProfile(storage = {}) {
    return languageDefaults.resolveLanguageProfile(storage);
  }

  function getLimitFollowupCopy(
    languageCode,
    copyKey = FREE_LIMIT_OFFER_COPY_KEY,
  ) {
    const supportedLanguage =
      languageDefaults.getSupportedLanguageCode(languageCode) || "en";
    const baseCopy = LIMIT_FOLLOWUP_COPY[supportedLanguage] || LIMIT_FOLLOWUP_COPY.en;
    const overrideCopy =
      LIMIT_FOLLOWUP_COPY_OVERRIDES[copyKey]?.[supportedLanguage] ||
      LIMIT_FOLLOWUP_COPY_OVERRIDES[copyKey]?.en ||
      null;
    const mergedCopy = overrideCopy ? { ...baseCopy, ...overrideCopy } : baseCopy;
    if (copyKey !== STARTER_DAILY_LIMIT_OFFER_COPY_KEY) return mergedCopy;
    return {
      ...mergedCopy,
      body:
        "Your limit resets tomorrow. If you regularly need more listings per day, Pro gives you 25/day and 250/month.",
      discount: "Pro: 25/day and 250/month",
      offerSub: "For regular listing days",
      primary: "Upgrade to Pro",
      secondary: "Wait until tomorrow",
      noAccount: "More daily and monthly listings included",
      stripe: "Secure Stripe checkout. Cancel anytime.",
    };
  }

  function getDescriptionFooterCopy(languageCode) {
    const supportedLanguage =
      languageDefaults.getSupportedLanguageCode(languageCode) || "en";
    return DESCRIPTION_FOOTER_COPY[supportedLanguage] || DESCRIPTION_FOOTER_COPY.en;
  }

  function getUploadChoiceCopy(languageCode) {
    const supportedLanguage =
      languageDefaults.getSupportedLanguageCode(languageCode) || "en";
    return UPLOAD_CHOICE_COPY[supportedLanguage] || UPLOAD_CHOICE_COPY.en;
  }

  async function resolveUploadChoiceCopy() {
    try {
      const storage = await chrome.storage.local.get([
        "selectedLanguage",
        "selectedTitleLanguage",
        "selectedDescriptionLanguage",
        LANGUAGE_PREFERENCE_TOUCHED_KEY,
      ]);
      const selectedUiLanguage =
        languageDefaults.getSupportedLanguageCode(storage.selectedLanguage);
      if (selectedUiLanguage) {
        return getUploadChoiceCopy(selectedUiLanguage);
      }
      const languageProfile = resolveLanguageProfile(storage);
      return getUploadChoiceCopy(languageProfile.uiLanguageCode);
    } catch (error) {
      return getUploadChoiceCopy("en");
    }
  }

  async function resolvePreferredUiLanguageContext(
    copyKey = FREE_LIMIT_OFFER_COPY_KEY,
  ) {
    try {
      const storage = await chrome.storage.local.get([
        "selectedLanguage",
        "selectedTitleLanguage",
        "selectedDescriptionLanguage",
        LANGUAGE_PREFERENCE_TOUCHED_KEY,
      ]);
      const languageProfile = resolveLanguageProfile(storage);
      return {
        languageCode: languageProfile.uiLanguageCode,
        languageSource: languageProfile.uiLanguageSource,
        copy: getLimitFollowupCopy(languageProfile.uiLanguageCode, copyKey),
        hasExplicitLanguagePreference:
          languageProfile.hasExplicitLanguagePreference,
      };
    } catch (error) {
      return {
        languageCode: "en",
        copy: getLimitFollowupCopy("en", copyKey),
        hasExplicitLanguagePreference: false,
      };
    }
  }

  function markInlineLanguageHintDone() {
    document
      .querySelectorAll(".quickvint-lang-field.quickvint-lang-hint")
      .forEach((field) => field.classList.remove("quickvint-lang-hint"));
    chrome.storage.local.set({ [INLINE_LANGUAGE_HINT_DONE_KEY]: true });
  }

  async function getPricingUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["supabaseSession", "userProfile"], (data) => {
        const user = data.supabaseSession?.user;
        const profile = data.userProfile;

        try {
          const userData = {
            source: "extension",
            signed_in: !!user,
            plan: profile?.subscription_tier || "free",
            subscription_status: profile?.subscription_status || "free",
            email: user?.email || "",
            timestamp: Date.now(),
          };
          // Simple base64 encode
          const token = btoa(JSON.stringify(userData));
          resolve(`${API_BASE}/pricing?token=${token}`);
        } catch (e) {
          console.error("Error building pricing URL:", e);
          resolve(`${API_BASE}/pricing`);
        }
      });
    });
  }

  function normalizeTier(tier) {
    const map = {
      unlimited_monthly: "starter",
      unlimited_annual: "starter",
      starter: "starter",
      pro: "pro",
      business: "business",
      free: "free",
    };

    return map[tier] || "free";
  }

  function isFreeProfile(profile) {
    const tier = normalizeTier(profile?.subscription_tier);
    return profile?.subscription_status !== "active" || tier === "free";
  }

  function hasLocalFreeLimitReached(profile, usage = null) {
    const freeLifetimeUsed = Number(
      usage?.freeLifetimeUsed ?? profile?.free_lifetime_generations_used ?? 0,
    );
    const packCredits = Number(
      usage?.packCredits ?? profile?.pack_credits ?? 0,
    );

    return (
      isFreeProfile(profile) &&
      freeLifetimeUsed >= FREE_LIFETIME_LIMIT &&
      packCredits <= 0
    );
  }

  function hasLocalStarterDailyLimitReached(profile, usage = null) {
    const tier = normalizeTier(usage?.tier || profile?.subscription_tier);
    const isActive = profile?.subscription_status === "active";
    if (!isActive || tier !== "starter") return false;

    const limits = usage?.limits || PLAN_LIMITS.starter;
    const dailyLimit = Number(limits?.daily || PLAN_LIMITS.starter.daily);
    const monthlyLimit = Number(limits?.monthly || PLAN_LIMITS.starter.monthly);
    const dailyUsed = Number(usage?.daily || 0);
    const monthlyUsed = Number(
      usage?.monthly ?? profile?.api_calls_this_month ?? 0,
    );
    const packCredits = Number(
      usage?.packCredits ?? profile?.pack_credits ?? 0,
    );

    return (
      dailyLimit > 0 &&
      monthlyLimit > 0 &&
      dailyUsed >= dailyLimit &&
      monthlyUsed < monthlyLimit &&
      packCredits <= 0
    );
  }

  async function getCurrentUserUsageSnapshot() {
    let usage = null;
    try {
      const response = await sendMessage({ type: "GET_USER_USAGE_COUNT" });
      if (response && typeof response === "object") {
        usage = { ...response, fetchedAt: Date.now() };
        await chrome.storage.local.set({
          [USER_USAGE_SNAPSHOT_STORAGE_KEY]: usage,
        });
      }
    } catch (error) {
      usage = null;
    }

    if (usage) return usage;

    const stored = await chrome.storage.local.get(USER_USAGE_SNAPSHOT_STORAGE_KEY);
    return stored[USER_USAGE_SNAPSHOT_STORAGE_KEY] || null;
  }

  function canUseEmojiSetting(profile) {
    const tier = normalizeTier(profile?.subscription_tier);
    if (profile?.subscription_status !== "active" || tier === "free") {
      return true;
    }
    return tier === "pro" || tier === "business";
  }

  function canUseDescriptionFooterSetting(profile) {
    const tier = normalizeTier(profile?.subscription_tier);
    if (profile?.subscription_status !== "active" || tier === "free") {
      return true;
    }
    return tier === "pro" || tier === "business";
  }

  function validateDescriptionFooterText(value) {
    const text = typeof value === "string" ? value : "";
    if (text.length > DESCRIPTION_FOOTER_MAX_LENGTH) {
      return {
        ok: false,
        error: `Saved note must be ${DESCRIPTION_FOOTER_MAX_LENGTH} characters or less.`,
      };
    }

    const hasLink =
      /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|co|io|app|fr|de|nl|it|es|pl|pt|be|uk|co\.uk)\b)/i.test(
        text,
      );
    const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
    const hasPhone = /(?:\+|00)?\d[\d\s().-]{7,}\d/.test(text);

    if (hasLink || hasEmail || hasPhone) {
      return {
        ok: false,
        error: "Saved note cannot include links, email addresses, or phone numbers.",
      };
    }

    return { ok: true, text };
  }

  function getProfileUserId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["supabaseSession"], ({ supabaseSession }) => {
        resolve(
          supabaseSession?.user?.id ||
            supabaseSession?.user?.email ||
            "anonymous",
        );
      });
    });
  }

  async function getPerUserStorageKey(prefix, suffix = "") {
    const userId = await getProfileUserId();
    return suffix ? `${prefix}:${userId}:${suffix}` : `${prefix}:${userId}`;
  }

  async function isOfferLocallyDismissed(offer) {
    if (!offer?.campaignKey) return true;
    const key = await getPerUserStorageKey(
      OFFER_DISMISSED_KEY_PREFIX,
      offer.campaignKey,
    );
    const result = await chrome.storage.local.get(key);
    return Boolean(result[key]);
  }

  async function dismissOfferLocally(offer) {
    if (!offer?.campaignKey) return;
    const key = await getPerUserStorageKey(
      OFFER_DISMISSED_KEY_PREFIX,
      offer.campaignKey,
    );
    await chrome.storage.local.set({ [key]: Date.now() });
  }

  async function wasOfferShownRecently(offer) {
    if (!offer?.campaignKey) return true;
    const key = await getPerUserStorageKey(
      OFFER_LAST_SHOWN_KEY_PREFIX,
      offer.campaignKey,
    );
    const result = await chrome.storage.local.get(key);
    const lastShownAt = Number(result[key] || 0);
    return lastShownAt > 0 && Date.now() - lastShownAt < OFFER_SHOW_COOLDOWN_MS;
  }

  async function markOfferShownLocally(offer) {
    if (!offer?.campaignKey) return;
    const key = await getPerUserStorageKey(
      OFFER_LAST_SHOWN_KEY_PREFIX,
      offer.campaignKey,
    );
    await chrome.storage.local.set({ [key]: Date.now() });
  }

  async function hasLimitPaywallBeenSeenLocally(copyKey) {
    const campaignKey = getOfferCampaignKey(copyKey);
    const key = await getPerUserStorageKey(
      LIMIT_PAYWALL_SEEN_KEY_PREFIX,
      campaignKey,
    );
    const result = await chrome.storage.local.get(key);
    return Boolean(result[key]);
  }

  async function markLimitPaywallSeenLocally(copyKey) {
    const campaignKey = getOfferCampaignKey(copyKey);
    const key = await getPerUserStorageKey(
      LIMIT_PAYWALL_SEEN_KEY_PREFIX,
      campaignKey,
    );
    await chrome.storage.local.set({ [key]: Date.now() });
  }

  function formatPlanLimitSummary(plan) {
    const daily = plan.daily === null ? "no daily limit" : `${plan.daily}/day`;
    return `${daily} · ${plan.monthly}/month`;
  }

  function planOption(
    tier,
    { badge = "", featured = false, muted = false, selectable = true } = {},
  ) {
    const plan = PLAN_LIMITS[tier];
    const displayBadge = tier === "pro" ? "Most popular" : badge;
    return {
      tier,
      name: plan.name,
      price: plan.price,
      limits: formatPlanLimitSummary(plan),
      actionText: `Upgrade to ${plan.name}`,
      checkoutType: "subscription",
      badge: displayBadge,
      featured,
      muted,
      selectable,
    };
  }

  function creditPackOption({ badge = "", featured = false } = {}) {
    return {
      tier: "credit_pack",
      name: CREDIT_PACK.name,
      price: CREDIT_PACK.price,
      limits: CREDIT_PACK.limits,
      actionText: "Buy one-time credits",
      checkoutType: "credit_pack",
      badge,
      featured,
    };
  }

  function tailoredLimitsOption({ badge = "", featured = false } = {}) {
    return {
      name: "Tailored limits",
      price: SUPPORT_EMAIL,
      limits: "For higher volume",
      actionText: "Contact us",
      actionUrl: TAILORED_LIMITS_CONTACT_URL,
      badge,
      featured,
    };
  }

  function showAccountPausedPaywall(pricingUrl) {
    showLimitPaywall({
      title: "Continue with a paid option",
      message:
        "Paid plans and credit packs let legitimate sellers continue while support reviews duplicate free-trial issues.",
      options: [
        planOption("starter", { featured: true }),
        planOption("pro"),
        planOption("business"),
        creditPackOption({ badge: "One-time purchase" }),
      ],
      trustNote: "Secure checkout by Stripe. Contact support if this pause looks wrong.",
      actionText: "Upgrade to Starter",
      actionUrl: pricingUrl,
      secondaryActionText: "Contact support",
      secondaryActionUrl: ACCOUNT_REVIEW_CONTACT_URL,
      limitCode: "account_paused",
      currentTier: "free",
    });
  }

  async function createCheckoutForPaywall(option, source = "extension_paywall") {
    const response = await sendMessage({
      type: "CREATE_CHECKOUT",
      checkoutType: option.checkoutType,
      tier: option.tier,
      source,
    });
    if (!response?.ok || !response.url) {
      const error = new Error(
        response?.error || "Unable to open the payment page.",
      );
      error.reason = response?.reason || null;
      error.status = response?.status || null;
      throw error;
    }
    return response.url;
  }

  function buildLimitMessage(limitData = {}) {
    const code = limitData.code;
    const currentTier = normalizeTier(limitData.currentTier);
    const nextTier = limitData.nextTier ? normalizeTier(limitData.nextTier) : null;
    const nextPlan = nextTier ? PLAN_LIMITS[nextTier] : null;
    if (code === "burst_limit") {
      return {
        message: "Too many requests at once. Please wait a moment and try again.",
        actionText: null,
        paywall: false,
      };
    }

    if (code === "service_unavailable") {
      return {
        message: limitData.error || "Service temporarily unavailable. Please try again later.",
        actionText: null,
        paywall: false,
      };
    }

    if (code === "account_paused") {
      return {
        title: "Account paused",
        message:
          limitData.error ||
          "This account is paused because it appears linked to duplicate free-trial usage. To continue, contact support or choose a paid option.",
        actionText: "View paid options",
        secondaryActionText: "Contact support",
        secondaryActionUrl: ACCOUNT_REVIEW_CONTACT_URL,
        paywall: false,
      };
    }

    if (code === "free_lifetime_limit") {
      return {
        title: "Free listings used",
        message: "Your photos stay here. Pick a plan to generate this listing.",
        options: [
          planOption("starter", { featured: true }),
          planOption("pro"),
          planOption("business"),
          creditPackOption({ badge: "No commitment" }),
        ],
        trustNote: "Secure checkout by Stripe. Cancel anytime.",
        actionText: "Upgrade to Starter",
        secondaryActionText: "Compare all plans",
        paywall: true,
      };
    }

    if (currentTier === "business") {
      return {
        title: "Limit reached",
        message:
          code === "monthly_limit" || code === "daily_limit"
            ? "Your listing stays here. Add credits without changing plan."
            : limitData.error || "Usage limit reached.",
        options:
          code === "monthly_limit" || code === "daily_limit"
            ? [
                creditPackOption({ badge: "One-time", featured: true }),
                tailoredLimitsOption(),
              ]
            : [],
        trustNote:
          code === "monthly_limit" || code === "daily_limit"
            ? "Secure checkout by Stripe. One-time purchase."
            : "",
        actionText:
          code === "monthly_limit" || code === "daily_limit"
            ? "Buy one-time credits"
            : null,
        secondaryActionText:
          code === "monthly_limit" || code === "daily_limit"
            ? null
            : null,
        paywall: code === "monthly_limit" || code === "daily_limit",
      };
    }

    if (nextPlan) {
      const titleText =
        code === "monthly_limit" ? "Monthly limit reached" : "Daily limit reached";
      const nextTierOptions =
        currentTier === "starter"
          ? [
              planOption("pro", { featured: true }),
              planOption("business"),
              creditPackOption({ badge: "One-time" }),
            ]
          : currentTier === "pro"
            ? [
                planOption("business", { badge: "Recommended", featured: true }),
                creditPackOption({ badge: "One-time" }),
              ]
            : [planOption(nextTier, { badge: "Recommended", featured: true })];

      return {
        title: titleText,
        message: "Your listing stays here. Upgrade or top up to continue.",
        options: nextTierOptions,
        trustNote: "Secure checkout by Stripe. Cancel anytime.",
        actionText: `Upgrade to ${nextPlan.name}`,
        secondaryActionText: "Compare all plans",
        paywall: true,
      };
    }

    return {
      message:
        limitData.error ||
        "Pick the option that fits your next listings.",
      actionText: "Compare all plans",
      options: [
        planOption("starter", { featured: true }),
        planOption("pro"),
        planOption("business"),
      ],
      trustNote: "Secure checkout by Stripe. Cancel anytime.",
      paywall: true,
      title: "Usage limit reached",
    };
  }

  async function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  function shouldOpenSignInInTab() {
    return (
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (window.KAGI && navigator.maxTouchPoints > 0)
    );
  }

  async function openSignInPopup(source, context = {}) {
    const eventContext = {
      source,
      path: window.location.pathname,
      ...context,
    };

    if (shouldOpenSignInInTab()) {
      return openSignInTabFallback(eventContext);
    }

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "OPEN_POPUP" }, (result) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            resolve({
              ok: false,
              error: lastError.message || "Unable to open extension popup.",
            });
            return;
          }
          resolve(result || { ok: true });
        });
      });

      if (response?.ok === false) {
        throw new Error(response.error || "Unable to open extension popup.");
      }

      trackGrowthEvent("signin_popup_opened", eventContext);
      return true;
    } catch (error) {
      const message = error?.message || "Unable to open extension popup.";
      trackGrowthEvent("signin_popup_failed", {
        ...eventContext,
        message,
      });
      return openSignInTabFallback(eventContext);
    }
  }

  async function openSignInTabFallback(eventContext) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "OPEN_AUTH_TAB" }, (result) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            resolve({
              ok: false,
              error: lastError.message || "Unable to open AutoLister sign-in.",
            });
            return;
          }
          resolve(result || { ok: true });
        });
      });

      if (response?.ok === false) {
        throw new Error(response.error || "Unable to open AutoLister sign-in.");
      }

      trackGrowthEvent("signin_auth_tab_opened", eventContext);
      return true;
    } catch (error) {
      trackGrowthEvent("signin_auth_tab_failed", {
        ...eventContext,
        message: error?.message || "Unable to open AutoLister sign-in.",
      });
      showToast(
        "Open AutoLister from the browser toolbar to sign in.",
        "info",
        null,
        false,
      );
      return false;
    }
  }

  function isExtensionContextInvalidatedError(error) {
    return /Extension context invalidated/i.test(error?.message || String(error || ""));
  }

  function stopPreferenceSyncTimers() {
    if (descriptionLengthSyncTimer) {
      window.clearInterval(descriptionLengthSyncTimer);
      descriptionLengthSyncTimer = null;
    }
    if (hashtagsToggleSyncTimer) {
      window.clearInterval(hashtagsToggleSyncTimer);
      hashtagsToggleSyncTimer = null;
    }
    if (descriptionFooterSyncTimer) {
      window.clearInterval(descriptionFooterSyncTimer);
      descriptionFooterSyncTimer = null;
    }
    if (emojiToggleSyncTimer) {
      window.clearInterval(emojiToggleSyncTimer);
      emojiToggleSyncTimer = null;
    }
  }

  function handleExtensionContextInvalidated(error) {
    if (!isExtensionContextInvalidatedError(error)) return false;
    extensionContextInvalidated = true;
    stopPreferenceSyncTimers();
    return true;
  }

  async function claimGenerationOffer(offer) {
    const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });
    if (!access_token) {
      throw new Error("Your session has expired. Please sign in again via the extension.");
    }

    const response = await fetch(`${API_BASE}/api/user/generation-offers/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({ offerId: offer.id }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Could not add this free generation.");
    }

    return payload;
  }

  async function dismissGenerationOffer(offer) {
    const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });
    if (!access_token) return null;

    const response = await fetch(`${API_BASE}/api/user/generation-offers/dismiss`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({ offerId: offer.id }),
    });

    return response.json().catch(() => null);
  }

  /**
   * Compresses and resizes an image to reduce token usage for AI processing.
   * @param {string} imageUrl - The original image URL
   * @param {number} maxDimension - Maximum width or height (default: 1280)
   * @param {number} quality - JPEG quality 0-1 (default: 0.8)
   * @returns {Promise<string>} Base64 encoded compressed image
   */
  function getImageUrlKind(url) {
    if (/^data:/i.test(url)) return "data_url";
    if (/^blob:/i.test(url)) return "blob_url";
    if (/^https?:\/\//i.test(url)) return "remote_url";
    return "unknown";
  }

  function getApproxDataUrlBytes(dataUrl) {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex === -1) return null;
    const base64 = dataUrl.slice(commaIndex + 1);
    return Math.floor((base64.length * 3) / 4);
  }

  function getSafeImageUrlForMetadata(url) {
    if (!/^https?:\/\//i.test(url)) return null;
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return null;
    }
  }

  function parseSrcsetCandidates(srcset) {
    if (!srcset || typeof srcset !== "string") return [];
    return srcset
      .split(",")
      .map((candidate) => {
        const parts = candidate.trim().split(/\s+/);
        const url = parts[0];
        const descriptor = parts[1] || "";
        const widthMatch = descriptor.match(/^(\d+)w$/);
        const densityMatch = descriptor.match(/^(\d+(?:\.\d+)?)x$/);
        const rank = widthMatch
          ? Number(widthMatch[1])
          : densityMatch
            ? Number(densityMatch[1]) * 1000
            : 0;
        return url ? { url, rank } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.rank - a.rank);
  }

  function getBestImageSource(img) {
    const currentUrl = img.currentSrc || img.src || img.getAttribute("src") || "";
    const srcsetCandidates = parseSrcsetCandidates(
      img.getAttribute("srcset") || img.srcset || "",
    );
    const bestSrcset = srcsetCandidates[0]?.url || "";
    const url = bestSrcset || currentUrl;

    return {
      url,
      sourceSelection: bestSrcset && bestSrcset !== currentUrl ? "srcset_best" : "current_src",
      currentUrl,
      bestSrcsetUrl: bestSrcset,
    };
  }

  function revokeCapturedPromptUpload(reason = "replace") {
    if (!capturedPromptUpload) return;
    cleanupCapturedPromptUploadStorage(capturedPromptUpload);
    capturedPromptUpload.files.forEach((entry) => {
      if (entry.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
      }
    });
    capturedPromptUpload = null;
    if (reason !== "replace") {
      console.debug(`AutoLister AI: cleared captured prompt upload (${reason}).`);
    }
  }

  function cleanupCapturedPromptUploadStorage(upload) {
    if (
      !upload ||
      upload.source !== "manual_file_input" ||
      !upload.storageSessionId ||
      upload.storageCleanupRequested
    ) {
      return;
    }
    upload.storageCleanupRequested = true;
    fetch(
      `${PHONE_UPLOAD_API}?action=cleanup&sessionId=${encodeURIComponent(
        upload.storageSessionId,
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        keepalive: true,
      },
    ).catch(() => {});
  }

  function buildCapturedUploadFileMetadata(file, index, source) {
    return {
      index: index + 1,
      captureSource: source,
      fileName: file?.name || null,
      fileType: file?.type || null,
      fileSizeBytes: typeof file?.size === "number" ? file.size : null,
      fileLastModified:
        typeof file?.lastModified === "number" ? file.lastModified : null,
      promptSourceKind: "captured_file_object_url",
    };
  }

  function registerPromptUploadFiles(
    files,
    source,
    { append = false, generateUrls = [], storageSessionId = null } = {},
  ) {
    const fileList = Array.from(files || []).filter(Boolean);
    if (!fileList.length) return null;

    const existingUpload = append ? getActiveCapturedPromptUpload() : null;
    const existingFiles =
      existingUpload && existingUpload.currentSetTrusted !== false
        ? existingUpload.files
        : [];
    if (!existingFiles.length) {
      revokeCapturedPromptUpload("replace");
    }

    const capturedAt = Date.now();
    const newFiles = fileList.map((file, index) => ({
      objectUrl: URL.createObjectURL(file),
      generateUrl:
        typeof generateUrls[index] === "string" && generateUrls[index]
          ? generateUrls[index]
          : null,
      metadata: buildCapturedUploadFileMetadata(
        file,
        existingFiles.length + index,
        source,
      ),
    }));

    capturedPromptUpload = {
      source:
        existingUpload && existingUpload.source !== source
          ? "mixed_upload_sources"
          : source,
      capturedAt,
      storageSessionId: existingUpload?.storageSessionId || storageSessionId || null,
      storageSessionIds: [
        ...new Set(
          [
            ...(Array.isArray(existingUpload?.storageSessionIds)
              ? existingUpload.storageSessionIds
              : existingUpload?.storageSessionId
                ? [existingUpload.storageSessionId]
                : []),
            storageSessionId,
          ].filter(Boolean),
        ),
      ],
      storageUploadPromise: existingUpload?.storageUploadPromise || null,
      storageUploadError: existingUpload?.storageUploadError || null,
      orderTrusted: existingUpload?.orderTrusted !== false,
      currentSetTrusted: true,
      serverComplete:
        source === "phone_upload_single" &&
        lastPhoneUploadState?.complete === true,
      files: [...existingFiles, ...newFiles],
    };

    return {
      upload: capturedPromptUpload,
      files: fileList,
      startIndex: existingFiles.length,
    };
  }

  function invalidateCapturedPromptUploadGenerationUrls(sessionId, reason) {
    const capturedUpload = getActiveCapturedPromptUpload();
    if (
      !capturedUpload ||
      !sessionId ||
      !(
        capturedUpload.storageSessionId === sessionId ||
        capturedUpload.storageSessionIds?.includes(sessionId)
      ) ||
      capturedUpload.source !== "phone_upload_single"
    ) {
      return;
    }

    capturedUpload.files.forEach((entry) => {
      entry.generateUrl = null;
    });
    capturedUpload.generationUrlsInvalidatedReason = reason || "session_finished";
  }

  function clearCapturedPromptUploadGenerationUrls(reason) {
    const capturedUpload = getActiveCapturedPromptUpload();
    if (!capturedUpload?.files?.length) return false;
    const hadGenerationUrls = capturedUpload.files.some((entry) => entry.generateUrl);
    capturedUpload.files.forEach((entry) => {
      entry.generateUrl = null;
    });
    capturedUpload.generationUrlsInvalidatedReason = reason || "fallback_to_local";
    return hadGenerationUrls;
  }

  function finishCapturedPromptUploadPhoneSessions() {
    const capturedUpload = getActiveCapturedPromptUpload();
    const sessionIds = [
      ...new Set(
        [
          ...(Array.isArray(capturedUpload?.storageSessionIds)
            ? capturedUpload.storageSessionIds
            : []),
          capturedUpload?.storageSessionId,
          activePhoneUploadSessionId,
        ].filter(Boolean),
      ),
    ];
    sessionIds.forEach((sessionId) => finishPhoneUploadSession(sessionId));
  }

  function isCapturedStoragePayload(metadata) {
    return (
      metadata?.generationPayloadSource === "phone_upload_storage_url" ||
      metadata?.generationPayloadSource === "manual_upload_storage_url"
    );
  }

  function shouldRetryGenerateWithLocalCapturedImages(status, errorMessage, metadata) {
    if (status !== 400) return false;
    if (!Array.isArray(metadata) || !metadata.some(isCapturedStoragePayload)) {
      return false;
    }
    return /image|photo|fetch|url|processing/i.test(errorMessage || "");
  }

  function isGenerateWaitingMessage(message) {
    return /still (uploading|preparing photos)|wait a moment/i.test(message || "");
  }

  function removeCapturedPromptUploadAtIndex(index) {
    const capturedUpload = getActiveCapturedPromptUpload();
    if (!capturedUpload) return;

    if (capturedUpload.orderTrusted === false) {
      capturedUpload.currentSetTrusted = false;
      capturedUpload.untrustedReason = "delete_after_reorder";
      return;
    }

    if (!Number.isInteger(index) || index < 0 || index >= capturedUpload.files.length) {
      capturedUpload.currentSetTrusted = false;
      capturedUpload.untrustedReason = "delete_index_unmatched";
      return;
    }

    const [removedFile] = capturedUpload.files.splice(index, 1);
    if (removedFile?.objectUrl) {
      URL.revokeObjectURL(removedFile.objectUrl);
    }
    capturedUpload.capturedAt = Date.now();
  }

  async function uploadManualFileToTempStorage(sessionId, file, order, signal) {
    signal?.throwIfAborted();
    const uploadFile = await compressFileForStorageUpload(file, signal);
    let lastError = null;
    let lastStatus = null;
    let attempts = 0;

    for (
      let attempt = 0;
      attempt <= MANUAL_STORAGE_UPLOAD_RETRY_DELAYS_MS.length;
      attempt += 1
    ) {
      attempts = attempt + 1;
      try {
        const formData = new FormData();
        formData.append("sessionId", sessionId);
        formData.append("uploadOrder", String(order));
        formData.append(
          "file",
          uploadFile,
          uploadFile.name || `manual-${order + 1}.jpg`,
        );

        const response = await fetch(
          `${PHONE_UPLOAD_API}?sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: "POST",
            body: formData,
            signal,
          },
        );
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          const uploadedFile = getPhoneUploadPhotoFiles(data?.files)[0];
          return uploadedFile?.url || null;
        }

        const error = new Error(
          data?.error || `Manual upload failed (${response.status})`,
        );
        error.status = response.status;
        throw error;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
        lastStatus = Number.isFinite(Number(error?.status))
          ? Number(error.status)
          : null;
        const delayMs = MANUAL_STORAGE_UPLOAD_RETRY_DELAYS_MS[attempt];
        const retryable = shouldRetryUploadError(error);
        if (!delayMs || !retryable) break;
        trackGrowthEvent("manual_upload_storage_retry", {
          sessionId,
          order,
          attempt: attempt + 1,
          nextAttempt: attempt + 2,
          status: lastStatus,
          retryable,
          message: error?.message || String(error),
        });
        await sleep(delayMs, signal);
      }
    }

    if (lastError) {
      lastError.uploadOrder = order;
      lastError.uploadAttempts = attempts;
      lastError.status = lastStatus;
    }
    throw lastError || new Error("Manual upload failed");
  }

  function shouldRetryUploadError(error) {
    const status = Number(error?.status);
    if (!Number.isFinite(status)) return true;
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
  }

  function sleep(ms, signal) {
    if (!signal) return new Promise((resolve) => setTimeout(resolve, ms));
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timeout);
        reject(signal.reason || new DOMException("Aborted", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  async function mapWithConcurrency(items, limit, mapper) {
    const source = Array.from(items || []);
    const results = new Array(source.length);
    let cursor = 0;
    const workerCount = Math.max(1, Math.min(limit || 1, source.length));

    async function runWorker() {
      while (cursor < source.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(source[index], index);
      }
    }

    const workers = await Promise.allSettled(
      Array.from({ length: workerCount }, runWorker),
    );
    const failedWorker = workers.find(({ status }) => status === "rejected");
    if (failedWorker) throw failedWorker.reason;
    return results;
  }

  function getCompressedUploadFileName(file) {
    const rawName = String(file?.name || "").trim();
    const baseName = rawName
      ? rawName.replace(/\.[^.\\/]+$/, "")
      : `manual-${Date.now()}`;
    return `${baseName || "manual-upload"}.jpg`;
  }

  async function compressFileForStorageUploadOnce(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const result = await compressImageWithMetadata(objectUrl, 1280, 0.8);
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      return new File([blob], getCompressedUploadFileName(file), {
        type: "image/jpeg",
        lastModified: file?.lastModified || Date.now(),
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function compressFileForStorageUpload(file, signal) {
    let lastError = null;
    for (
      let attempt = 0;
      attempt <= MANUAL_STORAGE_COMPRESSION_RETRY_DELAYS_MS.length;
      attempt += 1
    ) {
      try {
        signal?.throwIfAborted();
        const compressed = await compressFileForStorageUploadOnce(file);
        signal?.throwIfAborted();
        return compressed;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
        const delayMs = MANUAL_STORAGE_COMPRESSION_RETRY_DELAYS_MS[attempt];
        if (!delayMs) break;
        await sleep(delayMs, signal);
      }
    }
    console.warn("AutoLister AI: manual temp upload compression failed", lastError);
    trackGrowthEvent("manual_upload_compression_fallback", {
      attempts: MANUAL_STORAGE_COMPRESSION_RETRY_DELAYS_MS.length + 1,
      fileType: file?.type || null,
      fileSizeBytes: Number.isFinite(Number(file?.size)) ? Number(file.size) : null,
      message: lastError?.message || String(lastError || "unknown"),
    });
    return file;
  }

  async function listTempStorageFiles(sessionId, signal) {
    const response = await fetch(
      `${PHONE_UPLOAD_API}?sessionId=${encodeURIComponent(sessionId)}&t=${Date.now()}`,
      { method: "GET", signal },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Upload list failed (${response.status})`);
    }
    return normalizeBatchRemoteFiles(getPhoneUploadPhotoFiles(data?.files));
  }

  async function listManualTempStorageUrls(sessionId) {
    return (await listTempStorageFiles(sessionId)).map((file) => file.url || null);
  }

  function startManualStorageUpload(registration) {
    if (!registration?.upload || registration.upload.source !== "manual_file_input") {
      return;
    }

    const upload = registration.upload;
    const sessionId = upload.storageSessionId || generateSessionId();
    upload.storageSessionId = sessionId;
    upload.storageUploadError = null;

    const currentUploadPromise = (async () => {
      const uploadedUrls = await mapWithConcurrency(
        registration.files,
        MANUAL_STORAGE_UPLOAD_CONCURRENCY,
        (file, offset) =>
          uploadManualFileToTempStorage(
            sessionId,
            file,
            registration.startIndex + offset,
          ),
      );
      let urls = uploadedUrls;
      if (urls.some((url) => !url)) {
        const listedUrls = await listManualTempStorageUrls(sessionId);
        urls = registration.files.map(
          (_file, offset) => listedUrls[registration.startIndex + offset] || null,
        );
      }

      urls.forEach((url, offset) => {
        if (url && upload.files[registration.startIndex + offset]) {
          upload.files[registration.startIndex + offset].generateUrl = url;
        }
      });

      trackGrowthEvent("manual_upload_storage_ready", {
        sessionId,
        uploadedCount: urls.filter(Boolean).length,
        expectedCount: registration.files.length,
      });
    })().catch((error) => {
      upload.storageUploadError = error?.message || String(error);
      trackGrowthEvent("manual_upload_storage_error", {
        sessionId,
        message: upload.storageUploadError,
        expectedCount: registration.files.length,
        order: Number.isFinite(Number(error?.uploadOrder))
          ? Number(error.uploadOrder)
          : null,
        attempts: Number.isFinite(Number(error?.uploadAttempts))
          ? Number(error.uploadAttempts)
          : null,
        status: Number.isFinite(Number(error?.status))
          ? Number(error.status)
          : null,
      });
      throw error;
    }).finally(() => {
      updateButtonUI();
    });

    upload.storageUploadPromise = upload.storageUploadPromise
      ? Promise.allSettled([upload.storageUploadPromise, currentUploadPromise])
      : currentUploadPromise;
    updateButtonUI();
  }

  function hasManualCapturedFilesMissingStorageUrls(upload = getActiveCapturedPromptUpload()) {
    return Boolean(
      upload &&
        upload.source === "manual_file_input" &&
        upload.currentSetTrusted !== false &&
        !upload.storageUploadError &&
        upload.files?.length > 0 &&
        upload.files.some((entry) => !entry.generateUrl),
    );
  }

  async function waitForManualStorageUrlsForGenerate() {
    const upload = getActiveCapturedPromptUpload();
    if (upload?.source === "manual_file_input" && upload.storageUploadError) {
      throw new Error("Could not prepare photos. Try again.");
    }
    if (!hasManualCapturedFilesMissingStorageUrls(upload)) return;

    if (upload.storageUploadPromise) {
      await Promise.race([
        upload.storageUploadPromise.catch(() => null),
        new Promise((resolve) =>
          setTimeout(resolve, MANUAL_STORAGE_UPLOAD_WAIT_MS),
        ),
      ]);
    }

    if (upload.storageUploadError) {
      throw new Error("Could not prepare photos. Try again.");
    }

    if (hasManualCapturedFilesMissingStorageUrls(upload)) {
      throw new Error("Still preparing photos. Try again in a moment.");
    }
  }

  function setGenerateBusyLabel(label = "Generating") {
    generateBusyLabel = label || "Generating";
    if (isBusy) updateButtonUI();
  }

  function shouldAppendToCapturedPromptUpload(uploadSource = null) {
    const capturedUpload = getActiveCapturedPromptUpload();
    if (!capturedUpload || capturedUpload.currentSetTrusted === false) {
      return false;
    }

    if (
      uploadSource === "phone_upload_single" &&
      capturedUpload.source === "phone_upload_single"
    ) {
      return true;
    }

    const visiblePhotoCount = getVisibleUploadedPhotoCount();
    if (capturedUpload.files.length === visiblePhotoCount) return true;

    return (
      capturedUpload.source === "phone_upload_single" &&
      capturedUpload.serverComplete === true &&
      capturedUpload.files.length > visiblePhotoCount
    );
  }

  function getActiveCapturedPromptUpload() {
    if (!capturedPromptUpload) return null;
    const ageMs = Date.now() - capturedPromptUpload.capturedAt;
    if (ageMs > CAPTURED_PROMPT_UPLOAD_TTL_MS) {
      revokeCapturedPromptUpload("expired");
      return null;
    }
    return capturedPromptUpload;
  }

  function applyCapturedPromptUploadSources(domEntries) {
    const capturedUpload = getActiveCapturedPromptUpload();
    if (!capturedUpload) return domEntries;

    if (
      capturedUpload.currentSetTrusted !== false &&
      (capturedUpload.source === "phone_upload_batch" ||
        (capturedUpload.source === "phone_upload_single" &&
          capturedUpload.serverComplete === true)) &&
      capturedUpload.files.length > domEntries.length
    ) {
      return capturedUpload.files.map((capturedFile, index) => ({
        url: capturedFile.objectUrl,
        generationUrl: capturedFile.generateUrl || null,
        promptSource: "captured_upload_file",
        sourceSelection: "captured_upload_file",
        currentUrl: null,
        bestSrcsetUrl: null,
        domNaturalWidth: null,
        domNaturalHeight: null,
        renderedWidth: null,
        renderedHeight: null,
        capturedUploadAvailable: true,
        capturedUploadSource: capturedUpload.source,
        capturedUploadFileCount: capturedUpload.files.length,
        capturedUploadMatchStatus:
          domEntries.length > 0
            ? "partial_vinted_pending_using_captured"
            : "vinted_pending_using_captured",
        capturedUploadOrderTrusted: capturedUpload.orderTrusted !== false,
        capturedUploadSetTrusted: true,
        capturedUploadFile: capturedFile.metadata,
        vintedSourceSelection: null,
        vintedSourceKind: null,
        vintedSourceUrl: null,
        vintedCurrentSrcUrl: null,
        vintedBestSrcsetUrl: null,
        vintedDomNaturalWidth: null,
        vintedDomNaturalHeight: null,
        vintedRenderedWidth: null,
        vintedRenderedHeight: null,
      }));
    }

    const matchStatus =
      capturedUpload.currentSetTrusted === false
        ? `${capturedUpload.untrustedReason || "untrusted_set"}_fallback_to_vinted`
        : capturedUpload.files.length === domEntries.length
          ? capturedUpload.orderTrusted === false
            ? "count_match_unordered"
            : "count_match_by_order"
          : "count_mismatch_fallback_to_vinted";

    if (
      matchStatus !== "count_match_by_order" &&
      matchStatus !== "count_match_unordered"
    ) {
      return domEntries.map((entry) => ({
        ...entry,
        promptSource: "vinted_dom_image",
        capturedUploadAvailable: true,
        capturedUploadSource: capturedUpload.source,
        capturedUploadFileCount: capturedUpload.files.length,
        capturedUploadMatchStatus: matchStatus,
        capturedUploadOrderTrusted: capturedUpload.orderTrusted !== false,
        capturedUploadSetTrusted: capturedUpload.currentSetTrusted !== false,
      }));
    }

    return domEntries.map((entry, index) => {
      const capturedFile = capturedUpload.files[index];
      return {
        ...entry,
        url: capturedFile.objectUrl,
        generationUrl: capturedFile.generateUrl || null,
        promptSource: "captured_upload_file",
        sourceSelection: "captured_upload_file",
        capturedUploadAvailable: true,
        capturedUploadSource: capturedUpload.source,
        capturedUploadFileCount: capturedUpload.files.length,
        capturedUploadMatchStatus: matchStatus,
        capturedUploadOrderTrusted: capturedUpload.orderTrusted !== false,
        capturedUploadSetTrusted: capturedUpload.currentSetTrusted !== false,
        capturedUploadFile: capturedFile.metadata,
        vintedSourceSelection: entry.sourceSelection,
        vintedSourceKind: getImageUrlKind(entry.url),
        vintedSourceUrl: getSafeImageUrlForMetadata(entry.url),
        vintedCurrentSrcUrl: getSafeImageUrlForMetadata(entry.currentUrl),
        vintedBestSrcsetUrl: getSafeImageUrlForMetadata(entry.bestSrcsetUrl),
        vintedDomNaturalWidth: entry.domNaturalWidth,
        vintedDomNaturalHeight: entry.domNaturalHeight,
        vintedRenderedWidth: entry.renderedWidth,
        vintedRenderedHeight: entry.renderedHeight,
      };
    });
  }

  async function compressImageWithMetadata(
    imageUrl,
    maxDimension = 1280,
    quality = 0.8,
    sourceMetadata = {},
  ) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const isRemoteUrl = /^https?:\/\//i.test(imageUrl);
      if (!isRemoteUrl) {
        img.crossOrigin = "anonymous";
      }

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          const inputWidth = img.naturalWidth || img.width;
          const inputHeight = img.naturalHeight || img.height;
          let width = inputWidth;
          let height = inputHeight;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const base64 = canvas.toDataURL("image/jpeg", quality);
          resolve({
            imageUrl: base64,
            metadata: {
              ...sourceMetadata,
              sourceKind: getImageUrlKind(imageUrl),
              sourceUrl: getSafeImageUrlForMetadata(imageUrl),
              sourceNaturalWidth: sourceMetadata.sourceNaturalWidth || null,
              sourceNaturalHeight: sourceMetadata.sourceNaturalHeight || null,
              inputWidth,
              inputHeight,
              outputWidth: width,
              outputHeight: height,
              maxDimension,
              jpegQuality: quality,
              outputBytes: getApproxDataUrlBytes(base64),
              resized: width !== inputWidth || height !== inputHeight,
            },
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      if (isRemoteUrl) {
        sendMessage({
          type: "PROXY_FETCH",
          url: imageUrl,
          options: { method: "GET" },
          isBlob: true,
        })
          .then((response) => {
            if (!response?.ok || !response.data) {
              reject(new Error(response?.error || `Failed to fetch image: ${imageUrl}`));
              return;
            }
            img.src = response.data;
          })
          .catch((error) => reject(error));
        return;
      }

      img.src = imageUrl;
    });
  }

  async function compressImage(imageUrl, maxDimension = 1280, quality = 0.8) {
    const result = await compressImageWithMetadata(imageUrl, maxDimension, quality);
    return result.imageUrl;
  }

  /**
   * Compresses multiple images in parallel with error handling.
   * @param {string[]} imageUrls - Array of image URLs
   * @returns {Promise<string[]>} Array of compressed base64 images
   */
  async function compressImages(imageUrls) {
    let failedCount = 0;
    const compressionPromises = imageUrls.map(async (url) => {
      try {
        return await compressImage(url);
      } catch (error) {
        failedCount += 1;
        // Return original URL as fallback if compression fails
        return url;
      }
    });

    const compressedImages = await Promise.all(compressionPromises);
    if (failedCount > 0) {
      console.warn(
        `AutoLister AI: ${failedCount}/${imageUrls.length} image(s) could not be compressed; using original URL fallback.`,
      );
    }
    return compressedImages;
  }

  function buildImageRequestMetadataBase(entry, index) {
    return {
      index: index + 1,
      sourceSelection: entry.sourceSelection,
      promptSource: entry.promptSource || "vinted_dom_image",
      domNaturalWidth: entry.domNaturalWidth,
      domNaturalHeight: entry.domNaturalHeight,
      renderedWidth: entry.renderedWidth,
      renderedHeight: entry.renderedHeight,
      currentSrcUrl: getSafeImageUrlForMetadata(entry.currentUrl),
      bestSrcsetUrl: getSafeImageUrlForMetadata(entry.bestSrcsetUrl),
      capturedUploadAvailable: entry.capturedUploadAvailable || false,
      capturedUploadSource: entry.capturedUploadSource || null,
      capturedUploadFileCount: entry.capturedUploadFileCount || null,
      capturedUploadMatchStatus: entry.capturedUploadMatchStatus || null,
      capturedUploadOrderTrusted: entry.capturedUploadOrderTrusted ?? null,
      capturedUploadSetTrusted: entry.capturedUploadSetTrusted ?? null,
      capturedUploadFile: entry.capturedUploadFile || null,
      vintedSourceSelection: entry.vintedSourceSelection || null,
      vintedSourceKind: entry.vintedSourceKind || null,
      vintedSourceUrl: entry.vintedSourceUrl || null,
      vintedCurrentSrcUrl: entry.vintedCurrentSrcUrl || null,
      vintedBestSrcsetUrl: entry.vintedBestSrcsetUrl || null,
      vintedDomNaturalWidth: entry.vintedDomNaturalWidth || null,
      vintedDomNaturalHeight: entry.vintedDomNaturalHeight || null,
      vintedRenderedWidth: entry.vintedRenderedWidth || null,
      vintedRenderedHeight: entry.vintedRenderedHeight || null,
    };
  }

  function isPhoneUploadGenerationUrlEntry(entry) {
    return (
      /^https?:\/\//i.test(entry?.generationUrl || "") &&
      (entry.capturedUploadSource === "phone_upload_single" ||
        entry.capturedUploadSource === "phone_upload_batch" ||
        entry.capturedUploadSource === "manual_file_input")
    );
  }

  async function prepareImagesForGenerate(
    imageEntries,
    { ignoreGenerationUrls = false } = {},
  ) {
    let failedCount = 0;
    const imagePromises = imageEntries.map(async (entry, index) => {
      const metadataBase = buildImageRequestMetadataBase(entry, index);
      if (!ignoreGenerationUrls && isPhoneUploadGenerationUrlEntry(entry)) {
        return {
          imageUrl: entry.generationUrl,
          metadata: {
            ...metadataBase,
            sourceKind: "remote_url",
            sourceUrl: getSafeImageUrlForMetadata(entry.generationUrl),
            generationPayloadSource:
              entry.capturedUploadSource === "manual_file_input"
                ? "manual_upload_storage_url"
                : "phone_upload_storage_url",
          },
        };
      }

      try {
        return await compressImageWithMetadata(entry.url, 1280, 0.8, metadataBase);
      } catch (error) {
        failedCount += 1;
        return {
          imageUrl: entry.url,
          metadata: {
            ...metadataBase,
            sourceKind: getImageUrlKind(entry.url),
            sourceUrl: getSafeImageUrlForMetadata(entry.url),
            compressionFailed: true,
            error: error?.message || "Compression failed",
          },
        };
      }
    });

    const results = await Promise.all(imagePromises);
    if (failedCount > 0) {
      console.warn(
        `AutoLister AI: ${failedCount}/${imageEntries.length} image(s) could not be compressed; using original URL fallback.`,
      );
    }

    return {
      imageUrls: results.map((result) => result.imageUrl),
      imageMetadata: results.map((result) => result.metadata),
    };
  }

  const compressImagesWithMetadata = prepareImagesForGenerate;

  function getGenerateRequestBodyByteLimit() {
    const override = window.__AUTOLISTER_MAX_GENERATE_REQUEST_BODY_BYTES;
    return Number.isFinite(override) && override > 0
      ? override
      : MAX_GENERATE_REQUEST_BODY_BYTES;
  }

  function getRemoteFallbackImageUrl(metadata) {
    if (!metadata || typeof metadata !== "object") return null;
    return (
      metadata.vintedBestSrcsetUrl ||
      metadata.vintedCurrentSrcUrl ||
      metadata.vintedSourceUrl ||
      (metadata.sourceKind === "remote_url" ? metadata.sourceUrl : null) ||
      null
    );
  }

  function maybeUseRemoteImagesForOversizedGeneratePayload(requestBody) {
    const initialJson = JSON.stringify(requestBody);
    const byteLimit = getGenerateRequestBodyByteLimit();
    if (initialJson.length <= byteLimit) {
      return {
        requestBody,
        requestBodyJson: initialJson,
        payloadFallback: null,
      };
    }

    if (
      Array.isArray(requestBody.imageUrls) &&
      requestBody.imageUrls.every((url) => /^https?:\/\//i.test(url || ""))
    ) {
      return {
        requestBody,
        requestBodyJson: initialJson,
        payloadFallback: {
          attempted: false,
          reason: "already_using_remote_urls",
          initialRequestBodyBytes: initialJson.length,
          byteLimit,
        },
      };
    }

    const imageMetadata = Array.isArray(requestBody.imageMetadata)
      ? requestBody.imageMetadata
      : [];
    const remoteImageUrls = imageMetadata.map(getRemoteFallbackImageUrl);
    if (
      remoteImageUrls.length !== requestBody.imageUrls.length ||
      remoteImageUrls.some((url) => !url)
    ) {
      return {
        requestBody,
        requestBodyJson: initialJson,
        payloadFallback: {
          attempted: false,
          reason: "missing_remote_url",
          initialRequestBodyBytes: initialJson.length,
          byteLimit,
        },
      };
    }

    const fallbackBody = {
      ...requestBody,
      imageUrls: remoteImageUrls,
      imageMetadata: imageMetadata.map((metadata, index) => ({
        ...metadata,
        generationPayloadSource: "vinted_remote_url",
        generationPayloadFallbackReason: "request_body_too_large",
        generationPayloadOriginalKind: getImageUrlKind(
          requestBody.imageUrls[index] || "",
        ),
      })),
    };
    const fallbackJson = JSON.stringify(fallbackBody);
    return {
      requestBody: fallbackBody,
      requestBodyJson: fallbackJson,
      payloadFallback: {
        attempted: true,
        reason: "request_body_too_large",
        initialRequestBodyBytes: initialJson.length,
        fallbackRequestBodyBytes: fallbackJson.length,
        byteLimit,
      },
    };
  }

  if (window.__AUTOLISTER_TEST_HOOKS__) {
    window.__AUTOLISTER_TEST_HOOKS__.compressImage = compressImage;
    window.__AUTOLISTER_TEST_HOOKS__.compressImages = compressImages;
    window.__AUTOLISTER_TEST_HOOKS__.compressImagesWithMetadata =
      compressImagesWithMetadata;
  }

  function getUploadedImageEntries() {
    const grid = document.querySelector(SELECTORS.mediaGrid);
    const root = grid || document;
    const images = Array.from(root.querySelectorAll(SELECTORS.mediaImage));
    const seenUrls = new Set();

    const domEntries = images
      .map((img) => {
        const source = getBestImageSource(img);
        return {
          ...source,
          promptSource: "vinted_dom_image",
          domNaturalWidth: img.naturalWidth || null,
          domNaturalHeight: img.naturalHeight || null,
          renderedWidth: img.clientWidth || null,
          renderedHeight: img.clientHeight || null,
        };
      })
      .filter((entry) => {
        if (!entry.url || seenUrls.has(entry.url)) return false;
        seenUrls.add(entry.url);
        return true;
      });

    return applyCapturedPromptUploadSources(domEntries);
  }

  function buildImageSourceTelemetry(imageEntries) {
    return imageEntries.map((entry, index) => ({
      index: index + 1,
      sourceSelection: entry.sourceSelection,
      promptSource: entry.promptSource || "vinted_dom_image",
      sourceKind: getImageUrlKind(entry.url),
      sourceUrl: getSafeImageUrlForMetadata(entry.url),
      currentSrcUrl: getSafeImageUrlForMetadata(entry.currentUrl),
      bestSrcsetUrl: getSafeImageUrlForMetadata(entry.bestSrcsetUrl),
      domNaturalWidth: entry.domNaturalWidth,
      domNaturalHeight: entry.domNaturalHeight,
      renderedWidth: entry.renderedWidth,
      renderedHeight: entry.renderedHeight,
      capturedUploadAvailable: entry.capturedUploadAvailable || false,
      capturedUploadSource: entry.capturedUploadSource || null,
      capturedUploadFileCount: entry.capturedUploadFileCount || null,
      capturedUploadMatchStatus: entry.capturedUploadMatchStatus || null,
      capturedUploadOrderTrusted: entry.capturedUploadOrderTrusted ?? null,
      capturedUploadSetTrusted: entry.capturedUploadSetTrusted ?? null,
      capturedUploadFile: entry.capturedUploadFile || null,
      vintedSourceSelection: entry.vintedSourceSelection || null,
      vintedSourceKind: entry.vintedSourceKind || null,
      vintedSourceUrl: entry.vintedSourceUrl || null,
      vintedCurrentSrcUrl: entry.vintedCurrentSrcUrl || null,
      vintedBestSrcsetUrl: entry.vintedBestSrcsetUrl || null,
      vintedDomNaturalWidth: entry.vintedDomNaturalWidth || null,
      vintedDomNaturalHeight: entry.vintedDomNaturalHeight || null,
      vintedRenderedWidth: entry.vintedRenderedWidth || null,
      vintedRenderedHeight: entry.vintedRenderedHeight || null,
    }));
  }

  function createGenerationAttemptId() {
    return `gen_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  function truncateForTelemetry(value, maxLength = 700) {
    const text = String(value || "");
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  function estimateDataUrlBytes(value) {
    const match = String(value || "").match(/^data:[^,]*;base64,(.+)$/i);
    if (!match) return 0;
    const base64 = match[1].replace(/\s/g, "");
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
  }

  function getCompressedImageBytes(imageUrlsForRequest, imageMetadata = []) {
    return imageUrlsForRequest.reduce((total, imageUrl, index) => {
      const outputBytes = Number(imageMetadata[index]?.outputBytes || 0);
      return total + (outputBytes > 0 ? outputBytes : estimateDataUrlBytes(imageUrl));
    }, 0);
  }

  function summarizeImageSourcesForTelemetry(imageSources = []) {
    return imageSources.reduce(
      (summary, source) => {
        summary.total += 1;
        if (source.promptSource === "vinted_dom_image") {
          summary.vintedDomImageFiles += 1;
        }
        if (source.promptSource === "captured_upload_file") {
          summary.capturedUploadFiles += 1;
        }
        if (source.capturedUploadAvailable === false) {
          summary.noCapturedUploadFiles += 1;
        }
        if (source.capturedUploadSource === "phone_upload_single") {
          summary.phoneUploadSingleFiles += 1;
        }
        if (source.capturedUploadSource === "phone_upload_batch") {
          summary.phoneUploadBatchFiles += 1;
        }
        if (source.sourceKind === "data_url") summary.dataUrlSources += 1;
        if (source.sourceKind === "blob_url") summary.blobUrlSources += 1;
        if (
          source.sourceKind === "remote_url" ||
          source.vintedSourceKind === "remote_url"
        ) {
          summary.remoteUrlSources += 1;
        }
        return summary;
      },
      {
        total: 0,
        vintedDomImageFiles: 0,
        capturedUploadFiles: 0,
        noCapturedUploadFiles: 0,
        phoneUploadSingleFiles: 0,
        phoneUploadBatchFiles: 0,
        dataUrlSources: 0,
        blobUrlSources: 0,
        remoteUrlSources: 0,
      },
    );
  }

  function getImageSourceTelemetryMode(summary) {
    if (!summary?.total) return "none";
    if (
      summary.vintedDomImageFiles === summary.total &&
      summary.noCapturedUploadFiles === summary.total
    ) {
      return "vinted_dom_without_captured_upload";
    }
    if (summary.capturedUploadFiles === summary.total) {
      return "captured_upload";
    }
    if (summary.capturedUploadFiles > 0) {
      return "mixed_captured_and_vinted";
    }
    return "other";
  }

  function buildGenerateFailureDiagnostics(err, baseContext = {}) {
    return {
      ...baseContext,
      errorName: truncateForTelemetry(err?.name || "Error", 120),
      message: truncateForTelemetry(err?.message || String(err) || "unknown", 240),
      stack: truncateForTelemetry(err?.stack || "", 700),
      navigatorOnline:
        typeof navigator !== "undefined" ? navigator.onLine === true : null,
    };
  }

  function getUploadedImageUrls() {
    return getUploadedImageEntries().map((entry) => entry.url);
  }

  function getVisibleUploadedPhotoCount() {
    const grid = document.querySelector(SELECTORS.mediaGrid);
    if (!grid) return getUploadedImageUrls().length;
    return grid.querySelectorAll(SELECTORS.mediaPhotoBox).length;
  }

  function bindPromptUploadFileCapture() {
    const getFileListSignature = (input) =>
      Array.from(input.files || [])
        .map((file) =>
          [
            file.name || "",
            file.type || "",
            file.size || 0,
            file.lastModified || 0,
          ].join(":"),
        )
        .join("|");

    const captureInputFiles = (input) => {
      if (suppressNextFileInputCapture) return;
      if (!input.files?.length) return;
      const signature = getFileListSignature(input);
      if (
        signature &&
        capturedPromptUploadFileSignatures.get(input) === signature
      ) {
        return;
      }
      if (signature) {
        capturedPromptUploadFileSignatures.set(input, signature);
      }
      const registration = registerPromptUploadFiles(input.files, "manual_file_input", {
        append: shouldAppendToCapturedPromptUpload(),
      });
      startManualStorageUpload(registration);
    };

    const bindFileInput = (input) => {
      if (!(input instanceof HTMLInputElement)) return;
      if (!input.matches?.(SELECTORS.fileInput)) return;
      if (boundPromptUploadFileInputs.has(input)) return;

      boundPromptUploadFileInputs.add(input);
      input.addEventListener("change", () => captureInputFiles(input));
    };

    const bindFileInputsIn = (root = document) => {
      if (root instanceof HTMLInputElement) {
        bindFileInput(root);
        return;
      }
      if (!(root instanceof Document || root instanceof Element)) return;
      root.querySelectorAll?.(SELECTORS.fileInput).forEach(bindFileInput);
    };

    const getRemovedPhotoBoxIndex = (mutation) => {
      const removedPhotoBox = Array.from(mutation.removedNodes || []).find(
        (node) =>
          node instanceof Element &&
          node.matches?.(SELECTORS.mediaPhotoBox),
      );
      if (!removedPhotoBox) return null;

      let index = 0;
      let sibling = mutation.previousSibling;
      while (sibling) {
        if (
          sibling instanceof Element &&
          sibling.matches?.(SELECTORS.mediaPhotoBox)
        ) {
          index += 1;
        }
        sibling = sibling.previousSibling;
      }
      return index;
    };

    const bindMediaGrid = (grid) => {
      if (!(grid instanceof Element)) return;
      if (!grid.matches?.(SELECTORS.mediaGrid)) return;
      if (boundPromptUploadMediaGrids.has(grid)) return;
      boundPromptUploadMediaGrids.add(grid);

      const mediaGridObserver = new MutationObserver((mutations) => {
        const capturedUpload = getActiveCapturedPromptUpload();
        if (!capturedUpload || capturedUpload.orderTrusted === false) return;

        mutations.forEach((mutation) => {
          const addedPhotoBox = Array.from(mutation.addedNodes || []).some(
            (node) =>
              node instanceof Element &&
              node.matches?.(SELECTORS.mediaPhotoBox),
          );
          if (addedPhotoBox) return;

          const removedIndex = getRemovedPhotoBoxIndex(mutation);
          if (removedIndex !== null) {
            removeCapturedPromptUploadAtIndex(removedIndex);
          }
        });
      });
      mediaGridObserver.observe(grid, { childList: true });
    };

    const bindMediaGridsIn = (root = document) => {
      if (root instanceof Element && root.matches?.(SELECTORS.mediaGrid)) {
        bindMediaGrid(root);
      }
      if (!(root instanceof Document || root instanceof Element)) return;
      root.querySelectorAll?.(SELECTORS.mediaGrid).forEach(bindMediaGrid);
    };

    bindFileInputsIn(document);
    bindMediaGridsIn(document);
    document.addEventListener(
      "change",
      (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (!input.matches?.(SELECTORS.fileInput)) return;
        captureInputFiles(input);
      },
      true,
    );

    const fileInputObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          bindFileInputsIn(node);
          bindMediaGridsIn(node);
        });
      });
    });
    fileInputObserver.observe(document.body, { childList: true, subtree: true });

    document.addEventListener(
      "dragstart",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest?.(SELECTORS.mediaGrid)) {
          const capturedUpload = getActiveCapturedPromptUpload();
          if (capturedUpload) capturedUpload.orderTrusted = false;
        }
      },
      true,
    );
    document.addEventListener(
      "drop",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest?.(SELECTORS.mediaGrid)) {
          const capturedUpload = getActiveCapturedPromptUpload();
          if (capturedUpload) capturedUpload.orderTrusted = false;
        }
      },
      true,
    );

    window.addEventListener("pagehide", () => {
      fileInputObserver.disconnect();
      revokeCapturedPromptUpload("pagehide");
    });
  }

  // --- AUTHENTICATION & STATE SYNC ---

  function initializeAuthState() {
    chrome.storage.local.get("supabaseSession", ({ supabaseSession }) => {
      isAuthenticated = !!supabaseSession?.access_token;
      updateButtonUI();
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.supabaseSession) {
      isAuthenticated = !!changes.supabaseSession.newValue?.access_token;
      updateButtonUI();
    }
    if (
      changes.selectedLanguage ||
      changes.selectedTitleLanguage ||
      changes.selectedDescriptionLanguage
    ) {
      syncInlineLanguageControls();
    }
    if (changes.useEmojis || changes.userProfile) {
      syncEmojiToggleState();
    }
    if (changes[HASHTAGS_STORAGE_KEY]) {
      syncHashtagsToggleState();
    }
    if (changes[DESCRIPTION_FOOTER_STORAGE_KEY] || changes.userProfile) {
      syncDescriptionFooterButtonState();
    }
    if (changes[DESCRIPTION_LENGTH_STORAGE_KEY]) {
      syncDescriptionLengthToggleState();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "BATCH_PING") {
      sendResponse({ ok: Boolean(document.querySelector(SELECTORS.fileInput)) });
      return false;
    }

    if (message?.type === "RUN_BATCH_ITEM") {
      runBatchItem(message)
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.error("Batch item error:", err);
          sendResponse({
            ok: false,
            error: err.message || "Batch item failed.",
          });
        });
      return true;
    }

    if (message?.type === "BATCH_PROGRESS") {
      handleBatchProgress(message);
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === "CHECKOUT_FULFILLED") {
      const paywall = document.getElementById("quickvint-toast");
      if (paywall?.classList.contains("paywall")) {
        paywall.classList.remove("visible");
      }
      showToast("Payment confirmed. Click Generate again.", "success");
      sendResponse({ ok: true });
      return false;
    }

    return false;
  });

  // --- UI ---

  function injectStylesheet() {
    const style = document.createElement("style");
    style.textContent = `
      #${BTN_ID}, #${PHONE_BTN_ID} {
        display: none;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 38px;
        padding: 9px 18px;
        background: #a1a1aa;
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        cursor: not-allowed;
        transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease, opacity 0.16s ease;
        font-weight: 650;
        line-height: 1;
        box-shadow: 0 7px 16px rgba(79, 70, 229, 0.22);
        text-align: center;
        white-space: nowrap;
        position: relative;
      }

      #${BTN_ID} {
        min-width: 147px;
      }

      #${PHONE_BTN_ID} .quickvint-phone-new-badge {
        position: absolute;
        top: -10px;
        right: -8px;
        min-width: 30px;
        height: 17px;
        padding: 0 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.82);
        border-radius: 999px;
        background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
        color: #713f12;
        box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.16), 0 0 18px rgba(251, 191, 36, 0.46);
        font-size: 9px;
        font-weight: 850;
        line-height: 1;
        letter-spacing: 0;
        pointer-events: none;
        transform: translateZ(0);
      }

      #${SIGN_IN_BTN_ID} {
        display: none;
        width: 100%;
        margin-top: 14px;
        padding: 14px 24px;
        background: linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(67, 56, 202) 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-decoration: none;
        position: relative;
        overflow: hidden;
      }

      #${SIGN_IN_BTN_ID}::after {
        content: "";
        position: absolute;
        top: 0;
        left: -150%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          to right,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.03) 15%,
          rgba(255, 255, 255, 0.35) 50%,
          rgba(255, 255, 255, 0.03) 85%,
          rgba(255, 255, 255, 0) 100%
        );
        transform: skewX(-20deg);
        animation: slow-glide-fast-restart 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        pointer-events: none;
      }

      @keyframes slow-glide-fast-restart {
        0% {
          left: -150%;
        }
        /* The shimmer takes 80% of the time (3.2s) to cross.
          This makes the movement very slow and deliberate. */
        80% {
          left: 150%;
        }
        /* It only pauses for the remaining 20% (0.8s).
          This makes the "restart" feel much faster. */
        100% {
          left: 150%;
        }
      }

      #${SIGN_IN_BTN_ID}:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
        /* Brighter gradient on hover for better feedback */
        background: linear-gradient(135deg, rgb(90, 82, 245) 0%, rgb(79, 70, 229) 100%);
      }

      #${SIGN_IN_BTN_ID}:active {
        transform: translateY(0);
      }

      #${SIGN_IN_BTN_ID} svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      #${BTN_ID}:disabled, #${PHONE_BTN_ID}:disabled {
        box-shadow: 0 3px 8px rgba(17, 24, 39, 0.1);
        opacity: 0.82;
      }

      #${REPORT_BTN_ID} {
        display: none;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        min-width: 38px;
        padding: 0;
        border: 1px solid #d9deea;
        border-radius: 10px;
        background: #ffffff;
        color: #475569;
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.1);
        cursor: pointer;
        transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, color 0.16s ease;
      }

      #${REPORT_BTN_ID}:hover {
        border-color: #a5b4fc;
        color: #4338ca;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.16);
        transform: translateY(-1px);
      }

      #${REPORT_BTN_ID}:active {
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
        transform: translateY(0);
      }

      #${REPORT_BTN_ID}:disabled {
        cursor: progress;
        opacity: 0.72;
        transform: none;
      }

      #${REPORT_BTN_ID} .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
      }

      #${REPORT_BTN_ID} svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      #${PHONE_BTN_ID}.is-loading::before {
        content: "";
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.38);
        border-top-color: #ffffff;
        border-radius: 999px;
        animation: quickvintSpin 760ms linear infinite;
      }

      #${PHONE_BTN_ID}.is-loading .icon {
        display: none !important;
      }

      .quickvint-generation-action .quickvint-mirage {
        display: none;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 17px;
        flex: 0 0 30px;
        color: #ffffff;
      }

      #${MODAL_ID} .quickvint-generation-action,
      #${BATCH_MODAL_ID} .quickvint-generation-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      }

      .quickvint-generation-action .quickvint-mirage svg {
        display: block;
        width: 30px;
        height: 6.9px;
        overflow: visible;
      }

      .quickvint-generation-action .quickvint-mirage .dot {
        fill: currentColor;
        animation: quickvintMirage 1.65s linear infinite both;
        transform-box: fill-box;
        transform-origin: center;
      }

      .quickvint-generation-action .quickvint-mirage .dot:nth-child(2) {
        animation-delay: -0.33s;
      }

      .quickvint-generation-action .quickvint-mirage .dot:nth-child(3) {
        animation-delay: -0.66s;
      }

      .quickvint-generation-action .quickvint-mirage .dot:nth-child(4) {
        animation-delay: -0.99s;
      }

      .quickvint-generation-action .quickvint-mirage .dot:nth-child(5) {
        animation-delay: -1.32s;
      }

      .quickvint-generation-action.is-loading .quickvint-mirage {
        display: inline-flex;
      }

      .quickvint-generation-action.is-loading .icon {
        display: none !important;
      }

      @keyframes quickvintMirage {
        0%, 100% {
          transform: translateX(0) scale(0);
        }

        50% {
          transform: translateX(15px) scale(1);
        }

        99.999% {
          transform: translateX(30px) scale(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .quickvint-generation-action .quickvint-mirage .dot {
          animation-play-state: paused;
        }
      }

      @keyframes quickvintSpin {
        to {
          transform: rotate(360deg);
        }
      }

      #quickvint-batch-tab-status {
        position: static;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        max-width: 100%;
        min-height: 42px;
        margin: 8px 0 10px;
        padding: 10px 13px;
        border: 1px solid rgba(79, 70, 229, 0.18);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.97);
        color: #111827;
        box-shadow: 0 16px 42px rgba(15, 23, 42, 0.18), 0 8px 18px rgba(79, 70, 229, 0.12);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 780;
        line-height: 1.2;
        transform: translateY(-4px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 160ms ease, transform 160ms ease;
      }

      #quickvint-batch-tab-status.visible {
        opacity: 1;
        transform: translateY(0);
      }

      #quickvint-batch-tab-status .batch-tab-status-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 18px;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        color: #ffffff;
        font-size: 12px;
        font-weight: 900;
      }

      #quickvint-batch-tab-status.loading .batch-tab-status-icon {
        border: 2px solid rgba(79, 70, 229, 0.22);
        border-top-color: #4f46e5;
        background: transparent;
        animation: quickvintSpin 760ms linear infinite;
      }

      #quickvint-batch-tab-status.success .batch-tab-status-icon {
        background: #16a34a;
      }

      #quickvint-batch-tab-status.error .batch-tab-status-icon {
        background: #dc2626;
      }

      .quickvint-lang-field {
        display: none;
        align-items: center;
        width: fit-content;
        margin-top: 0;
        position: relative;
        color: #4c1d95;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .quickvint-lang-title-host {
        display: flex !important;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .quickvint-lang-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 9px;
        border: 1px solid #ddd6fe;
        border-radius: 8px;
        background: #f8f7ff;
        color: #312e81;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        outline: none;
        position: relative;
      }

      .quickvint-lang-field.quickvint-lang-hint .quickvint-lang-trigger {
        background: linear-gradient(180deg, #ffffff 0%, #f7f5ff 100%);
        border-color: #a78bfa;
        box-shadow: 0 1px 2px rgba(79, 70, 229, 0.08);
      }

      .quickvint-lang-field.quickvint-lang-hint.open .quickvint-lang-trigger,
      .quickvint-lang-field.quickvint-lang-hint .quickvint-lang-trigger:hover,
      .quickvint-lang-field.quickvint-lang-hint .quickvint-lang-trigger:focus-visible {
        box-shadow: 0 1px 2px rgba(79, 70, 229, 0.08);
      }

      .quickvint-lang-field.quickvint-lang-hint .quickvint-lang-trigger::before {
        content: "";
        position: absolute;
        inset: -4px;
        border: 2px solid rgba(124, 58, 237, 0.22);
        border-radius: 12px;
        opacity: 0;
        pointer-events: none;
        transform: scale(0.88);
        transform-origin: center;
        animation: quickvintLangHintPulse 1800ms cubic-bezier(0.22, 1, 0.36, 1) infinite;
        will-change: transform, opacity;
      }

      .quickvint-lang-field.quickvint-lang-hint.open .quickvint-lang-trigger::before,
      .quickvint-lang-field.quickvint-lang-hint .quickvint-lang-trigger:hover::before,
      .quickvint-lang-field.quickvint-lang-hint .quickvint-lang-trigger:focus-visible::before {
        animation: none;
        opacity: 0;
      }

      @keyframes quickvintLangHintPulse {
        0%, 100% {
          opacity: 0;
          transform: scale(0.88);
        }
        18% {
          opacity: 1;
          transform: scale(1);
        }
        54% {
          opacity: 0;
          transform: scale(1.18);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .quickvint-lang-field.quickvint-lang-hint .quickvint-lang-trigger::before {
          animation: none;
        }
      }

      .quickvint-lang-trigger::after {
        content: "";
        width: 6px;
        height: 6px;
        border-right: 1.5px solid currentColor;
        border-bottom: 1.5px solid currentColor;
        transform: rotate(45deg) translateY(-2px);
      }

      .quickvint-lang-menu {
        display: none;
        position: fixed;
        z-index: 2147483647;
        min-width: 92px;
        max-height: 240px;
        overflow-y: auto;
        padding: 2px 0;
        border: 1px solid #c7d2fe;
        border-radius: 6px;
        background: #ffffff;
        box-shadow: 0 8px 18px rgba(17, 24, 39, 0.14);
      }

      .quickvint-lang-field.open .quickvint-lang-menu {
        display: block;
      }

      .quickvint-lang-option {
        display: flex;
        align-items: center;
        gap: 7px;
        width: 100%;
        margin: 0;
        padding: 6px 9px;
        border: 0 !important;
        border-radius: 0;
        background: transparent !important;
        box-shadow: none !important;
        color: #1f2937;
        cursor: pointer;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        text-align: left;
        appearance: none;
        -webkit-appearance: none;
        transition: background-color 120ms ease, color 120ms ease;
      }

      .quickvint-lang-option.active {
        background: #eef2ff;
        color: #3730a3;
      }

      .quickvint-lang-option:hover {
        background: #f6f7ff !important;
        color: #312e81;
      }

      .quickvint-lang-field img {
        width: 16px;
        height: 11px;
        border-radius: 2px;
        object-fit: cover;
        box-shadow: 0 0 0 1px rgba(17, 24, 39, 0.08);
      }

      #${BTN_ID}:not(:disabled):hover, #${PHONE_BTN_ID}:not(:disabled):hover {
        box-shadow: 0 10px 22px rgba(79, 70, 229, 0.3);
        filter: brightness(1.05);
        transform: translateY(-1px);
      }

      #${BTN_ID}:not(:disabled):active, #${PHONE_BTN_ID}:not(:disabled):active {
        box-shadow: 0 5px 12px rgba(79, 70, 229, 0.24);
        filter: brightness(0.98);
        transform: translateY(0);
      }

      #${BTN_ID} .icon, #${PHONE_BTN_ID} .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 17px;
        height: 17px;
        flex: 0 0 17px;
      }

      #${BTN_ID} .icon svg, #${PHONE_BTN_ID} .icon svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      #${REPORT_MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.36);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      #${REPORT_MODAL_ID}.visible {
        display: flex;
      }

      #${REPORT_MODAL_ID} .quickvint-report-card {
        width: min(420px, 100%);
        padding: 18px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 14px;
        background: #ffffff;
        color: #111827;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
      }

      #${REPORT_MODAL_ID} .quickvint-report-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      #${REPORT_MODAL_ID} .quickvint-report-title {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        line-height: 1.25;
        color: #0f172a;
      }

      #${REPORT_MODAL_ID} .quickvint-report-copy {
        margin: 7px 0 16px;
        color: #475569;
        font-size: 13px;
        line-height: 1.45;
      }

      #${REPORT_MODAL_ID} .quickvint-report-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
      }

      #${REPORT_MODAL_ID} .quickvint-report-close:hover {
        background: #f1f5f9;
        color: #0f172a;
      }

      #${REPORT_MODAL_ID} .quickvint-report-label {
        display: block;
        margin: 0 0 7px;
        color: #334155;
        font-size: 12px;
        font-weight: 760;
      }

      #${REPORT_MODAL_ID} .quickvint-report-select,
      #${REPORT_MODAL_ID} .quickvint-report-textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
        color: #0f172a;
        font: inherit;
        font-size: 14px;
        outline: none;
        transition: border-color 0.14s ease, box-shadow 0.14s ease;
      }

      #${REPORT_MODAL_ID} .quickvint-report-select {
        height: 40px;
        margin-bottom: 13px;
        padding: 0 11px;
      }

      #${REPORT_MODAL_ID} .quickvint-report-textarea {
        min-height: 104px;
        resize: vertical;
        padding: 11px;
        line-height: 1.4;
      }

      #${REPORT_MODAL_ID} .quickvint-report-select:focus,
      #${REPORT_MODAL_ID} .quickvint-report-textarea:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
      }

      #${REPORT_MODAL_ID} .quickvint-report-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 15px;
      }

      #${REPORT_MODAL_ID} .quickvint-report-secondary,
      #${REPORT_MODAL_ID} .quickvint-report-submit {
        height: 38px;
        padding: 0 14px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 760;
        cursor: pointer;
      }

      #${REPORT_MODAL_ID} .quickvint-report-secondary {
        border: 1px solid #d7dce7;
        background: #ffffff;
        color: #334155;
      }

      #${REPORT_MODAL_ID} .quickvint-report-submit {
        border: 0;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.24);
      }

      #${REPORT_MODAL_ID} .quickvint-report-submit:disabled {
        cursor: progress;
        opacity: 0.75;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.36);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID}.visible {
        display: flex;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-card {
        width: min(440px, 100%);
        padding: 18px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 14px;
        background: #ffffff;
        color: #111827;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-title {
        margin: 0;
        color: #0f172a;
        font-size: 18px;
        font-weight: 800;
        line-height: 1.25;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-copy,
      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-status {
        margin: 7px 0 14px;
        color: #475569;
        font-size: 13px;
        line-height: 1.45;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-copy {
        padding-left: 18px;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-copy li {
        margin: 2px 0;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-close:hover {
        background: #f1f5f9;
        color: #0f172a;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-label {
        display: block;
        margin: 0 0 7px;
        color: #334155;
        font-size: 12px;
        font-weight: 760;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-textarea {
        width: 100%;
        min-height: 126px;
        resize: vertical;
        padding: 11px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
        color: #0f172a;
        font: inherit;
        font-size: 14px;
        line-height: 1.4;
        outline: none;
        transition: border-color 0.14s ease, box-shadow 0.14s ease;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-textarea:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-textarea:disabled {
        background: #f8fafc;
        color: #64748b;
        cursor: not-allowed;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        min-height: 18px;
        margin-top: 7px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.35;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-status[data-state="error"] {
        color: #b45309;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 15px;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-secondary,
      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-clear,
      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-save {
        height: 38px;
        padding: 0 14px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 760;
        cursor: pointer;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-secondary,
      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-clear {
        border: 1px solid #d7dce7;
        background: #ffffff;
        color: #334155;
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-save {
        border: 0;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.24);
      }

      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-save:disabled,
      #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-clear:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      #${UPLOAD_CHOICE_MODAL_ID} {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.52);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: fadeIn 0.16s ease-out;
      }

      #${UPLOAD_CHOICE_MODAL_ID},
      #${UPLOAD_CHOICE_MODAL_ID} * {
        box-sizing: border-box;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-card {
        width: min(760px, calc(100vw - 40px));
        background: #ffffff;
        color: #111827;
        border-radius: 8px;
        box-shadow: 0 28px 72px rgba(15, 23, 42, 0.26);
        padding: 28px 24px 24px;
        animation: slideUp 0.18s ease-out;
        position: relative;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-head {
        display: block;
        margin: 0 auto 22px;
        max-width: 560px;
        text-align: center;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-title {
        margin: 0;
        font-size: 24px;
        font-weight: 820;
        letter-spacing: 0;
        line-height: 1.2;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-capacity {
        margin: 10px 0 0;
        color: #334155;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.4;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 8px;
        background: #f8fafc;
        color: #64748b;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-close:hover {
        background: #eef2f7;
        color: #111827;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-options {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-option {
        width: 100%;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        color: #111827;
        cursor: pointer;
        display: grid;
        grid-template-rows: auto auto;
        gap: 14px;
        padding: 14px 14px 18px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, background 120ms ease;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-option:hover {
        border-color: #c7d2fe;
        background: #ffffff;
        box-shadow: 0 14px 30px rgba(79, 70, 229, 0.14);
        transform: translateY(-1px);
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-option:active {
        transform: translateY(0);
        box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-art {
        min-width: 0;
        aspect-ratio: 1 / 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: #f8fafc;
        overflow: hidden;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-art img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-copy {
        min-width: 0;
        display: grid;
        gap: 5px;
        justify-items: center;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-label {
        display: block;
        font-size: 16px;
        font-weight: 780;
        line-height: 1.2;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-note {
        display: block;
        color: #64748b;
        font-size: 13px;
        font-weight: 620;
        line-height: 1.35;
      }

      #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-arrow {
        color: #94a3b8;
        font-size: 18px;
        line-height: 1;
        display: none;
      }

      @media (max-width: 560px) {
        #${UPLOAD_CHOICE_MODAL_ID} {
          padding: 18px;
        }

        #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-card {
          width: min(430px, calc(100vw - 32px));
          max-height: calc(100vh - 36px);
          overflow: auto;
          padding: 20px 16px 16px;
        }

        #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-head {
          max-width: none;
          margin-bottom: 18px;
          padding: 0 42px;
        }

        #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-title {
          font-size: 18px;
        }

        #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-options {
          grid-template-columns: 1fr;
          gap: 10px;
        }

        #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-option {
          grid-template-columns: 112px minmax(0, 1fr);
          grid-template-rows: none;
          align-items: center;
          min-height: 136px;
          gap: 12px;
          padding: 12px;
          text-align: left;
        }

        #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-art {
          width: 112px;
          height: auto;
        }

        #${UPLOAD_CHOICE_MODAL_ID} .quickvint-upload-choice-copy {
          justify-items: start;
        }
      }

      /* Modal Styles */
      #${MODAL_ID} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.48);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      #${MODAL_ID} .modal-content {
        background: white;
        padding: 32px;
        border-radius: 20px;
        text-align: center;
        max-width: 430px;
        width: 90%;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
        box-shadow: 0 18px 42px -12px rgba(0, 0, 0, 0.32);
        animation: slideUp 0.3s ease-out;
        position: relative;
      }

      #${MODAL_ID} .close-x {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        color: #9ca3af;
        font-size: 24px;
        line-height: 1;
        padding: 0;
      }

      #${MODAL_ID} .close-x:hover {
        background: #f3f4f6;
        color: #374151;
      }

      #${MODAL_ID} .modal-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      #${MODAL_ID} .feature-pill {
        background: #dcfce7;
        color: #166534;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
        border: 1px solid #bbf7d0;
      }

      #${MODAL_ID} h3 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #111827;
        letter-spacing: -0.02em;
      }

      #${MODAL_ID} .subtitle {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 32px 0;
      }

      #${MODAL_ID} .qr-container {
        margin: 0 auto 24px;
        padding: 12px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        display: inline-block;
        border: 1px solid #f3f4f6;
      }

      #${MODAL_ID} #qr-code {
        display: block;
        border-radius: 12px;
        width: 180px;
        height: 180px;
      }

      #${MODAL_ID} .instruction {
        margin: 0 0 24px 0;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.5;
      }

      #${MODAL_ID} .modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 32px;
      }

      #${MODAL_ID} .close-btn, #${MODAL_ID} .generate-btn {
        flex: 1;
        padding: 12px 20px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s ease;
        border: none;
      }

      #${MODAL_ID} .close-btn {
        background: white;
        color: #374151;
        border: 1px solid #e5e7eb;
      }

      #${MODAL_ID} .generate-btn {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: white;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
      }

      #${MODAL_ID} .close-btn:hover {
        background: #f9fafb;
        border-color: #d1d5db;
      }

      #${MODAL_ID} .generate-btn:hover {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        filter: brightness(1.05);
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
      }

      #${MODAL_ID} .status {
        margin-top: 0;
        padding: 8px 16px;
        font-size: 13px;
        color: #6b7280;
        background: #f9fafb;
        border-radius: 99px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #f3f4f6;
      }

      #${MODAL_ID} .status.waiting {
        color: #4f46e5;
        background: #eef2ff;
        border-color: #e0e7ff;
      }

      #${MODAL_ID} .status.waiting::before {
        content: '';
        width: 8px;
        height: 8px;
        background: currentColor;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
      }

      #${MODAL_ID} .status.ready {
        color: #047857;
        background: #ecfdf5;
        border-color: #a7f3d0;
        box-shadow: 0 6px 18px rgba(16, 185, 129, 0.12);
        animation: statusReadyPop 0.34s cubic-bezier(0.2, 0.85, 0.25, 1.35);
      }

      #${MODAL_ID} .status.ready::before {
        content: '✓';
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #10b981;
        color: white;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        box-shadow: 0 4px 10px rgba(16, 185, 129, 0.24);
      }

      #${MODAL_ID} .status-count {
        font-weight: 900;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      @keyframes statusReadyPop {
        0% { transform: translateY(2px) scale(0.96); opacity: 0.72; }
        70% { transform: translateY(-1px) scale(1.025); opacity: 1; }
        100% { transform: translateY(0) scale(1); opacity: 1; }
      }

      #${MODAL_ID} .phone-previews {
        height: 50px;
        margin: 0 0 14px;
        padding: 8px 10px;
        background: #f9fafb;
        border: 1px solid #eef0f3;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        overflow: hidden;
      }

      #${MODAL_ID} .preview-header {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex: 0 0 54px;
        color: #374151;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
      }

      #${MODAL_ID} .preview-extra {
        color: #6b7280;
        font-weight: 600;
        margin-top: 3px;
      }

      #${MODAL_ID} .preview-grid {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }

      #${MODAL_ID} .preview-empty {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6b7280;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }

      #${MODAL_ID} .waiting-dots,
      #${BATCH_MODAL_ID} .waiting-dots {
        display: inline-flex;
        width: 18px;
        margin-left: 1px;
      }

      #${MODAL_ID} .waiting-dots span,
      #${BATCH_MODAL_ID} .waiting-dots span {
        animation: waitingDot 1.15s ease-in-out infinite;
      }

      #${MODAL_ID} .waiting-dots span:nth-child(2),
      #${BATCH_MODAL_ID} .waiting-dots span:nth-child(2) {
        animation-delay: 0.16s;
      }

      #${MODAL_ID} .waiting-dots span:nth-child(3),
      #${BATCH_MODAL_ID} .waiting-dots span:nth-child(3) {
        animation-delay: 0.32s;
      }

      @keyframes waitingDot {
        0%, 80%, 100% { opacity: 0.28; }
        40% { opacity: 1; }
      }

      #${MODAL_ID} .preview-pulse {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: linear-gradient(90deg, #eef2ff 0%, #f8fafc 45%, #eef2ff 100%);
        background-size: 200% 100%;
        border: 1px solid #e0e7ff;
        animation: previewShimmer 1.4s ease-in-out infinite;
      }

      #${MODAL_ID} .preview-dot {
        width: 5px;
        height: 5px;
        border-radius: 999px;
        background: #818cf8;
        animation: pulse 1.4s ease-in-out infinite;
      }

      @keyframes previewShimmer {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }

      #${MODAL_ID} .preview-thumb {
        flex: 0 0 32px;
        width: 32px;
        height: 32px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        background: white;
        opacity: 0;
        transform: translateY(4px) scale(0.96);
        animation: previewIn 0.22s ease-out forwards;
      }

      #${MODAL_ID} .preview-more {
        flex: 0 0 auto;
        color: #6b7280;
        font-size: 12px;
        font-weight: 700;
        padding: 0 2px;
      }

      @keyframes previewIn {
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      #${BATCH_MODAL_ID} {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(17, 24, 39, 0.46);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: fadeIn 0.2s ease-out;
      }

      #${BATCH_MODAL_ID} .batch-content {
        width: min(760px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow: auto;
        background: #fbfcff;
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 16px;
        box-shadow: 0 22px 54px rgba(17, 24, 39, 0.24);
        padding: 18px;
        color: #111827;
        animation: slideUp 0.24s ease-out;
      }

      #${BATCH_MODAL_ID} .batch-topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      #${BATCH_MODAL_ID} .batch-title {
        margin: 0 0 5px;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0;
      }

      #${BATCH_MODAL_ID} .batch-title-row {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        gap: 3px;
      }

      #${BATCH_MODAL_ID} .batch-title-row .batch-title {
        margin: 0;
      }

      #${BATCH_MODAL_ID} .batch-subtitle {
        margin: 0;
        color: #6b7280;
        font-size: 13px;
        line-height: 1.45;
      }

      #${BATCH_MODAL_ID} .batch-close {
        flex: 0 0 auto;
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 8px;
        background: #f3f4f6;
        color: #4b5563;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
      }

      #${BATCH_MODAL_ID} .batch-close:hover {
        background: #e5e7eb;
        color: #111827;
      }

      #${BATCH_MODAL_ID} .batch-layout {
        display: grid;
        grid-template-columns: 204px minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }

      #${BATCH_MODAL_ID} .batch-qr {
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        text-align: center;
      }

      #${BATCH_MODAL_ID} .batch-qr img {
        width: 164px;
        height: 164px;
        border-radius: 8px;
        background: #ffffff;
      }

      #${BATCH_MODAL_ID} .batch-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 32px;
        margin: 0 0 14px;
        padding: 7px 12px;
        border: 1px solid #e0e7ff;
        border-radius: 999px;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 12px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID} .batch-status::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: currentColor;
        animation: pulse 1.4s ease-in-out infinite;
      }

      #${BATCH_MODAL_ID} .batch-status.done {
        border-color: #bbf7d0;
        background: #ecfdf5;
        color: #047857;
      }

      #${BATCH_MODAL_ID} .batch-section-label {
        margin: 0 0 8px;
        color: #374151;
        font-size: 12px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-helper {
        margin: 9px 0 0;
        color: #6b7280;
        font-size: 12px;
        line-height: 1.42;
      }

      #${BATCH_MODAL_ID} .batch-helper + .batch-section-label {
        margin-top: 14px;
      }

      #${BATCH_MODAL_ID} .batch-strip {
        min-height: 112px;
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
      }

      #${BATCH_MODAL_ID} .batch-empty {
        width: 100%;
        color: #6b7280;
        text-align: center;
        font-size: 13px;
        font-weight: 650;
      }

      #${BATCH_MODAL_ID} .batch-photo-wrap {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #${BATCH_MODAL_ID} .batch-photo {
        position: relative;
        width: 82px;
        height: 96px;
        border-radius: 9px;
        overflow: hidden;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
      }

      #${BATCH_MODAL_ID} .batch-photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      #${BATCH_MODAL_ID} .batch-photo-badge {
        position: absolute;
        left: 6px;
        top: 6px;
        padding: 3px 6px;
        border-radius: 999px;
        background: rgba(17, 24, 39, 0.74);
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
      }

      #${BATCH_MODAL_ID} .batch-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
        gap: 10px;
        margin-top: 10px;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo-wrap {
        display: block;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo {
        width: 100%;
        height: auto;
        aspect-ratio: 1 / 1.18;
        cursor: pointer;
        border: 2px solid #e5e7eb;
        background: #ffffff;
        transition: border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease, transform 120ms ease;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.selected {
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.16);
        transform: translateY(-1px);
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.marked {
        opacity: 0.38;
        filter: grayscale(0.35);
        cursor: default;
      }

      #${BATCH_MODAL_ID} .batch-select-check {
        position: absolute;
        right: 7px;
        top: 7px;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 2px solid #ffffff;
        background: rgba(17, 24, 39, 0.4);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 900;
        box-shadow: 0 3px 8px rgba(17, 24, 39, 0.18);
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.selected .batch-select-check {
        background: #4f46e5;
      }

      #${BATCH_MODAL_ID} .batch-inline-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
      }

      #${BATCH_MODAL_ID} .batch-selection-count {
        color: #6b7280;
        font-size: 12px;
        font-weight: 750;
        margin-right: auto;
      }

      #${BATCH_MODAL_ID} .batch-groups {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }

      #${BATCH_MODAL_ID} .batch-item-card {
        min-width: 0;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        padding: 10px;
        box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
      }

      #${BATCH_MODAL_ID} .batch-item-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin: 0 0 9px;
        color: #111827;
        font-size: 12px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-item-count {
        color: #6b7280;
        font-size: 11px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID} .batch-ungroup {
        border: 0;
        background: transparent;
        color: #4f46e5;
        cursor: pointer;
        font-size: 11px;
        font-weight: 850;
        padding: 0;
      }

      #${BATCH_MODAL_ID} .batch-item-photos {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      #${BATCH_MODAL_ID} .batch-item-card .batch-photo-wrap {
        display: block;
      }

      #${BATCH_MODAL_ID} .batch-item-card .batch-photo {
        width: 70px;
        height: 84px;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 18px;
      }

      #${BATCH_MODAL_ID} .batch-actions button,
      #${BATCH_MODAL_ID} .batch-inline-actions button {
        min-height: 36px;
        width: auto;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #111827;
        cursor: pointer;
        font-size: 13px;
        font-weight: 800;
      }

      #${BATCH_MODAL_ID} .batch-actions button:hover:not(:disabled),
      #${BATCH_MODAL_ID} .batch-inline-actions button:hover:not(:disabled) {
        background: #f9fafb;
        border-color: #9ca3af;
      }

      #${BATCH_MODAL_ID} .batch-actions .primary {
        border-color: #4f46e5;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.22);
      }

      #${BATCH_MODAL_ID} .batch-inline-actions .primary {
        border-color: #4f46e5;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.18);
      }

      #${BATCH_MODAL_ID} .batch-actions .primary:hover:not(:disabled),
      #${BATCH_MODAL_ID} .batch-inline-actions .primary:hover:not(:disabled) {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        border-color: #4338ca;
        filter: brightness(1.05);
      }

      #${BATCH_MODAL_ID} .batch-actions button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
        box-shadow: none;
      }

      #${BATCH_MODAL_ID} .batch-body {
        min-height: 0;
      }

      #${BATCH_MODAL_ID} .batch-review {
        min-height: 0;
      }

      #${BATCH_MODAL_ID} .batch-gallery {
        grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
        gap: 8px;
        max-height: min(48vh, 430px);
        overflow: auto;
        padding-right: 2px;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo {
        aspect-ratio: 1 / 1.08;
        border-radius: 8px;
      }

      #${BATCH_MODAL_ID} .batch-groups {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 184px;
        overflow: auto;
        margin-top: 8px;
        padding-right: 2px;
      }

      #${BATCH_MODAL_ID} .batch-item-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border-radius: 8px;
        padding: 8px 10px;
        box-shadow: none;
      }

      #${BATCH_MODAL_ID} .batch-item-title {
        flex: 1 1 auto;
        min-width: 138px;
        margin: 0;
      }

      #${BATCH_MODAL_ID} .batch-item-photos {
        flex: 0 0 auto;
        align-items: center;
        gap: 4px;
        flex-wrap: nowrap;
      }

      #${BATCH_MODAL_ID} .batch-thumb-chip {
        width: 24px;
        height: 24px;
        border-radius: 5px;
        object-fit: cover;
        border: 1px solid #e5e7eb;
      }

      #${BATCH_MODAL_ID} .batch-thumb-more {
        min-width: 24px;
        height: 24px;
        border-radius: 5px;
        background: #f3f4f6;
        color: #4b5563;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        position: sticky;
        bottom: -18px;
        z-index: 2;
        margin: 16px -18px -18px;
        padding: 12px 18px;
        background: #fbfcff;
        border-top: 1px solid #e5e7eb;
      }

      #${BATCH_MODAL_ID} .batch-content {
        width: min(820px, calc(100vw - 28px));
        border-radius: 12px;
        padding: 16px 18px 18px;
      }

      #${BATCH_MODAL_ID} .batch-topbar {
        margin-bottom: 14px;
      }

      #${BATCH_MODAL_ID} .batch-title {
        font-size: 18px;
      }

      #${BATCH_MODAL_ID} .batch-subtitle {
        font-size: 12px;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 164px;
        height: 164px;
        border-radius: 8px;
        background: linear-gradient(135deg, #f8fafc, #eef2ff);
        overflow: hidden;
        color: #4f46e5;
        font-size: 12px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.72) 50%, transparent 100%);
        transform: translateX(-100%);
        animation: batchQrShimmer 1.4s ease-in-out infinite;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder::after {
        content: "QR";
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border: 1px solid #c7d2fe;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.1);
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder.error {
        background: #fff7ed;
        color: #c2410c;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder.error::before {
        display: none;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder.error::after {
        content: "QR";
        border-color: #fed7aa;
      }

      @keyframes batchQrShimmer {
        to {
          transform: translateX(100%);
        }
      }

      #${BATCH_MODAL_ID} .batch-wait-panel {
        min-height: 196px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #ffffff;
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      #${BATCH_MODAL_ID} .batch-wait-title {
        color: #111827;
        font-size: 18px;
        font-weight: 850;
        letter-spacing: 0;
      }

      #${BATCH_MODAL_ID} .batch-count-number {
        display: inline-block;
        min-width: 0.7em;
        text-align: right;
      }

      #${BATCH_MODAL_ID} .batch-count-number.bump {
        animation: batchCountBump 220ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes batchCountBump {
        0% {
          opacity: 0.35;
          transform: translateY(7px) scale(0.96);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      #${BATCH_MODAL_ID} .batch-wait-copy,
      #${BATCH_MODAL_ID} .batch-review-subtitle {
        margin-top: 5px;
        color: #6b7280;
        font-size: 12px;
        line-height: 1.45;
      }

      #${BATCH_MODAL_ID} .batch-status.warning {
        border-color: #fed7aa;
        background: #fff7ed;
        color: #c2410c;
      }

      #${BATCH_MODAL_ID} .batch-review-header,
      #${BATCH_MODAL_ID} .batch-summary-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
      }

      #${BATCH_MODAL_ID} .batch-summary-head {
        margin: 12px 0 7px;
        color: #374151;
        font-size: 12px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-summary-count {
        color: #6b7280;
        font-size: 11px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID} .batch-gallery {
        grid-template-columns: repeat(auto-fill, minmax(62px, 1fr));
        gap: 7px;
        max-height: min(43vh, 344px);
        margin-top: 10px;
        padding: 1px 2px 1px 1px;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo {
        aspect-ratio: 1 / 1;
        border-width: 1px;
        border-radius: 7px;
        transition: border-color 100ms ease, box-shadow 100ms ease, opacity 100ms ease;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.selected {
        border-color: #4f46e5;
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.22);
        transform: none;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.marked {
        opacity: 0.5;
        filter: saturate(0.75);
      }

      #${BATCH_MODAL_ID} .batch-photo-badge {
        left: 5px;
        top: 5px;
        padding: 2px 5px;
        font-size: 9px;
      }

      #${BATCH_MODAL_ID} .batch-select-check {
        right: 5px;
        top: 5px;
        width: 18px;
        height: 18px;
        font-size: 11px;
      }

      #${BATCH_MODAL_ID} .batch-groups {
        gap: 6px;
        max-height: 142px;
      }

      #${BATCH_MODAL_ID} .batch-item-card {
        min-height: 42px;
        flex-direction: row;
        align-items: center;
        border-radius: 7px;
        padding: 7px 10px;
      }

      #${BATCH_MODAL_ID} .batch-item-title {
        min-width: 0;
        flex: 1 1 auto;
        font-size: 12px;
        margin: 0;
      }

      #${BATCH_MODAL_ID} .batch-item-side {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #${BATCH_MODAL_ID} .batch-item-photos {
        gap: 4px;
      }

      #${BATCH_MODAL_ID} .batch-ungroup {
        min-height: auto !important;
        width: auto !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #4f46e5 !important;
        font-size: 11px !important;
        line-height: 1 !important;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        align-items: center;
        gap: 8px;
      }

      #${BATCH_MODAL_ID} .batch-actions .batch-selection-count {
        margin-right: auto;
      }

      #${BATCH_MODAL_ID} .batch-actions button {
        min-height: 34px;
        border-radius: 7px;
      }

      #${BATCH_MODAL_ID} {
        background: rgba(17, 24, 39, 0.42);
      }

      #${BATCH_MODAL_ID} .batch-content {
        width: min(620px, calc(100vw - 32px));
        background: #ffffff;
        border-color: #dfe3ea;
        border-radius: 10px;
        box-shadow: 0 18px 42px rgba(17, 24, 39, 0.2);
        padding: 16px 18px 0;
      }

      #${BATCH_MODAL_ID} .batch-topbar {
        align-items: center;
        margin-bottom: 14px;
      }

      #${BATCH_MODAL_ID} .batch-title {
        margin-bottom: 3px;
        font-size: 17px;
      }

      #${BATCH_MODAL_ID} .batch-subtitle {
        max-width: 430px;
        font-size: 12px;
      }

      #${BATCH_MODAL_ID} .batch-close {
        width: 30px;
        height: 30px;
        border: 1px solid #e5e7eb;
        background: #ffffff;
        box-shadow: 0 4px 10px rgba(17, 24, 39, 0.08);
      }

      #${BATCH_MODAL_ID} .batch-layout {
        grid-template-columns: 176px minmax(0, 1fr);
        gap: 14px;
      }

      #${BATCH_MODAL_ID} .batch-qr {
        padding: 12px;
        border-radius: 9px;
        background: #ffffff;
      }

      #${BATCH_MODAL_ID} .batch-qr img,
      #${BATCH_MODAL_ID} .batch-qr-placeholder {
        width: 148px;
        height: 148px;
      }

      #${BATCH_MODAL_ID} .batch-wait-panel {
        min-height: 206px;
        border-radius: 9px;
        padding: 22px 18px;
        justify-content: center;
      }

      #${BATCH_MODAL_ID} .batch-status {
        width: fit-content;
        min-height: 26px;
        margin-bottom: 12px;
        padding: 5px 9px;
        border-radius: 999px;
        font-size: 11px;
      }

      #${BATCH_MODAL_ID} .batch-wait-title {
        font-size: 18px;
        min-height: 22px;
      }

      #${BATCH_MODAL_ID} .batch-wait-copy {
        max-width: 360px;
        min-height: 34px;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        margin: 16px -18px 0;
        padding: 10px 18px 12px;
      }

      #${BATCH_MODAL_ID} .batch-layout + .batch-actions {
        min-height: 58px;
      }

      #${BATCH_MODAL_ID} .batch-actions button[hidden] {
        display: none;
      }

      @keyframes batchCardIn {
        from {
          opacity: 0;
          transform: translateX(14px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @media (max-width: 680px) {
        #${BATCH_MODAL_ID} .batch-layout {
          grid-template-columns: 1fr;
        }

        #${BATCH_MODAL_ID} .batch-qr img {
          width: 150px;
          height: 150px;
        }

        #${BATCH_MODAL_ID} .batch-content {
          padding: 14px;
        }

        #${BATCH_MODAL_ID} .batch-actions {
          bottom: -14px;
          margin: 14px -14px -14px;
          padding: 10px 14px;
        }

        #${BATCH_MODAL_ID} .batch-gallery {
          grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
          max-height: 42vh;
        }

        #${BATCH_MODAL_ID} .batch-item-card {
          align-items: center;
          flex-direction: row;
        }

        #${BATCH_MODAL_ID} .batch-item-side {
          gap: 7px;
        }

        #${BATCH_MODAL_ID} .batch-actions {
          flex-wrap: wrap;
        }

        #${BATCH_MODAL_ID} .batch-actions .batch-selection-count {
          flex: 1 0 100%;
        }
      }

      #${BATCH_MODAL_ID},
      #${BATCH_MODAL_ID} * {
        box-sizing: border-box;
      }

      html.quickvint-batch-modal-open,
      body.quickvint-batch-modal-open {
        overflow: hidden !important;
        scrollbar-gutter: stable;
      }

      #${BATCH_MODAL_ID} .batch-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID} .batch-body {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        position: static;
        bottom: auto;
        z-index: 1;
        flex: 0 0 auto;
        margin: 16px -18px 0;
        padding: 12px 18px 14px;
        border-top: 1px solid #e5e7eb;
        background: #ffffff;
      }

      #${BATCH_MODAL_ID}.organizing .batch-content {
        width: min(520px, calc(100vw - 24px));
        height: auto;
        max-height: min(860px, calc(100vh - 20px));
        padding: 18px 18px 0;
        border-radius: 16px;
        background: #f8fafc;
      }

      #${BATCH_MODAL_ID}.organizing .batch-topbar {
        flex: 0 0 auto;
        align-items: flex-start;
        flex-wrap: wrap;
        margin: -18px -18px 14px;
        padding: 18px 18px 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
        z-index: 2;
      }

      #${BATCH_MODAL_ID}.organizing .batch-heading {
        flex: 1 1 auto;
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-title {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
      }

      #${BATCH_MODAL_ID}.organizing .batch-subtitle {
        max-width: none;
        margin: 2px 0 0;
        color: #64748b;
        font-size: 13px;
        font-weight: 700;
      }

      #${BATCH_MODAL_ID}.organizing .batch-body {
        flex: 0 1 auto;
        max-height: none;
        overflow: clip;
      }

      #${BATCH_MODAL_ID}.organizing .batch-review {
        flex: 0 1 auto;
        min-height: 0;
        max-height: min(650px, calc(100vh - 184px));
        overflow-x: hidden;
        overflow-y: scroll;
        overscroll-behavior: contain;
        padding: 0 8px 20px 0;
        scrollbar-gutter: stable;
        scrollbar-color: #64748b #cbd5e1;
        scrollbar-width: auto;
      }

      #${BATCH_MODAL_ID}.organizing .batch-review::-webkit-scrollbar {
        width: 10px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-review::-webkit-scrollbar-track {
        background: #cbd5e1;
      }

      #${BATCH_MODAL_ID}.organizing .batch-review::-webkit-scrollbar-thumb {
        border: 2px solid #cbd5e1;
        border-radius: 8px;
        background: #64748b;
      }

      #${BATCH_MODAL_ID}.organizing .organize-progress {
        position: relative;
        width: 100%;
        height: 8px;
        margin: 0;
        border-radius: 999px;
        background: #e5e7eb;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .organize-progress span {
        position: absolute;
        top: 0;
        bottom: 0;
        display: block;
        border-radius: inherit;
        transition: left 180ms ease, width 180ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .organize-status-row {
        flex: 1 0 100%;
        display: grid;
        gap: 8px;
        width: 100%;
        margin: 12px 0 0;
      }

      #${BATCH_MODAL_ID}.organizing .organize-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        width: 100%;
      }

      #${BATCH_MODAL_ID}.organizing .organize-jump-to-photos,
      #${BATCH_MODAL_ID}.organizing .organize-jump-to-groups {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #2563eb;
        cursor: pointer;
        font-size: 13px;
        font-weight: 750;
        line-height: 1.2;
        white-space: nowrap;
      }

      #${BATCH_MODAL_ID}.organizing .batch-direction-icon {
        flex: 0 0 auto;
        width: 18px;
        height: 18px;
      }

      #${BATCH_MODAL_ID}.organizing :is(.organize-jump-to-photos, .organize-jump-to-groups):hover:not(:disabled),
      #${BATCH_MODAL_ID}.organizing :is(.organize-jump-to-photos, .organize-jump-to-groups):focus-visible {
        color: #1d4ed8;
      }

      #${BATCH_MODAL_ID}.organizing .organize-jump-to-photos:disabled {
        color: #047857;
        cursor: default;
        text-decoration: none;
      }

      #${BATCH_MODAL_ID}.organizing .organize-progress-done {
        left: 0;
        background: #2563eb;
      }

      #${BATCH_MODAL_ID}.organizing .organize-items-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        margin-left: 4px;
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 11px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-section {
        padding: 15px;
        border: 1px solid #dbe3ed;
        border-radius: 14px;
        background: #ffffff;
      }

      @keyframes batchGalleryAttention {
        20%, 60% {
          border-color: #2563eb;
          box-shadow:
            0 0 0 5px rgba(37, 99, 235, 0.28),
            0 12px 28px rgba(37, 99, 235, 0.2);
        }
      }

      @keyframes batchRemainingAttention {
        20%, 60% {
          background: #dbeafe;
          color: #1d4ed8;
          box-shadow: 0 0 0 6px #dbeafe;
          transform: scale(1.05);
        }
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-section.is-attention {
        animation: batchGalleryAttention 1100ms ease-out;
      }

      #${BATCH_MODAL_ID}.organizing .organize-jump-to-photos.is-attention {
        animation: batchRemainingAttention 1100ms ease-out;
      }

      #${BATCH_MODAL_ID}.organizing .batch-section-head,
      #${BATCH_MODAL_ID}.organizing .batch-summary-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-section-head {
        margin: 0 0 14px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-section-title {
        margin: 0;
        color: #0f172a;
        font-size: 15px;
        font-weight: 850;
        line-height: 1.25;
      }

      #${BATCH_MODAL_ID}.organizing .batch-section-copy {
        margin: 3px 0 0;
        color: #64748b;
        font-size: 12px;
        line-height: 1.35;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-count,
      #${BATCH_MODAL_ID}.organizing .batch-summary-count {
        flex: 0 0 auto;
        color: #64748b;
        font-size: 12px;
        font-weight: 750;
        line-height: 1.25;
        white-space: nowrap;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery {
        display: block;
        max-height: none;
        overflow: visible;
        margin: 0;
        padding: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 9px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid {
        min-height: var(--quickvint-batch-gallery-min-height, 0);
        max-height: none;
        overflow: hidden;
        margin: 0;
        padding: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-photo-wrap {
        display: block;
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-photo-wrap.is-grouped {
        pointer-events: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid.is-empty {
        display: none;
        min-height: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid.is-settling {
        display: grid;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-empty {
        padding: 28px 12px;
        color: #047857;
        text-align: center;
        font-size: 13px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo {
        width: 100%;
        aspect-ratio: 1 / 1;
        border: 2px solid transparent;
        border-radius: 12px;
        background: #e2e8f0;
        box-shadow: none;
        cursor: pointer;
        transform: translateZ(0);
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease,
          transform 180ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo.tap-target:not(.selected) {
        border-color: rgba(99, 102, 241, 0.34);
        border-style: dashed;
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo.tap-target:not(.selected):hover,
      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo.tap-target:not(.selected):focus-visible {
        border-color: rgba(79, 70, 229, 0.48);
        border-style: solid;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.14);
        outline: none;
        transform: translateY(-1px);
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo:active:not(.marked) {
        transform: scale(0.96);
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo.selected {
        border-color: #2563eb;
        border-style: solid;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.22);
        transform: scale(0.96);
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo.selected::after {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(37, 99, 235, 0.22);
        pointer-events: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo.marked {
        opacity: 1;
      }

      #${BATCH_MODAL_ID}.organizing .batch-photo-badge {
        display: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-select-check {
        left: 50%;
        right: auto;
        top: 50%;
        z-index: 1;
        width: 24px;
        height: 24px;
        transform: translate(-50%, -50%) scale(0.82);
        border: 0;
        background: #3b82f6;
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(37, 99, 235, 0.3);
        opacity: 0;
        transition: opacity 160ms ease, transform 160ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo.selected .batch-select-check {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      #${BATCH_MODAL_ID}.organizing .batch-discard-photo {
        position: absolute;
        right: 7px;
        top: 7px;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        min-height: 24px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.82);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.68);
        color: #ffffff;
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.2);
        cursor: pointer;
        font-size: 16px;
        font-weight: 850;
        line-height: 1;
        opacity: 0.82;
        transform: scale(1);
        transition: opacity 140ms ease, transform 140ms ease, background 140ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery-grid .batch-photo:hover .batch-discard-photo,
      #${BATCH_MODAL_ID}.organizing .batch-discard-photo:focus-visible {
        opacity: 1;
      }

      #${BATCH_MODAL_ID}.organizing .batch-discard-photo:hover {
        background: #dc2626;
      }

      #${BATCH_MODAL_ID}.organizing .batch-groups-section {
        margin-top: 20px;
        padding-top: 18px;
        border-top: 2px solid #dbe3ed;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-head {
        align-items: center;
        margin: 0 0 12px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-title-row {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-title-row .batch-summary-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 5px;
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 11px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-reset {
        flex: 0 0 auto;
        width: auto !important;
        max-width: max-content;
        min-height: 30px;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #4f46e5;
        cursor: pointer;
        font-size: 12px;
        font-weight: 850;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-reset:hover:not(:disabled) {
        background: transparent;
        color: #3730a3;
      }

      #${BATCH_MODAL_ID}.organizing .batch-groups-empty {
        padding: 24px 4px;
        color: #64748b;
        font-size: 13px;
        text-align: center;
      }

      #${BATCH_MODAL_ID} .batch-capacity-note {
        max-height: 84px;
        margin: 12px 0 14px;
        padding: 10px 12px;
        border: 1px solid #e0e7ff;
        border-radius: 12px;
        background: #eef2ff;
        color: #3730a3;
        font-size: 12.5px;
        font-weight: 750;
        line-height: 1.35;
        opacity: 1;
        overflow: hidden;
        transform: translateY(0);
        transition:
          max-height 120ms ease,
          margin 120ms ease,
          padding 120ms ease,
          border-width 120ms ease,
          opacity 160ms ease,
          transform 160ms ease;
      }

      #${BATCH_MODAL_ID} .batch-capacity-note.is-hidden {
        max-height: 0;
        margin-top: 0;
        margin-bottom: 0;
        padding-top: 0;
        padding-bottom: 0;
        border-width: 0;
        opacity: 0;
        transform: translateY(-4px);
      }

      #${BATCH_MODAL_ID} .batch-capacity-note.warning {
        border-color: #fed7aa;
        background: #fff7ed;
        color: #9a3412;
      }

      #${BATCH_MODAL_ID} .batch-capacity-note.error {
        border-color: #fecaca;
        background: #fef2f2;
        color: #991b1b;
      }

      #${BATCH_MODAL_ID}.organizing .batch-groups {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: none;
        overflow: visible;
        margin: 0;
        padding: 0 0 10px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-card {
        display: block;
        min-height: 0;
        padding: 14px 16px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 3px 12px rgba(15, 23, 42, 0.05);
        opacity: 1;
        transform: translateX(0);
        overflow: hidden;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease,
          transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-card.is-entering,
      #${BATCH_MODAL_ID}.organizing .batch-item-card.is-leaving {
        transform: translateX(34px);
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-title {
        display: block;
        min-width: 0;
        margin: 0;
        color: #0f172a;
        font-size: 14px;
        font-weight: 850;
        line-height: 1.25;
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-count {
        display: block;
        margin-top: 2px;
        color: #64748b;
        font-size: 12px;
        font-weight: 600;
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-photos {
        display: flex;
        gap: 8px;
        overflow: hidden;
        padding-bottom: 0;
        flex-wrap: nowrap;
      }

      #${BATCH_MODAL_ID}.organizing .batch-thumb-chip,
      #${BATCH_MODAL_ID}.organizing .batch-thumb-more {
        flex: 0 0 auto;
        width: 62px;
        height: 62px;
        border-radius: 8px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-thumb-chip {
        object-fit: cover;
        border: 1px solid #e5e7eb;
        background: #f1f5f9;
      }

      #${BATCH_MODAL_ID}.organizing .batch-thumb-more {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
        background: #f1f5f9;
        color: #64748b;
        font-size: 13px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID}.organizing .batch-ungroup {
        flex: 0 0 auto;
        width: 32px !important;
        height: 32px !important;
        min-height: 32px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #94a3b8 !important;
        font-size: 18px !important;
        line-height: 1 !important;
      }

      #${BATCH_MODAL_ID}.organizing .batch-ungroup:hover {
        background: #f1f5f9 !important;
        color: #ef4444 !important;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions {
        position: static;
        left: auto;
        right: auto;
        bottom: auto;
        display: grid;
        align-items: center;
        gap: 10px;
        margin: 0 -18px;
        min-height: 72px;
        padding: 13px 24px 15px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 -10px 26px rgba(15, 23, 42, 0.08);
        border-top: 1px solid #e5e7eb;
      }

      #${BATCH_MODAL_ID}.organizing .batch-selection-count {
        grid-area: status;
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        min-width: 0;
        width: auto;
        max-height: none;
        min-height: 40px;
        margin: 0;
        padding: 0 12px;
        border: 1px solid #c7d2fe;
        border-radius: 10px;
        background: #eef2ff;
        color: #4338ca;
        cursor: pointer;
        font-size: 12.5px;
        font-weight: 650;
        text-align: left;
        line-height: 1.35;
        opacity: 1;
        overflow: hidden;
        transform: translateY(0);
        white-space: nowrap;
        transition:
          max-width 140ms ease,
          opacity 160ms ease,
          transform 160ms ease,
          color 160ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-selection-count {
        gap: 7px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-selection-count.is-hidden {
        max-width: 0;
        opacity: 0;
        transform: translateY(4px);
      }

      #${BATCH_MODAL_ID}.organizing .batch-secondary-actions {
        grid-area: secondary;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        flex-wrap: nowrap;
        gap: 10px;
        max-width: 100%;
        max-height: 34px;
        min-height: 34px;
        opacity: 1;
        transform: translateY(0);
        overflow: hidden;
        transition: opacity 120ms ease, transform 120ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="browse"],
      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="empty"] {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: "status";
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="browse"] .batch-selection-count,
      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="empty"] .batch-selection-count {
        width: 100%;
        min-height: 44px;
        justify-content: center;
        font-weight: 800;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="selecting"] {
        grid-template-columns: max-content max-content minmax(180px, 1fr);
        grid-template-areas: "status secondary primary";
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="selecting"] .batch-selection-count,
      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="selecting"] .batch-clear-selection {
        min-height: 42px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="selecting"] .batch-secondary-actions {
        max-height: 40px;
        min-height: 40px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="ready"] {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: "primary";
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="ready"] .batch-selection-count {
        display: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-secondary-actions.is-hidden {
        max-width: 0;
        max-height: 0;
        min-height: 0;
        gap: 0;
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        visibility: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions button {
        min-height: 34px;
        border-radius: 12px;
        transition:
          transform 140ms ease,
          box-shadow 140ms ease,
          opacity 140ms ease,
          background 140ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions button:not(:disabled):active {
        transform: scale(0.98);
      }

      #${BATCH_MODAL_ID}.organizing .batch-mark-group,
      #${BATCH_MODAL_ID}.organizing .batch-start {
        grid-area: primary;
        width: 100%;
        max-width: none;
        justify-self: stretch;
        justify-content: center;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        border-color: #4f46e5;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.28);
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="selecting"] .batch-mark-group,
      #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="ready"] .batch-start {
        min-height: 46px;
      }

      #${BATCH_MODAL_ID}.organizing .footer-control.is-hidden {
        max-height: 0;
        max-width: 0;
        min-height: 0;
        margin: 0;
        padding-left: 0;
        padding-right: 0;
        padding-top: 0;
        padding-bottom: 0;
        border-width: 0;
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-reset.is-hidden {
        max-width: 0;
        min-height: 0;
        padding-left: 0;
        padding-right: 0;
        border-width: 0;
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions [hidden],
      #${BATCH_MODAL_ID} [hidden] {
        display: none !important;
      }

      #${BATCH_MODAL_ID}.generating .batch-content {
        width: min(620px, calc(100vw - 24px));
        max-height: min(760px, calc(100vh - 24px));
        padding: 18px 18px 0;
        border-radius: 16px;
        background: #f8fafc;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.generating .batch-topbar {
        align-items: flex-start;
        margin: -18px -18px 0;
        padding: 18px 18px 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      #${BATCH_MODAL_ID}.generating .batch-heading {
        flex: 1 1 auto;
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.generating .batch-title {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
      }

      #${BATCH_MODAL_ID}.generating .batch-subtitle {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 13px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID}.generating .batch-close:disabled {
        cursor: wait;
        opacity: 0.42;
      }

      #${BATCH_MODAL_ID}.generating .batch-body {
        flex: 1 1 auto;
        min-height: 0;
        margin: 0 -18px;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-stage {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        padding: 18px;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.generating .batch-ambient {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(115deg, transparent 0%, rgba(79, 70, 229, 0.08) 42%, transparent 68%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0));
        opacity: 0.75;
        transform: translateX(-38%);
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-stage.is-live .batch-ambient {
        animation: batchAmbientSweep 3.6s ease-in-out infinite;
      }

      @keyframes batchAmbientSweep {
        0% {
          transform: translateX(-38%);
          opacity: 0.45;
        }
        50% {
          opacity: 0.82;
        }
        100% {
          transform: translateX(38%);
          opacity: 0.45;
        }
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-head {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 14px;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-title {
        color: #475569;
        font-size: 13px;
        font-weight: 700;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-count {
        min-width: 54px;
        padding: 6px 8px;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        background: #ffffff;
        color: #0f172a;
        text-align: center;
        font-size: 12px;
        font-weight: 850;
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.05);
      }

      #${BATCH_MODAL_ID}.generating .batch-live-progress {
        position: relative;
        z-index: 1;
        height: 8px;
        margin-bottom: 16px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.generating .batch-live-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #4f46e5, #22c55e);
        transition: width 360ms ease;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-list {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: min(46vh, 420px);
        overflow-y: auto;
        padding: 1px;
        overscroll-behavior: contain;
        scrollbar-width: none;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-list::-webkit-scrollbar {
        width: 0;
        height: 0;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        min-height: 76px;
        padding: 11px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 5px 16px rgba(15, 23, 42, 0.05);
        transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.active {
        border-color: #818cf8;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.14);
        transform: translateY(-1px);
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.done {
        border-color: #bbf7d0;
        background: rgba(240, 253, 244, 0.9);
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.failed {
        border-color: #fed7aa;
        background: #fff7ed;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs {
        display: flex;
        align-items: center;
        min-width: 82px;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs img,
      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs span {
        width: 38px;
        height: 44px;
        margin-left: -12px;
        border: 2px solid #ffffff;
        border-radius: 9px;
        object-fit: cover;
        background: #e2e8f0;
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.1);
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs img:first-child,
      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs span:first-child {
        margin-left: 0;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        font-size: 11px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-meta {
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-meta strong {
        display: block;
        color: #0f172a;
        font-size: 14px;
        font-weight: 850;
        line-height: 1.2;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-meta span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 12px;
        font-weight: 650;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-badge {
        min-width: 86px;
        padding: 6px 8px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #475569;
        text-align: center;
        font-size: 11px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.active .batch-progress-badge {
        background: #eef2ff;
        color: #4f46e5;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.done .batch-progress-badge {
        background: #dcfce7;
        color: #15803d;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.failed .batch-progress-badge {
        background: #ffedd5;
        color: #c2410c;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-note {
        position: relative;
        z-index: 1;
        margin-top: 14px;
        color: #64748b;
        font-size: 12.5px;
        font-weight: 650;
        line-height: 1.45;
      }

      #${BATCH_MODAL_ID}.generating .batch-actions {
        flex: 0 0 auto;
        justify-content: flex-end;
        margin: 0;
        min-height: 86px;
        padding: 18px 32px 22px;
        background: rgba(255, 255, 255, 0.98);
        border-top: 1px solid #e5e7eb;
        box-shadow: 0 -10px 26px rgba(15, 23, 42, 0.08);
      }

      #${BATCH_MODAL_ID}.generating .batch-dismiss {
        width: min(100%, 320px);
        justify-content: center;
        background: ${PRIMARY_BUTTON_BACKGROUND} !important;
        border-color: #4f46e5 !important;
        color: #ffffff !important;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.22) !important;
      }

      #${BATCH_MODAL_ID}.generating .batch-dismiss:hover:not(:disabled) {
        background: ${PRIMARY_BUTTON_BACKGROUND} !important;
        border-color: #4338ca !important;
        color: #ffffff !important;
        filter: brightness(1.04);
      }

      #${BATCH_MODAL_ID}.generating .batch-dismiss:disabled {
        background: ${PRIMARY_BUTTON_BACKGROUND} !important;
        border-color: #4f46e5 !important;
        color: #ffffff !important;
        cursor: wait !important;
        opacity: 0.52;
        box-shadow: none !important;
        filter: none !important;
      }

      @media (max-width: 560px) {
        #${BATCH_MODAL_ID}.organizing .batch-content {
          width: calc(100vw - 24px);
          padding: 16px 14px 0;
        }

        #${BATCH_MODAL_ID}.organizing .batch-topbar {
          margin: -16px -14px 12px;
          padding: 16px 14px 14px;
        }

        #${BATCH_MODAL_ID}.organizing .batch-gallery-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        #${BATCH_MODAL_ID}.organizing .batch-actions {
          row-gap: 10px;
          column-gap: 0;
          margin: 0 -14px;
          min-height: 0;
          padding: 14px 18px 18px;
        }

        #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="selecting"] {
          grid-template-columns: minmax(0, 1fr) max-content;
          grid-template-areas:
            "status secondary"
            "primary primary";
        }

        #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="browse"],
        #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="empty"],
        #${BATCH_MODAL_ID}.organizing .batch-actions[data-state="ready"] {
          grid-template-columns: minmax(0, 1fr);
        }

        #${BATCH_MODAL_ID}.organizing .batch-selection-count {
          min-width: 0;
          min-height: 24px;
          white-space: normal;
        }

        #${BATCH_MODAL_ID}.organizing .batch-secondary-actions {
          min-height: 34px;
        }

        #${BATCH_MODAL_ID}.organizing .batch-mark-group,
        #${BATCH_MODAL_ID}.organizing .batch-start {
          max-width: none;
          width: 100%;
        }

        #${BATCH_MODAL_ID}.generating .batch-actions {
          min-height: 84px;
          padding: 16px 22px 20px;
        }

        #${BATCH_MODAL_ID}.generating .batch-dismiss {
          width: 100%;
        }

        #${BATCH_MODAL_ID}.generating .batch-progress-card {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        #${BATCH_MODAL_ID}.generating .batch-progress-badge {
          width: fit-content;
          min-width: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${BATCH_MODAL_ID} *,
        #${BATCH_MODAL_ID} *::before,
        #${BATCH_MODAL_ID} *::after {
          animation-duration: 1ms !important;
          transition-duration: 1ms !important;
        }
      }

      #${MODAL_ID} .language-selector {
        margin: 0 0 20px;
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        position: relative;
      }

      #${MODAL_ID} .language-select-wrapper {
        position: relative;
        width: 100%;
        max-width: 180px;
      }

      #${MODAL_ID} .language-select-label {
        display: block;
        margin: 0 0 5px 2px;
        color: #6b7280;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
      }

      #${MODAL_ID} .modal-flag-icon {
        position: absolute;
        left: 12px;
        top: 30px;
        pointer-events: none;
        z-index: 1;
        width: 20px;
        height: 14px;
        border-radius: 2px;
        object-fit: cover;
        box-shadow: 0 0 0 1px rgba(17, 24, 39, 0.08);
      }

      #${MODAL_ID} .language-select {
        width: 100%;
        padding: 10px 36px 10px 42px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #f9fafb;
        font-size: 14px;
        color: #374151;
        cursor: pointer;
        font-weight: 500;
        outline: none;
        text-align: left;
        appearance: none;
        transition: all 0.2s ease;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        background-size: 16px;
      }

      #${MODAL_ID} .language-select:hover {
        background-color: #f3f4f6;
        border-color: #d1d5db;
        color: #111827;
      }

      #${MODAL_ID} .language-select:focus {
        background-color: white;
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }

      #${MODAL_ID} .disclaimer {
        margin-top: 24px;
        font-size: 11px;
        color: #9ca3af;
        text-align: center;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} {
        position: fixed;
        z-index: 2147483647;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 16px 40px rgba(17, 24, 39, 0.18);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-title {
        margin: 0 0 9px;
        color: #111827;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.35;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-copy {
        margin: -3px 0 10px;
        color: #4b5563;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.4;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-copy a {
        color: #4f46e5;
        font-weight: 800;
        text-decoration: underline;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-start;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} button {
        flex: 0 0 auto;
        width: auto !important;
        min-width: 76px;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #111827;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-add {
        min-width: 96px;
        border-color: #4f46e5;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-settings {
        flex-basis: 100%;
        border-color: #e5e7eb;
        background: #f8fafc;
        color: #374151;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} button:hover {
        filter: brightness(0.98);
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} {
        position: fixed;
        z-index: 2147483647;
        width: min(410px, calc(100vw - 28px));
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-card {
        width: 100%;
        border: 1px solid #ddd6fe;
        border-radius: 16px;
        background: #ffffff;
        color: #111827;
        box-shadow:
          0 24px 70px rgba(17, 24, 39, 0.24),
          0 0 0 1px rgba(255, 255, 255, 0.72) inset;
        overflow: hidden;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-body {
        padding: 20px;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-brand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 14px;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-brand-main {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-logo {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.18);
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-brand-name {
        color: #111827;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.15;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-brand-sub {
        margin-top: 2px;
        color: #64748b;
        font-size: 11px;
        font-weight: 720;
        line-height: 1.2;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-top {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 14px;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-kicker {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 24px;
        padding: 0 9px;
        border-radius: 999px;
        background: #f4f3ff;
        color: #4f46e5;
        font-size: 11px;
        font-weight: 850;
        line-height: 1;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        font: inherit;
        font-size: 22px;
        line-height: 1;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-close:hover {
        background: #f8fafc;
        color: #334155;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-title {
        margin: 0;
        color: #111827;
        font-size: 22px;
        font-weight: 850;
        line-height: 1.12;
        letter-spacing: 0;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-copy {
        margin: 10px 0 0;
        color: #475467;
        font-size: 14px;
        font-weight: 620;
        line-height: 1.48;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-offer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-top: 16px;
        padding: 14px;
        border: 1px solid #c7d2fe;
        border-radius: 12px;
        background: #f8f7ff;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-offer-main {
        color: #312e81;
        font-size: 15px;
        font-weight: 850;
        line-height: 1.2;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-offer-sub {
        margin-top: 4px;
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.25;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-code {
        flex: 0 0 auto;
        padding: 7px 9px;
        border: 1px dashed #8b5cf6;
        border-radius: 9px;
        background: #ffffff;
        color: #4338ca;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0;
        outline: none;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-code:hover {
        background: #f4f3ff;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-points {
        display: grid;
        gap: 8px;
        margin: 15px 0 0;
        padding: 0;
        list-style: none;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-points li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        color: #334155;
        font-size: 13px;
        font-weight: 680;
        line-height: 1.34;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-check {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #ecfdf5;
        color: #059669;
        font-size: 12px;
        font-weight: 900;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-actions {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        margin-top: 18px;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-primary,
      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-secondary {
        min-height: 42px;
        border-radius: 10px;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 850;
        outline: none;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-primary {
        border: 0;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 14px 28px rgba(79, 70, 229, 0.24);
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-secondary {
        min-width: 96px;
        border: 1px solid #dbe3f0;
        background: #ffffff;
        color: #475467;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-primary:hover,
      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-secondary:hover {
        filter: brightness(0.98);
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-primary:focus-visible,
      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-secondary:focus-visible,
      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-code:focus-visible,
      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-feedback:focus-visible,
      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-close:focus-visible {
        outline: 3px solid rgba(79, 70, 229, 0.18);
        outline-offset: 2px;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-feedback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 38px;
        margin-top: 10px;
        border: 0;
        border-radius: 9px;
        background: transparent;
        color: #4f46e5;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        outline: none;
      }

      #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-feedback:hover {
        background: #f8f7ff;
      }

      @media (max-width: 520px) {
        #${LIMIT_FOLLOWUP_MODAL_ID} {
          top: auto !important;
          right: 12px !important;
          bottom: 12px !important;
          left: 12px !important;
          width: auto;
        }

        #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-card {
          border-radius: 14px;
        }

        #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-body {
          padding: 18px;
        }

        #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-actions {
          grid-template-columns: 1fr;
        }

        #${LIMIT_FOLLOWUP_MODAL_ID} .quickvint-limit-secondary {
          width: 100%;
        }
      }

      .quickvint-tools {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }

      .quickvint-primary-tools,
      .quickvint-tool-options {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .quickvint-tool-options {
        justify-content: flex-end;
        gap: 7px;
        width: 100%;
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID} {
        display: inline-grid;
        grid-template-columns: repeat(2, minmax(47px, 1fr));
        align-items: center;
        width: 100px;
        height: 38px;
        min-height: 38px;
        padding: 3px;
        border: 1px solid #d9dde8;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.07);
        transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID}:hover {
        border-color: #b8c0d8;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.09);
        transform: translateY(-1px);
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID}[data-loading="true"] {
        pointer-events: none;
        border-color: #e2e8f0;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID}[data-loading="true"]:hover {
        border-color: #e2e8f0;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        transform: none;
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID} .quickvint-length-option {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 30px;
        min-width: 0;
        padding: 0 7px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: 0;
        white-space: nowrap;
        transform: scale(1);
        transition: background 0.22s ease, color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID} .quickvint-length-option:hover {
        color: #4338ca;
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID} .quickvint-length-option[aria-pressed="true"] {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 5px 12px rgba(79, 70, 229, 0.2);
        transform: scale(1.015);
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID}[data-loading="true"] .quickvint-length-option {
        position: relative;
        overflow: hidden;
        background: #eef2f7;
        color: transparent;
        cursor: wait;
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID}[data-loading="true"] .quickvint-length-option[aria-pressed="true"] {
        background: #eef2f7;
        color: transparent;
        box-shadow: none;
        transform: none;
      }

      #${DESCRIPTION_LENGTH_TOGGLE_ID}[data-loading="true"] .quickvint-length-option::after,
      #${OUTPUT_SHAPE_TOGGLE_ID}[data-loading="true"] .format-chip::after,
      .quickvint-binary-toggle[data-loading="true"] .quickvint-toggle-label::after,
      .quickvint-binary-toggle[data-loading="true"] .quickvint-toggle-switch::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.78) 50%, transparent 100%);
        transform: translateX(-100%);
        animation: quickvintSkeletonSweep 1.25s ease-in-out infinite;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 38px;
        min-height: 38px;
        padding: 3px;
        border: 1px solid #d9dde8;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.07);
        transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID}:hover {
        border-color: #b8c0d8;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.09);
        transform: translateY(-1px);
      }

      #${OUTPUT_SHAPE_TOGGLE_ID}[data-loading="true"] {
        pointer-events: none;
        border-color: #e2e8f0;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      }

      #${OUTPUT_SHAPE_TOGGLE_ID}[data-loading="true"]:hover {
        border-color: #e2e8f0;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        transform: none;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .quickvint-format-option {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 30px;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .quickvint-format-option:disabled {
        cursor: wait;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .format-chip {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        overflow: hidden;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        transition: background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .quickvint-format-option:hover .format-chip {
        background: #f8fafc;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .format-icon {
        display: flex;
        flex-direction: column;
        gap: 2px;
        width: 20px;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .format-icon-bullet {
        display: flex;
        align-items: center;
        gap: 3px;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .format-icon-bullet::before {
        content: "";
        width: 4px;
        height: 4px;
        flex: 0 0 auto;
        border-radius: 50%;
        background: #d1d5db;
        transition: background-color 0.2s;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .format-icon-bullet span,
      #${OUTPUT_SHAPE_TOGGLE_ID} .format-icon-para span {
        display: block;
        height: 3px;
        border-radius: 1.5px;
        background: #cccccc;
        transition: background-color 0.2s;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .format-icon-bullet span {
        flex: 1;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .format-icon-para span {
        width: 100%;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .format-icon-para span:last-child {
        width: 60%;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .quickvint-format-option[aria-pressed="true"] .format-chip {
        background: #eef2ff;
        border-color: #667eea;
        box-shadow: 0 0 0 1px #667eea;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .quickvint-format-option[aria-pressed="true"] .format-icon-bullet::before {
        background: #667eea;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID} .quickvint-format-option[aria-pressed="true"] .format-icon-bullet span,
      #${OUTPUT_SHAPE_TOGGLE_ID} .quickvint-format-option[aria-pressed="true"] .format-icon-para span {
        background: #a5b4fc;
      }

      #${OUTPUT_SHAPE_TOGGLE_ID}[data-loading="true"] .format-chip {
        background: #eef2f7;
        border-color: transparent;
        box-shadow: none;
      }

      .quickvint-binary-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
        height: 38px;
        min-height: 38px;
        padding: 5px 7px 5px 12px;
        border: 1px solid #d9dde8;
        border-radius: 8px;
        background: #ffffff;
        color: #475569;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.07);
        transition: border-color 0.22s ease, background 0.22s ease, color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
      }

      .quickvint-binary-toggle:hover {
        border-color: #b8c0d8;
        background: #f8fafc;
        transform: translateY(-1px);
      }

      .quickvint-binary-toggle[aria-pressed="true"] {
        border-color: #8b7cf6;
        background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
        color: #4338ca;
        box-shadow: 0 8px 20px rgba(79, 70, 229, 0.16);
      }

      .quickvint-binary-toggle:disabled {
        cursor: not-allowed;
        opacity: 0.58;
        transform: none;
        box-shadow: 0 3px 8px rgba(17, 24, 39, 0.08);
      }

      .quickvint-binary-toggle[data-loading="true"] {
        cursor: wait;
        opacity: 1;
        pointer-events: none;
        border-color: #e2e8f0;
        background: #ffffff;
        color: transparent;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      }

      .quickvint-binary-toggle[data-loading="true"]:hover {
        border-color: #e2e8f0;
        background: #ffffff;
        transform: none;
      }

      .quickvint-binary-toggle:disabled:hover {
        border-color: #d9dde8;
        background: #ffffff;
        transform: none;
      }

      .quickvint-binary-toggle .quickvint-toggle-label {
        position: relative;
        line-height: 1;
      }

      .quickvint-binary-toggle[data-loading="true"] .quickvint-toggle-label {
        width: 48px;
        height: 12px;
        overflow: hidden;
        border-radius: 999px;
        background: #eef2f7;
        color: transparent;
      }

      .quickvint-binary-toggle .quickvint-toggle-switch {
        position: relative;
        width: 36px;
        height: 20px;
        flex: 0 0 auto;
        border-radius: 999px;
        background: #cbd5e1;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
        transition: background 0.22s ease, box-shadow 0.22s ease;
      }

      .quickvint-binary-toggle .quickvint-toggle-knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.28);
        transition: transform 0.22s ease;
      }

      .quickvint-binary-toggle[aria-pressed="true"] .quickvint-toggle-switch {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
      }

      .quickvint-binary-toggle[aria-pressed="true"] .quickvint-toggle-knob {
        transform: translateX(16px);
      }

      .quickvint-binary-toggle[data-loading="true"] .quickvint-toggle-switch {
        overflow: hidden;
        background: #e2e8f0;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
      }

      .quickvint-binary-toggle[data-loading="true"] .quickvint-toggle-knob,
      .quickvint-binary-toggle[data-loading="true"][aria-pressed="true"] .quickvint-toggle-knob {
        transform: translateX(8px);
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.16);
      }

      .quickvint-note-control {
        display: inline-flex;
        align-items: center;
        height: 38px;
        border: 1px solid #d9dde8;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.07);
        overflow: hidden;
        transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
      }

      .quickvint-note-control .quickvint-binary-toggle {
        height: 36px;
        min-height: 36px;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }

      .quickvint-note-control:hover {
        border-color: #b8c0d8;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.09);
        transform: translateY(-1px);
      }

      .quickvint-note-control[data-active="true"] {
        border-color: #8b7cf6;
        background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
        box-shadow: 0 8px 20px rgba(79, 70, 229, 0.16);
      }

      .quickvint-note-control[data-active="true"] .quickvint-binary-toggle,
      .quickvint-note-control[data-active="true"] .quickvint-note-edit {
        background: transparent;
      }

      .quickvint-note-control[data-active="true"] .quickvint-note-edit {
        border-left-color: rgba(139, 124, 246, 0.45);
        color: #4338ca;
      }

      .quickvint-note-control:hover .quickvint-binary-toggle,
      .quickvint-note-control:hover .quickvint-note-edit {
        transform: none;
      }

      .quickvint-note-edit {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        min-width: 36px;
        padding: 0;
        border: 0;
        border-left: 1px solid #e2e8f0;
        border-radius: 0;
        background: #ffffff;
        color: #475569;
        cursor: pointer;
        box-shadow: none;
        transition: background 0.22s ease, color 0.22s ease;
      }

      .quickvint-note-edit:hover {
        background: #f8fafc;
        color: #4338ca;
      }

      .quickvint-note-edit:disabled {
        cursor: wait;
        opacity: 0.58;
        transform: none;
      }

      .quickvint-note-edit svg {
        width: 15px;
        height: 15px;
      }

      @keyframes quickvintSkeletonSweep {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${DESCRIPTION_LENGTH_TOGGLE_ID},
        #${DESCRIPTION_LENGTH_TOGGLE_ID} .quickvint-length-option,
        #${OUTPUT_SHAPE_TOGGLE_ID},
        #${OUTPUT_SHAPE_TOGGLE_ID} .format-chip,
        .quickvint-binary-toggle,
        .quickvint-note-edit,
        .quickvint-binary-toggle .quickvint-toggle-switch,
        .quickvint-binary-toggle .quickvint-toggle-knob {
          transition-duration: 1ms !important;
        }

        #${DESCRIPTION_LENGTH_TOGGLE_ID}:hover,
        #${OUTPUT_SHAPE_TOGGLE_ID}:hover,
        .quickvint-binary-toggle:hover,
        .quickvint-note-control:hover,
        .quickvint-note-edit:hover,
        #${DESCRIPTION_LENGTH_TOGGLE_ID} .quickvint-length-option[aria-pressed="true"] {
          transform: none;
        }

        #${DESCRIPTION_LENGTH_TOGGLE_ID}[data-loading="true"] .quickvint-length-option::after,
        #${OUTPUT_SHAPE_TOGGLE_ID}[data-loading="true"] .format-chip::after,
        .quickvint-binary-toggle[data-loading="true"] .quickvint-toggle-label::after,
        .quickvint-binary-toggle[data-loading="true"] .quickvint-toggle-switch::after {
          animation: none;
        }
      }

      /* TOAST NOTIFICATION */
      #quickvint-toast {
        position: fixed;
        top: 120px;
        right: 24px;
        transform: translateY(-20px);
        background: #4f46e5; /* Brand Purple */
        color: #ffffff;
        padding: 14px 18px; /* Slightly tighter horizontal padding */
        border-radius: 12px; /* Fixed radius instead of pill */
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
        box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2);
        display: flex;
        align-items: flex-start; /* Align to top in case of multiline */
        gap: 12px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
        min-width: 320px; /* Force minimum width */
        max-width: 450px; /* Don't get too wide */
      }

      #quickvint-toast.error {
        background: #dc2626; /* Red for errors */
        box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.4), 0 8px 10px -6px rgba(220, 38, 38, 0.2);
      }

      #quickvint-toast.info {
        background: #0891b2; /* Cyan for info/tips */
        box-shadow: 0 10px 25px -5px rgba(8, 145, 178, 0.4), 0 8px 10px -6px rgba(8, 145, 178, 0.2);
      }

      #quickvint-toast.success {
        background: #059669; /* Green for success */
        box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.4), 0 8px 10px -6px rgba(5, 150, 105, 0.2);
      }

      #quickvint-toast.paywall {
        background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
        color: #111827;
        border: 1px solid rgba(79, 70, 229, 0.14);
        border-radius: 18px;
        padding: 17px;
        min-width: 390px;
        max-width: 450px;
        gap: 10px;
        box-shadow: 0 26px 80px rgba(17, 24, 39, 0.2), 0 10px 26px rgba(79, 70, 229, 0.14);
        overflow: hidden;
      }

      #quickvint-toast.paywall::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #10b981, #38bdf8, #4f46e5);
        pointer-events: none;
        z-index: 0;
      }

      #quickvint-toast.visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      #quickvint-toast .toast-icon {
        flex-shrink: 0; /* Don't squash icon */
        margin-top: 1px; /* Align slightly with text */
      }

      #quickvint-toast .toast-content {
        flex: 1;
        /* Allow wrapping normally */
      }

      #quickvint-toast.has-actions .toast-content {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      #quickvint-toast .toast-message-text {
        display: block;
      }

      #quickvint-toast .toast-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 7px;
        margin-top: 2px;
      }

      #quickvint-toast .toast-link {
        appearance: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: auto;
        min-width: 190px;
        max-width: 100%;
        min-height: 34px;
        padding: 8px 12px;
        border-radius: 9px;
        border: 1px solid rgba(255, 255, 255, 0.28);
        background: rgba(255, 255, 255, 0.13);
        color: inherit;
        cursor: pointer;
        font: inherit;
        text-decoration: none;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.2;
      }

      #quickvint-toast .toast-link.primary {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.42);
      }

      #quickvint-toast .toast-link:hover {
        background: rgba(255, 255, 255, 0.26);
        text-decoration: none;
      }

      #quickvint-toast .toast-action-button:not(.toast-link) {
        appearance: none;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        margin-left: 12px;
        padding: 0;
        text-decoration: underline;
        white-space: nowrap;
      }

      #quickvint-toast .toast-action-button:not(.toast-link):hover {
        opacity: 0.86;
      }

      #quickvint-toast.paywall .paywall-logo {
        flex: 0 0 auto;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: block;
        background: #ffffff;
        border: 1px solid rgba(79, 70, 229, 0.12);
        box-shadow: 0 6px 14px rgba(17, 24, 39, 0.08);
      }

      #quickvint-toast.paywall .paywall-body {
        position: relative;
        z-index: 1;
        flex: 1;
        min-width: 0;
      }

      #quickvint-toast.paywall .paywall-header {
        display: flex;
        align-items: center;
        gap: 11px;
        margin: 1px 28px 10px 0;
      }

      #quickvint-toast.paywall .paywall-kicker {
        color: #667085;
        font-size: 11px;
        font-weight: 760;
        line-height: 1.1;
        margin-bottom: 3px;
      }

      #quickvint-toast.paywall .paywall-title {
        margin: 0;
        color: #111827;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0;
        line-height: 1.2;
      }

      #quickvint-toast.paywall .paywall-message {
        color: #5b6472;
        font-size: 13px;
        line-height: 1.5;
        margin: 0 0 11px;
      }

      #quickvint-toast.paywall .paywall-options {
        display: grid;
        gap: 9px;
        margin: 2px 0 13px;
      }

      #quickvint-toast.paywall .paywall-option {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 52px;
        padding: 10px 11px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
      }

      #quickvint-toast.paywall .paywall-option:hover:not(:disabled) {
        border-color: #c7d2fe;
        background: #fbfbff;
        box-shadow: 0 7px 18px rgba(79, 70, 229, 0.12);
        transform: translateY(-1px);
      }

      #quickvint-toast.paywall .paywall-option:focus-visible {
        outline: 2px solid rgba(79, 70, 229, 0.45);
        outline-offset: 2px;
      }

      #quickvint-toast.paywall .paywall-option.muted {
        background: #f8fafc;
      }

      #quickvint-toast.paywall .paywall-option:disabled {
        cursor: default;
        opacity: 0.74;
        transform: none;
      }

      #quickvint-toast.paywall .paywall-option[data-checkout-pending="true"] {
        cursor: wait;
        opacity: 0.86;
      }

      #quickvint-toast.paywall .paywall-option-main {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }

      #quickvint-toast.paywall .paywall-option-name {
        color: #111827;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #quickvint-toast.paywall .paywall-option-badge {
        flex: 0 0 auto;
        padding: 3px 6px;
        border-radius: 999px;
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #bbf7d0;
        font-size: 10px;
        font-weight: 850;
        line-height: 1;
        white-space: nowrap;
      }

      #quickvint-toast.paywall .paywall-option-badge.most-popular {
        background: #f4f2ff;
        color: #4f46e5;
        border-color: #ddd6fe;
      }

      #quickvint-toast.paywall .paywall-option-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        text-align: right;
        white-space: nowrap;
      }

      #quickvint-toast.paywall .paywall-option-price {
        color: #111827;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.1;
      }

      #quickvint-toast.paywall .paywall-option-limits {
        color: #667085;
        font-size: 11px;
        font-weight: 720;
        line-height: 1.15;
      }

      #quickvint-toast.paywall .paywall-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 10px;
        background: #111827;
        color: #ffffff;
        border: 0;
        cursor: pointer;
        font-family: inherit;
        text-decoration: none;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 10px 22px rgba(17, 24, 39, 0.18);
      }

      #quickvint-toast.paywall .paywall-action:hover:not(:disabled) {
        background: #1f2937;
      }

      #quickvint-toast.paywall .paywall-action:disabled {
        cursor: wait;
        opacity: 0.78;
      }

      #quickvint-toast.paywall .paywall-secondary-action {
        display: inline-flex;
        justify-content: center;
        width: 100%;
        margin-top: 9px;
        color: #4f46e5;
        text-decoration: none;
        font-size: 12px;
        font-weight: 800;
      }

      #quickvint-toast.paywall .paywall-secondary-action:hover {
        text-decoration: underline;
      }

      #quickvint-toast.paywall .paywall-trust {
        margin-top: 9px;
        color: #778196;
        font-size: 11px;
        font-weight: 650;
        line-height: 1.35;
        text-align: center;
      }

      #quickvint-toast .toast-close {
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.7);
        cursor: pointer;
        font-size: 20px;
        line-height: .8;
        padding: 4px;
        margin: -2px -4px 0 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
        border-radius: 4px;
        width: 24px;
        height: 24px;
      }

      #quickvint-toast .toast-close:hover {
        background: rgba(255,255,255,0.15);
        color: #ffffff;
      }

      #quickvint-toast.paywall .toast-close {
        position: absolute;
        top: 12px;
        right: 12px;
        color: #9ca3af;
        z-index: 2;
      }

      #quickvint-toast.paywall .toast-close:hover {
        background: #f3f4f6;
        color: #111827;
      }

      /* Icons are emojis, but if we use text/svg later, ensure they pop */
      #quickvint-toast.error .toast-icon { text-shadow: 0 0 10px rgba(220, 38, 38, 0.5); }
      #quickvint-toast.success .toast-icon { text-shadow: 0 0 10px rgba(5, 150, 105, 0.5); }
      #quickvint-toast.info .toast-icon { text-shadow: 0 0 10px rgba(8, 145, 178, 0.5); }

      #${BATCH_MODAL_ID} .batch-source-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      #${BATCH_MODAL_ID} .batch-source-panel {
        min-width: 0;
        min-height: 278px;
        padding: 16px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 7px 20px rgba(15, 23, 42, 0.045);
      }

      #${BATCH_MODAL_ID} .batch-source-kicker {
        margin-bottom: 13px;
        color: #64748b;
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #${BATCH_MODAL_ID} .batch-source-phone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      #${BATCH_MODAL_ID} .batch-source-phone.batch-wait-panel {
        display: block;
        min-height: 278px;
        padding: 16px;
      }

      #${BATCH_MODAL_ID} .batch-source-phone .batch-qr {
        display: flex;
        justify-content: center;
        padding: 0;
        border: 0;
        background: transparent;
      }

      #${BATCH_MODAL_ID} .batch-source-phone .batch-qr img,
      #${BATCH_MODAL_ID} .batch-source-phone .batch-qr-placeholder {
        width: 138px;
        height: 138px;
      }

      #${BATCH_MODAL_ID} .batch-source-phone .batch-wait-title {
        margin-top: 11px;
        min-height: 0;
        font-size: 15px;
      }

      #${BATCH_MODAL_ID} .batch-source-phone .batch-wait-copy {
        min-height: 0;
        margin-top: 4px;
        font-size: 11.5px;
      }

      #${BATCH_MODAL_ID} .batch-source-phone.is-computer-locked .batch-qr {
        opacity: 0.22;
        filter: grayscale(1);
      }

      #${BATCH_MODAL_ID} .batch-computer-dropzone {
        display: flex;
        min-height: 168px;
        padding: 18px 14px;
        border: 1.5px dashed #cbd5e1;
        border-radius: 12px;
        background: #f8fafc;
        color: #64748b;
        cursor: pointer;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
      }

      #${BATCH_MODAL_ID} .batch-computer-dropzone:hover,
      #${BATCH_MODAL_ID} .batch-computer-dropzone:focus-within,
      #${BATCH_MODAL_ID} .batch-computer-dropzone.is-dragging {
        border-color: #818cf8;
        background: #f5f7ff;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }

      #${BATCH_MODAL_ID} .batch-source-computer.is-phone-locked .batch-computer-dropzone {
        border-style: solid;
        background: #f8fafc;
        cursor: default;
      }

      #${BATCH_MODAL_ID} .batch-computer-files-input {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      #${BATCH_MODAL_ID} .batch-computer-icon {
        display: inline-flex;
        width: 40px;
        height: 40px;
        margin-bottom: 10px;
        border-radius: 12px;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.2);
      }

      #${BATCH_MODAL_ID} .batch-computer-icon svg {
        width: 21px;
        height: 21px;
      }

      #${BATCH_MODAL_ID} .batch-computer-dropzone strong {
        color: #0f172a;
        font-size: 14px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-computer-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        margin-top: 10px;
      }

      #${BATCH_MODAL_ID} .batch-computer-actions button {
        min-height: 44px;
        padding: 0 13px;
        border: 1px solid #d7dce5;
        border-radius: 9px;
        background: #ffffff;
        color: #334155;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
      }

      #${BATCH_MODAL_ID} .batch-computer-actions .primary {
        border-color: #4f46e5;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 7px 16px rgba(79, 70, 229, 0.18);
      }

      #${BATCH_MODAL_ID} .batch-computer-actions button:hover {
        border-color: #818cf8;
      }

      #${BATCH_MODAL_ID} .batch-computer-actions button:disabled {
        border-color: #e2e8f0;
        background: #f1f5f9;
        color: #94a3b8;
        box-shadow: none;
        cursor: not-allowed;
      }

      #${BATCH_MODAL_ID} .batch-computer-actions button:focus-visible,
      #${BATCH_MODAL_ID} .batch-close:focus-visible,
      #${BATCH_MODAL_ID} .batch-actions button:focus-visible {
        outline: 3px solid rgba(99, 102, 241, 0.26);
        outline-offset: 2px;
      }

      #${BATCH_MODAL_ID} .batch-source-computer.is-uploading .batch-computer-dropzone,
      #${BATCH_MODAL_ID} .batch-source-computer.is-uploading .batch-computer-actions {
        display: none;
      }

      #${BATCH_MODAL_ID} .batch-computer-progress {
        display: flex;
        min-height: 216px;
        padding: 20px;
        border: 1px solid #e0e7ff;
        border-radius: 12px;
        background: linear-gradient(145deg, #fafaff 0%, #f3f4ff 100%);
        color: #64748b;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 11.5px;
      }

      #${BATCH_MODAL_ID} .batch-computer-progress-icon {
        display: inline-flex;
        width: 42px;
        height: 42px;
        margin-bottom: 11px;
        border-radius: 13px;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        align-items: center;
        justify-content: center;
        box-shadow: 0 9px 20px rgba(79, 70, 229, 0.22);
      }

      #${BATCH_MODAL_ID} .batch-computer-progress-icon svg {
        width: 22px;
        height: 22px;
      }

      #${BATCH_MODAL_ID} .batch-computer-progress strong {
        margin-bottom: 3px;
        color: #0f172a;
        font-size: 14px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-computer-progress-track {
        display: block;
        width: min(180px, 100%);
        height: 6px;
        margin-top: 14px;
        border-radius: 999px;
        background: #dfe3f6;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID} .batch-computer-progress-track > span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        transition: width 180ms ease;
      }

      #${BATCH_MODAL_ID} .batch-computer-error {
        margin: 0 0 10px;
        padding: 9px 10px;
        border: 1px solid #fecaca;
        border-radius: 9px;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 11.5px;
        font-weight: 750;
        line-height: 1.35;
        text-align: center;
      }

      #${BATCH_MODAL_ID} .batch-computer-error + .batch-source-kicker {
        margin-top: 2px;
      }

      @media (min-width: 681px) {
        #${BATCH_MODAL_ID} .batch-content,
        #${BATCH_MODAL_ID}.organizing .batch-content,
        #${BATCH_MODAL_ID}.generating .batch-content {
          width: min(620px, calc(100vw - 32px));
          height: min(780px, calc(100dvh - 32px));
          min-height: min(680px, calc(100dvh - 32px));
          max-height: min(780px, calc(100dvh - 32px));
        }

        #${BATCH_MODAL_ID} .batch-body,
        #${BATCH_MODAL_ID}.organizing .batch-body {
          flex: 1 1 auto;
        }

        #${BATCH_MODAL_ID}.organizing .batch-review {
          flex: 1 1 auto;
          max-height: none;
        }

        #${BATCH_MODAL_ID} .batch-source-grid {
          flex: 1 1 auto;
          min-height: 0;
          align-content: safe center;
          align-items: stretch;
          overflow-y: auto;
          scrollbar-gutter: stable;
        }

        #${BATCH_MODAL_ID} .batch-source-panel {
          height: 370px;
          min-height: 370px;
          max-height: 370px;
        }

        #${BATCH_MODAL_ID} .batch-source-phone.batch-wait-panel,
        #${BATCH_MODAL_ID} .batch-source-computer {
          display: flex;
          flex-direction: column;
        }

        #${BATCH_MODAL_ID} .batch-source-phone-content,
        #${BATCH_MODAL_ID} .batch-computer-dropzone,
        #${BATCH_MODAL_ID} .batch-computer-progress {
          flex: 1 1 auto;
          min-height: 0;
        }

        #${BATCH_MODAL_ID} .batch-source-phone-content {
          justify-content: center;
        }
      }

      @media (max-width: 680px) {
        .quickvint-tools {
          width: 100%;
          align-items: stretch;
        }

        .quickvint-primary-tools {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr)) 44px;
          width: 100%;
          gap: 6px;
        }

        #${BTN_ID},
        #${PHONE_BTN_ID} {
          width: 100%;
          min-width: 0;
          min-height: 44px;
          padding: 10px 6px;
        }

        #${REPORT_BTN_ID} {
          width: 44px;
          height: 44px;
          min-width: 44px;
        }

        .quickvint-tool-options {
          justify-content: flex-start;
          gap: 6px;
        }

        #${DESCRIPTION_LENGTH_TOGGLE_ID},
        #${OUTPUT_SHAPE_TOGGLE_ID} {
          height: 50px;
          min-height: 50px;
        }

        #${DESCRIPTION_LENGTH_TOGGLE_ID} .quickvint-length-option,
        #${OUTPUT_SHAPE_TOGGLE_ID} .quickvint-format-option {
          height: 44px;
        }

        .quickvint-binary-toggle {
          height: 44px;
          min-height: 44px;
        }

        .quickvint-note-control {
          height: 46px;
          min-height: 46px;
        }

        .quickvint-note-control .quickvint-binary-toggle,
        .quickvint-note-edit {
          height: 44px;
          min-height: 44px;
        }

        .quickvint-lang-trigger,
        .quickvint-lang-option {
          min-height: 44px;
        }

        .quickvint-lang-trigger {
          min-width: 44px;
          justify-content: center;
        }

        .quickvint-lang-menu {
          max-width: calc(100vw - 16px);
          max-height: min(240px, calc(100dvh - 16px));
        }

        #${REPORT_MODAL_ID},
        #${DESCRIPTION_FOOTER_MODAL_ID},
        #${MODAL_ID},
        #${BATCH_MODAL_ID} {
          box-sizing: border-box;
          top: max(12px, env(safe-area-inset-top));
          bottom: 0;
          height: auto;
          align-items: flex-end;
          padding: 0;
        }

        #${REPORT_MODAL_ID} .quickvint-report-card,
        #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-card,
        #${MODAL_ID} .modal-content,
        #${BATCH_MODAL_ID} .batch-content {
          box-sizing: border-box;
          width: 100%;
          max-width: none;
          max-height: 100%;
          margin: 0;
          border-radius: 18px 18px 0 0;
        }

        #${REPORT_MODAL_ID} .quickvint-report-card,
        #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-card,
        #${MODAL_ID} .modal-content {
          overflow-y: auto;
          padding: 20px 18px max(18px, env(safe-area-inset-bottom));
        }

        #${REPORT_MODAL_ID} .quickvint-report-close,
        #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-close,
        #${MODAL_ID} .close-x,
        #${BATCH_MODAL_ID} .batch-close {
          width: 44px;
          height: 44px;
          min-width: 44px;
        }

        #${REPORT_MODAL_ID} .quickvint-report-select {
          height: 44px;
        }

        #${REPORT_MODAL_ID} .quickvint-report-secondary,
        #${REPORT_MODAL_ID} .quickvint-report-submit,
        #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-secondary,
        #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-clear,
        #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-save,
        #${MODAL_ID} .close-btn,
        #${MODAL_ID} .generate-btn,
        #${BATCH_MODAL_ID} .batch-actions button,
        #${BATCH_MODAL_ID} .batch-inline-actions button {
          min-height: 44px;
          height: auto;
        }

        #${REPORT_MODAL_ID} .quickvint-report-actions,
        #${DESCRIPTION_FOOTER_MODAL_ID} .quickvint-footer-actions,
        #${MODAL_ID} .modal-buttons {
          position: sticky;
          bottom: 0;
          z-index: 2;
          padding-top: 12px;
          background: #ffffff;
        }

        #${MODAL_ID} .modal-content {
          text-align: center;
        }

        #${MODAL_ID} .subtitle {
          margin-bottom: 20px;
        }

        #${MODAL_ID} .qr-container {
          margin-bottom: 16px;
        }

        #${MODAL_ID} #qr-code {
          width: min(180px, 48vw);
          height: min(180px, 48vw);
        }

        #${MODAL_ID} .modal-buttons {
          margin-top: 20px;
        }

        #${BATCH_MODAL_ID} .batch-content {
          height: 100%;
          min-height: 100%;
          border-radius: 18px 18px 0 0;
        }

        #${BATCH_MODAL_ID}.organizing .batch-content,
        #${BATCH_MODAL_ID}.generating .batch-content {
          height: 100%;
          min-height: 100%;
          max-height: 100%;
        }

        #${BATCH_MODAL_ID} .batch-body,
        #${BATCH_MODAL_ID}.organizing .batch-body {
          flex: 1 1 auto;
        }

        #${BATCH_MODAL_ID}.organizing .batch-review {
          flex: 1 1 auto;
          max-height: none;
        }

        #${BATCH_MODAL_ID}.organizing .organize-status-row {
          gap: 6px;
        }

        #${BATCH_MODAL_ID}.organizing .organize-jump-to-photos,
        #${BATCH_MODAL_ID}.organizing .organize-jump-to-groups {
          min-height: 44px;
        }

        #${BATCH_MODAL_ID} .batch-actions {
          margin-right: -14px;
          margin-left: -14px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }

        #${BATCH_MODAL_ID}.organizing .batch-actions {
          padding-bottom: max(18px, env(safe-area-inset-bottom));
        }

        #${BATCH_MODAL_ID}.generating .batch-actions {
          padding-bottom: max(20px, env(safe-area-inset-bottom));
        }

        #${BATCH_MODAL_ID} .batch-source-grid {
          flex: 1 1 auto;
          min-height: 0;
          grid-template-columns: 1fr;
          gap: 9px;
          align-content: start;
          overflow-y: auto;
        }

        #${BATCH_MODAL_ID} .batch-source-panel,
        #${BATCH_MODAL_ID} .batch-source-phone.batch-wait-panel {
          min-height: 0;
          padding: 12px;
        }

        #${BATCH_MODAL_ID} .batch-source-kicker {
          margin-bottom: 9px;
        }

        #${BATCH_MODAL_ID} .batch-source-phone-content {
          flex-direction: row;
          gap: 14px;
          text-align: left;
        }

        #${BATCH_MODAL_ID} .batch-source-phone .batch-qr img,
        #${BATCH_MODAL_ID} .batch-source-phone .batch-qr-placeholder {
          width: 104px;
          height: 104px;
        }

        #${BATCH_MODAL_ID} .batch-source-phone .batch-wait-title {
          margin-top: 0;
        }

        #${BATCH_MODAL_ID} .batch-computer-dropzone {
          min-height: 116px;
          padding: 12px;
        }

        #${BATCH_MODAL_ID} .batch-computer-icon {
          width: 34px;
          height: 34px;
          margin-bottom: 7px;
          border-radius: 10px;
        }

        #${BATCH_MODAL_ID} .batch-computer-actions button {
          min-height: 44px;
        }

        #${BATCH_MODAL_ID} .batch-computer-progress {
          min-height: 184px;
        }
      }

      @media (max-width: 520px) {
        #quickvint-toast {
          top: max(16px, env(safe-area-inset-top));
          right: 12px;
          left: 12px;
          min-width: 0;
          max-width: none;
        }

        #quickvint-toast.paywall {
          min-width: 0;
          max-width: none;
        }

        #quickvint-toast.paywall .paywall-option {
          grid-template-columns: 1fr;
          gap: 5px;
        }

        #quickvint-toast.paywall .paywall-option-side {
          align-items: flex-start;
          text-align: left;
        }
      }

      .quickvint-wardrobe-rewrite-host,
      .quickvint-wardrobe-rewrite-host * {
        box-sizing: border-box;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} {
        position: relative;
        width: 100%;
        height: 176px;
        overflow: hidden;
        border: 1px solid #dfe1ff;
        border-radius: 16px;
        background:
          radial-gradient(circle at 94% 16%, rgba(45, 212, 191, .19), transparent 34%),
          linear-gradient(135deg, #fff 30%, #f4f3ff 100%);
        box-shadow: 0 14px 34px rgba(55, 48, 163, .10);
        color: #19164d;
        isolation: isolate;
      }

      #${WARDROBE_REWRITE_WIDGET_ID}.is-animating {
        pointer-events: none;
      }

      #${WARDROBE_REWRITE_WIDGET_ID}.quickvint-wardrobe-rewrite-pending {
        visibility: hidden;
      }

      #${WARDROBE_REWRITE_WIDGET_ID}::before {
        position: absolute;
        right: -32px;
        bottom: -54px;
        z-index: -1;
        width: 190px;
        height: 190px;
        border-radius: 50%;
        background: rgba(79, 70, 229, .08);
        content: "";
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-expanded {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        padding: 19px 166px 18px 21px;
        opacity: 1;
        visibility: visible;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-brand {
        margin: 0;
        color: #4f46e5;
        font-size: 10px;
        font-weight: 850;
        letter-spacing: .09em;
        line-height: 1.2;
        text-transform: uppercase;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} h2 {
        max-width: 280px;
        margin: 4px 0 5px;
        color: #19164d;
        font-size: 21px;
        font-weight: 700;
        line-height: 1.08;
        letter-spacing: -.025em;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-copy {
        max-width: 245px;
        margin: 0 0 10px;
        color: #686783;
        font-size: 12px;
        line-height: 1.35;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} button {
        font: inherit;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-cta {
        height: 33px;
        padding: 0 13px;
        border: 0;
        border-radius: 9px;
        background: #4f46e5;
        box-shadow: 0 7px 16px rgba(79, 70, 229, .22);
        color: #fff;
        cursor: default;
        font-size: 12px;
        font-weight: 760;
        opacity: .88;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-character {
        position: absolute;
        right: -3px;
        bottom: -9px;
        width: 169px;
        height: auto;
        filter: drop-shadow(0 12px 12px rgba(30, 41, 59, .15));
        pointer-events: none;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-minimize {
        position: absolute;
        top: 7px;
        right: 7px;
        z-index: 3;
        display: grid;
        width: 40px;
        height: 40px;
        padding: 0;
        place-items: center;
        border: 1px solid #c7c5ff;
        border-radius: 50%;
        background: #fff;
        color: #3730a3;
        box-shadow: 0 5px 14px rgba(49, 46, 129, .18);
        cursor: pointer;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-minimize svg {
        width: 19px;
        height: 19px;
        stroke: currentColor;
        stroke-width: 2.25;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-minimize:hover,
      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-minimize:focus-visible {
        background: #fff;
        color: #312e81;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-minimize:focus-visible,
      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-compact:focus-visible {
        outline: 3px solid rgba(79, 70, 229, .3);
        outline-offset: 2px;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-compact {
        position: absolute;
        inset: 0;
        display: flex;
        width: 100%;
        height: 100%;
        align-items: center;
        gap: 8px;
        padding: 4px 10px 4px 5px;
        border: 0;
        background: transparent;
        color: #312e81;
        cursor: pointer;
        font-size: 13px;
        font-weight: 750;
        opacity: 0;
        visibility: hidden;
        white-space: nowrap;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-compact img {
        width: 42px;
        height: 42px;
        object-fit: contain;
      }

      #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-chevron {
        margin-left: auto;
        font-size: 17px;
        line-height: 1;
      }

      #${WARDROBE_REWRITE_WIDGET_ID}.is-collapsed {
        width: 196px;
        height: 50px;
        border-radius: 999px;
        box-shadow: 0 8px 22px rgba(55, 48, 163, .10);
      }

      #${WARDROBE_REWRITE_WIDGET_ID}.is-collapsed::before {
        display: none;
      }

      #${WARDROBE_REWRITE_WIDGET_ID}.is-collapsed .quickvint-wardrobe-rewrite-expanded {
        opacity: 0;
        visibility: hidden;
      }

      #${WARDROBE_REWRITE_WIDGET_ID}.is-collapsed .quickvint-wardrobe-rewrite-compact {
        opacity: 1;
        visibility: visible;
      }

      #${WARDROBE_REWRITE_WIDGET_ID}.is-animating .quickvint-wardrobe-rewrite-expanded,
      #${WARDROBE_REWRITE_WIDGET_ID}.is-animating .quickvint-wardrobe-rewrite-compact {
        visibility: visible;
      }

      @media (min-width: 1101px) {
        .quickvint-wardrobe-rewrite-host {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
          gap: 20px;
          align-items: start;
        }

        .quickvint-wardrobe-rewrite-host:has(#${WARDROBE_REWRITE_WIDGET_ID}.is-collapsed) {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .quickvint-wardrobe-rewrite-host > .web_ui__Cell__content {
          min-width: 0;
        }
      }

      @media (max-width: 1100px) {
        .quickvint-wardrobe-rewrite-host {
          display: block !important;
        }

        #${WARDROBE_REWRITE_WIDGET_ID} {
          max-width: 520px;
          margin: 16px 0 0 auto;
        }
      }

      @media (max-width: 640px) {
        #${WARDROBE_REWRITE_WIDGET_ID}:not(.is-collapsed) {
          height: 148px;
          border-radius: 14px;
        }

        #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-expanded {
          padding: 17px 104px 15px 17px;
        }

        #${WARDROBE_REWRITE_WIDGET_ID} h2 {
          max-width: 230px;
          margin-top: 3px;
          font-size: 19px;
        }

        #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-copy {
          display: none;
        }

        #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-cta {
          height: 32px;
          margin-top: 10px;
          padding: 0 11px;
          font-size: 11px;
        }

        #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-character {
          right: -10px;
          bottom: -5px;
          width: 118px;
        }

        #${WARDROBE_REWRITE_WIDGET_ID} .quickvint-wardrobe-rewrite-minimize {
          top: 4px;
          right: 4px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${WARDROBE_REWRITE_WIDGET_ID},
        #${WARDROBE_REWRITE_WIDGET_ID} * {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.className = "quickvint-generation-action";
    btn.innerHTML = `
        <span class="icon">${WAND_ICON_SVG}</span>
        ${mirageLoaderSvg("quickvint-mirage-main")}
        <span class="label">Generate</span>
    `;
    btn.addEventListener("click", onGenerateClick);
    return btn;
  }

  function isListingEditPage() {
    return /\/items\/[^/]+\/edit\/?$/i.test(window.location.pathname || "");
  }

  function shouldUseCurrentListingBatchNote() {
    return isListingEditPage() || getVisibleUploadedPhotoCount() > 0;
  }

  function closeUploadChoiceModal() {
    const modal = document.getElementById(UPLOAD_CHOICE_MODAL_ID);
    if (!modal) return;
    if (modal.__quickvintHandleKeyDown) {
      document.removeEventListener("keydown", modal.__quickvintHandleKeyDown);
    }
    modal.remove();
  }

  async function openUploadChoiceModal() {
    if (!isAuthenticated) {
      showToast("Please sign in via the extension popup first.", "error");
      return;
    }

    closeUploadChoiceModal();
    const restorePhoneButton = setActionButtonLoading(phoneBtn, "Checking...");
    let capacity;
    try {
      capacity = await fetchBatchGenerationCapacity();
    } catch (err) {
      capacity = {
        allowed: false,
        available: 0,
        message: "Could not check how many listings are available.",
      };
    } finally {
      restorePhoneButton();
    }

    const available = Math.max(0, Math.floor(Number(capacity.available || 0)));
    if (!capacity.allowed || available <= 0) {
      await showBatchCapacityBlocked(capacity);
      return;
    }

    const copy = await resolveUploadChoiceCopy();
    const usesCurrentListingNote = shouldUseCurrentListingBatchNote();
    const multipleNote = usesCurrentListingNote
      ? copy.multipleCurrentListingNote
      : copy.multipleNote;
    const singleAssetUrl = chrome.runtime.getURL("images/quickvint-upload-single.jpg");
    const multipleAssetUrl = chrome.runtime.getURL("images/quickvint-upload-multiple.jpg");
    const modal = document.createElement("div");
    modal.id = UPLOAD_CHOICE_MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "quickvint-upload-choice-title");
    modal.innerHTML = `
      <div class="quickvint-upload-choice-card">
        <div class="quickvint-upload-choice-head">
          <h2 id="quickvint-upload-choice-title" class="quickvint-upload-choice-title">${escapeHtml(copy.title)}</h2>
          <p class="quickvint-upload-choice-capacity">${available} listing${available === 1 ? "" : "s"} available</p>
          <button type="button" class="quickvint-upload-choice-close" aria-label="${escapeHtml(copy.close)}">&times;</button>
        </div>
        <div class="quickvint-upload-choice-options">
          <button type="button" class="quickvint-upload-choice-option quickvint-upload-choice-single">
            <span class="quickvint-upload-choice-art" aria-hidden="true">
              <img src="${escapeHtml(singleAssetUrl)}" alt="" />
            </span>
            <span class="quickvint-upload-choice-copy">
              <span class="quickvint-upload-choice-label">${escapeHtml(copy.singleLabel)}</span>
              <span class="quickvint-upload-choice-note">${escapeHtml(copy.singleNote)}</span>
            </span>
            <span class="quickvint-upload-choice-arrow" aria-hidden="true">&rsaquo;</span>
          </button>
          <button type="button" class="quickvint-upload-choice-option quickvint-upload-choice-multiple">
            <span class="quickvint-upload-choice-art" aria-hidden="true">
              <img src="${escapeHtml(multipleAssetUrl)}" alt="" />
            </span>
            <span class="quickvint-upload-choice-copy">
              <span class="quickvint-upload-choice-label">${escapeHtml(copy.multipleLabel)}</span>
              <span class="quickvint-upload-choice-note">${escapeHtml(multipleNote)}</span>
            </span>
            <span class="quickvint-upload-choice-arrow" aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
      </div>
    `;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeUploadChoiceModal();
    };
    modal.__quickvintHandleKeyDown = handleKeyDown;
    document.addEventListener("keydown", handleKeyDown);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeUploadChoiceModal();
    });
    modal
      .querySelector(".quickvint-upload-choice-close")
      ?.addEventListener("click", closeUploadChoiceModal);
    modal
      .querySelector(".quickvint-upload-choice-single")
      ?.addEventListener("click", async () => {
        closeUploadChoiceModal();
        trackGrowthEvent("phone_upload_choice_select", {
          mode: "single",
          listingHasPhotos: getVisibleUploadedPhotoCount() > 0,
          isEditPage: isListingEditPage(),
        });
        await onPhoneUploadClick(capacity);
      });
    modal
      .querySelector(".quickvint-upload-choice-multiple")
      ?.addEventListener("click", async () => {
        closeUploadChoiceModal();
        trackGrowthEvent("phone_upload_choice_select", {
          mode: "batch",
          listingHasPhotos: getVisibleUploadedPhotoCount() > 0,
          isEditPage: isListingEditPage(),
        });
        await onBatchUploadClick(capacity);
      });

    document.body.appendChild(modal);
  }

  function createPhoneButton() {
    const btn = document.createElement("button");
    btn.id = PHONE_BTN_ID;
    btn.disabled = true;
    btn.innerHTML = `
        <span class="icon">${PHONE_ICON_SVG}</span>
        <span class="label">Phone</span>
        <span class="quickvint-phone-new-badge" aria-hidden="true">NEW</span>
    `;
    btn.addEventListener("click", openUploadChoiceModal);
    return btn;
  }

  function createReportButton() {
    const btn = document.createElement("button");
    btn.id = REPORT_BTN_ID;
    btn.type = "button";
    btn.title = "Report an issue or send feedback";
    btn.setAttribute("aria-label", "Report an issue or send feedback");
    btn.innerHTML = `<span class="icon">${REPORT_ICON_SVG}</span>`;
    btn.addEventListener("click", openReportModal);
    return btn;
  }

  function getOrCreateReportModal() {
    let modal = document.getElementById(REPORT_MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = REPORT_MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "quickvint-report-title");
    modal.innerHTML = `
      <div class="quickvint-report-card">
        <div class="quickvint-report-head">
          <div>
            <h2 id="quickvint-report-title" class="quickvint-report-title">Report an issue</h2>
            <p class="quickvint-report-copy">Tell me what went wrong or what should improve. 🎁 Helpful reports have a chance to get <strong>up to 10 free extra listings</strong>.</p>
          </div>
          <button type="button" class="quickvint-report-close" aria-label="Close report form">&times;</button>
        </div>

        <label class="quickvint-report-label" for="quickvint-report-category">What is it about?</label>
        <select id="quickvint-report-category" class="quickvint-report-select">
          <option value="result_quality">Generated result</option>
          <option value="tool_bug">Tool bug</option>
          <option value="billing_account">Billing or account</option>
          <option value="idea">Idea or improvement</option>
          <option value="other">Other</option>
        </select>

        <label class="quickvint-report-label" for="quickvint-report-message">Short note</label>
        <textarea id="quickvint-report-message" class="quickvint-report-textarea" placeholder="What happened?"></textarea>

        <div class="quickvint-report-actions">
          <button type="button" class="quickvint-report-secondary">Cancel</button>
          <button type="button" class="quickvint-report-submit">Send report</button>
        </div>
      </div>
    `;

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeReportModal();
    });
    modal
      .querySelector(".quickvint-report-close")
      ?.addEventListener("click", closeReportModal);
    modal
      .querySelector(".quickvint-report-secondary")
      ?.addEventListener("click", closeReportModal);
    modal
      .querySelector(".quickvint-report-submit")
      ?.addEventListener("click", submitReportFeedback);

    document.body.appendChild(modal);
    return modal;
  }

  function openReportModal(options = {}) {
    const modal = getOrCreateReportModal();
    modal.classList.add("visible");
    const categorySelect = modal.querySelector(".quickvint-report-select");
    if (categorySelect && options.category) {
      categorySelect.value = options.category;
    }
    const textarea = modal.querySelector(".quickvint-report-textarea");
    if (textarea) {
      textarea.value = "";
      if (options.placeholder) {
        textarea.placeholder = options.placeholder;
      } else {
        textarea.placeholder = "What happened?";
      }
      setTimeout(() => textarea.focus(), 0);
    }
    trackGrowthEvent("listing_report_opened", {
      source: options.source || "listing_tools",
      path: window.location.pathname,
    });
  }

  function closeReportModal() {
    document.getElementById(REPORT_MODAL_ID)?.classList.remove("visible");
  }

  async function submitReportFeedback() {
    const modal = document.getElementById(REPORT_MODAL_ID);
    if (!modal) return;
    const category = modal.querySelector(".quickvint-report-select")?.value || "other";
    const message = modal.querySelector(".quickvint-report-textarea")?.value?.trim() || "";
    const submitButton = modal.querySelector(".quickvint-report-submit");

    if (message.length < 4) {
      showToast("Add a few words so I can understand the report.", "info");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    const titleInput = document.querySelector(SELECTORS.title);
    const descriptionInput = document.querySelector(SELECTORS.description);

    try {
      await sendImmediateGrowthEvent("listing_report_submitted", {
        source: "listing_tools",
        category,
        message,
        path: window.location.pathname,
        titleValue: titleInput?.value?.slice(0, 160) || "",
        descriptionLength: descriptionInput?.value?.length || 0,
        visiblePhotoCount: getVisibleUploadedPhotoCount(),
      });
      closeReportModal();
      showToast("Thanks - report sent.", "success");
    } catch (error) {
      showToast("Could not send the report. Please try again.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send report";
      }
    }
  }

  function updateDescriptionFooterModalState(modal, { allowed, text, status = "" }) {
    const copy = modal.__descriptionFooterCopy || DESCRIPTION_FOOTER_COPY.en;
    const textarea = modal.querySelector(".quickvint-footer-textarea");
    const counter = modal.querySelector(".quickvint-footer-count");
    const statusEl = modal.querySelector(".quickvint-footer-status");
    const saveButton = modal.querySelector(".quickvint-footer-save");
    const clearButton = modal.querySelector(".quickvint-footer-clear");
    const currentText = typeof text === "string" ? text : textarea?.value || "";
    const validation = validateDescriptionFooterText(currentText);

    if (textarea) {
      textarea.disabled = !allowed;
      textarea.maxLength = DESCRIPTION_FOOTER_MAX_LENGTH;
    }
    if (counter) {
      counter.textContent = `${currentText.length}/${DESCRIPTION_FOOTER_MAX_LENGTH}`;
    }
    if (statusEl) {
      const message = !allowed
        ? copy.locked
        : validation.ok
          ? status
          : validation.error;
      statusEl.textContent = message;
      statusEl.dataset.state = validation.ok || !allowed ? "default" : "error";
    }
    if (saveButton) {
      saveButton.disabled = !allowed || !validation.ok;
    }
    if (clearButton) {
      clearButton.disabled = !allowed || currentText.length === 0;
    }
  }

  function getOrCreateDescriptionFooterModal() {
    let modal = document.getElementById(DESCRIPTION_FOOTER_MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = DESCRIPTION_FOOTER_MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "quickvint-footer-title");
    modal.innerHTML = `
      <div class="quickvint-footer-card">
        <div class="quickvint-footer-head">
          <div>
            <h2 id="quickvint-footer-title" class="quickvint-footer-title">Saved note</h2>
            <ul class="quickvint-footer-copy">
              <li></li>
              <li></li>
              <li></li>
            </ul>
          </div>
          <button type="button" class="quickvint-footer-close" aria-label="Close saved note form">&times;</button>
        </div>

        <label class="quickvint-footer-label" for="quickvint-footer-text">Description note</label>
        <textarea id="quickvint-footer-text" class="quickvint-footer-textarea" placeholder="Smoke-free home. Happy to bundle items."></textarea>
        <div class="quickvint-footer-meta">
          <span class="quickvint-footer-status"></span>
          <span class="quickvint-footer-count">0/${DESCRIPTION_FOOTER_MAX_LENGTH}</span>
        </div>

        <div class="quickvint-footer-actions">
          <button type="button" class="quickvint-footer-clear">Clear</button>
          <button type="button" class="quickvint-footer-secondary">Cancel</button>
          <button type="button" class="quickvint-footer-save">Save</button>
        </div>
      </div>
    `;

    const close = () => closeDescriptionFooterModal();
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    modal.querySelector(".quickvint-footer-close")?.addEventListener("click", close);
    modal
      .querySelector(".quickvint-footer-secondary")
      ?.addEventListener("click", close);
    modal
      .querySelector(".quickvint-footer-save")
      ?.addEventListener("click", saveDescriptionFooterFromModal);
    modal
      .querySelector(".quickvint-footer-clear")
      ?.addEventListener("click", clearDescriptionFooterFromModal);
    modal
      .querySelector(".quickvint-footer-textarea")
      ?.addEventListener("input", () => {
        const textarea = modal.querySelector(".quickvint-footer-textarea");
        const allowed = modal.dataset.allowed === "true";
        updateDescriptionFooterModalState(modal, {
          allowed,
          text: textarea?.value || "",
        });
      });

    document.body.appendChild(modal);
    return modal;
  }

  function applyDescriptionFooterModalCopy(modal, copy) {
    modal.__descriptionFooterCopy = copy;
    const title = modal.querySelector(".quickvint-footer-title");
    const label = modal.querySelector(".quickvint-footer-label");
    const textarea = modal.querySelector(".quickvint-footer-textarea");
    const closeButton = modal.querySelector(".quickvint-footer-close");
    const clearButton = modal.querySelector(".quickvint-footer-clear");
    const cancelButton = modal.querySelector(".quickvint-footer-secondary");
    const saveButton = modal.querySelector(".quickvint-footer-save");

    if (title) title.textContent = copy.title;
    if (label) label.textContent = copy.label;
    if (textarea) textarea.placeholder = copy.placeholder;
    if (closeButton) closeButton.setAttribute("aria-label", copy.close);
    if (clearButton) clearButton.textContent = copy.clear;
    if (cancelButton) cancelButton.textContent = copy.cancel;
    if (saveButton) saveButton.textContent = copy.save;

    modal.querySelectorAll(".quickvint-footer-copy li").forEach((item, index) => {
      item.textContent = copy.bullets[index] || "";
    });
  }

  async function openDescriptionFooterModal() {
    const modal = getOrCreateDescriptionFooterModal();
    const storage =
      await new Promise((resolve) => {
        chrome.storage.local.get(
          {
            [DESCRIPTION_FOOTER_STORAGE_KEY]: "",
            userProfile: null,
            selectedLanguage: null,
            selectedTitleLanguage: null,
            selectedDescriptionLanguage: null,
            [LANGUAGE_PREFERENCE_TOUCHED_KEY]: false,
          },
          (result) => resolve(result),
        );
      });
    const {
      [DESCRIPTION_FOOTER_STORAGE_KEY]: storedText = "",
      userProfile = null,
    } = storage;
    const languageProfile = resolveLanguageProfile(storage);
    const copy = getDescriptionFooterCopy(languageProfile.uiLanguageCode);
    const allowed = canUseDescriptionFooterSetting(userProfile);
    const text = typeof storedText === "string" ? storedText : "";
    const textarea = modal.querySelector(".quickvint-footer-textarea");

    applyDescriptionFooterModalCopy(modal, copy);
    modal.dataset.allowed = allowed ? "true" : "false";
    modal.dataset.hadText = /\S/.test(text) ? "true" : "false";
    if (textarea) {
      textarea.value = text;
    }
    updateDescriptionFooterModalState(modal, { allowed, text });
    modal.classList.add("visible");
    if (allowed) {
      setTimeout(() => textarea?.focus(), 0);
    }
    trackGrowthEvent("description_footer_opened", {
      source: "listing_tools",
      allowed,
      languageCode: languageProfile.uiLanguageCode,
      hasDescriptionFooter: /\S/.test(text),
      descriptionFooterLength: text.length,
    });
  }

  function closeDescriptionFooterModal() {
    document
      .getElementById(DESCRIPTION_FOOTER_MODAL_ID)
      ?.classList.remove("visible");
  }

  async function saveDescriptionFooterFromModal() {
    const modal = document.getElementById(DESCRIPTION_FOOTER_MODAL_ID);
    if (!modal || modal.dataset.allowed !== "true") return;
    const copy = modal.__descriptionFooterCopy || DESCRIPTION_FOOTER_COPY.en;
    const textarea = modal.querySelector(".quickvint-footer-textarea");
    const text = textarea?.value || "";
    const validation = validateDescriptionFooterText(text);

    if (!validation.ok) {
      updateDescriptionFooterModalState(modal, {
        allowed: true,
        text,
      });
      return;
    }

    await chrome.storage.local.set({
      [DESCRIPTION_FOOTER_STORAGE_KEY]: validation.text,
    });
    ensureDescriptionFooterListingState();
    if (/\S/.test(validation.text) && modal.dataset.hadText !== "true") {
      descriptionFooterIncludeForListing = true;
    }
    syncDescriptionFooterButtonState();
    closeDescriptionFooterModal();
    showToast(
      /\S/.test(validation.text) ? copy.saved : copy.cleared,
      "success",
    );
    trackGrowthEvent("description_footer_saved", {
      source: "listing_tools",
      hasDescriptionFooter: /\S/.test(validation.text),
      descriptionFooterLength: validation.text.length,
    });
  }

  async function clearDescriptionFooterFromModal() {
    const modal = document.getElementById(DESCRIPTION_FOOTER_MODAL_ID);
    if (!modal || modal.dataset.allowed !== "true") return;
    const textarea = modal.querySelector(".quickvint-footer-textarea");
    if (textarea) textarea.value = "";
    await chrome.storage.local.set({ [DESCRIPTION_FOOTER_STORAGE_KEY]: "" });
    ensureDescriptionFooterListingState();
    descriptionFooterIncludeForListing = DESCRIPTION_FOOTER_INCLUDE_DEFAULT;
    modal.dataset.hadText = "false";
    updateDescriptionFooterModalState(modal, {
      allowed: true,
      text: "",
      status: "Cleared.",
    });
    syncDescriptionFooterButtonState();
    trackGrowthEvent("description_footer_cleared", {
      source: "listing_tools",
    });
  }

  function normalizeDescriptionLength(value) {
    return value === "short" ? "short" : "long";
  }

  function setPreferenceLoadingState(control, isLoading) {
    if (!control) return;
    control.dataset.loading = isLoading ? "true" : "false";
    control.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  function setDescriptionLengthLoadingState(isLoading) {
    if (!descriptionLengthToggle) return;
    setPreferenceLoadingState(descriptionLengthToggle, isLoading);
    descriptionLengthToggle
      .querySelectorAll(".quickvint-length-option")
      .forEach((option) => {
        option.disabled = isLoading;
        if (isLoading) {
          option.setAttribute("aria-pressed", "false");
        }
      });
  }

  function setBinaryToggleLoadingState(button, isLoading) {
    if (!button) return;
    setPreferenceLoadingState(button, isLoading);
    button.disabled = isLoading;
    if (isLoading) {
      button.setAttribute("aria-pressed", "mixed");
    }
  }

  function setDescriptionLengthToggleState(value) {
    if (!descriptionLengthToggle) return;
    const normalizedValue = normalizeDescriptionLength(value);
    setDescriptionLengthLoadingState(false);
    descriptionLengthToggle.dataset.value = normalizedValue;
    descriptionLengthToggle
      .querySelectorAll(".quickvint-length-option")
      .forEach((option) => {
        option.disabled = false;
        option.setAttribute(
          "aria-pressed",
          option.dataset.length === normalizedValue ? "true" : "false",
        );
      });
  }

  async function getStoredDescriptionLength() {
    const storage = await chrome.storage.local.get({
      [DESCRIPTION_LENGTH_STORAGE_KEY]: "long",
    });
    return normalizeDescriptionLength(storage[DESCRIPTION_LENGTH_STORAGE_KEY]);
  }

  async function syncDescriptionLengthToggleState() {
    if (!descriptionLengthToggle || extensionContextInvalidated) return;
    if (descriptionLengthToggle.dataset.loading !== "false") {
      setDescriptionLengthLoadingState(true);
    }
    try {
      setDescriptionLengthToggleState(await getStoredDescriptionLength());
    } catch (error) {
      if (handleExtensionContextInvalidated(error)) return;
      console.warn("AutoLister AI: failed to load description length", error);
      setDescriptionLengthToggleState("long");
    }
  }

  function createDescriptionLengthToggle() {
    const group = document.createElement("div");
    group.id = DESCRIPTION_LENGTH_TOGGLE_ID;
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Description length");
    group.setAttribute("aria-busy", "true");
    group.dataset.loading = "true";
    group.title = "Description length";
    group.innerHTML = `
      <button type="button" class="quickvint-length-option" data-length="short" aria-pressed="false" disabled>Short</button>
      <button type="button" class="quickvint-length-option" data-length="long" aria-pressed="false" disabled>Long</button>
    `;

    group.addEventListener("click", async (event) => {
      if (group.dataset.loading === "true") return;
      const option =
        event.target instanceof Element
          ? event.target.closest(".quickvint-length-option")
          : null;
      if (!option || option.disabled) return;
      const descriptionLength = normalizeDescriptionLength(option.dataset.length);
      await chrome.storage.local.set({
        [DESCRIPTION_LENGTH_STORAGE_KEY]: descriptionLength,
      });
      setDescriptionLengthToggleState(descriptionLength);
      trackGrowthEvent("description_length_changed", {
        source: "listing_tools",
        descriptionLength,
      });
    });

    syncDescriptionLengthToggleState();
    startDescriptionLengthToggleSync();
    return group;
  }

  function startDescriptionLengthToggleSync() {
    if (descriptionLengthSyncTimer) return;
    descriptionLengthSyncTimer = window.setInterval(() => {
      if (
        extensionContextInvalidated ||
        !descriptionLengthToggle ||
        !document.body.contains(descriptionLengthToggle)
      ) {
        window.clearInterval(descriptionLengthSyncTimer);
        descriptionLengthSyncTimer = null;
        return;
      }
      syncDescriptionLengthToggleState();
    }, 1000);
  }

  function setEmojiToggleState(enabled) {
    if (!emojiToggleBtn) return;
    setPreferenceLoadingState(emojiToggleBtn, false);
    emojiToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  }

  function setHashtagsToggleState(enabled) {
    if (!hashtagsToggleBtn) return;
    setPreferenceLoadingState(hashtagsToggleBtn, false);
    hashtagsToggleBtn.disabled = false;
    hashtagsToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    hashtagsToggleBtn.title = enabled
      ? "Hashtags are on for generated descriptions"
      : "Hashtags are off for generated descriptions";
  }

  async function syncHashtagsToggleState() {
    if (!hashtagsToggleBtn || extensionContextInvalidated) return;
    if (hashtagsToggleBtn.dataset.loading !== "false") {
      setBinaryToggleLoadingState(hashtagsToggleBtn, true);
    }
    try {
      const storage = await chrome.storage.local.get({
        [HASHTAGS_STORAGE_KEY]: true,
      });
      setHashtagsToggleState(storage[HASHTAGS_STORAGE_KEY] !== false);
    } catch (error) {
      if (handleExtensionContextInvalidated(error)) return;
      console.warn("AutoLister AI: failed to load hashtag setting", error);
      setHashtagsToggleState(true);
    }
  }

  function createBinaryToggleMarkup(label) {
    return `
      <span class="quickvint-toggle-label">${label}</span>
      <span class="quickvint-toggle-switch" aria-hidden="true">
        <span class="quickvint-toggle-knob"></span>
      </span>
    `;
  }

  function setOutputShapeToggleState(useBulletPoints) {
    if (!outputShapeToggleBtn) return;
    setPreferenceLoadingState(outputShapeToggleBtn, false);
    outputShapeToggleBtn.dataset.value = useBulletPoints ? "bullets" : "paragraphs";
    outputShapeToggleBtn
      .querySelectorAll(".quickvint-format-option")
      .forEach((option) => {
        const selected =
          option.dataset.format === (useBulletPoints ? "bullets" : "paragraphs");
        option.disabled = false;
        option.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    outputShapeToggleBtn.title = useBulletPoints
      ? "Generated descriptions use bullet points"
      : "Generated descriptions use paragraphs";
  }

  async function syncOutputShapeToggleState() {
    if (!outputShapeToggleBtn || extensionContextInvalidated) return;
    if (outputShapeToggleBtn.dataset.loading !== "false") {
      setPreferenceLoadingState(outputShapeToggleBtn, true);
    }
    try {
      const storage = await chrome.storage.local.get({
        [OUTPUT_SHAPE_STORAGE_KEY]: true,
      });
      setOutputShapeToggleState(storage[OUTPUT_SHAPE_STORAGE_KEY] !== false);
    } catch (error) {
      if (handleExtensionContextInvalidated(error)) return;
      console.warn("AutoLister AI: failed to load output shape setting", error);
      setOutputShapeToggleState(true);
    }
  }

  function createOutputShapeToggleButton() {
    const btn = document.createElement("div");
    btn.id = OUTPUT_SHAPE_TOGGLE_ID;
    btn.setAttribute("role", "group");
    btn.setAttribute("aria-label", "Description format");
    btn.setAttribute("aria-busy", "true");
    btn.dataset.loading = "true";
    btn.innerHTML = `
      <button type="button" class="quickvint-format-option" data-format="paragraphs" aria-label="Paragraphs" aria-pressed="false" disabled>
        <span class="format-chip">
          <span class="format-icon format-icon-para" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </span>
      </button>
      <button type="button" class="quickvint-format-option" data-format="bullets" aria-label="Bullet points" aria-pressed="false" disabled>
        <span class="format-chip">
          <span class="format-icon" aria-hidden="true">
            <span class="format-icon-bullet"><span></span></span>
            <span class="format-icon-bullet"><span></span></span>
            <span class="format-icon-bullet"><span></span></span>
          </span>
        </span>
      </button>
    `;
    btn.addEventListener("click", async (event) => {
      if (btn.dataset.loading === "true") return;
      const option = event.target.closest(".quickvint-format-option");
      if (!option || option.disabled) return;
      const nextValue = option.dataset.format === "bullets";
      const storage = await chrome.storage.local.get({
        [OUTPUT_SHAPE_STORAGE_KEY]: true,
      });
      if ((storage[OUTPUT_SHAPE_STORAGE_KEY] !== false) === nextValue) return;
      await chrome.storage.local.set({ [OUTPUT_SHAPE_STORAGE_KEY]: nextValue });
      setOutputShapeToggleState(nextValue);
      trackGrowthEvent("output_shape_toggle_changed", {
        source: "listing_tools",
        useBulletPoints: nextValue,
      });
    });
    syncOutputShapeToggleState();
    startOutputShapeToggleSync();
    return btn;
  }

  function startOutputShapeToggleSync() {
    if (outputShapeToggleSyncTimer) return;
    outputShapeToggleSyncTimer = window.setInterval(() => {
      if (
        extensionContextInvalidated ||
        !outputShapeToggleBtn ||
        !document.body.contains(outputShapeToggleBtn)
      ) {
        window.clearInterval(outputShapeToggleSyncTimer);
        outputShapeToggleSyncTimer = null;
        return;
      }
      syncOutputShapeToggleState();
    }, 1000);
  }

  function getCurrentDescriptionFooterListingKey() {
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  }

  function ensureDescriptionFooterListingState() {
    const listingKey = getCurrentDescriptionFooterListingKey();
    if (listingKey !== descriptionFooterListingKey) {
      descriptionFooterListingKey = listingKey;
      descriptionFooterIncludeForListing = DESCRIPTION_FOOTER_INCLUDE_DEFAULT;
    }
  }

  function createHashtagsToggleButton() {
    const btn = document.createElement("button");
    btn.id = HASHTAGS_TOGGLE_ID;
    btn.type = "button";
    btn.className = "quickvint-binary-toggle";
    btn.setAttribute("aria-label", "Toggle hashtags in generated descriptions");
    btn.setAttribute("aria-pressed", "mixed");
    btn.setAttribute("aria-busy", "true");
    btn.dataset.loading = "true";
    btn.disabled = true;
    btn.innerHTML = createBinaryToggleMarkup("# Tags");
    btn.addEventListener("click", async () => {
      if (btn.dataset.loading === "true" || btn.disabled) return;
      const storage = await chrome.storage.local.get({
        [HASHTAGS_STORAGE_KEY]: true,
      });
      const nextValue = storage[HASHTAGS_STORAGE_KEY] === false;
      await chrome.storage.local.set({ [HASHTAGS_STORAGE_KEY]: nextValue });
      setHashtagsToggleState(nextValue);
      trackGrowthEvent("hashtags_toggle_changed", {
        source: "listing_tools",
        enabled: nextValue,
      });
    });
    syncHashtagsToggleState();
    startHashtagsToggleSync();
    return btn;
  }

  function startHashtagsToggleSync() {
    if (hashtagsToggleSyncTimer) return;
    hashtagsToggleSyncTimer = window.setInterval(() => {
      if (
        extensionContextInvalidated ||
        !hashtagsToggleBtn ||
        !document.body.contains(hashtagsToggleBtn)
      ) {
        window.clearInterval(hashtagsToggleSyncTimer);
        hashtagsToggleSyncTimer = null;
        return;
      }
      syncHashtagsToggleState();
    }, 1000);
  }

  function setDescriptionFooterButtonState({ enabled, hasText, copy }) {
    if (!descriptionFooterBtn) return;
    ensureDescriptionFooterListingState();
    const includeForListing =
      enabled && hasText && descriptionFooterIncludeForListing;
    setPreferenceLoadingState(descriptionFooterBtn, false);
    descriptionFooterBtn.disabled = false;
    descriptionFooterBtn.setAttribute(
      "aria-pressed",
      includeForListing ? "true" : "false",
    );
    descriptionFooterBtn
      .closest(".quickvint-note-control")
      ?.setAttribute("data-active", includeForListing ? "true" : "false");
    descriptionFooterBtn.setAttribute(
      "aria-label",
      hasText
        ? copy?.includeLabel || "Use saved note on this listing"
        : "Add a saved note before hashtags",
    );
    descriptionFooterBtn.title = enabled
      ? hasText
        ? includeForListing
          ? "Saved note will be added before hashtags"
          : copy?.skipped || "Saved note is off for this listing."
        : "Add a saved note before hashtags"
      : "Saved notes are available during the free trial and on Pro or Business.";
    setDescriptionFooterEditButtonState({ enabled });
  }

  function setDescriptionFooterEditButtonState({ enabled }) {
    if (!descriptionFooterEditBtn) return;
    descriptionFooterEditBtn.disabled = false;
    descriptionFooterEditBtn.title = enabled
      ? "Edit saved note"
      : "Saved notes are available during the free trial and on Pro or Business.";
    descriptionFooterEditBtn.setAttribute("aria-label", "Edit saved note");
  }

  async function syncDescriptionFooterButtonState() {
    if (!descriptionFooterBtn || extensionContextInvalidated) return;
    if (descriptionFooterBtn.dataset.loading !== "false") {
      setBinaryToggleLoadingState(descriptionFooterBtn, true);
      if (descriptionFooterEditBtn) {
        descriptionFooterEditBtn.disabled = true;
      }
    }
    try {
      const storage = await new Promise((resolve) => {
        chrome.storage.local.get(
          {
            [DESCRIPTION_FOOTER_STORAGE_KEY]: "",
            userProfile: null,
            selectedLanguage: null,
            selectedTitleLanguage: null,
            selectedDescriptionLanguage: null,
            [LANGUAGE_PREFERENCE_TOUCHED_KEY]: false,
          },
          (result) => resolve(result),
        );
      });
      const {
        [DESCRIPTION_FOOTER_STORAGE_KEY]: storedText = "",
        userProfile = null,
      } = storage;
      const languageProfile = resolveLanguageProfile(storage);
      setDescriptionFooterButtonState({
        enabled: canUseDescriptionFooterSetting(userProfile),
        hasText: /\S/.test(typeof storedText === "string" ? storedText : ""),
        copy: getDescriptionFooterCopy(languageProfile.uiLanguageCode),
      });
    } catch (error) {
      if (handleExtensionContextInvalidated(error)) return;
      console.warn("AutoLister AI: failed to load saved note setting", error);
      setDescriptionFooterButtonState({ enabled: false, hasText: false });
    }
  }

  function createDescriptionFooterControl() {
    const wrapper = document.createElement("div");
    wrapper.className = "quickvint-note-control";

    const btn = document.createElement("button");
    btn.id = DESCRIPTION_FOOTER_BTN_ID;
    btn.type = "button";
    btn.className = "quickvint-binary-toggle";
    btn.setAttribute("aria-label", "Edit saved note for generated descriptions");
    btn.setAttribute("aria-pressed", "mixed");
    btn.setAttribute("aria-busy", "true");
    btn.dataset.loading = "true";
    btn.disabled = true;
    btn.innerHTML = createBinaryToggleMarkup("Note");
    btn.addEventListener("click", async () => {
      if (btn.dataset.loading === "true" || btn.disabled) return;
      ensureDescriptionFooterListingState();
      const { [DESCRIPTION_FOOTER_STORAGE_KEY]: storedText = "", userProfile = null } =
        await chrome.storage.local.get({
          [DESCRIPTION_FOOTER_STORAGE_KEY]: "",
          userProfile: null,
        });
      const enabled = canUseDescriptionFooterSetting(userProfile);
      const hasText = /\S/.test(
        typeof storedText === "string" ? storedText : "",
      );
      if (!enabled || !hasText) {
        openDescriptionFooterModal();
        return;
      }
      descriptionFooterIncludeForListing = !descriptionFooterIncludeForListing;
      syncDescriptionFooterButtonState();
      trackGrowthEvent("description_footer_include_changed", {
        source: "listing_tools",
        enabled: descriptionFooterIncludeForListing,
      });
    });

    const editBtn = document.createElement("button");
    editBtn.id = DESCRIPTION_FOOTER_EDIT_BTN_ID;
    editBtn.type = "button";
    editBtn.className = "quickvint-note-edit";
    editBtn.setAttribute("aria-label", "Edit saved note");
    editBtn.title = "Edit saved note";
    editBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    `;
    editBtn.addEventListener("click", () => {
      if (btn.dataset.loading === "true") return;
      openDescriptionFooterModal();
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(editBtn);
    descriptionFooterBtn = btn;
    descriptionFooterEditBtn = editBtn;
    syncDescriptionFooterButtonState();
    startDescriptionFooterSync();
    return wrapper;
  }

  function startDescriptionFooterSync() {
    if (descriptionFooterSyncTimer) return;
    descriptionFooterSyncTimer = window.setInterval(() => {
      if (
        extensionContextInvalidated ||
        !descriptionFooterBtn ||
        !document.body.contains(descriptionFooterBtn)
      ) {
        window.clearInterval(descriptionFooterSyncTimer);
        descriptionFooterSyncTimer = null;
        return;
      }
      syncDescriptionFooterButtonState();
    }, 1000);
  }

  async function syncEmojiToggleState() {
    if (!emojiToggleBtn || extensionContextInvalidated) return;
    if (emojiToggleBtn.dataset.loading !== "false") {
      setBinaryToggleLoadingState(emojiToggleBtn, true);
    }
    try {
      const { useEmojis = true, userProfile = null } = await new Promise((resolve) => {
        chrome.storage.local.get(
          { useEmojis: true, userProfile: null },
          (result) => resolve(result),
        );
      });
      const emojiAccess = canUseEmojiSetting(userProfile);
      setEmojiToggleState(emojiAccess && useEmojis !== false);
      emojiToggleBtn.disabled = !emojiAccess;
      emojiToggleBtn.title = emojiAccess
        ? useEmojis !== false
          ? "Emojis are on for generated descriptions"
          : "Emojis are off for generated descriptions"
        : "Emoji support is available during the free trial and on Pro or Business.";
    } catch (error) {
      if (handleExtensionContextInvalidated(error)) return;
      console.warn("AutoLister AI: failed to load emoji setting", error);
      setEmojiToggleState(false);
      emojiToggleBtn.disabled = true;
      emojiToggleBtn.title = "Emoji setting could not be loaded.";
    }
  }

  function createEmojiToggleButton() {
    const btn = document.createElement("button");
    btn.id = EMOJI_TOGGLE_ID;
    btn.type = "button";
    btn.className = "quickvint-binary-toggle";
    btn.setAttribute("aria-label", "Toggle emojis in generated descriptions");
    btn.setAttribute("aria-pressed", "mixed");
    btn.setAttribute("aria-busy", "true");
    btn.dataset.loading = "true";
    btn.disabled = true;
    btn.innerHTML = createBinaryToggleMarkup("😊 Emoji");
    btn.addEventListener("click", async () => {
      if (btn.dataset.loading === "true" || btn.disabled) return;
      const { useEmojis = true, userProfile = null } = await new Promise((resolve) => {
        chrome.storage.local.get(
          { useEmojis: true, userProfile: null },
          (result) => resolve(result),
        );
      });
      if (!canUseEmojiSetting(userProfile)) {
        setEmojiToggleState(false);
        return;
      }
      const nextValue = useEmojis === false;
      await chrome.storage.local.set({ useEmojis: nextValue });
      setEmojiToggleState(nextValue);
      trackGrowthEvent("emoji_toggle_changed", {
        source: "listing_tools",
        enabled: nextValue,
      });
    });
    syncEmojiToggleState();
    startEmojiToggleSync();
    return btn;
  }

  function startEmojiToggleSync() {
    if (emojiToggleSyncTimer) return;
    emojiToggleSyncTimer = window.setInterval(() => {
      if (
        extensionContextInvalidated ||
        !emojiToggleBtn ||
        !document.body.contains(emojiToggleBtn)
      ) {
        window.clearInterval(emojiToggleSyncTimer);
        emojiToggleSyncTimer = null;
        return;
      }
      syncEmojiToggleState();
    }, 1000);
  }

  function setActionButtonLoading(button, labelText) {
    if (!button) return () => {};

    const label = button.querySelector(".label");
    const previousLabel = label?.textContent || button.textContent || "";
    const previousDisabled = button.disabled;
    const previousCursor = button.style.cursor;
    const previousBackground = button.style.background;

    button.classList.add("is-loading");
    button.disabled = true;
    button.style.cursor = "progress";
    button.style.background = PRIMARY_BUTTON_BACKGROUND;
    if (label) {
      label.textContent = labelText;
    } else {
      button.textContent = labelText;
    }

    return () => {
      button.classList.remove("is-loading");
      button.disabled = previousDisabled;
      button.style.cursor = previousCursor;
      button.style.background = previousBackground;
      if (label) {
        label.textContent = previousLabel;
      } else {
        button.textContent = previousLabel;
      }
    };
  }

  function createInlineLanguageField(label, title, selectId, storageKey) {
    const field = document.createElement("div");
    field.className = "quickvint-lang-field";
    field.title = title;
    chrome.storage.local.get(INLINE_LANGUAGE_HINT_DONE_KEY, (result) => {
      if (!result[INLINE_LANGUAGE_HINT_DONE_KEY]) {
        field.classList.add("quickvint-lang-hint");
      }
    });

    const trigger = document.createElement("button");
    trigger.id = selectId;
    trigger.type = "button";
    trigger.className = "quickvint-lang-trigger";
    trigger.setAttribute("aria-label", title);
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      markInlineLanguageHintDone();
      document.querySelectorAll(".quickvint-lang-field.open").forEach((openField) => {
        if (openField !== field) openField.classList.remove("open");
      });
      field.classList.toggle("open");
      if (field.classList.contains("open")) {
        positionInlineLanguageMenu(trigger, menu);
      }
    });

    const menu = document.createElement("div");
    menu.className = "quickvint-lang-menu";
    menu.addEventListener("mousedown", (event) => event.stopPropagation());
    menu.addEventListener("click", (event) => event.stopPropagation());
    menu.addEventListener("wheel", (event) => event.stopPropagation());
    LANGUAGE_OPTIONS.forEach((lang) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "quickvint-lang-option";
      option.dataset.value = lang.code;
      option.title = lang.name;
      option.innerHTML = `<img src="https://flagcdn.com/w40/${lang.flag}.png" alt="${lang.flagAlt}"><span>${lang.shortName}</span>`;
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        markInlineLanguageHintDone();
        updateInlineLanguageControl(trigger, lang.code);
        field.classList.remove("open");
        chrome.storage.local.set({
          [storageKey]: lang.code,
          [LANGUAGE_PREFERENCE_TOUCHED_KEY]: true,
        });
      });
      menu.appendChild(option);
    });

    field.appendChild(trigger);
    field.appendChild(menu);
    bindInlineLanguageGlobalListeners();
    return field;
  }

  function bindInlineLanguageGlobalListeners() {
    if (inlineLanguageListenersBound) return;
    inlineLanguageListenersBound = true;

    document.addEventListener("click", closeInlineLanguageMenus);
    window.addEventListener("scroll", closeInlineLanguageMenus, true);
    window.addEventListener("resize", closeInlineLanguageMenus);
  }

  function closeInlineLanguageMenus(event) {
    const target = event?.target;
    if (
      target instanceof Element &&
      target.closest(".quickvint-lang-field")
    ) {
      return;
    }
    document.querySelectorAll(".quickvint-lang-field.open").forEach((field) => {
      field.classList.remove("open");
    });
  }

  function positionInlineLanguageMenu(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    menu.style.minWidth = `${Math.round(rect.width)}px`;
    if (!window.matchMedia("(max-width: 680px)").matches) {
      menu.style.left = `${Math.round(rect.left)}px`;
      menu.style.top = `${Math.round(rect.bottom + 4)}px`;
      return;
    }

    const margin = 8;
    const menuWidth = menu.offsetWidth || rect.width;
    const menuHeight = menu.offsetHeight;
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - menuWidth - margin),
    );
    const below = rect.bottom + 4;
    const top =
      below + menuHeight <= window.innerHeight - margin
        ? below
        : Math.max(margin, rect.top - menuHeight - 4);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  }

  function updateInlineLanguageControl(trigger, languageCode) {
    const selectedOption = LANGUAGE_OPTIONS.find(
      (lang) =>
        lang.code === languageDefaults.normalizeLanguageCode(languageCode),
    );
    if (!selectedOption) return;
    trigger.dataset.value = selectedOption.code;
    trigger.innerHTML = `<img src="https://flagcdn.com/w40/${selectedOption.flag}.png" alt="${selectedOption.flagAlt}"><span>${selectedOption.shortName}</span>`;
    trigger
      .closest(".quickvint-lang-field")
      ?.querySelectorAll(".quickvint-lang-option")
      .forEach((option) => {
        option.classList.toggle("active", option.dataset.value === selectedOption.code);
      });
  }

  function injectFieldLanguageControls() {
    const titleInput = document.querySelector(SELECTORS.title);
    const descriptionInput = document.querySelector(SELECTORS.description);

    injectFieldLanguageControl(
      titleInput,
      "T",
      "Title language",
      TITLE_LANGUAGE_SELECT_ID,
      "selectedTitleLanguage",
    );
    injectFieldLanguageControl(
      descriptionInput,
      "D",
      "Description language",
      DESCRIPTION_LANGUAGE_SELECT_ID,
      "selectedDescriptionLanguage",
    );
    syncInlineLanguageControls();
  }

  function injectFieldLanguageControl(input, label, title, selectId, storageKey) {
    if (!input || document.getElementById(selectId)) return;
    const fieldLabel = input.closest("label");
    const titleNode =
      fieldLabel?.querySelector('[data-testid$="--title"]') ||
      fieldLabel?.querySelector('[class*="Input__title"]');
    if (!titleNode) return;
    titleNode.classList.add("quickvint-lang-title-host");
    titleNode.appendChild(
      createInlineLanguageField(label, title, selectId, storageKey),
    );
  }

  function syncInlineLanguageControls(root = document) {
    chrome.storage.local.get(
      ["selectedLanguage", "selectedTitleLanguage", "selectedDescriptionLanguage"],
      (storage) => {
        const languagePreferences = resolveListingLanguagePreferences(storage);
        const titleTrigger = root.querySelector(`#${TITLE_LANGUAGE_SELECT_ID}`);
        const descriptionTrigger = root.querySelector(
          `#${DESCRIPTION_LANGUAGE_SELECT_ID}`,
        );
        if (titleTrigger) {
          updateInlineLanguageControl(
            titleTrigger,
            languagePreferences.titleLanguageCode,
          );
        }
        if (descriptionTrigger) {
          updateInlineLanguageControl(
            descriptionTrigger,
            languagePreferences.descriptionLanguageCode,
          );
        }
      },
    );
  }

  function createSignInComponent() {
    const btn = document.createElement("button");
    btn.id = SIGN_IN_BTN_ID;
    btn.innerHTML = `
        ${WAND_ICON_SVG}
        <span>Sign in to enable AI Tools</span>
        <span>(Click here)</span>
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      trackGrowthEvent("signin_cta_click", {
        path: window.location.pathname,
      });
      openSignInPopup("signed_out_cta");
    });

    return btn;
  }

  function updateButtonUI() {
    const titleLanguageField = document
      .getElementById(TITLE_LANGUAGE_SELECT_ID)
      ?.closest(".quickvint-lang-field");
    const descriptionLanguageField = document
      .getElementById(DESCRIPTION_LANGUAGE_SELECT_ID)
      ?.closest(".quickvint-lang-field");
    const descriptionFooterControl = descriptionFooterBtn?.closest(
      ".quickvint-note-control",
    );

    if (isAuthenticated === null) {
      if (signInBtn) signInBtn.style.display = "none";
      if (generateBtn) generateBtn.style.display = "none";
      if (phoneBtn) phoneBtn.style.display = "none";
      if (batchBtn) batchBtn.style.display = "none";
      if (reportBtn) reportBtn.style.display = "none";
      if (emojiToggleBtn) emojiToggleBtn.style.display = "none";
      if (hashtagsToggleBtn) hashtagsToggleBtn.style.display = "none";
      if (outputShapeToggleBtn) outputShapeToggleBtn.style.display = "none";
      if (descriptionFooterControl) {
        descriptionFooterControl.style.display = "none";
      }
      if (descriptionLengthToggle) descriptionLengthToggle.style.display = "none";
      if (titleLanguageField) titleLanguageField.style.display = "none";
      if (descriptionLanguageField) descriptionLanguageField.style.display = "none";
      return;
    }

    // If not authenticated, show premium sign-in button and hide others
    if (!isAuthenticated) {
      if (signInBtn) signInBtn.style.display = "flex";
      if (generateBtn) generateBtn.style.display = "none";
      if (phoneBtn) phoneBtn.style.display = "none";
      if (batchBtn) batchBtn.style.display = "none";
      if (reportBtn) reportBtn.style.display = "none";
      if (emojiToggleBtn) emojiToggleBtn.style.display = "none";
      if (hashtagsToggleBtn) hashtagsToggleBtn.style.display = "none";
      if (outputShapeToggleBtn) outputShapeToggleBtn.style.display = "none";
      if (descriptionFooterControl) {
        descriptionFooterControl.style.display = "none";
      }
      if (descriptionLengthToggle) descriptionLengthToggle.style.display = "none";
      if (titleLanguageField) titleLanguageField.style.display = "none";
      if (descriptionLanguageField) descriptionLanguageField.style.display = "none";
      maybeTrackSignedOutToolsReady();
      return;
    }

    // Authenticated state
    if (signInBtn) signInBtn.style.display = "none";
    if (generateBtn) generateBtn.style.display = "flex";
    if (phoneBtn) phoneBtn.style.display = "flex";
    if (batchBtn) batchBtn.style.display = "flex";
    if (reportBtn) reportBtn.style.display = "inline-flex";
    if (descriptionLengthToggle) descriptionLengthToggle.style.display = "inline-grid";
    if (outputShapeToggleBtn) outputShapeToggleBtn.style.display = "inline-flex";
    if (hashtagsToggleBtn) hashtagsToggleBtn.style.display = "inline-flex";
    if (descriptionFooterControl) {
      descriptionFooterControl.style.display = "inline-flex";
    }
    if (emojiToggleBtn) emojiToggleBtn.style.display = "inline-flex";
    if (titleLanguageField) titleLanguageField.style.display = "inline-flex";
    if (descriptionLanguageField) {
      descriptionLanguageField.style.display = "inline-flex";
    }

    if (!generateBtn) return;
    maybeTrackListingToolsReady();
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");

    if (phoneBtn) {
      phoneBtn.classList.remove("is-loading");
      phoneBtn.disabled = isBusy;
      phoneBtn.style.background = PRIMARY_BUTTON_BACKGROUND;
      phoneBtn.style.cursor = isBusy ? "not-allowed" : "pointer";
    }
    if (batchBtn) {
      batchBtn.classList.remove("is-loading");
      batchBtn.disabled = isBusy;
      batchBtn.style.background = PRIMARY_BUTTON_BACKGROUND;
      batchBtn.style.cursor = isBusy ? "not-allowed" : "pointer";
    }
    if (reportBtn) {
      reportBtn.disabled = false;
      reportBtn.style.cursor = "pointer";
    }

    if (!label || !icon) return;

    const incompletePhoneUpload = getIncompletePhoneUploadState();
    const manualPhotosPreparing = hasManualCapturedFilesMissingStorageUrls();

    if (isBusy || incompletePhoneUpload || manualPhotosPreparing) {
      generateBtn.classList.add("is-loading");
      generateBtn.disabled = true;
      icon.style.display = "";
      label.textContent =
        incompletePhoneUpload || manualPhotosPreparing
          ? "Preparing..."
          : generateBusyLabel;
      generateBtn.style.cursor = "progress";
      generateBtn.style.background = PRIMARY_BUTTON_BACKGROUND;
    } else {
      generateBtn.classList.remove("is-loading");
      generateBtn.disabled = false;
      generateBusyLabel = "Generating";
      icon.style.display = "";
      label.textContent = "Generate";
      generateBtn.style.background = PRIMARY_BUTTON_BACKGROUND;
      generateBtn.style.cursor = "pointer";
    }
  }

  function maybeTrackListingToolsReady() {
    if (listingToolsReadyTracked || !isAuthenticated || !generateBtn) return;
    listingToolsReadyTracked = true;
    trackGrowthEvent("listing_tools_ready", {
      path: window.location.pathname,
      visiblePhotoCount: getVisibleUploadedPhotoCount(),
    });
    maybePostDomCanaryPass();
    scheduleLimitFollowupReturnCheck();
  }

  function maybeTrackSignedOutToolsReady() {
    if (signedOutToolsReadyTracked || isAuthenticated || !signInBtn) return;
    signedOutToolsReadyTracked = true;
    trackGrowthEvent("signed_out_tools_ready", {
      path: window.location.pathname,
      visiblePhotoCount: getVisibleUploadedPhotoCount(),
    });
  }

  function isDomCanaryEnabled() {
    return Boolean(
      DOM_CANARY_CONFIG?.enabled &&
        DOM_CANARY_CONFIG?.secret &&
        location.hostname === "www.vinted.nl",
    );
  }

  function getDomCanaryPayload(status, result = {}) {
    const title = Boolean(document.querySelector(SELECTORS.title));
    const description = Boolean(document.querySelector(SELECTORS.description));
    const fileInput = Boolean(document.querySelector(SELECTORS.fileInput));
    const generateButton = Boolean(document.getElementById(BTN_ID));
    const signInButton = Boolean(document.getElementById(SIGN_IN_BTN_ID));
    const tools = Boolean(document.querySelector(".quickvint-tools"));
    return {
      check: DOM_CANARY_CHECK,
      status,
      occurredAt: new Date().toISOString(),
      url: location.href,
      path: location.pathname,
      extensionVersion: chrome.runtime.getManifest().version || "",
      result: {
        ...result,
        dom: {
          title,
          description,
          fileInput,
          generateButton,
          signInButton,
          tools,
          titleText: document.title,
        },
      },
      selectors: {
        title: SELECTORS.title,
        description: SELECTORS.description,
        fileInput: SELECTORS.fileInput,
        generateButton: `#${BTN_ID}`,
        signInButton: `#${SIGN_IN_BTN_ID}`,
        tools: ".quickvint-tools",
      },
    };
  }

  function postDomCanary(status, result = {}) {
    if (!isDomCanaryEnabled()) return;
    fetch(`${API_BASE}/api/dom-canary`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DOM_CANARY_CONFIG.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getDomCanaryPayload(status, result)),
    }).catch(() => {});
  }

  function maybePostDomCanaryPass() {
    if (!isDomCanaryEnabled()) return;
    if (window.__quickvintDomCanaryPassed) return;
    if (location.pathname !== "/items/new") return;
    if (!document.querySelector(SELECTORS.title)) return;
    if (!document.querySelector(SELECTORS.description)) return;
    if (!document.querySelector(SELECTORS.fileInput)) return;
    if (
      !document.getElementById(BTN_ID) &&
      !document.getElementById(SIGN_IN_BTN_ID) &&
      !document.querySelector(".quickvint-tools")
    ) {
      return;
    }
    window.__quickvintDomCanaryPassed = true;
    postDomCanary("passed", { injected: true });
  }

  function setNativeInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function clickCanaryTarget(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  }

  function submitDomCanaryAuthForm() {
    const emailInput = document.querySelector(
      'input[name="email"], input[name="username"]',
    );
    const passwordInput = document.querySelector('input[name="password"]');
    const loginInput = document.querySelector('input[name="login"]');
    if (!emailInput || !passwordInput) return false;

    if (loginInput && DOM_CANARY_CONFIG.username) {
      setNativeInputValue(loginInput, DOM_CANARY_CONFIG.username);
    }
    setNativeInputValue(emailInput, DOM_CANARY_CONFIG.email);
    setNativeInputValue(passwordInput, DOM_CANARY_CONFIG.password);

    const termsInput = document.querySelector('input[name="agreeRules"]');
    if (termsInput && !termsInput.checked) {
      clickCanaryTarget('[data-testid="terms-and-conditions-checkbox--input"]') ||
        clickCanaryTarget('[data-testid="terms-and-conditions-checkbox"]') ||
        termsInput.click();
    }

    const submit = [...document.querySelectorAll("button")].find((button) =>
      /Verder|Inloggen|Log in|Continue|Sign up|Registreren/i.test(
        button.innerText || "",
      ),
    );
    submit?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    return Boolean(submit);
  }

  function maybeRecoverDomCanaryLogin() {
    if (!isDomCanaryEnabled()) return;
    if (/session has been blocked|unusual or automated activity/i.test(document.body?.innerText || "")) {
      postDomCanary("failed", { reason: "vinted_session_blocked" });
      return;
    }
    if (!DOM_CANARY_CONFIG.email || !DOM_CANARY_CONFIG.password) return;
    if (!/\/member\/signup\/select_type|\/member\/login|\/auth\//.test(location.pathname)) {
      return;
    }
    if (window.__quickvintDomCanaryLoginAttempted) return;
    window.__quickvintDomCanaryLoginAttempted = true;

    setTimeout(() => {
      const mode = DOM_CANARY_CONFIG.mode === "signup" ? "signup" : "login";
      if (mode === "login") {
        clickCanaryTarget('[data-testid="auth-select-type--register-switch"]');
        setTimeout(() => {
          clickCanaryTarget('[data-testid="auth-select-type--login-email"]') ||
            clickCanaryTarget('[data-testid="auth-select-type--register-email"]');
          setTimeout(() => {
            if (!submitDomCanaryAuthForm()) {
              postDomCanary("failed", { reason: "auth_recovery_form_missing" });
            } else {
              setTimeout(() => {
                if (
                  /\/member\/signup\/select_type|\/member\/login|\/auth\//.test(
                    location.pathname,
                  )
                ) {
                  postDomCanary("failed", {
                    reason: "auth_recovery_still_required",
                  });
                }
              }, 7000);
            }
          }, 1200);
        }, 1200);
      } else {
        clickCanaryTarget('[data-testid="auth-select-type--register-email"]');
        setTimeout(() => {
          if (!submitDomCanaryAuthForm()) {
            postDomCanary("failed", { reason: "auth_signup_form_missing" });
          } else {
            setTimeout(() => {
              if (
                /\/member\/signup\/select_type|\/member\/login|\/auth\//.test(
                  location.pathname,
                )
              ) {
                postDomCanary("failed", {
                  reason: "auth_signup_still_required",
                });
              }
            }, 7000);
          }
        }, 1200);
      }
    }, 1200);
  }

  function setButtonSuccessState() {
    if (!generateBtn) return;
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");
    if (!label || !icon) return;

    generateBtn.classList.remove("is-loading");
    icon.style.display = "none";
    label.textContent = "✅ Done";

    setTimeout(() => {
      isBusy = false;
      updateButtonUI();
    }, 2000);
  }

  function removeDescriptionApplyPrompt() {
    if (activeDescriptionApplyPromptCleanup) {
      activeDescriptionApplyPromptCleanup("cancel");
      return;
    }
    document.getElementById(DESCRIPTION_APPLY_PROMPT_ID)?.remove();
    activeFloatingPromptType = null;
  }

  function setDescriptionValue(descInput, value) {
    descInput.value = value;
    descInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function positionDescriptionApplyPrompt(prompt, descInput) {
    positionAnchoredFloatingCard(prompt, descInput, 320);
  }

  function showFloatingPrompt({
    type,
    anchorInput,
    title,
    copy = "",
    actions = [],
    onAction = null,
  }) {
    removeDescriptionApplyPrompt();

    return new Promise((resolve) => {
      const prompt = document.createElement("div");
      prompt.id = DESCRIPTION_APPLY_PROMPT_ID;
      activeFloatingPromptType = type;
      prompt.innerHTML = `
        <div class="quickvint-apply-title">${escapeHtml(title)}</div>
        ${copy ? `<div class="quickvint-apply-copy">${escapeHtml(copy)}</div>` : ""}
        <div class="quickvint-apply-actions">
          ${actions
            .map(
              (action, index) => `
                <button
                  type="button"
                  class="quickvint-apply-${escapeHtml(action.choice)}${action.primary ? " quickvint-apply-add" : ""}${action.fullWidth ? " quickvint-apply-settings" : ""}"
                  data-quickvint-prompt-action="${index}"
                >${escapeHtml(action.label)}</button>
              `,
            )
            .join("")}
        </div>
      `;

      document.body.appendChild(prompt);
      positionDescriptionApplyPrompt(prompt, anchorInput);

      const onReposition = () => positionDescriptionApplyPrompt(prompt, anchorInput);
      window.addEventListener("resize", onReposition);
      window.addEventListener("scroll", onReposition, true);

      function finish(choice) {
        window.removeEventListener("resize", onReposition);
        window.removeEventListener("scroll", onReposition, true);
        prompt.remove();
        activeDescriptionApplyPromptCleanup = null;
        activeFloatingPromptType = null;
        resolve(choice);
      }

      activeDescriptionApplyPromptCleanup = finish;

      prompt.querySelectorAll("[data-quickvint-prompt-action]").forEach((button) => {
        button.addEventListener("click", async (event) => {
          const index = Number(event.currentTarget.dataset.quickvintPromptAction);
          const action = actions[index];
          if (!action) return;
          if (typeof onAction === "function") {
            const result = await onAction(action.choice, finish, event);
            if (result === false) return;
          }
          finish(action.choice);
        });
      });
    });
  }

  function getDescriptionApplyChoice(descInput) {
    if (!(descInput.value || "").trim()) {
      return Promise.resolve("replace");
    }

    return showFloatingPrompt({
      type: "description_apply",
      anchorInput: descInput,
      title: "Update existing description?",
      actions: [
        { choice: "replace", label: "Replace description", primary: true },
        { choice: "add", label: "Add below" },
        { choice: "cancel", label: "Cancel" },
      ],
    });
  }

  function stripEmojisFromText(text) {
    return text
      .replace(EMOJI_SEQUENCE_REGEX, "")
      .replace(/[\uFE0E\uFE0F]/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getEmojiRemoveChoice(descInput) {
    return showFloatingPrompt({
      type: "emoji_remove",
      anchorInput: descInput,
      title: "😊 Remove emojis?",
      copy: "Remove emojis and turn them off.",
      actions: [
        { choice: "remove_emojis", label: "Remove emojis", primary: true },
        { choice: "keep_emojis", label: "Keep emojis" },
        { choice: "settings", label: "⚙️ Open Settings", fullWidth: true },
      ],
      onAction: async (choice, finish, event) => {
        if (choice === "settings") {
          event.preventDefault();
          await chrome.storage.local.set({
            [OPEN_SETTINGS_ON_NEXT_POPUP_KEY]: Date.now(),
          });
          await openSignInPopup("emoji_settings_prompt", {
            requestedPanel: "settings",
          });
          return false;
        }
        return true;
      },
    });
  }

  function applyGeneratedDescription(descInput, generatedDescription, applyChoice) {
    const currentDescription = descInput.value || "";
    if (applyChoice === "add" && currentDescription.trim()) {
      setDescriptionValue(
        descInput,
        `${currentDescription.trimEnd()}\n\n${generatedDescription}`,
      );
      return;
    }

    setDescriptionValue(descInput, generatedDescription);
  }

  function normalizeTrackedOutputText(value) {
    return String(value || "").replace(/\r\n/g, "\n");
  }

  function createOutputTrackingId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `out_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function startGenerationOutputEditTracking({
    generationAttemptId,
    mode,
    photoCount,
    titleLanguageCode,
    descriptionLanguageCode,
    descriptionApplyChoice,
    generatedTitle,
    generatedDescription,
    appliedTitle,
    appliedDescription,
  }) {
    if (activeGenerationOutputEditCleanup) {
      activeGenerationOutputEditCleanup("new_generation");
    }

    const titleInput = document.querySelector(SELECTORS.title);
    const descInput = document.querySelector(SELECTORS.description);
    if (!titleInput && !descInput) return;

    const initialTitle = normalizeTrackedOutputText(appliedTitle);
    const initialDescription = normalizeTrackedOutputText(appliedDescription);
    const outputTrackingId = createOutputTrackingId();
    const startedAt = Date.now();
    let summaryCount = 0;
    let editEventCount = 0;
    let titleEditEventCount = 0;
    let descriptionEditEventCount = 0;
    let firstEditAt = null;
    let lastEditAt = startedAt;
    let lastObservedTitle = initialTitle;
    let lastObservedDescription = initialDescription;
    let lastEmittedTitle = initialTitle;
    let lastEmittedDescription = initialDescription;
    let lastSummaryAt = startedAt;
    let summaryTimer = null;
    let expiryTimer = null;
    let isCleanedUp = false;

    const readCurrentOutput = () => ({
      title: normalizeTrackedOutputText(titleInput?.value),
      description: normalizeTrackedOutputText(descInput?.value),
    });

    const hasChangedFromInitial = ({ title, description }) => ({
      titleChanged: Boolean(titleInput) && title !== initialTitle,
      descriptionChanged:
        Boolean(descInput) && description !== initialDescription,
    });

    const hasChangedFromLastObserved = ({ title, description }) => ({
      titleChangedSinceLastObserved:
        Boolean(titleInput) && title !== lastObservedTitle,
      descriptionChangedSinceLastObserved:
        Boolean(descInput) && description !== lastObservedDescription,
    });

    const hasChangedSinceLastSummary = ({ title, description }) =>
      (Boolean(titleInput) && title !== lastEmittedTitle) ||
      (Boolean(descInput) && description !== lastEmittedDescription);

    const summarizeChangedFields = ({ titleChanged, descriptionChanged }) => {
      const fields = [];
      if (titleChanged) fields.push("title");
      if (descriptionChanged) fields.push("description");
      return fields.join(",");
    };

    const trackSummary = (reason) => {
      if (summaryCount >= GENERATION_OUTPUT_EDIT_MAX_SUMMARIES) return false;
      if (!firstEditAt || editEventCount <= 0) return false;
      const current = readCurrentOutput();
      const changedFromInitial = hasChangedFromInitial(current);
      if (
        !changedFromInitial.titleChanged &&
        !changedFromInitial.descriptionChanged
      ) {
        return false;
      }
      if (!hasChangedSinceLastSummary(current)) {
        return false;
      }

      const now = Date.now();
      summaryCount += 1;
      const changedSinceLastSummary = {
        titleChangedSincePrevious:
          Boolean(titleInput) && current.title !== lastEmittedTitle,
        descriptionChangedSincePrevious:
          Boolean(descInput) &&
          current.description !== lastEmittedDescription,
      };
      trackGrowthEvent("generation_output_edited", {
        mode,
        photoCount,
        titleLanguageCode,
        descriptionLanguageCode,
        descriptionApplyChoice,
        outputTrackingId,
        generationAttemptId,
        editSequence: summaryCount,
        editSnapshotReason: reason,
        editDelayMs: now - startedAt,
        msSincePreviousEditSnapshot: now - lastSummaryAt,
        titleChanged: changedFromInitial.titleChanged,
        descriptionChanged: changedFromInitial.descriptionChanged,
        titleChangedSincePrevious:
          changedSinceLastSummary.titleChangedSincePrevious,
        descriptionChangedSincePrevious:
          changedSinceLastSummary.descriptionChangedSincePrevious,
        generatedTitle: normalizeTrackedOutputText(generatedTitle),
        generatedDescription: normalizeTrackedOutputText(generatedDescription),
        appliedTitle: initialTitle,
        appliedDescription: initialDescription,
        previousTitle: lastEmittedTitle,
        previousDescription: lastEmittedDescription,
        currentTitle: current.title,
        currentDescription: current.description,
        finalTitle: current.title,
        finalDescription: current.description,
        editSummaryReason: reason,
        editSummarySequence: summaryCount,
        editEventCount,
        titleEditEventCount,
        descriptionEditEventCount,
        changedFields: summarizeChangedFields(changedFromInitial),
        titleLengthDelta: current.title.length - initialTitle.length,
        descriptionLengthDelta:
          current.description.length - initialDescription.length,
        editStartedDelayMs: firstEditAt - startedAt,
        editDurationMs: now - firstEditAt,
        editIdleMs: now - lastEditAt,
        summaryLimit: GENERATION_OUTPUT_EDIT_MAX_SUMMARIES,
      });

      lastEmittedTitle = current.title;
      lastEmittedDescription = current.description;
      lastSummaryAt = now;
      editEventCount = 0;
      titleEditEventCount = 0;
      descriptionEditEventCount = 0;
      firstEditAt = null;
      return true;
    };

    const cleanup = (reason = "cleanup") => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (summaryTimer) clearTimeout(summaryTimer);
      if (expiryTimer) clearTimeout(expiryTimer);
      trackSummary(reason);
      titleInput?.removeEventListener("input", handleTitleInput);
      descInput?.removeEventListener("input", handleDescriptionInput);
      titleInput?.removeEventListener("change", handleTitleChange);
      descInput?.removeEventListener("change", handleDescriptionChange);
      window.removeEventListener("pagehide", handlePageHide);
      if (activeGenerationOutputEditCleanup === cleanup) {
        activeGenerationOutputEditCleanup = null;
      }
    };

    const checkForEdit = () => {
      trackSummary("idle");
      if (summaryCount >= GENERATION_OUTPUT_EDIT_MAX_SUMMARIES) {
        cleanup("summary_limit");
      }
    };

    function scheduleSummary() {
      if (summaryTimer) clearTimeout(summaryTimer);
      summaryTimer = setTimeout(
        checkForEdit,
        GENERATION_OUTPUT_EDIT_SUMMARY_IDLE_MS,
      );
    }

    function recordOutputEdit(field) {
      if (isCleanedUp) return;

      const current = readCurrentOutput();
      const changedFromInitial = hasChangedFromInitial(current);
      const changedFromLastObserved = hasChangedFromLastObserved(current);
      if (
        !changedFromInitial.titleChanged &&
        !changedFromInitial.descriptionChanged
      ) {
        lastObservedTitle = current.title;
        lastObservedDescription = current.description;
        return;
      }
      if (
        !changedFromLastObserved.titleChangedSinceLastObserved &&
        !changedFromLastObserved.descriptionChangedSinceLastObserved
      ) {
        return;
      }

      const now = Date.now();
      if (!firstEditAt) firstEditAt = now;
      lastEditAt = now;
      editEventCount += 1;
      if (
        field === "title" ||
        changedFromLastObserved.titleChangedSinceLastObserved
      ) {
        titleEditEventCount += 1;
      }
      if (
        field === "description" ||
        changedFromLastObserved.descriptionChangedSinceLastObserved
      ) {
        descriptionEditEventCount += 1;
      }
      lastObservedTitle = current.title;
      lastObservedDescription = current.description;
      scheduleSummary();
    }

    const handleTitleInput = () => recordOutputEdit("title");
    const handleDescriptionInput = () =>
      recordOutputEdit("description");
    const handleTitleChange = () => recordOutputEdit("title");
    const handleDescriptionChange = () =>
      recordOutputEdit("description");

    function handlePageHide() {
      cleanup("pagehide");
      flushGrowthEvents();
    }

    titleInput?.addEventListener("input", handleTitleInput);
    descInput?.addEventListener("input", handleDescriptionInput);
    titleInput?.addEventListener("change", handleTitleChange);
    descInput?.addEventListener("change", handleDescriptionChange);
    window.addEventListener("pagehide", handlePageHide);
    expiryTimer = setTimeout(
      () => cleanup("expired"),
      GENERATION_OUTPUT_EDIT_TRACKING_TTL_MS,
    );
    activeGenerationOutputEditCleanup = cleanup;
  }

  async function maybeShowEmojiRetryPrompt(descInput) {
    if (pendingGenerationOffer || activeFloatingPromptType) return;

    const handledKey = await getPerUserStorageKey(EMOJI_RETRY_PROMPT_HANDLED_KEY);
    const { [handledKey]: handled } =
      await chrome.storage.local.get(handledKey);
    if (handled) return;
    EMOJI_SEQUENCE_REGEX.lastIndex = 0;
    if (!EMOJI_SEQUENCE_REGEX.test(descInput.value || "")) return;
    EMOJI_SEQUENCE_REGEX.lastIndex = 0;

    const choice = await getEmojiRemoveChoice(descInput);
    await chrome.storage.local.set({ [handledKey]: true });

    if (choice !== "remove_emojis") {
      trackGrowthEvent("emoji_remove_prompt_kept", {
        source: "listing_tools",
      });
      return;
    }

    await chrome.storage.local.set({ useEmojis: false });
    setEmojiToggleState(false);
    const originalDescription = descInput.value || "";
    const strippedDescription = stripEmojisFromText(originalDescription);
    if (strippedDescription !== originalDescription) {
      setDescriptionValue(descInput, strippedDescription);
    }
    trackGrowthEvent("emoji_remove_prompt_accepted", {
      source: "listing_tools",
      changed: strippedDescription !== originalDescription,
    });
  }

  function getPromptAnchorInput() {
    return (
      document.querySelector(SELECTORS.description) ||
      document.querySelector(SELECTORS.title)
    );
  }

  function isPromptBlockingModalOpen() {
    return Boolean(
      document.getElementById(MODAL_ID) ||
        document.getElementById(BATCH_MODAL_ID),
    );
  }

  async function maybeShowPendingGenerationOffer() {
    const offer = pendingGenerationOffer;
    if (!offer || activeFloatingPromptType || isPromptBlockingModalOpen()) return false;
    if (await isOfferLocallyDismissed(offer)) {
      pendingGenerationOffer = null;
      return false;
    }

    const anchorInput = getPromptAnchorInput();
    if (!anchorInput) return false;

    const choice = await showFloatingPrompt({
      type: "generation_offer",
      anchorInput,
      title: offer.title || "Forgot the label photo?",
      copy:
        offer.body ||
        "Label photos help create better descriptions.",
      actions: [
        {
          choice: "claim",
          label: offer.cta || "🎁 Claim 1 free generation",
          primary: true,
        },
        { choice: "dismiss", label: "No thanks" },
      ],
      onAction: async (choice, finish, event) => {
        if (choice !== "claim") return true;
        const actionButton = event.currentTarget;
        const previousLabel = actionButton.textContent;
        actionButton.disabled = true;
        actionButton.textContent = "Adding...";
        try {
          const payload = await claimGenerationOffer(offer);
          pendingGenerationOffer = null;
          const { userProfile = {} } = await chrome.storage.local.get("userProfile");
          await chrome.storage.local.set({
            userProfile: { ...userProfile, pack_credits: payload.packCredits },
          });
          trackGrowthEvent("generation_offer_claimed", {
            campaignKey: offer.campaignKey,
            offerCode: offer.offerCode,
          });
          showToast("1 free generation added.", "success");
          finish("claim");
        } catch (err) {
          actionButton.disabled = false;
          actionButton.textContent = previousLabel;
          showToast(err.message || "Could not add this free generation.", "error");
        }
        return false;
      },
    });

    if (choice === "dismiss") {
      await dismissOfferLocally(offer);
      dismissGenerationOffer(offer).catch(() => {});
      pendingGenerationOffer = null;
      trackGrowthEvent("generation_offer_dismissed", {
        campaignKey: offer.campaignKey,
        offerCode: offer.offerCode,
      });
    }

    setTimeout(() => {
      maybeShowPendingLimitFollowupOffer();
    }, 0);

    return true;
  }

  function positionLimitFollowupOfferModal(modal, anchorInput) {
    positionAnchoredFloatingCard(modal, anchorInput, 410);
  }

  function showLimitFollowupOfferModal(offer, anchorInput, copy) {
    document.getElementById(LIMIT_FOLLOWUP_MODAL_ID)?.remove();
    removeDescriptionApplyPrompt();

    const couponCode = offer.couponCode ?? "LISTFASTER20";
    const modalCopy = copy || LIMIT_FOLLOWUP_COPY.en;
    const discountLabel =
      modalCopy.discount || offer.discountLabel || LIMIT_FOLLOWUP_COPY.en.discount;
    const logoUrl = chrome.runtime.getURL("icons/icon48.png");

    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.id = LIMIT_FOLLOWUP_MODAL_ID;
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "quickvint-limit-title");
      activeFloatingPromptType = "limit_followup_offer";
      modal.innerHTML = `
        <div class="quickvint-limit-card">
          <div class="quickvint-limit-body">
            <div class="quickvint-limit-brand">
              <div class="quickvint-limit-brand-main">
                <img class="quickvint-limit-logo" src="${escapeHtml(logoUrl)}" alt="" />
                <div>
                  <div class="quickvint-limit-brand-name">AutoLister AI</div>
                  <div class="quickvint-limit-brand-sub">${escapeHtml(modalCopy.brandSub)}</div>
                </div>
              </div>
              <button type="button" class="quickvint-limit-close" aria-label="${escapeHtml(modalCopy.close)}">&times;</button>
            </div>
            <div class="quickvint-limit-top">
              <span class="quickvint-limit-kicker">${escapeHtml(modalCopy.kicker)}</span>
            </div>
            <h2 class="quickvint-limit-title" id="quickvint-limit-title">${escapeHtml(modalCopy.title)}</h2>
            <p class="quickvint-limit-copy">${escapeHtml(modalCopy.body)}</p>
            <div class="quickvint-limit-offer" aria-label="${escapeHtml(discountLabel)}">
              <div>
                <div class="quickvint-limit-offer-main">${escapeHtml(discountLabel)}</div>
                <div class="quickvint-limit-offer-sub">${escapeHtml(modalCopy.offerSub)}</div>
              </div>
              ${
                couponCode
                  ? `<button type="button" class="quickvint-limit-code" aria-label="${escapeHtml(modalCopy.copyCoupon)} ${escapeHtml(couponCode)}">${escapeHtml(couponCode)}</button>`
                  : ""
              }
            </div>
            <ul class="quickvint-limit-points">
              <li><span class="quickvint-limit-check">✓</span><span>${escapeHtml(modalCopy.noAccount)}</span></li>
              <li><span class="quickvint-limit-check">✓</span><span>${escapeHtml(modalCopy.stripe)}</span></li>
            </ul>
            <div class="quickvint-limit-actions">
              <button type="button" class="quickvint-limit-primary">${escapeHtml(modalCopy.primary)}</button>
              <button type="button" class="quickvint-limit-secondary">${escapeHtml(modalCopy.secondary)}</button>
            </div>
            <button type="button" class="quickvint-limit-feedback">${escapeHtml(modalCopy.feedback)}</button>
          </div>
        </div>
      `;

      function finish(choice, extra = {}) {
        window.removeEventListener("resize", onReposition);
        window.removeEventListener("scroll", onReposition, true);
        modal.remove();
        activeFloatingPromptType = null;
        activeLimitFollowupOfferCleanup = null;
        resolve({ choice, ...extra });
      }

      const onReposition = () => positionLimitFollowupOfferModal(modal, anchorInput);
      window.addEventListener("resize", onReposition);
      window.addEventListener("scroll", onReposition, true);
      activeLimitFollowupOfferCleanup = finish;
      modal
        .querySelector(".quickvint-limit-close")
        ?.addEventListener("click", () => finish("dismiss"));
      modal
        .querySelector(".quickvint-limit-secondary")
        ?.addEventListener("click", () => finish("dismiss"));
      modal
        .querySelector(".quickvint-limit-primary")
        ?.addEventListener("click", () => {
          const checkoutWindow = offer.checkoutType
            ? window.open("about:blank", "_blank")
            : null;
          finish(offer.checkoutType ? "checkout" : "open", { checkoutWindow });
        });
      modal
        .querySelector(".quickvint-limit-feedback")
        ?.addEventListener("click", () => finish("feedback"));
      modal
        .querySelector(".quickvint-limit-code")
        ?.addEventListener("click", async (event) => {
          const button = event.currentTarget;
          const previousText = button.textContent;
          try {
            await navigator.clipboard?.writeText(couponCode);
            button.textContent = modalCopy.copied;
            trackGrowthEvent("limit_followup_coupon_copied", {
              campaignKey: offer.campaignKey,
              couponCode,
            });
            setTimeout(() => {
              if (document.body.contains(button)) button.textContent = previousText;
            }, 1600);
          } catch (error) {
            button.textContent = couponCode;
          }
        });

      document.body.appendChild(modal);
      positionLimitFollowupOfferModal(modal, anchorInput);
      modal.querySelector(".quickvint-limit-primary")?.focus();
    });
  }

  async function maybeShowPendingLimitFollowupOffer({
    allowDuringDraft = false,
    reason = "auto",
  } = {}) {
    const offer = pendingLimitFollowupOffer;
    if (!offer) return false;
    if (document.visibilityState === "hidden") {
      return false;
    }
    if (activeFloatingPromptType || isPromptBlockingModalOpen()) {
      return false;
    }
    if (await isOfferLocallyDismissed(offer)) {
      pendingLimitFollowupOffer = null;
      return false;
    }
    if (await wasOfferShownRecently(offer)) {
      return false;
    }

    const anchorInput = getPromptAnchorInput();
    if (!anchorInput) {
      return false;
    }
    if (!allowDuringDraft && isListingDraftInProgress()) {
      return false;
    }

    const languageContext = await resolvePreferredUiLanguageContext(offer.copyKey);
    await markOfferShownLocally(offer);
    trackGrowthEvent("limit_followup_offer_shown", {
      campaignKey: offer.campaignKey,
      couponCode: offer.couponCode,
      limitHitAt: offer.limitHitAt,
      reason,
      languageCode: languageContext.languageCode,
      languageSource: languageContext.languageSource,
      hasExplicitLanguagePreference:
        languageContext.hasExplicitLanguagePreference,
    });

    const result = await showLimitFollowupOfferModal(
      offer,
      anchorInput,
      languageContext.copy,
    );
    const choice = result?.choice || result;

    if (choice === "feedback") {
      await dismissOfferLocally(offer);
      pendingLimitFollowupOffer = null;
      trackGrowthEvent("limit_followup_offer_feedback_click", {
        campaignKey: offer.campaignKey,
        couponCode: offer.couponCode,
        limitHitAt: offer.limitHitAt,
      });
      openReportModal({
        source: "limit_followup_offer",
        category: "idea",
        placeholder: languageContext.copy.feedbackPlaceholder,
      });
    }

    if (choice === "open") {
      await dismissOfferLocally(offer);
      pendingLimitFollowupOffer = null;
      trackGrowthEvent("limit_followup_offer_click", {
        campaignKey: offer.campaignKey,
        couponCode: offer.couponCode,
        limitHitAt: offer.limitHitAt,
      });
      window.open(offer.pricingUrl, "_blank", "noopener,noreferrer");
    }

    if (choice === "checkout") {
      await dismissOfferLocally(offer);
      pendingLimitFollowupOffer = null;
      trackGrowthEvent("checkout_start", {
        source: "extension_limit_followup_offer",
        tier: offer.tier,
        checkoutType: offer.checkoutType,
        campaignKey: offer.campaignKey,
      });
      try {
        const checkoutUrl = await createCheckoutForPaywall(
          offer,
          "extension_limit_followup_offer",
        );
        trackGrowthEvent("checkout_opened", {
          source: "extension_limit_followup_offer",
          tier: offer.tier,
          checkoutType: offer.checkoutType,
          campaignKey: offer.campaignKey,
        });
        if (result?.checkoutWindow) {
          result.checkoutWindow.location.href = checkoutUrl;
        } else {
          window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        result?.checkoutWindow?.close?.();
        trackGrowthEvent("checkout_failed", {
          source: "extension_limit_followup_offer",
          tier: offer.tier,
          checkoutType: offer.checkoutType,
          campaignKey: offer.campaignKey,
          reason: error.reason || null,
          status: error.status || null,
          message: error.message || "Unable to open the payment page.",
        });
        showToast(
          error.message || "Unable to open the payment page. Please try again.",
          "error",
        );
      }
    }

    if (choice === "dismiss") {
      await dismissOfferLocally(offer);
      pendingLimitFollowupOffer = null;
      trackGrowthEvent("limit_followup_offer_dismissed", {
        campaignKey: offer.campaignKey,
        couponCode: offer.couponCode,
        limitHitAt: offer.limitHitAt,
      });
    }

    return true;
  }

  function isListingDraftInProgress() {
    const titleInput = document.querySelector(SELECTORS.title);
    const descriptionInput = document.querySelector(SELECTORS.description);
    return Boolean(
      titleInput?.value?.trim() ||
        descriptionInput?.value?.trim() ||
        getVisibleUploadedPhotoCount() > 0,
    );
  }

  function maybeShowPendingPrompts(options = {}) {
    maybeShowPendingGenerationOffer().then((shown) => {
      if (!shown) {
        maybeShowPendingLimitFollowupOffer(options);
      }
    });
  }

  async function maybeFetchAndShowLimitFollowupOffer({
    force = false,
    allowDuringDraft = false,
    reason = "auto",
    onlyCopyKey = null,
  } = {}) {
    if (!isAuthenticated || !generateBtn) return;

    try {
      const copyKeysToCheck = onlyCopyKey
        ? [onlyCopyKey]
        : [STARTER_DAILY_LIMIT_OFFER_COPY_KEY, FREE_LIMIT_OFFER_COPY_KEY];

      const { userProfile = null } = await chrome.storage.local.get("userProfile");
      let usageSnapshot = null;
      const getUsageForOfferCheck = async () => {
        if (!usageSnapshot) {
          usageSnapshot = await getCurrentUserUsageSnapshot();
        }
        return usageSnapshot;
      };

      for (const copyKey of copyKeysToCheck) {
        const checkedKey = `return:${copyKey}`;
        if (!force && limitFollowupOfferChecked.has(checkedKey)) continue;
        if (!force) limitFollowupOfferChecked.add(checkedKey);

        const campaignKey = getOfferCampaignKey(copyKey);
        const localOfferKey = { campaignKey };
        if (await isOfferLocallyDismissed(localOfferKey)) continue;
        if (await wasOfferShownRecently(localOfferKey)) continue;

        let source = "local_free_limit_profile";
        let eligible = false;
        if (copyKey === STARTER_DAILY_LIMIT_OFFER_COPY_KEY) {
          const usage = await getUsageForOfferCheck();
          eligible = hasLocalStarterDailyLimitReached(userProfile, usage);
          source = "local_starter_daily_usage";
        } else {
          if (!(await hasLimitPaywallBeenSeenLocally(copyKey))) continue;
          const usage = await getUsageForOfferCheck();
          eligible = hasLocalFreeLimitReached(userProfile, usage);
          source = "local_free_limit_after_paywall";
        }

        if (!eligible) continue;
        if (!allowDuringDraft && isListingDraftInProgress()) continue;

        const offer = {
          campaignKey,
          copyKey,
          couponCode:
            copyKey === STARTER_DAILY_LIMIT_OFFER_COPY_KEY
              ? ""
              : LIMIT_FOLLOWUP_COUPON_CODE,
          discountLabel:
            copyKey === STARTER_DAILY_LIMIT_OFFER_COPY_KEY
              ? "Pro: 25/day and 250/month"
              : LIMIT_FOLLOWUP_COPY.en.discount,
          pricingUrl: await getPricingUrl(),
          limitHitAt: new Date().toISOString(),
          ...(copyKey === STARTER_DAILY_LIMIT_OFFER_COPY_KEY
            ? {
                tier: "pro",
                checkoutType: "subscription",
              }
            : {}),
        };

        if (await isOfferLocallyDismissed(offer)) continue;
        if (await wasOfferShownRecently(offer)) continue;

        pendingLimitFollowupOffer = offer;
        maybeShowPendingPrompts({ allowDuringDraft, reason });
        trackGrowthEvent("limit_followup_offer_loaded", {
          reason,
          campaignKey: offer.campaignKey,
          source,
        });
        return;
      }
    } catch (error) {
      console.debug("AutoLister AI: limit follow-up offer skipped", error);
    }
  }

  async function queueGenerationOffers(offers = []) {
    const offer = Array.isArray(offers) ? offers[0] : null;
    if (!offer?.id || !offer?.campaignKey) return false;
    if (await isOfferLocallyDismissed(offer)) return false;
    pendingGenerationOffer = offer;
    maybeShowPendingPrompts();
    return true;
  }

  // --- CORE LOGIC & EVENT HANDLERS ---

  // --- PHONE UPLOAD LOGIC ---

  function generateSessionId() {
    return "sess_" + Math.random().toString(36).substring(2, 15);
  }

  async function createModal(sessionId) {
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.dataset.sessionId = sessionId;

    const uploadUrl = `${PHONE_UPLOAD_PAGE}?s=${sessionId}`;

    // Get saved language preferences. Fall back to the legacy single language setting.
    const languageStorage = await chrome.storage.local.get([
      "selectedLanguage",
      "selectedTitleLanguage",
      "selectedDescriptionLanguage",
    ]);
    const languagePreferences =
      resolveListingLanguagePreferences(languageStorage);
    const selectedModalTitleLanguage = languagePreferences.titleLanguageCode;
    const selectedModalDescriptionLanguage =
      languagePreferences.descriptionLanguageCode;

    const selectedTitleLanguageOption =
      LANGUAGE_OPTIONS.find((lang) => lang.code === selectedModalTitleLanguage) ||
      LANGUAGE_OPTIONS[0];
    const selectedDescriptionLanguageOption =
      LANGUAGE_OPTIONS.find(
        (lang) => lang.code === selectedModalDescriptionLanguage,
      ) ||
      LANGUAGE_OPTIONS[0];

    const buildOptionsHTML = (selectedCode) =>
      LANGUAGE_OPTIONS
      .map(
        (lang) =>
          `<option value="${lang.code}" ${
            lang.code === selectedCode ? "selected" : ""
          }>${lang.name}</option>`,
      )
      .join("");

    modal.innerHTML = `
      <div class="modal-content">
        <button class="close-x" aria-label="Close">&times;</button>
        <div class="modal-header">
          <h3>📱 Upload from Phone</h3>
          <span class="feature-pill">NEW · Free to test</span>
        </div>
        <p class="subtitle">Scan with your camera app</p>
        <div class="qr-container">
          <img id="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            uploadUrl,
          )}" alt="QR Code" />
        </div>
        <p class="instruction">Photos will appear in this listing automatically</p>
        <div class="phone-previews" aria-live="polite">
          <div class="preview-header">
            <span>Photos</span>
            <span class="preview-extra"></span>
          </div>
          <div class="preview-grid">
            <span class="preview-empty">
              <span class="preview-pulse"></span>
              <span>Waiting for photos<span class="waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
            </span>
          </div>
        </div>
        <div class="language-selector">
          <div class="language-select-wrapper">
            <span class="language-select-label">Title</span>
            <img
              class="modal-flag-icon modal-title-flag-icon"
              src="https://flagcdn.com/w40/${selectedTitleLanguageOption.flag}.png"
              alt="${selectedTitleLanguageOption.flagAlt}"
            />
            <select class="language-select" id="modal-title-language-select">
              ${buildOptionsHTML(selectedTitleLanguageOption.code)}
            </select>
          </div>
          <div class="language-select-wrapper">
            <span class="language-select-label">Description</span>
            <img
              class="modal-flag-icon modal-description-flag-icon"
              src="https://flagcdn.com/w40/${selectedDescriptionLanguageOption.flag}.png"
              alt="${selectedDescriptionLanguageOption.flagAlt}"
            />
            <select class="language-select" id="modal-description-language-select">
              ${buildOptionsHTML(selectedDescriptionLanguageOption.code)}
            </select>
          </div>
        </div>
        <div class="status waiting">Waiting for photos from your phone...</div>
        <div class="modal-buttons">
          <button class="close-btn">Done</button>
          <button class="generate-btn quickvint-generation-action">
            <span class="icon" style="width: 14px; height: 14px; display: inline-block;">${WAND_ICON_SVG}</span>
            ${mirageLoaderSvg("quickvint-mirage-phone")}
            <span class="label">Done + Generate</span>
          </button>
        </div>
        <div class="disclaimer">
          <strong>Note:</strong> This feature will soon be available exclusively to Pro & Business plans.
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup language selectors
    const setupModalLanguageSelect = (selector, flagSelector, storageKey) => {
      const languageSelect = modal.querySelector(selector);
      const languageFlag = modal.querySelector(flagSelector);
      if (!languageSelect) return;
      languageSelect.addEventListener("change", (e) => {
        const selectedOption = LANGUAGE_OPTIONS.find(
          (lang) => lang.code === e.target.value,
        );
        if (languageFlag && selectedOption) {
          languageFlag.src = `https://flagcdn.com/w40/${selectedOption.flag}.png`;
          languageFlag.alt = selectedOption.flagAlt;
        }
        chrome.storage.local.set({
          [storageKey]: e.target.value,
          [LANGUAGE_PREFERENCE_TOUCHED_KEY]: true,
        });
      });
    };
    setupModalLanguageSelect(
      "#modal-title-language-select",
      ".modal-title-flag-icon",
      "selectedTitleLanguage",
    );
    setupModalLanguageSelect(
      "#modal-description-language-select",
      ".modal-description-flag-icon",
      "selectedDescriptionLanguage",
    );

    // Close button handlers
    modal.querySelector(".close-x").addEventListener("click", requestCloseModal);
    modal.querySelector(".close-btn").addEventListener("click", requestCloseModal);
    modal.querySelector(".generate-btn").addEventListener("click", (event) => {
      handlePhoneUploadModalGenerate(event.currentTarget);
    });

    // Close when clicking outside modal (on backdrop)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        requestCloseModal();
      }
    });

    return modal;
  }

  function requestCloseModal() {
    if (isPhoneUploadGenerateInFlight) {
      showToast("Generation is running. Wait a moment.", "info");
      return false;
    }
    if (
      getIncompletePhoneUploadState() &&
      !window.confirm("Stop receiving photos? Photos already added will stay.")
    ) {
      return false;
    }
    closeModal({ cancelUpload: Boolean(getIncompletePhoneUploadState()) });
    return true;
  }

  async function handlePhoneUploadModalGenerate(button) {
    if (isPhoneUploadGenerateInFlight) return;

    const hasPhoneUploadPhotos =
      downloadedFiles.size > 0 ||
      phoneUploadPreviewUrls.length > 0 ||
      getPhoneUploadVisibleAddedCount() > 0 ||
      Number(lastPhoneUploadState?.expectedCount || 0) > 0;
    if (!hasPhoneUploadPhotos) {
      showToast("Add photos first.", "info");
      return;
    }
    if (getIncompletePhoneUploadState()) {
      showToast("Still uploading. Wait a moment.", "info");
      return;
    }

    const restoreGenerateButton = setActionButtonLoading(button, "Generating");
    isPhoneUploadGenerateInFlight = true;

    try {
      markPhoneUploadCapturedReadyForGeneration();
      trackGrowthEvent("phone_upload_generate_ready", {
        mode: "single",
        source: "modal",
        ...getPhoneUploadDebugContext(),
      });

      const descInputBeforeGenerate = document.querySelector(
        SELECTORS.description,
      );
      const descriptionApplyChoice = descInputBeforeGenerate
        ? await getDescriptionApplyChoice(descInputBeforeGenerate)
        : "replace";

      if (descriptionApplyChoice === "cancel") {
        trackGrowthEvent("generate_cancelled", {
          reason: "description_apply_choice",
        });
        restoreGenerateButton();
        return;
      }

      await generateCurrentListing({
        descriptionApplyChoice,
        manageButtonState: true,
        showMeasurementAdvice: true,
      });
      closeModal({ generated: true });
    } catch (err) {
      restoreGenerateButton();
    } finally {
      isPhoneUploadGenerateInFlight = false;
    }
  }

  function closeModal({ cancelUpload = false, generated = false } = {}) {
    const modal = document.getElementById(MODAL_ID);
    const sessionId = modal?.dataset?.sessionId || activePhoneUploadSessionId;
    rememberPhoneUploadState(sessionId);
    if (!cancelUpload) {
      markPhoneUploadCapturedReadyForGeneration();
    }
    const keepSessionAlive =
      !cancelUpload &&
      !generated &&
      (Boolean(getIncompletePhoneUploadState()) ||
        hasReadyPhoneUploadCapturedFiles(sessionId) ||
        hasReadyPhoneUploadCapturedFilesPendingDomAttach(sessionId));
    if (modal) {
      modal.remove();
    }
    if (!keepSessionAlive) {
      finishPhoneUploadSession(sessionId);
    }

    maybeShowPendingPrompts();
  }

  function hasReadyPhoneUploadCapturedFiles(sessionId) {
    if (!sessionId || activePhoneUploadSessionId !== sessionId) return false;
    const capturedUpload = getActiveCapturedPromptUpload();
    return Boolean(
      capturedUpload &&
        capturedUpload.source === "phone_upload_single" &&
        capturedUpload.serverComplete === true &&
        capturedUpload.currentSetTrusted !== false &&
        capturedUpload.files.length > 0,
    );
  }

  function hasReadyPhoneUploadCapturedFilesPendingDomAttach(sessionId) {
    if (!hasReadyPhoneUploadCapturedFiles(sessionId)) return false;
    const capturedUpload = getActiveCapturedPromptUpload();
    return capturedUpload.files.length > getVisibleUploadedPhotoCount();
  }

  function finishPhoneUploadSession(sessionId) {
    invalidateCapturedPromptUploadGenerationUrls(
      sessionId,
      "phone_upload_session_finished",
    );

    if (activePhoneUploadSessionId === sessionId) {
      activePhoneUploadSessionId = null;
    }
    if (lastPhoneUploadState?.sessionId === sessionId) {
      lastPhoneUploadState = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (phoneUploadAutoCloseTimer) {
      clearTimeout(phoneUploadAutoCloseTimer);
      phoneUploadAutoCloseTimer = null;
    }
    resetPhoneUploadTransientState();
    updateButtonUI();

    if (sessionId && chrome.runtime?.id) {
      sendMessage({
        type: "PROXY_FETCH",
        url: `${PHONE_UPLOAD_API}?action=cleanup&sessionId=${sessionId}`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      }).catch(() => {});
    }
  }

  function resetPhoneUploadTransientState() {
    downloadedFiles.clear();
    pendingPhoneFiles.clear();
    lastPhoneUploadBlockedTrackKey = null;
    lastPhoneUploadReadyTrackKey = null;
    isPhoneUploadPollInFlight = false;
    if (phoneUploadPreviewTimer) {
      clearTimeout(phoneUploadPreviewTimer);
      phoneUploadPreviewTimer = null;
    }
    phoneUploadPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    phoneUploadPreviewUrls = [];
    displayedPhoneUploadPreviewCount = 0;
  }

  async function onPhoneUploadClick(capacity) {
    if (!isAuthenticated) {
      showToast("Please sign in via the extension popup first.", "error");
      return;
    }

    const available = Math.max(0, Math.floor(Number(capacity.available || 0)));

    if (document.getElementById(MODAL_ID)) {
      closeModal();
    }

    const incompletePhoneUpload = getIncompletePhoneUploadState();
    if (
      incompletePhoneUpload?.sessionId &&
      activePhoneUploadSessionId === incompletePhoneUpload.sessionId
    ) {
      trackGrowthEvent("phone_upload_resume", {
        mode: "single",
        sessionId: incompletePhoneUpload.sessionId,
      });
      await createModal(incompletePhoneUpload.sessionId);
      updatePhoneUploadStatus(
        document.querySelector(`#${MODAL_ID} .status`),
        incompletePhoneUpload.initialImageCount,
      );
      renderPhoneUploadPreviews();
      return;
    }

    const sessionId = generateSessionId();
    trackGrowthEvent("phone_upload_start", {
      mode: "single",
      available,
      sessionId,
    });
    await createModal(sessionId);
    startPolling(sessionId);
  }

  function startPolling(sessionId) {
    activePhoneUploadSessionId = sessionId;

    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    resetPhoneUploadTransientState();

    const statusEl = document.querySelector(`#${MODAL_ID} .status`);
    const initialImageCount = getVisibleUploadedPhotoCount();
    lastPhoneUploadState = {
      sessionId,
      initialImageCount,
      receivedCount: 0,
      expectedCount: null,
      complete: false,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    schedulePhoneUploadAutoClose(sessionId);

    pollInterval = setInterval(async () => {
      if (isPhoneUploadPollInFlight) return;

      try {
        isPhoneUploadPollInFlight = true;

        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          clearInterval(pollInterval);
          pollInterval = null;
          return;
        }

        const response = await sendMessage({
          type: "PROXY_FETCH",
          url: `${PHONE_UPLOAD_API}?sessionId=${sessionId}&t=${Date.now()}`,
          options: { method: "GET" },
        });

        if (!isPhoneUploadSessionActive(sessionId)) {
          return;
        }

        if (!response || !response.ok) return;

        const data =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;
        updateLastPhoneUploadState(sessionId, data, initialImageCount);
        updateButtonUI();
        const remoteFiles = getPhoneUploadPhotoFiles(data?.files);
        if (remoteFiles.length > 0) {
          const newRemoteFiles = remoteFiles.filter((file) => {
            const fileKey = getPhoneUploadFileKey(file);
            return (
              fileKey &&
              !downloadedFiles.has(fileKey) &&
              !pendingPhoneFiles.has(fileKey)
            );
          });

          if (newRemoteFiles.length > 0) {
            schedulePhoneUploadAutoClose(sessionId);
            newRemoteFiles.forEach((file) =>
              pendingPhoneFiles.add(getPhoneUploadFileKey(file)),
            );

            updatePhoneUploadStatus(statusEl, initialImageCount);

            try {
              const downloads = await Promise.all(
                newRemoteFiles.map(downloadPhoneUploadFile),
              );

              if (!isPhoneUploadSessionActive(sessionId)) {
                downloads.forEach((result) => {
                  if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
                });
                return;
              }

              const successfulDownloads = downloads.filter((result) => result.file);
              const filesToInject = successfulDownloads.map((result) => result.file);
              const failedDownloads = downloads.filter((result) => !result.file);
              const failedDownloadCount = failedDownloads.length;

              if (failedDownloadCount > 0) {
                trackGrowthEvent("phone_upload_download_error", {
                  mode: "single",
                  failedDownloadCount,
                  failedFiles: failedDownloads
                    .slice(0, 3)
                    .map((result) => ({
                      key: result.key,
                      name: result.name || null,
                      error: result.error || null,
                    })),
                  ...getPhoneUploadDebugContext(),
                });
              }

              if (filesToInject.length > 0) {
                if (
                  injectFilesIntoVinted(filesToInject, "phone_upload_single", {
                    generateUrls: successfulDownloads.map(
                      (result) => result.generateUrl,
                    ),
                    storageSessionId: sessionId,
                  })
                ) {
                  downloads.forEach((result) => {
                    if (result.file) {
                      downloadedFiles.add(result.key);
                      if (result.previewUrl) {
                        phoneUploadPreviewUrls.push(result.previewUrl);
                      }
                    }
                  });
                  schedulePhoneUploadPreviewReveal();
                } else {
                  trackGrowthEvent("phone_upload_inject_error", {
                    mode: "single",
                    receivedCount: filesToInject.length,
                    failedDownloadCount,
                    ...getPhoneUploadDebugContext(),
                  });
                  downloads.forEach((result) => {
                    if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
                  });
                }
              }
            } finally {
              newRemoteFiles.forEach((file) =>
                pendingPhoneFiles.delete(getPhoneUploadFileKey(file)),
              );
            }
          }

          updatePhoneUploadStatus(statusEl, initialImageCount);
          updateButtonUI();
        } else {
          // No files yet, show waiting message
          if (statusEl && downloadedFiles.size === 0) {
            statusEl.className = "status waiting";
            statusEl.textContent = "Waiting for photos from your phone...";
          } else if (statusEl && downloadedFiles.size > 0) {
            updatePhoneUploadStatus(statusEl, initialImageCount);
          }
        }
        updateButtonUI();
        if (
          activePhoneUploadSessionId === sessionId &&
          !document.getElementById(MODAL_ID) &&
          !getIncompletePhoneUploadState() &&
          !hasReadyPhoneUploadCapturedFiles(sessionId) &&
          !hasReadyPhoneUploadCapturedFilesPendingDomAttach(sessionId)
        ) {
          finishPhoneUploadSession(sessionId);
        }
      } catch (err) {
        console.error("Polling error:", err);
      } finally {
        if (activePhoneUploadSessionId === sessionId) {
          isPhoneUploadPollInFlight = false;
        }
      }
    }, 3000);

  }

  function schedulePhoneUploadAutoClose(sessionId) {
    if (phoneUploadAutoCloseTimer) {
      clearTimeout(phoneUploadAutoCloseTimer);
      phoneUploadAutoCloseTimer = null;
    }

    // Auto-close after 5 minutes of inactivity (silent, no alert)
    phoneUploadAutoCloseTimer = setTimeout(
      () => {
        if (isPhoneUploadSessionActive(sessionId)) {
          closeModal();
        }
      },
      5 * 60 * 1000,
    );
  }

  function isPhoneUploadSessionActive(sessionId) {
    return activePhoneUploadSessionId === sessionId;
  }

  function getPhoneUploadFileKey(file) {
    if (!file) return "";
    const explicitKey = file.id || file.key || file.path || file.storagePath;
    if (explicitKey) return String(explicitKey);

    let stableUrl = file.url || "";
    try {
      const parsedUrl = new URL(file.url);
      stableUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    } catch (err) {
      // Keep the raw URL if it is not parseable.
    }

    return [file.name, stableUrl].filter(Boolean).join("|");
  }

  function isPhoneUploadSessionMarkerFile(file) {
    const rawName = String(file?.name || file?.path || file?.storagePath || "");
    const name = rawName.split("/").pop();
    return (
      name === "_batch-complete.json" ||
      /^_expected-count-\d+\.json$/.test(name)
    );
  }

  function getPhoneUploadPhotoFiles(files) {
    if (!Array.isArray(files)) return [];
    return files.filter((file) => !isPhoneUploadSessionMarkerFile(file));
  }

  async function downloadPhoneUploadFile(remoteFile) {
    const key = getPhoneUploadFileKey(remoteFile);
    try {
      const response = await sendMessage({
        type: "PROXY_FETCH",
        url: remoteFile.url,
        options: { method: "GET" },
        isBlob: true,
      });

      if (!response || !response.ok) {
        throw new Error(
          response ? response.error : "Failed to download image via proxy",
        );
      }

      const res = await fetch(response.data);
      const blob = await res.blob();
      const filename = remoteFile.name || `upload_${Date.now()}.jpg`;
      const file = new File([blob], filename, {
        type: blob.type || "image/jpeg",
      });
      const previewUrl = URL.createObjectURL(blob);

      return {
        key,
        file,
        previewUrl,
        generateUrl: remoteFile.url || null,
      };
    } catch (err) {
      const error = err?.message || String(err);
      console.warn("Phone upload image download failed", {
        key,
        name: remoteFile?.name || null,
        error,
      });
      return {
        key,
        name: remoteFile?.name || null,
        file: null,
        previewUrl: null,
        error,
      };
    }
  }

  function injectFilesIntoVinted(
    files,
    uploadSource = "autolister_injected_files",
    { generateUrls = [], storageSessionId = null } = {},
  ) {
    const fileInput = document.querySelector(SELECTORS.fileInput);
    if (!fileInput || files.length === 0) return false;

    registerPromptUploadFiles(files, uploadSource, {
      append: shouldAppendToCapturedPromptUpload(uploadSource),
      generateUrls,
      storageSessionId,
    });

    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));

    fileInput.files = dataTransfer.files;
    suppressNextFileInputCapture = true;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    setTimeout(() => {
      suppressNextFileInputCapture = false;
    }, 0);
    return true;
  }

  function updateLastPhoneUploadState(sessionId, data, initialImageCount) {
    if (!lastPhoneUploadState || lastPhoneUploadState.sessionId !== sessionId) {
      lastPhoneUploadState = {
        sessionId,
        initialImageCount,
        receivedCount: 0,
        expectedCount: null,
        complete: false,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    const responseCount = Number(data?.expectedCount || data?.count || 0);
    const responseFileCount = getPhoneUploadPhotoFiles(data?.files).length;
    const receivedCount = Math.max(
      downloadedFiles.size,
      responseFileCount,
    );
    const complete = data?.complete === true;
    const expectedCount = Math.max(
      Number(lastPhoneUploadState.expectedCount || 0),
      responseCount,
      complete ? responseFileCount : 0,
      complete ? downloadedFiles.size : 0,
    );
    lastPhoneUploadState.receivedCount = receivedCount;
    lastPhoneUploadState.expectedCount = expectedCount > 0 ? expectedCount : null;
    lastPhoneUploadState.complete = complete;
    lastPhoneUploadState.updatedAt = Date.now();

    if (expectedCount > 0) {
      const capturedUpload = getActiveCapturedPromptUpload();
      if (
        capturedUpload?.source === "phone_upload_single" &&
        capturedUpload.currentSetTrusted !== false &&
        capturedUpload.files.length >= Number(lastPhoneUploadState.expectedCount || 0)
      ) {
        capturedUpload.serverComplete = true;
      }
    }
  }

  function rememberPhoneUploadState(sessionId) {
    if (!lastPhoneUploadState || lastPhoneUploadState.sessionId !== sessionId) {
      return;
    }
    lastPhoneUploadState.receivedCount = Math.max(
      lastPhoneUploadState.receivedCount || 0,
      downloadedFiles.size,
    );
    lastPhoneUploadState.updatedAt = Date.now();
  }

  function getPhoneUploadVisibleAddedCount(state = lastPhoneUploadState) {
    if (!state) return 0;
    return Math.max(0, getVisibleUploadedPhotoCount() - state.initialImageCount);
  }

  function getPhoneUploadDebugContext(state = lastPhoneUploadState) {
    const capturedUpload = getActiveCapturedPromptUpload();
    return {
      sessionId: state?.sessionId || null,
      complete: state?.complete === true,
      receivedCount: Number(state?.receivedCount || 0),
      expectedCount: state?.expectedCount || null,
      downloadedCount: downloadedFiles.size,
      pendingCount: pendingPhoneFiles.size,
      previewCount: phoneUploadPreviewUrls.length,
      visibleAddedCount: getPhoneUploadVisibleAddedCount(state),
      capturedFileCount: capturedUpload?.files?.length || 0,
      capturedSource: capturedUpload?.source || null,
      capturedTrusted: capturedUpload
        ? capturedUpload.currentSetTrusted !== false
        : null,
      capturedServerComplete: capturedUpload?.serverComplete === true,
      readyCount: getPhoneUploadCapturedReadyCount(state),
    };
  }

  function trackPhoneUploadReady(reason) {
    const context = getPhoneUploadDebugContext();
    if (context.readyCount <= 0) return;

    const readyTrackKey = [
      context.sessionId,
      context.readyCount,
      context.downloadedCount,
      context.capturedFileCount,
    ].join(":");
    if (readyTrackKey === lastPhoneUploadReadyTrackKey) return;

    lastPhoneUploadReadyTrackKey = readyTrackKey;
    trackGrowthEvent("phone_upload_ready", {
      mode: "single",
      reason,
      ...context,
    });
  }

  function getPhoneUploadCapturedReadyCount(state = lastPhoneUploadState) {
    const capturedUpload = getActiveCapturedPromptUpload();
    if (
      !state ||
      capturedUpload?.source !== "phone_upload_single" ||
      capturedUpload.currentSetTrusted === false ||
      capturedUpload.files.length <= 0
    ) {
      return 0;
    }

    const readyCount = Number(state.expectedCount || 0);
    if (
      readyCount <= 0 ||
      pendingPhoneFiles.size > 0 ||
      downloadedFiles.size < readyCount ||
      capturedUpload.files.length < readyCount
    ) {
      return 0;
    }

    return readyCount;
  }

  function markPhoneUploadCapturedReadyForGeneration() {
    if (getPhoneUploadCapturedReadyCount() <= 0) return;
    const capturedUpload = getActiveCapturedPromptUpload();
    if (capturedUpload?.source === "phone_upload_single") {
      capturedUpload.serverComplete = true;
    }
    trackPhoneUploadReady("mark_ready");
  }

  function getIncompletePhoneUploadState() {
    const state = lastPhoneUploadState;
    if (!state) return null;
    if (Date.now() - state.startedAt > PHONE_UPLOAD_PENDING_GENERATE_BLOCK_MS) {
      return null;
    }

    const visibleAddedCount = getPhoneUploadVisibleAddedCount(state);
    const hasPhotosInFlight =
      (state.receivedCount || 0) > 0 ||
      Number(state.expectedCount || 0) > 0 ||
      downloadedFiles.size > 0 ||
      pendingPhoneFiles.size > 0 ||
      visibleAddedCount > 0;
    if (!hasPhotosInFlight) return null;

    if (getPhoneUploadCapturedReadyCount(state) > 0) return null;

    const expectedCount = Number(state.expectedCount || 0);
    return { ...state, expectedCount, visibleAddedCount };
  }

  function updatePhoneUploadStatus(statusEl, initialImageCount) {
    if (!statusEl) return;

    const sentCount = downloadedFiles.size;
    const expectedCount = Number(lastPhoneUploadState?.expectedCount || 0);
    const capturedReadyCount = getPhoneUploadCapturedReadyCount();

    statusEl.className = "status";
    if (capturedReadyCount > 0) {
      trackPhoneUploadReady("status");
      statusEl.classList.add("ready");
      statusEl.textContent = `${capturedReadyCount} photo${
        capturedReadyCount !== 1 ? "s" : ""
      } ready to generate.`;
    } else if (expectedCount > 0) {
      statusEl.innerHTML = `Receiving <span class="status-count">${Math.min(sentCount, expectedCount)}/${expectedCount}</span>`;
    } else if (sentCount === 0) {
      statusEl.className = "status waiting";
      statusEl.textContent = "Waiting for photos from your phone...";
    } else {
      statusEl.textContent = "Receiving...";
    }
  }

  function schedulePhoneUploadPreviewReveal() {
    if (phoneUploadPreviewTimer) return;
    if (displayedPhoneUploadPreviewCount >= phoneUploadPreviewUrls.length) return;

    phoneUploadPreviewTimer = setTimeout(() => {
      phoneUploadPreviewTimer = null;
      displayedPhoneUploadPreviewCount += 1;
      renderPhoneUploadPreviews();
      schedulePhoneUploadPreviewReveal();
    }, displayedPhoneUploadPreviewCount === 0 ? 80 : 180);
  }

  function createPhoneUploadEmptyState() {
    const emptyEl = document.createElement("span");
    emptyEl.className = "preview-empty";
    emptyEl.innerHTML = `
      <span class="preview-pulse"></span>
      <span>Waiting for photos<span class="waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
    `;
    return emptyEl;
  }

  function renderPhoneUploadPreviews() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    const previewsEl = modal.querySelector(".phone-previews");
    const gridEl = modal.querySelector(".preview-grid");
    const extraEl = modal.querySelector(".preview-extra");
    if (!previewsEl || !gridEl || !extraEl) return;

    const revealedCount = Math.min(
      displayedPhoneUploadPreviewCount,
      phoneUploadPreviewUrls.length,
    );
    const visibleUrls = phoneUploadPreviewUrls.slice(
      0,
      Math.min(revealedCount, MAX_PHONE_UPLOAD_PREVIEWS),
    );
    const hiddenCount = Math.max(
      0,
      revealedCount - MAX_PHONE_UPLOAD_PREVIEWS,
    );

    const existingThumbs = gridEl.querySelectorAll(".preview-thumb").length;
    if (revealedCount === 0) {
      gridEl.replaceChildren(createPhoneUploadEmptyState());
    } else {
      const emptyEl = gridEl.querySelector(".preview-empty");
      if (emptyEl) emptyEl.remove();

      visibleUrls.slice(existingThumbs).forEach((url, index) => {
        const thumbIndex = existingThumbs + index;
        const img = document.createElement("img");
        img.className = "preview-thumb";
        img.src = url;
        img.alt = `Uploaded photo ${thumbIndex + 1}`;
        gridEl.appendChild(img);
      });
    }

    let moreEl = gridEl.querySelector(".preview-more");
    if (hiddenCount > 0) {
      if (!moreEl) {
        moreEl = document.createElement("span");
        moreEl.className = "preview-more";
        gridEl.appendChild(moreEl);
      }
      moreEl.textContent = `+${hiddenCount}`;
    } else if (moreEl) {
      moreEl.remove();
    }

    extraEl.textContent = revealedCount > 0 ? String(revealedCount) : "";
  }

  // --- BATCH UPLOAD LOGIC ---

  function resetBatchState() {
    batchUploadSessionId = null;
    batchRemoteFiles = [];
    batchRemoteFileKeys = new Set();
    batchMarkedGroups = [];
    batchSelectedPhotoKeys = new Set();
    batchIsComplete = false;
    batchPhotoTileByKey = new Map();
    batchGroupRowById = new Map();
    batchNextGroupId = 1;
    batchLastFileCount = 0;
    batchLastFileChangeAt = 0;
    batchSignedUrlsListedAt = 0;
    batchProgressGroups = [];
    batchProgressStatus = null;
    batchGenerationCapacity = null;
    batchCapacityLoading = false;
    batchInputSource = null;
    batchComputerUploadPromise = null;
    batchComputerUploadAbortController = null;
    isBatchPollInFlight = false;
    batchImagePreloadUrls = new Set();
    batchImagePreloadCache = new Map();
  }

  function setBatchModalScrollLock(locked) {
    document.documentElement.classList.toggle("quickvint-batch-modal-open", locked);
    document.body?.classList.toggle("quickvint-batch-modal-open", locked);
  }

  function isBatchGenerationActive() {
    return Boolean(batchProgressStatus && isBatchProgressActive(batchProgressStatus));
  }

  function isBatchProgressFinished() {
    return Boolean(batchProgressStatus && !isBatchProgressActive(batchProgressStatus));
  }

  function removeClonedBatchUiForWorkTab() {
    if (!document.getElementById(BATCH_MODAL_ID)) return;

    document.getElementById(BATCH_MODAL_ID)?.remove();
    setBatchModalScrollLock(false);
    if (batchPollInterval) {
      clearInterval(batchPollInterval);
      batchPollInterval = null;
    }
    if (batchAutoCloseTimer) {
      clearTimeout(batchAutoCloseTimer);
      batchAutoCloseTimer = null;
    }
    resetBatchState();
  }

  function shouldWarnBeforeClosingBatch() {
    if (isBatchProgressFinished()) return false;

    return (
      isBatchGenerationActive() ||
      Boolean(batchComputerUploadPromise) ||
      batchRemoteFiles.length > 0 ||
      batchSelectedPhotoKeys.size > 0 ||
      batchMarkedGroups.length > 0
    );
  }

  function getBatchCloseWarningMessage() {
    if (isBatchGenerationActive()) {
      return "Batch generation is still running. Closing this panel will hide progress, but opened listing tabs may continue. Close anyway?";
    }

    if (batchComputerUploadPromise) {
      return "Photos are still uploading. Closing now will discard this batch upload. Close anyway?";
    }

    if (!batchIsComplete && batchRemoteFiles.length > 0) {
      return "Photos are still uploading. Closing now will discard this batch upload. Close anyway?";
    }

    return "Closing now will discard this batch setup, including uploaded photos and grouped items. Close anyway?";
  }

  function requestCloseBatchModal({ cleanup = true } = {}) {
    if (shouldWarnBeforeClosingBatch() && !window.confirm(getBatchCloseWarningMessage())) {
      return false;
    }

    closeBatchModal({
      cleanup: cleanup && !isBatchGenerationActive(),
    });
    return true;
  }

  function closeBatchModal({ cleanup = true } = {}) {
    const sessionId = batchUploadSessionId;
    const computerUpload = batchComputerUploadPromise;
    const computerUploadAbortController = batchComputerUploadAbortController;
    document.getElementById(BATCH_MODAL_ID)?.remove();
    setBatchModalScrollLock(false);
    computerUploadAbortController?.abort();

    if (batchPollInterval) {
      clearInterval(batchPollInterval);
      batchPollInterval = null;
    }
    if (batchAutoCloseTimer) {
      clearTimeout(batchAutoCloseTimer);
      batchAutoCloseTimer = null;
    }

    const cleanupSession = () =>
      sendMessage({
        type: "PROXY_FETCH",
        url: `${PHONE_UPLOAD_API}?action=cleanup&sessionId=${sessionId}`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      }).catch(() => {});
    if (cleanup && sessionId && chrome.runtime?.id) {
      if (computerUpload) {
        computerUpload.then(cleanupSession, cleanupSession);
      } else {
        cleanupSession();
      }
    }

    resetBatchState();
    maybeShowPendingPrompts();
  }

  function shouldKeepBatchUploadSessionOpen() {
    return (
      batchRemoteFiles.length > 0 ||
      batchSelectedPhotoKeys.size > 0 ||
      batchMarkedGroups.length > 0
    );
  }

  function scheduleBatchAutoClose(sessionId) {
    if (batchAutoCloseTimer) {
      clearTimeout(batchAutoCloseTimer);
      batchAutoCloseTimer = null;
    }

    if (shouldKeepBatchUploadSessionOpen()) return;

    batchAutoCloseTimer = setTimeout(() => {
      if (
        batchUploadSessionId === sessionId &&
        !shouldKeepBatchUploadSessionOpen()
      ) {
        closeBatchModal({ cleanup: true });
      }
    }, BATCH_UPLOAD_IDLE_TIMEOUT_MS);
  }

  async function onBatchUploadClick(capacity) {
    if (!isAuthenticated) {
      trackGrowthEvent("phone_upload_blocked", { reason: "signed_out" });
      showToast("Please sign in via the extension popup first.", "error");
      return;
    }

    if (document.getElementById(BATCH_MODAL_ID)) {
      const closed = requestCloseBatchModal({ cleanup: true });
      if (!closed) return;
    }

    resetBatchState();
    batchGenerationCapacity = capacity;

    const available = Math.max(
      0,
      Math.floor(Number(batchGenerationCapacity?.available || 0)),
    );
    if (!batchGenerationCapacity?.allowed || available <= 0) {
      await showBatchCapacityBlocked(batchGenerationCapacity);
      resetBatchState();
      return;
    }

    const sessionId = generateSessionId();
    batchUploadSessionId = sessionId;
    batchLastFileChangeAt = Date.now();
    trackGrowthEvent("phone_upload_start", { mode: "batch", available });
    createBatchModal(sessionId);
    startBatchPolling(sessionId);
  }

  function createBatchModal(sessionId) {
    const modal = document.createElement("div");
    modal.id = BATCH_MODAL_ID;
    modal.dataset.sessionId = sessionId;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "quickvint-batch-title");
    setBatchModalScrollLock(true);

    modal.innerHTML = `
      <div class="batch-content">
        <div class="batch-topbar">
          <div class="batch-heading">
            <div class="batch-title-row">
              <h3 id="quickvint-batch-title" class="batch-title">Batch upload</h3>
            </div>
            <p class="batch-subtitle" hidden></p>
          </div>
          <button class="batch-close" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="batch-body"></div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector(".batch-close")?.addEventListener("click", () => {
      requestCloseBatchModal({ cleanup: true });
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) requestCloseBatchModal({ cleanup: true });
    });

    renderBatchUploadPhase(sessionId);
  }

  function getBatchUploadUrl(sessionId) {
    return `${PHONE_UPLOAD_PAGE}?s=${sessionId}&mode=batch`;
  }

  function getBatchBody() {
    return document.querySelector(`#${BATCH_MODAL_ID} .batch-body`);
  }

  function renderBatchUploadPhase(sessionId) {
    const body = getBatchBody();
    if (!body) return;
    document.getElementById(BATCH_MODAL_ID)?.classList.remove("organizing", "generating");
    const titleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-title`);
    const subtitleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-subtitle`);
    if (titleEl) titleEl.textContent = "Batch upload";
    if (subtitleEl) {
      subtitleEl.hidden = true;
      subtitleEl.textContent = "";
    }
    document
      .querySelector(`#${BATCH_MODAL_ID} .organize-progress`)
      ?.remove();

    const uploadUrl = getBatchUploadUrl(sessionId);
    body.innerHTML = `
      <div class="batch-source-grid">
        <section class="batch-source-panel batch-source-phone batch-wait-panel">
          <div class="batch-source-kicker">From your phone</div>
          <div class="batch-source-phone-content">
            <div class="batch-qr">
              <div class="batch-qr-placeholder" data-qr-src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                uploadUrl,
              )}"></div>
            </div>
            <div class="batch-source-copy">
              <div class="batch-wait-title">Scan QR code</div>
              <div class="batch-wait-copy">Choose photos. Keep page open.</div>
            </div>
          </div>
        </section>
        <section class="batch-source-panel batch-source-computer">
          <div class="batch-source-kicker">From this computer</div>
          <label class="batch-computer-dropzone">
            <input class="batch-computer-files-input" type="file" accept="image/*" multiple />
            <span class="batch-computer-icon" aria-hidden="true">${BATCH_ICON_SVG}</span>
            <strong>Drop photos or a folder</strong>
          </label>
          <div class="batch-computer-actions">
            <button type="button" class="primary batch-choose-files">Choose photos</button>
            <button type="button" class="batch-choose-folder">Choose folder</button>
            <input class="batch-computer-folder-input" type="file" accept="image/*" webkitdirectory multiple hidden />
          </div>
        </section>
      </div>
      <div class="batch-actions">
        <button type="button" class="batch-cancel">Cancel</button>
        <button type="button" class="primary batch-group" disabled hidden>Group photos</button>
      </div>
    `;

    requestAnimationFrame(() => {
      const placeholder = body.querySelector(".batch-qr-placeholder");
      if (!placeholder?.dataset.qrSrc) return;
      const img = document.createElement("img");
      img.alt = "Batch upload QR Code";
      img.onload = () => {
        placeholder.replaceWith(img);
      };
      img.onerror = () => {
        placeholder.classList.add("error");
      };
      img.src = placeholder.dataset.qrSrc;
    });

    body.querySelector(".batch-cancel")?.addEventListener("click", () => {
      requestCloseBatchModal({ cleanup: true });
    });
    body.querySelector(".batch-group")?.addEventListener("click", () => {
      renderBatchGroupingPhase();
    });
    body.querySelector(".batch-choose-files")?.addEventListener("click", () => {
      body.querySelector(".batch-computer-files-input")?.click();
    });
    body.querySelector(".batch-choose-folder")?.addEventListener("click", () => {
      body.querySelector(".batch-computer-folder-input")?.click();
    });
    body
      .querySelectorAll(".batch-computer-files-input, .batch-computer-folder-input")
      .forEach((input) => {
        input.addEventListener("change", () => {
          queueBatchComputerUpload(input.files);
          input.value = "";
        });
      });
    const dropzone = body.querySelector(".batch-computer-dropzone");
    dropzone?.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone?.addEventListener("dragleave", () => {
      dropzone.classList.remove("is-dragging");
    });
    dropzone?.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      queueBatchComputerUpload(getDroppedBatchFiles(event.dataTransfer), {
        preserveOrder: true,
        readErrorMessage: "Could not read that folder. Try choosing it instead.",
      });
    });
    renderBatchUploadStrip();
  }

  function isBatchImageFile(file) {
    return (
      file instanceof File &&
      (String(file.type || "").startsWith("image/") ||
        /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name || ""))
    );
  }

  function sortBatchComputerFiles(fileList) {
    const files = Array.from(fileList || []).filter(isBatchImageFile);
    if (
      !files.some(
        (file) => file.webkitRelativePath || file.__quickvintRelativePath,
      )
    ) {
      return files;
    }
    return files.sort((a, b) =>
      String(
        a.webkitRelativePath || a.__quickvintRelativePath || a.name || "",
      ).localeCompare(
        String(
          b.webkitRelativePath || b.__quickvintRelativePath || b.name || "",
        ),
        undefined,
        { numeric: true, sensitivity: "base" },
      ),
    );
  }

  function readDroppedBatchEntry(entry) {
    if (entry?.isFile) {
      return new Promise((resolve, reject) => {
        entry.file((file) => {
          Object.defineProperty(file, "__quickvintRelativePath", {
            configurable: true,
            value: String(entry.fullPath || file.name || "").replace(/^\//, ""),
          });
          resolve([file]);
        }, reject);
      });
    }
    if (!entry?.isDirectory) return Promise.resolve([]);

    const reader = entry.createReader();
    return new Promise((resolve, reject) => {
      const entries = [];
      const readNext = () => {
        reader.readEntries((batch) => {
          if (batch.length) {
            entries.push(...batch);
            readNext();
            return;
          }
          Promise.all(entries.map(readDroppedBatchEntry))
            .then((groups) => resolve(groups.flat()))
            .catch(reject);
        }, reject);
      };
      readNext();
    });
  }

  async function getDroppedBatchFiles(dataTransfer) {
    const entries = Array.from(dataTransfer?.items || [])
      .map((item) => item.webkitGetAsEntry?.())
      .filter(Boolean);
    if (!entries.length) return Array.from(dataTransfer?.files || []);
    const groups = await Promise.all(
      entries.map(async (entry) => {
        const files = await readDroppedBatchEntry(entry);
        return entry.isDirectory
          ? sortBatchComputerFiles(files)
          : files.filter(isBatchImageFile);
      }),
    );
    return groups.flat();
  }

  function queueBatchComputerUpload(
    files,
    { preserveOrder = false, readErrorMessage = "" } = {},
  ) {
    if (batchComputerUploadPromise || batchInputSource) return;
    const modal = document.getElementById(BATCH_MODAL_ID);
    const sourceSessionId = batchUploadSessionId;
    const pendingFiles = files instanceof Promise ? files : Array.from(files || []);
    const upload = Promise.resolve(pendingFiles)
      .then((resolvedFiles) => {
        if (
          document.getElementById(BATCH_MODAL_ID) !== modal ||
          batchUploadSessionId !== sourceSessionId
        ) {
          return;
        }
        return startBatchComputerUpload(resolvedFiles, { preserveOrder });
      })
      .catch((error) => {
        if (
          readErrorMessage &&
          document.getElementById(BATCH_MODAL_ID) === modal &&
          batchUploadSessionId === sourceSessionId
        ) {
          showToast(readErrorMessage, "error");
          return;
        }
        console.error("Batch computer upload error:", error);
      });
    batchComputerUploadPromise = upload;
    upload
      .finally(() => {
        if (batchComputerUploadPromise === upload) {
          batchComputerUploadPromise = null;
        }
      });
  }

  function renderBatchComputerUploadProgress(uploaded, total) {
    const panel = document.querySelector(
      `#${BATCH_MODAL_ID} .batch-source-computer`,
    );
    if (!panel) return;
    panel.classList.add("is-uploading");
    panel
      .querySelectorAll(".batch-choose-files, .batch-choose-folder")
      .forEach((button) => {
        button.disabled = true;
      });

    let progress = panel.querySelector(".batch-computer-progress");
    if (!progress) {
      progress = document.createElement("div");
      progress.className = "batch-computer-progress";
      progress.setAttribute("role", "status");
      progress.setAttribute("aria-live", "polite");
      panel.appendChild(progress);
    }
    const percent = total ? Math.round((uploaded / total) * 100) : 0;
    progress.innerHTML = `
      <span class="batch-computer-progress-icon" aria-hidden="true">${BATCH_ICON_SVG}</span>
      <strong>Uploading ${total} photo${total === 1 ? "" : "s"}</strong>
      <span>${uploaded} of ${total} uploaded</span>
      <span class="batch-computer-progress-track" aria-hidden="true">
        <span style="width: ${percent}%"></span>
      </span>
    `;
  }

  function lockBatchComputerControlsForPhone() {
    const panel = document.querySelector(
      `#${BATCH_MODAL_ID} .batch-source-computer`,
    );
    if (!panel) return;
    batchInputSource = "phone";
    panel.classList.add("is-phone-locked");
    panel
      .querySelectorAll(
        ".batch-choose-files, .batch-choose-folder, .batch-computer-files-input, .batch-computer-folder-input",
      )
      .forEach((control) => {
        control.disabled = true;
      });
    const dropzone = panel.querySelector(".batch-computer-dropzone");
    dropzone?.setAttribute("aria-disabled", "true");
    const title = dropzone?.querySelector("strong");
    if (title) title.textContent = "Receiving from phone";
  }

  function lockBatchPhoneControlsForComputer() {
    const panel = document.querySelector(
      `#${BATCH_MODAL_ID} .batch-source-phone`,
    );
    if (!panel) return;
    panel.classList.add("is-computer-locked");
    panel.setAttribute("aria-disabled", "true");
    const title = panel.querySelector(".batch-wait-title");
    const copy = panel.querySelector(".batch-wait-copy");
    if (title) title.textContent = "Using this computer";
    if (copy) copy.textContent = "Your selected photos are uploading.";
  }

  async function startBatchComputerUpload(fileList, { preserveOrder = false } = {}) {
    if (batchInputSource === "phone") return;
    const files = preserveOrder
      ? Array.from(fileList || []).filter(isBatchImageFile)
      : sortBatchComputerFiles(fileList);
    if (!files.length) {
      showToast("Add image files to continue.", "info");
      return;
    }

    const qrSessionId = batchUploadSessionId;
    const sessionId = generateSessionId();
    const modal = document.getElementById(BATCH_MODAL_ID);
    const abortController = new AbortController();
    batchComputerUploadAbortController = abortController;
    batchInputSource = "computer";
    batchUploadSessionId = sessionId;
    if (modal) modal.dataset.sessionId = sessionId;
    lockBatchPhoneControlsForComputer();
    if (batchPollInterval) {
      clearInterval(batchPollInterval);
      batchPollInterval = null;
    }
    if (qrSessionId) {
      sendMessage({
        type: "PROXY_FETCH",
        url: `${PHONE_UPLOAD_API}?action=cleanup&sessionId=${qrSessionId}`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      });
    }

    try {
      let uploadedCount = 0;
      renderBatchComputerUploadProgress(uploadedCount, files.length);
      await mapWithConcurrency(
        files,
        MANUAL_STORAGE_UPLOAD_CONCURRENCY,
        async (file, order) => {
          const result = await uploadManualFileToTempStorage(
            sessionId,
            file,
            order,
            abortController.signal,
          );
          uploadedCount += 1;
          renderBatchComputerUploadProgress(uploadedCount, files.length);
          return result;
        },
      );
      const remoteFiles = await listTempStorageFiles(
        sessionId,
        abortController.signal,
      );
      if (remoteFiles.length !== files.length) {
        throw new Error("Could not upload every photo.");
      }
      if (
        batchUploadSessionId !== sessionId ||
        !document.getElementById(BATCH_MODAL_ID)
      ) {
        return;
      }

      batchRemoteFiles = remoteFiles;
      batchRemoteFileKeys = new Set(
        remoteFiles.map(getPhoneUploadFileKey).filter(Boolean),
      );
      batchLastFileCount = remoteFiles.length;
      batchLastFileChangeAt = Date.now();
      batchSignedUrlsListedAt = Date.now();
      batchIsComplete = true;
      preloadBatchImages(remoteFiles);
      renderBatchGroupingPhase();
    } catch (error) {
      if (
        batchUploadSessionId !== sessionId ||
        !document.getElementById(BATCH_MODAL_ID)
      ) {
        return;
      }

      sendMessage({
        type: "PROXY_FETCH",
        url: `${PHONE_UPLOAD_API}?action=cleanup&sessionId=${sessionId}`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      });
      batchInputSource = null;
      batchRemoteFiles = [];
      batchRemoteFileKeys = new Set();
      batchIsComplete = false;
      const retrySessionId = generateSessionId();
      batchUploadSessionId = retrySessionId;
      const currentModal = document.getElementById(BATCH_MODAL_ID);
      if (currentModal) currentModal.dataset.sessionId = retrySessionId;
      renderBatchUploadPhase(retrySessionId);
      const panel = document.querySelector(
        `#${BATCH_MODAL_ID} .batch-source-computer`,
      );
      panel?.insertAdjacentHTML(
        "afterbegin",
        '<div class="batch-computer-error" role="alert">Could not upload every photo. Try again.</div>',
      );
      startBatchPolling(retrySessionId);
      trackGrowthEvent("batch_computer_upload_error", {
        message: error?.message || String(error),
        fileCount: files.length,
      });
    } finally {
      if (batchComputerUploadAbortController === abortController) {
        batchComputerUploadAbortController = null;
      }
    }
  }

  function renderBatchUploadStrip() {
    const status = document.querySelector(`#${BATCH_MODAL_ID} .batch-status`);
    const groupButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-group`);
    const title = document.querySelector(`#${BATCH_MODAL_ID} .batch-wait-title`);
    const copy = document.querySelector(`#${BATCH_MODAL_ID} .batch-wait-copy`);
    if (!title || !copy) return;

    const receivedCount = batchRemoteFiles.length;
    const isStale =
      !batchIsComplete &&
      receivedCount > 0 &&
      Date.now() - batchLastFileChangeAt > BATCH_UPLOAD_STALE_MS;

    if (status) {
      status.classList.toggle("done", batchIsComplete && receivedCount > 0);
      status.classList.toggle("warning", isStale);
      status.textContent = batchIsComplete
        ? receivedCount
          ? `${receivedCount} ready`
          : "No photos"
        : receivedCount
          ? isStale
            ? "Connection paused"
            : `${receivedCount} received`
          : "Waiting";
    }

    const previousCount = Number(title.dataset.receivedCount || "0");
    const countChanged = receivedCount > 0 && receivedCount !== previousCount;
    title.dataset.receivedCount = String(receivedCount);

    if (batchIsComplete) {
      title.innerHTML = receivedCount
        ? `<span class="batch-count-number">${receivedCount}</span> photo${receivedCount === 1 ? "" : "s"} ready`
        : "No photos received";
    } else if (receivedCount) {
      title.innerHTML = isStale
        ? `Check phone (<span class="batch-count-number">${receivedCount}</span> received)`
        : `Receiving <span class="batch-count-number">${receivedCount}</span> photo${receivedCount === 1 ? "" : "s"}<span class="waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>`;
    } else {
      title.textContent = "Scan QR code";
    }
    if (countChanged) {
      const countEl = title.querySelector(".batch-count-number");
      countEl?.classList.add("bump");
    }
    copy.textContent = batchIsComplete
      ? receivedCount
        ? "Group photos into listings."
        : "Select photos on your phone to begin."
      : receivedCount
        ? isStale
          ? "Reopen the phone page, then leave it visible."
          : "Keep the phone page open."
        : "Choose photos. Keep page open.";

    if (groupButton) {
      groupButton.disabled = !batchIsComplete || receivedCount === 0;
      groupButton.hidden = groupButton.disabled;
      groupButton.textContent = receivedCount
        ? batchIsComplete
          ? `Group ${receivedCount} photo${receivedCount === 1 ? "" : "s"}`
          : "Receiving photos"
        : "Group photos";
    }
  }

  function refreshBatchWaitingState() {
    if (document.querySelector(`#${BATCH_MODAL_ID} .batch-wait-panel`)) {
      renderBatchUploadStrip();
    }
  }

  function maybeAutoOpenBatchGrouping() {
    if (!batchIsComplete || batchRemoteFiles.length === 0) return false;
    if (!document.querySelector(`#${BATCH_MODAL_ID} .batch-wait-panel`)) return false;
    renderBatchGroupingPhase();
    return true;
  }

  function preloadBatchImage(file) {
    const url = file?.url;
    if (!url || batchImagePreloadUrls.has(url)) return;
    batchImagePreloadUrls.add(url);

    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;
    batchImagePreloadCache.set(url, img);
  }

  function preloadBatchImages(files = batchRemoteFiles) {
    files.forEach(preloadBatchImage);
  }

  function runAfterBatchRender(callback) {
    let didRun = false;
    const run = () => {
      if (didRun) return;
      didRun = true;
      callback();
    };

    requestAnimationFrame(run);
    window.setTimeout(run, 50);
  }

  function steadyBatchReviewLayout(durationMs = 220) {
    const review = document.querySelector(`#${BATCH_MODAL_ID} .batch-review`);
    if (!review) return;

    const timerKey = "__quickvintReflowTimer";
    const galleryTimerKey = "__quickvintGalleryHeightTimer";
    const gallery = document.querySelector(
      `#${BATCH_MODAL_ID}.organizing .batch-gallery-grid`,
    );
    if (review[timerKey]) {
      clearTimeout(review[timerKey]);
    }
    if (gallery?.[galleryTimerKey]) {
      clearTimeout(gallery[galleryTimerKey]);
    }

    const galleryHeight = gallery?.getBoundingClientRect().height || 0;
    if (galleryHeight) {
      gallery.style.setProperty(
        "--quickvint-batch-gallery-min-height",
        `${Math.round(galleryHeight)}px`,
      );
    }

    review.classList.add("is-reflowing");
    review[timerKey] = window.setTimeout(() => {
      review.classList.remove("is-reflowing");
      review[timerKey] = null;
    }, durationMs);

    if (gallery) {
      gallery[galleryTimerKey] = window.setTimeout(() => {
        gallery.style.removeProperty("--quickvint-batch-gallery-min-height");
        gallery[galleryTimerKey] = null;
      }, durationMs);
    }
  }

  function measureBatchGalleryPositions() {
    const review = document.querySelector(`#${BATCH_MODAL_ID}.organizing .batch-review`);
    if (!review) return new Map();

    const positions = new Map();
    review.querySelectorAll(".batch-photo-wrap:not([hidden])").forEach((wrapper) => {
      const key = wrapper.querySelector(".batch-photo")?.dataset?.photoKey;
      if (!key) return;
      const rect = wrapper.getBoundingClientRect();
      positions.set(key, { left: rect.left, top: rect.top });
    });
    return positions;
  }

  function animateBatchGalleryFromPositions(beforePositions) {
    const review = document.querySelector(`#${BATCH_MODAL_ID}.organizing .batch-review`);
    if (!review || !beforePositions?.size) return;

    const movingItems = [];
    review.querySelectorAll(".batch-photo-wrap:not([hidden])").forEach((wrapper) => {
      const key = wrapper.querySelector(".batch-photo")?.dataset?.photoKey;
      const before = key ? beforePositions.get(key) : null;
      if (!before) return;
      const rect = wrapper.getBoundingClientRect();
      const dx = before.left - rect.left;
      const dy = before.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      movingItems.push({ wrapper, dx, dy });
    });

    movingItems.forEach(({ wrapper, dx, dy }) => {
      wrapper.style.transition = "none";
      wrapper.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
    });

    requestAnimationFrame(() => {
      movingItems.forEach(({ wrapper }) => {
        wrapper.style.transition = "transform 180ms ease";
        wrapper.style.transform = "";
        window.setTimeout(() => {
          wrapper.style.transition = "";
        }, 200);
      });
    });
  }

  function createBatchPhotoElement(file, index, itemNumber, options = {}) {
    const {
      badgeText = `Listing ${itemNumber}`,
      marked = false,
      onClick = null,
      onDiscard = null,
      selected = false,
    } = options;
    const wrapper = document.createElement("div");
    wrapper.className = "batch-photo-wrap";
    wrapper.classList.toggle("is-grouped", marked);
    wrapper.hidden = marked;
    wrapper.setAttribute("aria-hidden", marked ? "true" : "false");

    const photo = document.createElement("div");
    photo.className = "batch-photo";
    photo.dataset.photoIndex = String(index);
    photo.dataset.photoKey = getPhoneUploadFileKey(file);
    photo.classList.toggle("selected", selected);
    photo.classList.toggle("marked", marked);
    photo.classList.toggle("tap-target", Boolean(onClick) && !marked);
    if (onClick) {
      photo.addEventListener("click", onClick);
    }
    const img = document.createElement("img");
    img.loading = "eager";
    img.decoding = "async";
    img.fetchPriority = "high";
    img.src = file.url;
    img.alt = `Batch photo ${index + 1}`;
    const badge = document.createElement("span");
    badge.className = "batch-photo-badge";
    badge.textContent = badgeText;
    photo.appendChild(img);
    photo.appendChild(badge);

    if (onDiscard) {
      const discardButton = document.createElement("button");
      discardButton.type = "button";
      discardButton.className = "batch-discard-photo";
      discardButton.setAttribute("aria-label", `Discard photo ${index + 1}`);
      discardButton.title = "Discard photo";
      discardButton.textContent = "×";
      discardButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onDiscard();
      });
      photo.appendChild(discardButton);
    }

    if (onClick) {
      const check = document.createElement("span");
      check.className = "batch-select-check";
      check.textContent = selected ? "✓" : "";
      photo.appendChild(check);
    }

    wrapper.appendChild(photo);
    return wrapper;
  }

  function renderBatchGroupingPhase() {
    const body = getBatchBody();
    if (!body) return;
    if (!batchIsComplete) {
      showToast("Phone upload is still running.", "info");
      renderBatchUploadPhase(batchUploadSessionId);
      return;
    }
    if (!batchRemoteFiles.length) {
      showToast("No photos were sent for this batch.", "error");
      return;
    }
    preloadBatchImages(batchRemoteFiles);
    const modal = document.getElementById(BATCH_MODAL_ID);
    modal?.classList.remove("generating");
    modal?.classList.add("organizing");
    const titleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-title`);
    const subtitleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-subtitle`);
    if (titleEl) titleEl.textContent = "Organize items";
    if (subtitleEl) {
      subtitleEl.hidden = true;
      subtitleEl.textContent = "";
    }
    const topbarEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-topbar`);
    if (topbarEl && !topbarEl.querySelector(".organize-progress")) {
      topbarEl.insertAdjacentHTML(
        "beforeend",
        `
          <div class="organize-status-row" aria-live="polite">
            <div class="organize-nav">
              <button type="button" class="organize-jump-to-photos" aria-controls="quickvint-batch-gallery-section"><span class="organize-photos-label"></span>${BATCH_ARROW_UP_SVG}</button>
              <button type="button" class="organize-jump-to-groups" aria-controls="quickvint-batch-groups-section" hidden><span>Items</span><span class="organize-items-count"></span>${BATCH_ARROW_DOWN_SVG}</button>
            </div>
            <div class="organize-progress" aria-hidden="true">
              <span class="organize-progress-done"></span>
            </div>
          </div>
        `,
      );
    }

    body.innerHTML = `
      <div class="batch-review">
        <section class="batch-gallery-section" id="quickvint-batch-gallery-section" aria-labelledby="quickvint-batch-gallery-title">
          <div class="batch-section-head">
            <div>
              <h3 class="batch-section-title" id="quickvint-batch-gallery-title">Photos to group</h3>
              <p class="batch-section-copy">Select every photo for one item.</p>
            </div>
            <span class="batch-gallery-count" aria-live="polite"></span>
          </div>
          <div class="batch-gallery" aria-live="polite">
            <div class="batch-gallery-grid"></div>
            <div class="batch-gallery-empty" hidden>All photos grouped.</div>
          </div>
        </section>
        <section class="batch-groups-section" id="quickvint-batch-groups-section" aria-labelledby="quickvint-batch-groups-title">
          <div class="batch-summary-head">
            <div class="batch-summary-title-row">
              <h3 class="batch-section-title" id="quickvint-batch-groups-title">Items</h3>
              <span class="batch-summary-count" aria-live="polite"></span>
            </div>
            <div class="batch-summary-actions">
              <button type="button" class="batch-summary-reset batch-reset-groups is-hidden" hidden aria-hidden="true">Reset</button>
            </div>
          </div>
          <div class="batch-groups-empty">No items grouped yet.</div>
          <div class="batch-capacity-note">Checking availability...</div>
          <div class="batch-groups" aria-live="polite"></div>
        </section>
      </div>
      <div class="batch-actions">
        <button type="button" class="batch-selection-count"><span class="batch-selection-label"></span>${BATCH_ARROW_UP_SVG}</button>
        <div class="batch-secondary-actions is-hidden" hidden>
          <button type="button" class="footer-control batch-clear-selection is-hidden" hidden aria-hidden="true">Clear</button>
        </div>
        <button type="button" class="primary footer-control batch-mark-group is-hidden" disabled hidden aria-hidden="true">Group photos</button>
        <button type="button" class="primary footer-control batch-start quickvint-generation-action is-hidden" hidden aria-hidden="true">${mirageLoaderSvg("quickvint-mirage-batch")}<span class="label"></span></button>
      </div>
    `;

    body.querySelector(".batch-clear-selection")?.addEventListener("click", () => {
      const selectedKeys = Array.from(batchSelectedPhotoKeys);
      batchSelectedPhotoKeys.clear();
      selectedKeys.forEach(updateBatchPhotoSelectionTile);
      updateBatchGroupingControls();
    });
    body.querySelector(".batch-mark-group")?.addEventListener("click", markSelectedPhotosAsGroup);
    body.querySelector(".batch-reset-groups")?.addEventListener("click", () => {
      steadyBatchReviewLayout();
      const groupedKeys = getMarkedBatchPhotoKeys();
      batchMarkedGroups = [];
      batchSelectedPhotoKeys.clear();
      batchGroupRowById.forEach((row) => row.remove());
      batchGroupRowById.clear();
      const emptyMarkedKeys = new Set();
      groupedKeys.forEach((key) => updateBatchPhotoMarkedTile(key, emptyMarkedKeys));
      updateBatchGroupingControls();
    });
    body.querySelector(".batch-start")?.addEventListener("click", startBatchGeneration);
    const review = body.querySelector(".batch-review");
    const scrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    const scrollToBatchGallery = () => {
      review?.scrollTo({ top: 0, behavior: scrollBehavior });
      window.setTimeout(() => {
        const targets = [
          body.querySelector(".batch-gallery-section"),
          topbarEl?.querySelector(".organize-jump-to-photos"),
        ].filter(Boolean);
        targets.forEach((target) => target.classList.remove("is-attention"));
        void body.offsetWidth;
        targets.forEach((target) => target.classList.add("is-attention"));
      }, scrollBehavior === "auto" ? 0 : 420);
    };
    topbarEl?.querySelector(".organize-jump-to-photos")?.addEventListener("click", scrollToBatchGallery);
    body.querySelector(".batch-selection-count")?.addEventListener("click", scrollToBatchGallery);
    topbarEl?.querySelector(".organize-jump-to-groups")?.addEventListener("click", () => {
      const groupsSection = body.querySelector(".batch-groups-section");
      if (!review || !groupsSection) return;
      review.scrollTo({
        top:
          review.scrollTop +
          groupsSection.getBoundingClientRect().top -
          review.getBoundingClientRect().top,
        behavior: scrollBehavior,
      });
    });
    buildBatchGroupingGallery();
    refreshBatchGenerationCapacity();
  }

  function buildBatchGroupingGallery() {
    const gallery = document.querySelector(`#${BATCH_MODAL_ID} .batch-gallery`);
    const galleryGrid = gallery?.querySelector(".batch-gallery-grid");
    const groupsEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-groups`);
    if (!gallery || !galleryGrid || !groupsEl) return;

    batchPhotoTileByKey = new Map();
    batchGroupRowById = new Map();
    galleryGrid.textContent = "";
    groupsEl.textContent = "";

    const markedKeys = getMarkedBatchPhotoKeys();
    const fragment = document.createDocumentFragment();
    batchRemoteFiles.forEach((file, index) => {
      const key = getPhoneUploadFileKey(file);
      const tile = createBatchPhotoElement(file, index, batchMarkedGroups.length + 1, {
        badgeText: `#${index + 1}`,
        marked: markedKeys.has(key),
        selected: batchSelectedPhotoKeys.has(key),
        onClick: () => toggleBatchPhotoSelection(key),
        onDiscard: () => discardBatchPhoto(key),
      });
      batchPhotoTileByKey.set(key, tile.querySelector(".batch-photo"));
      fragment.appendChild(tile);
    });
    galleryGrid.appendChild(fragment);

    batchMarkedGroups.forEach((group) => renderBatchGroupRow(group));
    updateBatchGroupingControls();
  }

  function getMarkedBatchPhotoKeys() {
    return new Set(batchMarkedGroups.flatMap((group) => group.keys));
  }

  function isBatchPhotoMarked(key) {
    return batchMarkedGroups.some((group) => group.keys.includes(key));
  }

  function toggleBatchPhotoSelection(key) {
    if (!key || isBatchPhotoMarked(key)) return;
    if (batchSelectedPhotoKeys.has(key)) {
      batchSelectedPhotoKeys.delete(key);
    } else {
      batchSelectedPhotoKeys.add(key);
    }
    updateBatchPhotoSelectionTile(key);
    updateBatchGroupingControls();
  }

  function discardBatchPhoto(key) {
    if (!key) return;

    const index = batchRemoteFiles.findIndex(
      (file) => getPhoneUploadFileKey(file) === key,
    );
    if (index < 0) return;

    const beforePositions = measureBatchGalleryPositions();
    steadyBatchReviewLayout();
    batchRemoteFiles.splice(index, 1);
    batchRemoteFileKeys.delete(key);
    batchSelectedPhotoKeys.delete(key);
    batchLastFileCount = batchRemoteFiles.length;
    batchLastFileChangeAt = Date.now();

    batchMarkedGroups = batchMarkedGroups
      .map((group) => ({
        ...group,
        keys: group.keys.filter((itemKey) => itemKey !== key),
      }))
      .filter((group) => group.keys.length > 0);

    buildBatchGroupingGallery();
    animateBatchGalleryFromPositions(beforePositions);
  }

  function updateBatchPhotoSelectionTile(key) {
    const photo = batchPhotoTileByKey.get(key);
    if (!photo) return;

    const selected = batchSelectedPhotoKeys.has(key);
    photo.classList.toggle("selected", selected);
    const check = photo.querySelector(".batch-select-check");
    if (check) check.textContent = selected ? "✓" : "";
  }

  function updateBatchPhotoMarkedTile(key, markedKeys = getMarkedBatchPhotoKeys()) {
    const photo = batchPhotoTileByKey.get(key);
    if (!photo) return;

    const marked = markedKeys.has(key);
    photo.classList.toggle("marked", marked);
    photo.classList.toggle("selected", batchSelectedPhotoKeys.has(key));
    const check = photo.querySelector(".batch-select-check");
    if (check) check.textContent = batchSelectedPhotoKeys.has(key) ? "✓" : "";
    const badge = photo.querySelector(".batch-photo-badge");
    if (badge) badge.textContent = marked ? "Done" : `#${getBatchFileIndexByKey(key) + 1}`;
    const wrapper = photo.closest(".batch-photo-wrap");
    if (wrapper) {
      const timerKey = "__quickvintHiddenTimer";
      if (wrapper[timerKey]) {
        clearTimeout(wrapper[timerKey]);
        wrapper[timerKey] = null;
      }
      wrapper.setAttribute("aria-hidden", marked ? "true" : "false");
      if (marked) {
        wrapper.classList.add("is-grouped");
        wrapper[timerKey] = window.setTimeout(() => {
          if (wrapper.classList.contains("is-grouped")) {
            wrapper.hidden = true;
            updateBatchGroupingControls();
          }
          wrapper[timerKey] = null;
        }, 130);
      } else {
        wrapper.hidden = false;
        runAfterBatchRender(() => {
          wrapper.classList.remove("is-grouped");
        });
      }
    }
  }

  async function fetchBatchGenerationCapacity() {
    const response = await sendMessage({ type: "GET_BATCH_CAPACITY" });
    return response?.ok
      ? response.capacity
      : {
          allowed: false,
          available: 0,
          message:
            response?.error ||
            "Could not check how many listings are available.",
        };
  }

  async function refreshBatchGenerationCapacity() {
    if (batchCapacityLoading) return;
    batchCapacityLoading = true;
    batchGenerationCapacity = null;
    updateBatchGroupingControls();

    try {
      batchGenerationCapacity = await fetchBatchGenerationCapacity();
    } catch (err) {
      batchGenerationCapacity = {
        allowed: false,
        available: 0,
        message: "Could not check how many listings are available.",
      };
    } finally {
      batchCapacityLoading = false;
      updateBatchGroupingControls();
    }
  }

  function setBatchControlHidden(control, hidden) {
    if (!control) return;
    const timerKey = "__quickvintHiddenTimer";
    if (control[timerKey]) {
      clearTimeout(control[timerKey]);
      control[timerKey] = null;
    }

    if (hidden) {
      control.classList.add("is-hidden");
      control.setAttribute("aria-hidden", "true");
      control[timerKey] = window.setTimeout(() => {
        if (control.classList.contains("is-hidden")) {
          control.hidden = true;
        }
        control[timerKey] = null;
      }, 160);
      return;
    }

    control.hidden = false;
    control.setAttribute("aria-hidden", "false");
    runAfterBatchRender(() => {
      control.classList.remove("is-hidden");
    });
  }

  function updateBatchGroupingControls() {
    const subtitleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-subtitle`);
    const selectionCount = document.querySelector(
      `#${BATCH_MODAL_ID} .batch-selection-count`,
    );
    const clearButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-clear-selection`);
    const resetButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-reset-groups`);
    const secondaryActions = document.querySelector(
      `#${BATCH_MODAL_ID} .batch-secondary-actions`,
    );
    const markButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-mark-group`);
    const startButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-start`);
    const actions = document.querySelector(`#${BATCH_MODAL_ID} .batch-actions`);
    const review = document.querySelector(`#${BATCH_MODAL_ID} .batch-review`);
    const gallery = document.querySelector(`#${BATCH_MODAL_ID} .batch-gallery`);
    const galleryGrid = gallery?.querySelector(".batch-gallery-grid");
    const galleryCount = document.querySelector(`#${BATCH_MODAL_ID} .batch-gallery-count`);
    const galleryEmpty = document.querySelector(`#${BATCH_MODAL_ID} .batch-gallery-empty`);
    const summaryCount = document.querySelector(`#${BATCH_MODAL_ID} .batch-summary-count`);
    const groupsEmpty = document.querySelector(`#${BATCH_MODAL_ID} .batch-groups-empty`);
    const capacityNote = document.querySelector(`#${BATCH_MODAL_ID} .batch-capacity-note`);
    const progressDone = document.querySelector(`#${BATCH_MODAL_ID} .organize-progress-done`);
    const jumpToPhotos = document.querySelector(`#${BATCH_MODAL_ID} .organize-jump-to-photos`);
    const jumpToGroups = document.querySelector(`#${BATCH_MODAL_ID} .organize-jump-to-groups`);
    const groups = getBatchGroups();
    const markedKeys = getMarkedBatchPhotoKeys();
    const selectedCount = batchSelectedPhotoKeys.size;
    const remainingCount = batchRemoteFiles.length - markedKeys.size;
    batchPhotoTileByKey.forEach((photo, key) => {
      if (markedKeys.has(key)) return;
      const wrapper = photo.closest(".batch-photo-wrap");
      if (!wrapper) return;
      if (wrapper.__quickvintHiddenTimer) {
        clearTimeout(wrapper.__quickvintHiddenTimer);
        wrapper.__quickvintHiddenTimer = null;
      }
      wrapper.hidden = false;
      wrapper.classList.remove("is-grouped");
      wrapper.setAttribute("aria-hidden", "false");
    });
    const visibleGalleryCount = gallery
      ? gallery.querySelectorAll(".batch-photo-wrap:not([hidden])").length
      : remainingCount;
    const groupedPct = batchRemoteFiles.length
      ? Math.round((markedKeys.size / batchRemoteFiles.length) * 100)
      : 0;
    const footerState = selectedCount > 0
      ? "selecting"
      : remainingCount > 0
        ? "browse"
        : groups.length > 0
          ? "ready"
          : "empty";

    if (subtitleEl) {
      subtitleEl.textContent = "";
    }
    if (actions) {
      actions.dataset.state = footerState;
    }
    if (jumpToPhotos) {
      jumpToPhotos.disabled = remainingCount === 0;
      const photosLabel = jumpToPhotos.querySelector(".organize-photos-label");
      const directionIcon = jumpToPhotos.querySelector(".batch-direction-icon");
      if (photosLabel) {
        photosLabel.textContent = remainingCount === 0
          ? "All photos grouped"
          : `${remainingCount} photo${remainingCount === 1 ? "" : "s"} remaining`;
      }
      if (directionIcon) directionIcon.hidden = remainingCount === 0;
    }
    if (jumpToGroups) {
      jumpToGroups.hidden = groups.length === 0;
      const itemsCount = jumpToGroups.querySelector(".organize-items-count");
      if (itemsCount) itemsCount.textContent = String(groups.length);
    }
    if (progressDone) {
      progressDone.style.width = `${groupedPct}%`;
    }
    if (selectionCount) {
      const selectionLabel = selectionCount.querySelector(".batch-selection-label");
      const directionIcon = selectionCount.querySelector(".batch-direction-icon");
      if (selectionLabel) {
        selectionLabel.textContent = selectedCount
          ? `${selectedCount} selected`
          : !batchRemoteFiles.length
            ? "No photos left in this batch"
            : remainingCount
              ? "Select photos for one item"
              : "Ready to generate";
      }
      if (directionIcon) directionIcon.hidden = remainingCount === 0;
      selectionCount.disabled = remainingCount === 0;
      setBatchControlHidden(selectionCount, footerState === "ready");
    }
    if (review) {
      review.classList.toggle("is-all-grouped", remainingCount === 0);
    }
    if (galleryCount) {
      galleryCount.textContent = `${remainingCount} photo${remainingCount === 1 ? "" : "s"}`;
    }
    if (galleryEmpty) {
      galleryEmpty.hidden = remainingCount > 0;
    }
    if (galleryGrid) {
      galleryGrid.classList.toggle(
        "is-settling",
        remainingCount === 0 && visibleGalleryCount > 0,
      );
      galleryGrid.classList.toggle(
        "is-empty",
        remainingCount === 0 && visibleGalleryCount === 0,
      );
    }
    if (summaryCount) {
      summaryCount.textContent = String(groups.length);
    }
    if (groupsEmpty) {
      groupsEmpty.hidden = groups.length > 0;
    }
    if (capacityNote) {
      capacityNote.classList.remove("warning", "error");
      if (!groups.length) {
        capacityNote.classList.add("is-hidden");
        capacityNote.setAttribute("aria-hidden", "true");
      } else if (batchCapacityLoading) {
        capacityNote.classList.add("is-hidden");
        capacityNote.setAttribute("aria-hidden", "true");
      } else if (!batchGenerationCapacity) {
        capacityNote.classList.add("is-hidden");
        capacityNote.setAttribute("aria-hidden", "true");
      } else {
        const available = Math.max(
          0,
          Math.floor(Number(batchGenerationCapacity.available || 0)),
        );
        if (!batchGenerationCapacity.allowed || available <= 0) {
          capacityNote.classList.remove("is-hidden");
          capacityNote.classList.add("error");
          capacityNote.setAttribute("aria-hidden", "false");
          capacityNote.textContent =
            batchGenerationCapacity.message ||
            "You cannot generate more listings right now.";
        } else if (groups.length > 0 && available < groups.length) {
          capacityNote.classList.remove("is-hidden");
          capacityNote.classList.add("warning");
          capacityNote.setAttribute("aria-hidden", "false");
          capacityNote.textContent = `You can generate ${available} of ${groups.length} listings right now. The first ${available} will be generated.`;
        } else {
          capacityNote.classList.add("is-hidden");
          capacityNote.setAttribute("aria-hidden", "true");
        }
      }
    }
    if (clearButton) {
      setBatchControlHidden(clearButton, selectedCount === 0);
    }
    if (resetButton) {
      setBatchControlHidden(resetButton, groups.length === 0);
    }
    if (secondaryActions) {
      setBatchControlHidden(
        secondaryActions,
        selectedCount === 0,
      );
    }
    if (markButton) {
      markButton.textContent = `Group ${selectedCount} photo${selectedCount === 1 ? "" : "s"}`;
      markButton.disabled = selectedCount === 0;
      setBatchControlHidden(markButton, selectedCount === 0);
    }
    if (startButton) {
      const available = batchGenerationCapacity
        ? Math.max(0, Math.floor(Number(batchGenerationCapacity.available || 0)))
        : null;
      const effectiveCount =
        available === null ? groups.length : Math.min(groups.length, available);
      const startLabel = startButton.querySelector(".label");
      if (startLabel) startLabel.textContent = batchCapacityLoading
        ? "Checking availability..."
        : available !== null && groups.length > 0 && available < groups.length && available > 0
          ? `Generate first ${available} of ${groups.length}`
          : `Generate ${effectiveCount} listing${effectiveCount === 1 ? "" : "s"}`;
      startButton.disabled =
        batchCapacityLoading ||
        groups.length === 0 ||
        remainingCount > 0 ||
        (available !== null && effectiveCount <= 0);
      setBatchControlHidden(
        startButton,
        selectedCount > 0 || groups.length === 0 || remainingCount > 0,
      );
    }
  }

  function markSelectedPhotosAsGroup() {
    const markedKeys = getMarkedBatchPhotoKeys();
    const keys = Array.from(batchSelectedPhotoKeys)
      .filter((key) => !markedKeys.has(key))
      .sort((a, b) => getBatchFileIndexByKey(a) - getBatchFileIndexByKey(b));
    if (!keys.length) return;

    const beforePositions = measureBatchGalleryPositions();
    steadyBatchReviewLayout();
    const group = { id: `group-${batchNextGroupId++}`, keys };
    batchMarkedGroups.push(group);
    batchSelectedPhotoKeys.clear();
    trackGrowthEvent("batch_group_created", {
      groupCount: batchMarkedGroups.length,
      photoCount: keys.length,
      totalPhotoCount: batchRemoteFiles.length,
    });
    const nextMarkedKeys = getMarkedBatchPhotoKeys();
    keys.forEach((key) => {
      updateBatchPhotoSelectionTile(key);
      updateBatchPhotoMarkedTile(key, nextMarkedKeys);
    });
    renderBatchGroupRow(group);
    updateBatchGroupingControls();
    window.setTimeout(() => {
      animateBatchGalleryFromPositions(beforePositions);
    }, 145);
  }

  function renderBatchGroupRow(group) {
    const groupsEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-groups`);
    if (!groupsEl || !group?.id) return;

    const groupIndex = batchMarkedGroups.findIndex((item) => item.id === group.id);
    if (groupIndex < 0) return;

    let row = batchGroupRowById.get(group.id);
    const isNewRow = !row;
    if (!row) {
      row = document.createElement("div");
      row.className = "batch-item-card is-entering";
      batchGroupRowById.set(group.id, row);
      groupsEl.appendChild(row);
    }

    const photos = getBatchFilesForKeys(group.keys);
    row.innerHTML = `
      <div class="batch-item-card-head">
        <div>
          <div class="batch-item-title">Item #${groupIndex + 1}</div>
          <span class="batch-item-count">${photos.length} photo${photos.length === 1 ? "" : "s"}</span>
        </div>
        <button type="button" class="batch-ungroup" aria-label="Ungroup item ${groupIndex + 1}" title="Ungroup">↶</button>
      </div>
      <div class="batch-item-photos"></div>
    `;

    const chips = row.querySelector(".batch-item-photos");
    photos.slice(0, 5).forEach(({ file, index }) => {
      const chip = document.createElement("img");
      chip.className = "batch-thumb-chip";
      chip.loading = "eager";
      chip.decoding = "async";
      chip.src = file.url;
      chip.alt = `Listing ${groupIndex + 1} photo ${index + 1}`;
      chips.appendChild(chip);
    });
    if (photos.length > 5) {
      const more = document.createElement("span");
      more.className = "batch-thumb-more";
      more.textContent = `+${photos.length - 5}`;
      chips.appendChild(more);
    }

    row.querySelector(".batch-ungroup")?.addEventListener("click", () => {
      ungroupBatchGroup(group.id);
    });

    if (isNewRow) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          row.classList.remove("is-entering");
        });
      });
    }
  }

  function rerenderBatchGroupRows() {
    batchMarkedGroups.forEach(renderBatchGroupRow);
  }

  function ungroupBatchGroup(groupId) {
    const groupIndex = batchMarkedGroups.findIndex((group) => group.id === groupId);
    if (groupIndex < 0) return;

    steadyBatchReviewLayout();
    const [group] = batchMarkedGroups.splice(groupIndex, 1);
    trackGrowthEvent("batch_group_removed", {
      groupCount: batchMarkedGroups.length,
      photoCount: group.keys.length,
      totalPhotoCount: batchRemoteFiles.length,
    });
    const row = batchGroupRowById.get(group.id);
    if (row) {
      row.classList.add("is-leaving");
      window.setTimeout(() => row.remove(), 190);
    }
    batchGroupRowById.delete(group.id);
    const markedKeys = getMarkedBatchPhotoKeys();
    group.keys.forEach((key) => updateBatchPhotoMarkedTile(key, markedKeys));
    rerenderBatchGroupRows();
    updateBatchGroupingControls();
  }

  function getBatchFileIndexByKey(key) {
    return batchRemoteFiles.findIndex((file) => getPhoneUploadFileKey(file) === key);
  }

  function getBatchFilesForKeys(keys) {
    return keys
      .map((key) => {
        const index = getBatchFileIndexByKey(key);
        return index >= 0 ? { file: batchRemoteFiles[index], index } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
  }

  function getBatchGroupsWithKeys() {
    return batchMarkedGroups
      .map((group) =>
        group.keys
          .slice()
          .sort((a, b) => getBatchFileIndexByKey(a) - getBatchFileIndexByKey(b))
          .map((key) => {
            const index = getBatchFileIndexByKey(key);
            const file = index >= 0 ? batchRemoteFiles[index] : null;
            return { file, key, index };
          })
          .filter(({ file }) => file),
      )
      .filter((group) => group.length > 0);
  }

  function getBatchGroups() {
    if (!batchRemoteFiles.length) return [];
    return getBatchGroupsWithKeys().map((group) =>
      group.map(({ file }) => file),
    );
  }

  async function showBatchCapacityBlocked(capacity = {}) {
    const pricingUrl = await getPricingUrl();
    const limitMessage = buildLimitMessage({
      code: capacity.reason,
      currentTier: capacity.tier,
      nextTier: capacity.nextTier,
      error: capacity.message,
    });

    if (limitMessage.paywall && pricingUrl) {
      showLimitPaywall({
        title: limitMessage.title || "Usage limit reached",
        message: limitMessage.message,
        options: limitMessage.options,
        trustNote: limitMessage.trustNote,
        actionText: limitMessage.actionText,
        actionUrl: pricingUrl,
        secondaryActionText: limitMessage.secondaryActionText,
        secondaryActionUrl: pricingUrl,
        limitCode: capacity.reason,
        currentTier: capacity.tier,
      });
      return;
    }

    showToast(
      limitMessage.message ||
        capacity.message ||
        "You do not have enough listings available right now.",
      "error",
      pricingUrl && limitMessage.actionText
        ? {
            text: limitMessage.actionText,
            url: pricingUrl,
            secondaryText: limitMessage.secondaryActionText,
            secondaryUrl: limitMessage.secondaryActionUrl,
          }
        : null,
    );
  }

  function normalizeBatchRemoteFiles(files) {
    return files
      .slice()
      .sort((a, b) => {
        const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
        const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
        return orderA - orderB || String(a.name || "").localeCompare(String(b.name || ""));
      });
  }

  async function refreshBatchRemoteFilesForGeneration(sessionId) {
    const response = await sendMessage({
      type: "PROXY_FETCH",
      url: `${PHONE_UPLOAD_API}?sessionId=${sessionId}&t=${Date.now()}`,
      options: { method: "GET" },
    });
    if (!response?.ok) {
      throw new Error("Could not refresh uploaded photos.");
    }

    const data =
      typeof response.data === "string"
        ? JSON.parse(response.data)
        : response.data;
    const files = Array.isArray(data?.files)
      ? normalizeBatchRemoteFiles(data.files).filter(
          (file) => !isPhoneUploadSessionMarkerFile(file),
        )
      : [];
    const refreshedKeys = new Set(files.map(getPhoneUploadFileKey).filter(Boolean));
    const missingGroupedFile = batchMarkedGroups.some((group) =>
      group.keys.some((key) => !refreshedKeys.has(key)),
    );

    if (!files.length || missingGroupedFile) {
      throw new Error("Uploaded photos are no longer available.");
    }

    batchRemoteFiles = files;
    batchRemoteFileKeys = refreshedKeys;
    batchIsComplete = data?.complete === true;
    batchSignedUrlsListedAt = Date.now();
  }

  function getBatchSignedUrlRefreshAfterMs() {
    const estimatedBatchDurationMs =
      Math.max(1, batchMarkedGroups.length) * BATCH_ESTIMATED_ITEM_DURATION_MS;
    return Math.max(
      0,
      BATCH_SIGNED_URL_TTL_MS -
        BATCH_SIGNED_URL_REFRESH_SAFETY_MS -
        estimatedBatchDurationMs,
    );
  }

  function shouldRefreshBatchSignedUrlsForGeneration() {
    return (
      !batchSignedUrlsListedAt ||
      Date.now() - batchSignedUrlsListedAt >= getBatchSignedUrlRefreshAfterMs()
    );
  }

  function startBatchPolling(sessionId) {
    if (batchPollInterval) {
      clearInterval(batchPollInterval);
      batchPollInterval = null;
    }
    scheduleBatchAutoClose(sessionId);

    const poll = async () => {
      if (isBatchPollInFlight || batchUploadSessionId !== sessionId) return;

      try {
        isBatchPollInFlight = true;
        const response = await sendMessage({
          type: "PROXY_FETCH",
          url: `${PHONE_UPLOAD_API}?sessionId=${sessionId}&t=${Date.now()}`,
          options: { method: "GET" },
        });
        if (batchUploadSessionId !== sessionId) return;
        if (!response?.ok) return;

        const data =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;
        const files = Array.isArray(data.files)
          ? normalizeBatchRemoteFiles(data.files)
          : [];
        if (files.length) {
          batchSignedUrlsListedAt = Date.now();
          if (!batchInputSource) lockBatchComputerControlsForPhone();
        }
        const wasComplete = batchIsComplete;
        batchIsComplete = data.complete === true;
        let added = false;

        files.forEach((file) => {
          const key = getPhoneUploadFileKey(file);
          if (!key || batchRemoteFileKeys.has(key)) return;
          batchRemoteFileKeys.add(key);
          batchRemoteFiles.push(file);
          added = true;
        });

        if (batchIsComplete) {
          batchRemoteFiles = files;
          batchRemoteFileKeys = new Set(files.map(getPhoneUploadFileKey).filter(Boolean));
        } else if (added) {
          batchRemoteFiles = normalizeBatchRemoteFiles(batchRemoteFiles);
        }

        if (batchRemoteFiles.length !== batchLastFileCount) {
          batchLastFileCount = batchRemoteFiles.length;
          batchLastFileChangeAt = Date.now();
        }

        preloadBatchImages(files);

        const openedGrouping = maybeAutoOpenBatchGrouping();

        if (openedGrouping) {
          scheduleBatchAutoClose(sessionId);
        } else if (added || batchIsComplete !== wasComplete) {
          scheduleBatchAutoClose(sessionId);
          refreshBatchWaitingState();
        } else {
          refreshBatchWaitingState();
        }

        if (batchIsComplete && batchPollInterval) {
          clearInterval(batchPollInterval);
          batchPollInterval = null;
        }
      } catch (err) {
        console.error("Batch polling error:", err);
      } finally {
        isBatchPollInFlight = false;
      }
    };

    poll();
    batchPollInterval = setInterval(poll, BATCH_POLL_INTERVAL_MS);
  }

  async function startBatchGeneration() {
    const modal = document.getElementById(BATCH_MODAL_ID);
    if (!modal || !batchUploadSessionId) return;
    const startButton = modal.querySelector(".batch-start");

    if (!batchIsComplete) {
      showToast("Phone upload is still running.", "info");
      return;
    }

    if (shouldRefreshBatchSignedUrlsForGeneration()) {
      try {
        await refreshBatchRemoteFilesForGeneration(batchUploadSessionId);
      } catch (err) {
        showToast(err.message || "Could not refresh uploaded photos.", "error");
        return;
      }
    }

    let groupsWithKeys = getBatchGroupsWithKeys();
    let groups = groupsWithKeys.map((group) => group.map(({ file }) => file));
    if (!groups.length) {
      trackGrowthEvent("batch_start_blocked", { reason: "no_groups" });
      showToast("Add at least one photo before starting batch generation.", "error");
      return;
    }

    const remainingCount = batchRemoteFiles.length - getMarkedBatchPhotoKeys().size;
    if (remainingCount > 0) {
      trackGrowthEvent("batch_start_blocked", {
        reason: "ungrouped_photos",
        remainingCount,
      });
      showToast("Group every photo before generating listings.", "error");
      return;
    }

    const restoreStartButton = setActionButtonLoading(startButton, "Starting");

    let capacity;
    try {
      capacity = await fetchBatchGenerationCapacity();
    } catch (err) {
      capacity = {
        allowed: false,
        available: 0,
        message: "Could not check how many listings are available.",
      };
    }
    const available = Math.max(0, Math.floor(Number(capacity.available || 0)));
    if (!capacity.allowed || available <= 0) {
      restoreStartButton();
      trackGrowthEvent("generate_limit_hit", {
        mode: "batch",
        code: capacity.reason || null,
        tier: capacity.tier || null,
      });
      await showBatchCapacityBlocked(capacity);
      return;
    }

    if (available < groups.length) {
      const confirmed = window.confirm(
        `You have ${available} of ${groups.length} listings available. Generate the first ${available}?`,
      );
      if (!confirmed) {
        restoreStartButton();
        return;
      }

      groupsWithKeys = groupsWithKeys.slice(0, available);
      groups = groups.slice(0, available);
      showToast(
        `Generating first ${available} listing${available === 1 ? "" : "s"}.`,
        "info",
      );
    }

    if (batchPollInterval) {
      clearInterval(batchPollInterval);
      batchPollInterval = null;
    }
    if (batchAutoCloseTimer) {
      clearTimeout(batchAutoCloseTimer);
      batchAutoCloseTimer = null;
    }

    batchProgressGroups = groupsWithKeys;
    renderBatchProgress({ status: "queued", current: 0, total: groups.length });
    restoreStartButton();
    trackGrowthEvent("batch_start", {
      groupCount: groups.length,
      available,
    });

    const response = await sendMessage({
      type: "START_BATCH_GENERATION",
      sessionId: batchUploadSessionId,
      groups,
    });

    if (!response?.ok) {
      renderBatchProgress({
        status: "failed",
        current: 0,
        total: groups.length,
        message: response?.error || "Could not start batch generation.",
      });
    } else if (response.limited) {
      const startedCount = Math.max(
        0,
        Math.floor(Number(response.startedCount || 0)),
      );
      if (startedCount > 0 && startedCount < groups.length) {
        batchProgressGroups = groupsWithKeys.slice(0, startedCount);
        renderBatchProgress({
          status: "queued",
          current: 0,
          total: startedCount,
          message: `Generating first ${startedCount} listing${
            startedCount === 1 ? "" : "s"
          }.`,
        });
      }
    }
  }

  function isBatchProgressActive(status) {
    return !["done", "failed"].includes(status);
  }

  function getBatchProgressCopy({ status, current = 0, total = 0, message = "", delayMs = 0 }) {
    if (message) return message;
    const itemCopy = current > 0 ? `Listing ${current} of ${total}` : `${total} listing${total === 1 ? "" : "s"}`;
    switch (status) {
      case "done":
        return `${total} listing${total === 1 ? "" : "s"} ready`;
      case "failed":
        return "Batch generation stopped.";
      case "opening_tab":
        return `${itemCopy}: opening tab...`;
      case "tab_ready":
        return `${itemCopy}: adding photos...`;
      case "generating":
        return `${itemCopy}: writing details...`;
      case "item_done":
        return `${itemCopy}: ready.`;
      case "waiting":
        return delayMs > 0
          ? "Brief pause..."
          : "Preparing next listing...";
      case "queued":
      default:
        return `Preparing ${total} listing${total === 1 ? "" : "s"}...`;
    }
  }

  function getBatchProgressPercent(status, current, total) {
    if (!total) return 0;
    if (status === "done") return 100;
    if (status === "failed") {
      return Math.max(0, Math.min(100, Math.round(((current || 0) / total) * 100)));
    }

    const currentIndex = Math.max(0, current - 1);
    const phaseWeight =
      status === "opening_tab"
        ? 0.12
        : status === "tab_ready"
          ? 0.28
          : status === "generating"
            ? 0.64
            : status === "item_done" || status === "waiting"
              ? 1
              : 0;
    return Math.max(0, Math.min(99, Math.round(((currentIndex + phaseWeight) / total) * 100)));
  }

  function getBatchItemState(status, itemNumber, current) {
    if (status === "done") return "done";
    if (status === "failed") {
      if (!current) return "pending";
      if (itemNumber < current) return "done";
      if (itemNumber === current) return "failed";
      return "pending";
    }
    if (status === "item_done" || status === "waiting") {
      if (itemNumber <= current) return "done";
      return "pending";
    }
    if (itemNumber < current) return "done";
    if (itemNumber === current && current > 0) return "active";
    return "pending";
  }

  function getBatchItemStateLabel(state, status) {
    if (state === "done") return "Ready";
    if (state === "failed") return "Stopped";
    if (state === "active") {
      if (status === "opening_tab") return "Opening tab";
      if (status === "tab_ready") return "Adding photos";
      return "Writing";
    }
    return "Queued";
  }

  function getBatchReadyCount(status, current) {
    if (status === "done") return current;
    if (status === "item_done" || status === "waiting") return current;
    if (status === "failed") return Math.max(0, current - 1);
    return Math.max(0, current - 1);
  }

  function renderBatchProgress({ status, current = 0, total = 0, message = "", delayMs = 0 }) {
    const body = getBatchBody();
    if (!body) return;

    const previousStatus = batchProgressStatus;
    batchProgressStatus = status;
    if (previousStatus !== status && (status === "done" || status === "failed")) {
      trackGrowthEvent(status === "done" ? "batch_done" : "batch_failed", {
        current,
        total,
        message: message || null,
      });
    }
    const modal = document.getElementById(BATCH_MODAL_ID);
    modal?.classList.remove("organizing");
    modal?.classList.add("generating");
    modal?.querySelector(".organize-status-row")?.remove();

    const closeButton = modal?.querySelector(".batch-close");
    if (closeButton) {
      closeButton.setAttribute(
        "aria-label",
        isBatchProgressActive(status)
          ? "Close batch generation progress"
          : "Close",
      );
    }

    const titleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-title`);
    const subtitleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-subtitle`);
    if (titleEl) titleEl.textContent = "Generating listings";
    if (subtitleEl) {
      subtitleEl.hidden = false;
      subtitleEl.textContent = `${getBatchReadyCount(status, current)}/${total} ready`;
    }

    const groups = batchProgressGroups.length
      ? batchProgressGroups
      : getBatchGroupsWithKeys();
    const progressPercent = getBatchProgressPercent(status, current, total);
    const statusText = getBatchProgressCopy({ status, current, total, message, delayMs });
    const running = isBatchProgressActive(status);

    body.innerHTML = `
      <div class="batch-progress-stage ${running ? "is-live" : ""}">
        <div class="batch-ambient" aria-hidden="true"></div>
        <div class="batch-progress-head">
          <div>
            <div class="batch-status ${status === "done" ? "done" : status === "failed" ? "warning" : ""}">${statusText}</div>
            <div class="batch-progress-title">${running ? "Keep this tab open" : status === "done" ? "Review tabs before publishing" : "Generation stopped"}</div>
          </div>
          <div class="batch-progress-count">${progressPercent}%</div>
        </div>
        <div class="batch-live-progress" aria-hidden="true">
          <span style="width: ${progressPercent}%"></span>
        </div>
        <div class="batch-progress-list" aria-live="polite"></div>
        ${status === "done" ? "" : `<div class="batch-progress-note">${status === "failed" ? "No more tabs will open." : "Tabs open one at a time."}</div>`}
      </div>
      <div class="batch-actions">
        <button type="button" class="batch-dismiss" ${running ? "disabled" : ""}>${running ? "Working..." : "Done"}</button>
      </div>
    `;

    const list = body.querySelector(".batch-progress-list");
    groups.forEach((group, index) => {
      const itemNumber = index + 1;
      const state = getBatchItemState(status, itemNumber, current);
      const card = document.createElement("div");
      card.className = `batch-progress-card ${state}`;

      const thumbs = document.createElement("div");
      thumbs.className = "batch-progress-thumbs";
      group.slice(0, 3).forEach(({ file }, photoIndex) => {
        const img = document.createElement("img");
        img.loading = "eager";
        img.decoding = "async";
        img.src = file.url;
        img.alt = `Listing ${itemNumber} preview ${photoIndex + 1}`;
        thumbs.appendChild(img);
      });
      if (group.length > 3) {
        const more = document.createElement("span");
        more.textContent = `+${group.length - 3}`;
        thumbs.appendChild(more);
      }

      const meta = document.createElement("div");
      meta.className = "batch-progress-meta";
      meta.innerHTML = `
        <strong>Listing ${itemNumber}</strong>
        <span>${group.length} photo${group.length === 1 ? "" : "s"}</span>
      `;

      const badge = document.createElement("div");
      badge.className = "batch-progress-badge";
      badge.textContent = getBatchItemStateLabel(state, status);

      card.appendChild(thumbs);
      card.appendChild(meta);
      card.appendChild(badge);
      list?.appendChild(card);
    });

    body.querySelector(".batch-dismiss")?.addEventListener("click", () => {
      closeBatchModal({ cleanup: false });
    });
  }

  function handleBatchProgress(message) {
    const hasBatchModal = Boolean(document.getElementById(BATCH_MODAL_ID));
    if (message.status === "done" && Array.isArray(message.offers)) {
      queueGenerationOffers(message.offers);
    }
    if (!hasBatchModal) return;
    renderBatchProgress(message);
    if (message.status === "failed") {
      showToast(message.message || "Batch generation stopped.", "error");
    }
  }

  function waitForUploadedPhotoCount(targetCount, timeoutMs = BATCH_UPLOAD_WAIT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const uploadedEntries = getUploadedImageEntries();
        const capturedReadyCount = uploadedEntries.filter(
          (entry) => entry.promptSource === "captured_upload_file",
        ).length;
        if (
          uploadedEntries.length >= targetCount &&
          (getVisibleUploadedPhotoCount() >= targetCount ||
            capturedReadyCount >= targetCount)
        ) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(timer);
          reject(new Error("Photos were added, but Vinted did not finish showing them in time."));
        }
      }, 500);
    });
  }

  function waitForGeneratedListingFields(expectedTitle, expectedDescription, timeoutMs = 2500) {
    const normalize = (value) => String(value || "").trim();
    const expectedTitleText = normalize(expectedTitle);
    const expectedDescriptionText = normalize(expectedDescription);

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const check = () => {
        const titleInput = document.querySelector(SELECTORS.title);
        const descInput = document.querySelector(SELECTORS.description);
        const titleMatches =
          !expectedTitleText || normalize(titleInput?.value) === expectedTitleText;
        const descriptionMatches =
          !expectedDescriptionText ||
          normalize(descInput?.value).includes(expectedDescriptionText);

        if (titleMatches && descriptionMatches) {
          resolve();
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("Generated listing details were not visible in time."));
          return;
        }

        requestAnimationFrame(check);
      };

      requestAnimationFrame(check);
    });
  }

  function showBatchTabStatus(message, state = "loading") {
    let status = document.getElementById("quickvint-batch-tab-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "quickvint-batch-tab-status";
    }

    const titleInput = document.querySelector(SELECTORS.title);
    const descriptionInput = document.querySelector(SELECTORS.description);
    const detailsCard =
      titleInput?.closest(".web_ui__Card__card") ||
      descriptionInput?.closest(".web_ui__Card__card");
    const fallbackAnchor =
      titleInput?.closest("label") ||
      titleInput ||
      descriptionInput?.closest("label") ||
      descriptionInput;
    const anchor = detailsCard || fallbackAnchor;

    if (anchor?.parentElement) {
      if (status.parentElement !== anchor.parentElement || status.nextSibling !== anchor) {
        anchor.parentElement.insertBefore(status, anchor);
      }
    } else if (!status.parentElement) {
      document.body.appendChild(status);
    }

    if (batchTabStatusTimer) {
      clearTimeout(batchTabStatusTimer);
      batchTabStatusTimer = null;
    }

    const iconText = state === "success" ? "✓" : state === "error" ? "!" : "";
    status.className = state;
    status.innerHTML = `
      <span class="batch-tab-status-icon" aria-hidden="true">${iconText}</span>
      <span>${escapeHtml(message)}</span>
    `;

    requestAnimationFrame(() => {
      status.classList.add("visible");
    });
  }

  function hideBatchTabStatus(delayMs = 0) {
    if (batchTabStatusTimer) {
      clearTimeout(batchTabStatusTimer);
      batchTabStatusTimer = null;
    }

    batchTabStatusTimer = setTimeout(() => {
      const status = document.getElementById("quickvint-batch-tab-status");
      if (!status) return;
      status.classList.remove("visible");
      setTimeout(() => status.remove(), 180);
    }, delayMs);
  }

  async function runBatchItem(message) {
    removeClonedBatchUiForWorkTab();

    const remoteFiles = Array.isArray(message.files) ? message.files : [];
    const itemIndex = Math.max(1, Number(message.itemIndex || 1));
    const totalItems = Math.max(itemIndex, Number(message.totalItems || itemIndex));
    const listingPrefix = totalItems > 1 ? `Listing ${itemIndex} of ${totalItems}` : "Listing";
    isBusy = true;
    updateButtonUI();

    if (!remoteFiles.length) {
      showBatchTabStatus(`${listingPrefix}: no photos were provided.`, "error");
      hideBatchTabStatus(9000);
      isBusy = false;
      updateButtonUI();
      throw new Error("Batch item has no photos.");
    }
    if (getVisibleUploadedPhotoCount() > 0) {
      showBatchTabStatus(`${listingPrefix}: this tab already has photos.`, "error");
      hideBatchTabStatus(9000);
      isBusy = false;
      updateButtonUI();
      throw new Error("This Vinted listing tab already has photos.");
    }

    const initialPhotoCount = getVisibleUploadedPhotoCount();
    let downloads = [];

    try {
      showBatchTabStatus(`${listingPrefix}: preparing photos...`);
      downloads = await Promise.all(remoteFiles.map(downloadPhoneUploadFile));
      const successfulDownloads = downloads.filter((result) => result.file);
      const filesToInject = successfulDownloads.map((result) => result.file);

      if (filesToInject.length !== remoteFiles.length) {
        throw new Error("Could not download every photo for this item.");
      }

      showBatchTabStatus(`${listingPrefix}: adding photos...`);
      if (
        !injectFilesIntoVinted(filesToInject, "phone_upload_batch", {
          generateUrls: successfulDownloads.map((result) => result.generateUrl),
        })
      ) {
        throw new Error("Could not add photos to the Vinted listing.");
      }

      showBatchTabStatus(`${listingPrefix}: waiting for Vinted to show photos...`);
      await waitForUploadedPhotoCount(initialPhotoCount + filesToInject.length);

      showBatchTabStatus(`${listingPrefix}: writing title and description...`);
      const generatedListing = await generateCurrentListing({
        descriptionApplyChoice: "replace",
        manageButtonState: false,
        showMeasurementAdvice: false,
        throwOnLimit: true,
        generationMode: "batch",
      });
      showBatchTabStatus(`${listingPrefix}: checking listing details...`);
      await waitForGeneratedListingFields(
        generatedListing?.title,
        generatedListing?.description,
      );

      showBatchTabStatus(`${listingPrefix}: ready to review.`, "success");
      hideBatchTabStatus(3500);
      return { ok: true, offers: generatedListing?.offers || [] };
    } catch (err) {
      showBatchTabStatus(
        err.message || `${listingPrefix}: generation failed.`,
        "error",
      );
      hideBatchTabStatus(9000);
      throw err;
    } finally {
      downloads.forEach((result) => {
        if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
      });
      isBusy = false;
      updateButtonUI();
    }
  }

  async function generateCurrentListing({
    descriptionApplyChoice = "replace",
    manageButtonState = true,
    showMeasurementAdvice = true,
    throwOnLimit = false,
    skipEmojiRetryPrompt = false,
    emojiRetry = false,
    overrideUseEmojis = null,
    generationMode = null,
  } = {}) {
    const incompletePhoneUpload = manageButtonState
      ? getIncompletePhoneUploadState()
      : null;
    if (incompletePhoneUpload) {
      const blockedTrackKey = [
        incompletePhoneUpload.sessionId,
        incompletePhoneUpload.receivedCount || 0,
        incompletePhoneUpload.expectedCount || 0,
        incompletePhoneUpload.visibleAddedCount || 0,
      ].join(":");
      if (blockedTrackKey !== lastPhoneUploadBlockedTrackKey) {
        lastPhoneUploadBlockedTrackKey = blockedTrackKey;
        trackGrowthEvent("phone_upload_generate_blocked", {
          mode: "single",
          ...getPhoneUploadDebugContext(incompletePhoneUpload),
        });
      }
      showToast("Still uploading. Wait a moment.", "info");
      throw new Error("Still uploading.");
    }

    let imageEntries = getUploadedImageEntries();
    let imageUrls = imageEntries.map((entry) => entry.url);
    let imageSourceTelemetry = buildImageSourceTelemetry(imageEntries);
    const generationAttemptId = createGenerationAttemptId();
    const mode = manageButtonState ? "manual" : "batch";
    const requestGenerationMode = generationMode || mode;
    let generateFetchDiagnostics = null;

    if (!imageUrls.length) {
      trackGrowthEvent("generate_missing_photo", { mode });
      if (manageButtonState) {
        showToast("Please upload at least one image.", "error");
      }
      throw new Error("Please upload at least one image.");
    }

    if (manageButtonState) {
      const imageSourceSummary =
        summarizeImageSourcesForTelemetry(imageSourceTelemetry);
      trackGrowthEvent("generate_click", {
        generationAttemptId,
        mode: "manual",
        descriptionApplyChoice,
        photoCount: imageUrls.length,
        imageSources: imageSourceTelemetry,
        imageSourceSummary,
        imageSourceMode: getImageSourceTelemetryMode(imageSourceSummary),
      });
    }

    if (manageButtonState) {
      isBusy = true;
      generateBusyLabel = hasManualCapturedFilesMissingStorageUrls()
        ? "Preparing..."
        : "Generating";
    }
    removeDescriptionApplyPrompt();
    if (activeGenerationOutputEditCleanup) {
      activeGenerationOutputEditCleanup("new_generation");
    }
    updateButtonUI();

    try {
      await waitForManualStorageUrlsForGenerate();
      if (manageButtonState) {
        setGenerateBusyLabel("Generating");
      }
      imageEntries = getUploadedImageEntries();
      imageUrls = imageEntries.map((entry) => entry.url);
      imageSourceTelemetry = buildImageSourceTelemetry(imageEntries);

      const storage = await chrome.storage.local.get([
        "selectedLanguage",
        "selectedTitleLanguage",
        "selectedDescriptionLanguage",
        LANGUAGE_PREFERENCE_TOUCHED_KEY,
        "tone",
        "useEmojis",
        HASHTAGS_STORAGE_KEY,
        DESCRIPTION_FOOTER_STORAGE_KEY,
        OUTPUT_SHAPE_STORAGE_KEY,
        DESCRIPTION_LENGTH_STORAGE_KEY,
        "userProfile",
      ]);
      const {
        tone = "standard",
        useEmojis = true,
        [HASHTAGS_STORAGE_KEY]: useHashtags = true,
        [DESCRIPTION_FOOTER_STORAGE_KEY]: storedDescriptionFooterText = "",
        [OUTPUT_SHAPE_STORAGE_KEY]: useBulletPoints = true,
        [DESCRIPTION_LENGTH_STORAGE_KEY]: storedDescriptionLength = "long",
        userProfile,
      } = storage;
      const descriptionLength = normalizeDescriptionLength(storedDescriptionLength);
      const languageProfile = resolveLanguageProfile(storage);
      const emojiAccess = canUseEmojiSetting(userProfile);
      const effectiveUseEmojis =
        emojiAccess &&
        (overrideUseEmojis === null
          ? useEmojis !== false
          : overrideUseEmojis === true);
      const descriptionFooterAccess = canUseDescriptionFooterSetting(userProfile);
      ensureDescriptionFooterListingState();
      const effectiveDescriptionFooterIncluded =
        descriptionFooterAccess && descriptionFooterIncludeForListing;
      const descriptionFooterText =
        effectiveDescriptionFooterIncluded &&
        typeof storedDescriptionFooterText === "string"
          ? storedDescriptionFooterText
          : "";
      const descriptionFooterValidation =
        validateDescriptionFooterText(descriptionFooterText);

      if (!descriptionFooterValidation.ok) {
        showToast(descriptionFooterValidation.error, "error");
        throw new Error(descriptionFooterValidation.error);
      }

      const effectiveDescriptionFooterText = descriptionFooterValidation.text;
      const titleLanguageCode = languageProfile.titleLanguageCode;
      const descriptionLanguageCode =
        languageProfile.descriptionLanguageCode;
      const legacyLanguageCode = descriptionLanguageCode || titleLanguageCode;
      const imageSourceSummary =
        summarizeImageSourcesForTelemetry(imageSourceTelemetry);
      trackGrowthEvent("generate_request", {
        generationAttemptId,
        mode,
        photoCount: imageUrls.length,
        imageSources: imageSourceTelemetry,
        imageSourceSummary,
        imageSourceMode: getImageSourceTelemetryMode(imageSourceSummary),
        titleLanguageCode,
        descriptionLanguageCode,
        uiLanguageCode: languageProfile.uiLanguageCode,
        uiLanguageSource: languageProfile.uiLanguageSource,
        languageDefaultSource: languageProfile.defaultSource,
        languageDefaultCode: languageProfile.defaultLanguageCode,
        domainLanguageCode: languageProfile.domainLanguageCode,
        hasStoredLanguagePreference:
          languageProfile.hasStoredLanguagePreference,
        hasExplicitLanguagePreference:
          languageProfile.hasExplicitLanguagePreference,
        tone,
        useEmojis: effectiveUseEmojis,
        useHashtags: useHashtags !== false,
        useBulletPoints: Boolean(useBulletPoints),
        descriptionLength,
        hasDescriptionFooter: /\S/.test(effectiveDescriptionFooterText),
        descriptionFooterIncluded: effectiveDescriptionFooterIncluded,
        descriptionFooterLength: effectiveDescriptionFooterText.length,
        emojiRetry: Boolean(emojiRetry),
      });
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });

      if (!access_token) {
        throw new Error(
          "Your session has expired. Please sign in again via the extension.",
        );
      }

      const baseRequestBody = {
        languageCode: legacyLanguageCode,
        titleLanguageCode,
        descriptionLanguageCode,
        tone,
        useEmojis: effectiveUseEmojis,
        useHashtags: useHashtags !== false,
        emojiRetry: Boolean(emojiRetry),
        useBulletPoints,
        descriptionLength,
        generationMode: requestGenerationMode,
        generationAttemptId,
      };

      async function buildPreparedGeneratePayload(entries, options = {}) {
        const { imageUrls: preparedImages, imageMetadata } =
          await prepareImagesForGenerate(entries, options);
        const requestBody = {
          ...baseRequestBody,
          imageUrls: preparedImages,
          imageMetadata,
        };

        if (/\S/.test(effectiveDescriptionFooterText)) {
          requestBody.descriptionFooterText = effectiveDescriptionFooterText;
        }

        return maybeUseRemoteImagesForOversizedGeneratePayload(requestBody);
      }

      let preparedGeneratePayload = await buildPreparedGeneratePayload(imageEntries);
      let requestBodyJson = preparedGeneratePayload.requestBodyJson;
      let requestImageUrls = preparedGeneratePayload.requestBody.imageUrls;
      let requestImageMetadata =
        preparedGeneratePayload.requestBody.imageMetadata;
      if (preparedGeneratePayload.payloadFallback) {
        trackGrowthEvent("generate_payload_remote_fallback", {
          generationAttemptId,
          mode,
          ...preparedGeneratePayload.payloadFallback,
        });
      }

      const sendGenerateRequest = async (retryReason = null) => {
        const fetchStartedAt = Date.now();
        generateFetchDiagnostics = {
          generationAttemptId,
          phase: "fetch",
          startedAtMs: fetchStartedAt,
          generationMode: requestGenerationMode,
          photoCount: imageUrls.length,
          requestBodyImageCount: requestImageUrls.length,
          requestBodyBytes: requestBodyJson.length,
          compressedImageBytes: getCompressedImageBytes(
            requestImageUrls,
            requestImageMetadata,
          ),
          imageSourceSummary:
            summarizeImageSourcesForTelemetry(imageSourceTelemetry),
          payloadFallback: preparedGeneratePayload.payloadFallback,
          retryReason,
        };

        const generateResponse = await fetch(`${API_BASE}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
            "X-Autolister-Extension-Version":
              chrome.runtime.getManifest().version,
          },
          body: requestBodyJson,
        });
        generateFetchDiagnostics.elapsedMs = Date.now() - fetchStartedAt;
        delete generateFetchDiagnostics.startedAtMs;
        return generateResponse;
      };

      let response = await sendGenerateRequest();

      if (response.status === 401) {
        trackGrowthEvent("generate_error", { mode, status: 401 });
        isAuthenticated = false;
        showToast("Session expired. Please sign in again.", "error");
        if (manageButtonState) {
          isBusy = false;
        }
        updateButtonUI();
        throw new Error("Session expired. Please sign in again.");
      }
      if (response.status === 429 || response.status === 403) {
        const errData = await response.json();
        if (response.status === 403 && errData.code !== "account_paused") {
          trackGrowthEvent("generate_error", {
            mode,
            status: response.status,
            code: errData.code || null,
          });
          throw new Error(errData.error || "Request blocked.");
        }
        trackGrowthEvent("generate_limit_hit", {
          mode,
          status: response.status,
          code: errData.code || null,
          currentTier: errData.currentTier || null,
          nextTier: errData.nextTier || null,
        });
        const limitMessage = buildLimitMessage(errData);
        const pricingUrl = limitMessage.actionText ? await getPricingUrl() : null;
        if (limitMessage.paywall && pricingUrl) {
          showLimitPaywall({
            title: limitMessage.title || "Usage limit reached",
            message: limitMessage.message,
            options: limitMessage.options,
            trustNote: limitMessage.trustNote,
            actionText: limitMessage.actionText,
            actionUrl: pricingUrl,
            secondaryActionText: limitMessage.secondaryActionText,
            secondaryActionUrl: pricingUrl,
            limitCode: errData.code,
            currentTier: errData.currentTier,
          });
        } else {
          const isAccountPaused = errData.code === "account_paused";
          showToast(
            limitMessage.message,
            "error",
            pricingUrl
              ? {
                  text: limitMessage.actionText,
                  onClick: isAccountPaused
                    ? () => showAccountPausedPaywall(pricingUrl)
                    : null,
                  url: isAccountPaused ? null : pricingUrl,
                  secondaryText: limitMessage.secondaryActionText,
                  secondaryUrl: limitMessage.secondaryActionUrl,
                }
              : null,
            !isAccountPaused,
          );
        }
        if (errData.code === "account_paused") {
          trackGrowthEvent("account_paused_shown", {
            mode,
            status: response.status,
            code: errData.code,
          });
        }
        if (manageButtonState) {
          isBusy = false;
        }
        updateButtonUI();
        if (throwOnLimit) {
          throw new Error(limitMessage.message || "Usage limit reached.");
        }
        return { ok: false, limited: true };
      }
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        if (
          shouldRetryGenerateWithLocalCapturedImages(
            response.status,
            error,
            requestImageMetadata,
          ) &&
          clearCapturedPromptUploadGenerationUrls("generate_remote_image_failed")
        ) {
          trackGrowthEvent("generate_retry_local_captured_images", {
            mode,
            status: response.status,
            message: error || null,
            generationAttemptId,
          });
          imageEntries = getUploadedImageEntries();
          imageUrls = imageEntries.map((entry) => entry.url);
          imageSourceTelemetry = buildImageSourceTelemetry(imageEntries);
          preparedGeneratePayload = await buildPreparedGeneratePayload(imageEntries, {
            ignoreGenerationUrls: true,
          });
          requestBodyJson = preparedGeneratePayload.requestBodyJson;
          requestImageUrls = preparedGeneratePayload.requestBody.imageUrls;
          requestImageMetadata =
            preparedGeneratePayload.requestBody.imageMetadata;
          response = await sendGenerateRequest("local_captured_images");
          if (response.ok) {
            // Continue to normal success handling below.
          } else {
            const retryError = await response.json().catch(() => ({}));
            trackGrowthEvent("generate_error", {
              mode,
              status: response.status,
              message: retryError.error || null,
              retriedWithLocalCapturedImages: true,
            });
            throw new Error(retryError.error || `HTTP ${response.status}`);
          }
        } else {
          trackGrowthEvent("generate_error", {
            mode,
            status: response.status,
            message: error || null,
          });
          throw new Error(error || `HTTP ${response.status}`);
        }
      }

      if (requestImageMetadata.some(isCapturedStoragePayload)) {
        clearCapturedPromptUploadGenerationUrls("generate_success");
      }
      if (
        requestImageMetadata.some(
          (metadata) => metadata?.capturedUploadSource === "phone_upload_single",
        )
      ) {
        finishCapturedPromptUploadPhoneSessions();
      }

      const { title, description, measurementAdvice, offers = [] } = await response.json();
      const titleInput = document.querySelector(SELECTORS.title);
      const descInput = document.querySelector(SELECTORS.description);

      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (descInput) {
        applyGeneratedDescription(descInput, description, descriptionApplyChoice);
      }

      startGenerationOutputEditTracking({
        generationAttemptId,
        mode,
        photoCount: imageUrls.length,
        titleLanguageCode,
        descriptionLanguageCode,
        descriptionApplyChoice,
        generatedTitle: title,
        generatedDescription: description,
        appliedTitle: titleInput?.value || "",
        appliedDescription: descInput?.value || "",
      });

      if (manageButtonState) {
        setButtonSuccessState();
      }

      trackGrowthEvent("generate_success", {
        mode,
        photoCount: imageUrls.length,
        titleLanguageCode,
        descriptionLanguageCode,
        useEmojis: effectiveUseEmojis,
        emojiRetry: Boolean(emojiRetry),
        hasMeasurementAdvice: Boolean(measurementAdvice && measurementAdvice.trim()),
      });
      markInlineLanguageHintDone();

      const showedOfferPrompt = manageButtonState
        ? await queueGenerationOffers(offers)
        : false;

      if (
        manageButtonState &&
        effectiveUseEmojis &&
        !skipEmojiRetryPrompt &&
        !showedOfferPrompt &&
        isFreeProfile(userProfile) &&
        descInput
      ) {
        await maybeShowEmojiRetryPrompt(descInput);
      }

      return { ok: true, title, description, measurementAdvice, offers };
    } catch (err) {
      console.error("AutoLister AI Error:", err);
      if (generateFetchDiagnostics?.startedAtMs) {
        generateFetchDiagnostics.elapsedMs =
          Date.now() - generateFetchDiagnostics.startedAtMs;
        delete generateFetchDiagnostics.startedAtMs;
      }
      const toastMessage = err.message || "An unexpected error occurred.";
      const isWaitingMessage = isGenerateWaitingMessage(toastMessage);
      if (!isWaitingMessage) {
        trackGrowthEvent(
          "generate_error",
          buildGenerateFailureDiagnostics(err, {
            mode,
            ...(generateFetchDiagnostics || {}),
          }),
        );
      }
      if (manageButtonState) {
        showToast(toastMessage, isWaitingMessage ? "info" : "error");
        isBusy = false;
      }
      updateButtonUI();
      throw err;
    }
  }

  async function onGenerateClick() {
    if (!isAuthenticated) {
      trackGrowthEvent("generate_blocked", { reason: "signed_out" });
      await openSignInPopup("generate_blocked", { reason: "signed_out" });
      return;
    }

    const descInputBeforeGenerate = document.querySelector(SELECTORS.description);
    const descriptionApplyChoice = descInputBeforeGenerate
      ? await getDescriptionApplyChoice(descInputBeforeGenerate)
      : "replace";

    if (descriptionApplyChoice === "cancel") {
      trackGrowthEvent("generate_cancelled", { reason: "description_apply_choice" });
      return;
    }

    try {
      await generateCurrentListing({
        descriptionApplyChoice,
        manageButtonState: true,
        showMeasurementAdvice: true,
      });
    } catch (err) {
      // generateCurrentListing already renders the user-facing error for manual clicks.
    }
  }

  // --- INJECTION & OBSERVATION LOGIC ---

  function injectButton() {
    const existingBtn = document.getElementById(BTN_ID);
    if (existingBtn) {
      generateBtn = existingBtn;
      phoneBtn = document.getElementById(PHONE_BTN_ID);
      batchBtn = document.getElementById(BATCH_BTN_ID);
      if (batchBtn) {
        batchBtn.remove();
        batchBtn = null;
      }
      reportBtn = document.getElementById(REPORT_BTN_ID);
      if (!reportBtn) {
        reportBtn = createReportButton();
        existingBtn.closest(".quickvint-primary-tools")?.appendChild(reportBtn);
      }
      emojiToggleBtn = document.getElementById(EMOJI_TOGGLE_ID);
      hashtagsToggleBtn = document.getElementById(HASHTAGS_TOGGLE_ID);
      outputShapeToggleBtn = document.getElementById(OUTPUT_SHAPE_TOGGLE_ID);
      if (!outputShapeToggleBtn) {
        const toolOptions = document.querySelector(".quickvint-tool-options");
        outputShapeToggleBtn = createOutputShapeToggleButton();
        toolOptions?.insertBefore(outputShapeToggleBtn, hashtagsToggleBtn || null);
      }
      descriptionFooterBtn = document.getElementById(DESCRIPTION_FOOTER_BTN_ID);
      descriptionFooterEditBtn = document.getElementById(
        DESCRIPTION_FOOTER_EDIT_BTN_ID,
      );
      if (!descriptionFooterBtn) {
        document
          .querySelector(".quickvint-tool-options")
          ?.appendChild(createDescriptionFooterControl());
      }
      descriptionLengthToggle = document.getElementById(
        DESCRIPTION_LENGTH_TOGGLE_ID,
      );
      signInBtn = document.getElementById(SIGN_IN_BTN_ID);
      injectFieldLanguageControls();
      syncEmojiToggleState();
      syncHashtagsToggleState();
      syncOutputShapeToggleState();
      syncDescriptionFooterButtonState();
      syncDescriptionLengthToggleState();
      updateButtonUI();
      maybePostDomCanaryPass();
      return true;
    }

    const titleEl = document.querySelector(SELECTORS.title);
    if (!titleEl) return false;

    const container = titleEl.closest("div");
    if (container && container.parentNode) {
      const btnContainer = document.createElement("div");
      // Container for tool buttons and the sign-in component, spaced below the title.
      btnContainer.style.marginTop = "20px";

      // Wrapper for primary actions and lightweight preferences.
      const toolsWrapper = document.createElement("div");
      toolsWrapper.className = "quickvint-tools";
      const primaryTools = document.createElement("div");
      primaryTools.className = "quickvint-primary-tools";
      const toolOptions = document.createElement("div");
      toolOptions.className = "quickvint-tool-options";

      generateBtn = createButton();
      phoneBtn = createPhoneButton();
      batchBtn = null;
      reportBtn = createReportButton();
      descriptionLengthToggle = createDescriptionLengthToggle();
      outputShapeToggleBtn = createOutputShapeToggleButton();
      hashtagsToggleBtn = createHashtagsToggleButton();
      const descriptionFooterControl = createDescriptionFooterControl();
      emojiToggleBtn = createEmojiToggleButton();
      signInBtn = createSignInComponent();

      primaryTools.appendChild(generateBtn);
      primaryTools.appendChild(phoneBtn);
      primaryTools.appendChild(reportBtn);
      toolOptions.appendChild(descriptionLengthToggle);
      toolOptions.appendChild(outputShapeToggleBtn);
      toolOptions.appendChild(hashtagsToggleBtn);
      toolOptions.appendChild(descriptionFooterControl);
      toolOptions.appendChild(emojiToggleBtn);
      toolsWrapper.appendChild(primaryTools);
      toolsWrapper.appendChild(toolOptions);

      btnContainer.appendChild(toolsWrapper);
      btnContainer.appendChild(signInBtn);

      container.parentNode.insertBefore(btnContainer, container.nextSibling);
      injectFieldLanguageControls();
      updateButtonUI();
      maybePostDomCanaryPass();
      return true;
    }
    return false;
  }

  function startInjectionObserver() {
    const pollInterval = setInterval(() => {
      if (injectButton()) {
        clearInterval(pollInterval);
      }
    }, 100);

    const observer = new MutationObserver(() => {
      if (injectButton()) {
        observer.disconnect();
        clearInterval(pollInterval);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function getMemberId(pathname = window.location.pathname) {
    return pathname.match(/^\/member\/(\d+)(?:[-/]|$)/)?.[1] || null;
  }

  function getRenderedCurrentMemberId() {
    for (const link of document.querySelectorAll('header a[href*="/member/"]')) {
      try {
        const url = new URL(link.href, window.location.origin);
        if (url.origin === window.location.origin) {
          const memberId = getMemberId(url.pathname);
          if (memberId) return memberId;
        }
      } catch {}
    }

    const userIdPattern =
      /(?:initialUserState\\?":\{\\?"user|(?:^|[,\{])\\?"currentUser)\\?":\{[^{}]{0,500}?\\?"id\\?":(\d+)/;
    for (const script of document.scripts) {
      const memberId = script.textContent?.match(userIdPattern)?.[1];
      if (memberId) return memberId;
    }
    return null;
  }

  function isVisible(element) {
    return Boolean(
      element &&
        (element.offsetWidth || element.offsetHeight || element.getClientRects().length),
    );
  }

  function injectWardrobeRewriteWidget() {
    if (document.getElementById(WARDROBE_REWRITE_WIDGET_ID)) return true;

    const profileId = getMemberId();
    if (!profileId) return true;
    if (
      isVisible(document.querySelector('[data-testid="header--login-button"]')) ||
      isVisible(
        document.querySelector('[data-testid="profile-info-follow-button"]'),
      )
    ) {
      return true;
    }

    const currentMemberId = getRenderedCurrentMemberId();
    if (!currentMemberId) return false;
    if (currentMemberId !== profileId) return true;

    const username = document.querySelector('[data-testid="profile-username"]');
    const profileContent = username?.closest(".u-flex-grow");
    const location = profileContent?.querySelector(
      '[data-testid="profile-location-info"]',
    );
    const host = location
      ? [...profileContent.children].find((child) => child.contains(location))
      : null;
    if (!host) return false;

    host.classList.add("quickvint-wardrobe-rewrite-host");
    const characterUrl = chrome.runtime.getURL(
      "images/wardrobe-rewrite-character.webp",
    );
    const widget = document.createElement("aside");
    widget.id = WARDROBE_REWRITE_WIDGET_ID;
    widget.className = "quickvint-wardrobe-rewrite-pending";
    widget.setAttribute("aria-label", "AutoLister listing rewrite");
    widget.innerHTML = `
      <div class="quickvint-wardrobe-rewrite-expanded">
        <button type="button" class="quickvint-wardrobe-rewrite-minimize" aria-label="Minimize rewrite listings" title="Minimize">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12" stroke-linecap="round" /></svg>
        </button>
        <p class="quickvint-wardrobe-rewrite-brand">AutoLister AI</p>
        <h2 id="quickvint-wardrobe-rewrite-title">Let's rewrite your listings</h2>
        <p class="quickvint-wardrobe-rewrite-copy">Refresh your titles and descriptions without starting over.</p>
        <button type="button" class="quickvint-wardrobe-rewrite-cta" disabled>Rewrite my listings</button>
        <img class="quickvint-wardrobe-rewrite-character" src="${characterUrl}" alt="" width="560" height="568" />
      </div>
      <button type="button" class="quickvint-wardrobe-rewrite-compact" aria-label="Expand rewrite listings">
        <img src="${characterUrl}" alt="" width="42" height="42" />
        <span>Rewrite listings</span>
        <span class="quickvint-wardrobe-rewrite-chevron" aria-hidden="true">›</span>
      </button>
    `;
    host.appendChild(widget);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fitToViewport = () => {
      if (window.innerWidth > 640) {
        widget.style.removeProperty("width");
        widget.style.removeProperty("max-width");
        widget.style.removeProperty("margin-left");
        return;
      }
      const viewportWidth = document.documentElement.clientWidth;
      const width = widget.classList.contains("is-collapsed")
        ? Math.min(196, viewportWidth - 32)
        : viewportWidth - 32;
      const currentMargin = Number.parseFloat(widget.style.marginLeft) || 0;
      const naturalLeft = widget.getBoundingClientRect().left - currentMargin;
      widget.style.width = `${width}px`;
      widget.style.maxWidth = "none";
      widget.style.marginLeft = `${viewportWidth - 16 - width - naturalLeft}px`;
    };
    const setCollapsed = (collapsed, persist) => {
      const applyState = () => {
        widget.classList.toggle("is-collapsed", collapsed);
        fitToViewport();
      };
      if (!persist || reduceMotion) {
        applyState();
      } else {
        const first = widget.getBoundingClientRect();
        const firstHostHeight = host.getBoundingClientRect().height;
        const firstRadius = getComputedStyle(widget).borderRadius;
        const outgoing = widget.querySelector(
          collapsed
            ? ".quickvint-wardrobe-rewrite-expanded"
            : ".quickvint-wardrobe-rewrite-compact",
        );
        const incoming = widget.querySelector(
          collapsed
            ? ".quickvint-wardrobe-rewrite-compact"
            : ".quickvint-wardrobe-rewrite-expanded",
        );
        widget.classList.add("is-animating");
        applyState();
        const last = widget.getBoundingClientRect();
        const lastHostHeight = host.getBoundingClientRect().height;
        const lastRadius = getComputedStyle(widget).borderRadius;
        const motion = {
          duration: 420,
          easing: "cubic-bezier(.22, 1, .36, 1)",
        };
        const widgetAnimation = widget.animate(
          [
            {
              transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`,
              transformOrigin: "top left",
              borderRadius: firstRadius,
            },
            {
              transform: "translate(0, 0) scale(1, 1)",
              transformOrigin: "top left",
              borderRadius: lastRadius,
            },
          ],
          motion,
        );
        const hostAnimation = host.animate(
          [
            { height: `${firstHostHeight}px` },
            { height: `${lastHostHeight}px` },
          ],
          motion,
        );
        outgoing.style.visibility = "visible";
        incoming.style.visibility = "visible";
        const outgoingAnimation = outgoing.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 220, easing: "ease-out" },
        );
        const incomingAnimation = incoming.animate(
          [
            { opacity: 0, transform: "translateY(4px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 280,
            delay: 60,
            easing: "ease-out",
            fill: "backwards",
          },
        );
        Promise.allSettled([
          widgetAnimation.finished,
          hostAnimation.finished,
          outgoingAnimation.finished,
          incomingAnimation.finished,
        ]).then(() => {
          outgoing.style.removeProperty("visibility");
          incoming.style.removeProperty("visibility");
          widget.classList.remove("is-animating");
        });
      }
      if (persist) {
        chrome.storage.local.set({ [WARDROBE_REWRITE_COLLAPSED_KEY]: collapsed });
      }
    };
    widget
      .querySelector(".quickvint-wardrobe-rewrite-minimize")
      .addEventListener("click", () => setCollapsed(true, true));
    widget
      .querySelector(".quickvint-wardrobe-rewrite-compact")
      .addEventListener("click", () => setCollapsed(false, true));
    chrome.storage.local.get(
      { [WARDROBE_REWRITE_COLLAPSED_KEY]: false },
      (storage) => {
        setCollapsed(Boolean(storage[WARDROBE_REWRITE_COLLAPSED_KEY]), false);
        widget.classList.remove("quickvint-wardrobe-rewrite-pending");
        if (!reduceMotion) {
          widget.animate(
            [
              { opacity: 0, transform: "translateY(10px) scale(.98)" },
              { opacity: 1, transform: "translateY(0) scale(1)" },
            ],
            {
              duration: 360,
              easing: "cubic-bezier(.22, 1, .36, 1)",
            },
          );
        }
      },
    );
    window.addEventListener("resize", fitToViewport);
    return true;
  }

  function startWardrobeRewriteObserver() {
    if (!getMemberId() || injectWardrobeRewriteWidget()) return;

    const observer = new MutationObserver(() => {
      if (injectWardrobeRewriteWidget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5000);
  }

  // --- INITIALIZATION ---

  function init() {
    injectStylesheet();
    bindPromptUploadFileCapture();
    bindLimitFollowupResumeListeners();
    maybeRecoverDomCanaryLogin();
    setTimeout(maybeRecoverDomCanaryLogin, 3000);
    setTimeout(maybeRecoverDomCanaryLogin, 10000);
    initializeAuthState();
    startWardrobeRewriteObserver();
    startInjectionObserver();
  }

  init();
})();
