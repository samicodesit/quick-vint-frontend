// Localization data and helper functions
// Moved from callback.js

const LOCALIZATION = {
  FR: {
    domain: "vinted.fr",
    currency: "€",
    texts: {
      welcomeTitle: "Bienvenue sur AutoLister AI !",
      welcomeSubtitle:
        "Vous êtes connecté et prêt à créer des annonces incroyables avec l'IA.",
      welcomeMessage:
        "Retournez sur Vinted, le bouton 🪄 Generate apparaîtra lors de la création d'annonces !",
      featuresTitle: "✨ Ce que vous pouvez faire maintenant",
      feature1:
        "Générer des titres et descriptions convaincants instantanément",
      feature2:
        "Télécharger des photos et obtenir des annonces alimentées par l'IA",
      feature3:
        "Flux de travail sécurisé : génération de texte uniquement, sans actions de masse automatisées sur le compte",
      feature4: "Démarrez avec 13 crédits gratuits — aucune carte requise",
      upgradeTitle: "💡 Vous voulez plus de puissance ?",
      upgradeDescription:
        "Les utilisateurs gratuits obtiennent 13 crédits au total. Passez à une offre supérieure pour plus de crédits, plus d'annonces IA et un support prioritaire !",
      privacyLink: "Politique de confidentialité",
      termsLink: "Conditions d'utilisation",
      // New keys
      closeTabButton: "Fermer l'onglet",
      viewPlansButton: "Voir tous les plans",
      onboardingTitle: "Prêt à vendre ?",
      onboardingImageAlt: "Aperçu de l'outil AutoLister sur Vinted",
    },
  },
  DE: {
    domain: "vinted.de",
    currency: "€",
    texts: {
      welcomeTitle: "Willkommen bei AutoLister AI!",
      welcomeSubtitle:
        "Sie sind angemeldet und bereit, fantastische Anzeigen mit KI zu erstellen.",
      welcomeMessage:
        "Gehen Sie zurück zu Vinted, der 🪄 Generate Button erscheint, wenn Sie neue Anzeigen erstellen!",
      featuresTitle: "✨ Was Sie jetzt tun können",
      feature1: "Überzeugende Titel und Beschreibungen sofort generieren",
      feature2: "Fotos hochladen und KI-gestützte Anzeigen erhalten",
      feature3:
        "Sicherer Workflow ohne automatisierte Massenaktionen auf Ihrem Konto",
      feature4: "Starte mit 13 kostenlosen Credits — keine Karte erforderlich",
      upgradeTitle: "💡 Möchten Sie mehr Power?",
      upgradeDescription:
        "Kostenlose Nutzer erhalten insgesamt 13 Credits. Upgraden Sie für mehr Credits, mehr KI-Listings und priorisierten Support!",
      privacyLink: "Datenschutzerklärung",
      termsLink: "Nutzungsbedingungen",
      // New keys
      closeTabButton: "Tab schließen",
      viewPlansButton: "Alle Pläne anzeigen",
      onboardingTitle: "Bereit zu verkaufen?",
      onboardingImageAlt: "Vorschau des AutoLister-Tools auf Vinted",
    },
  },
  PL: {
    domain: "vinted.pl",
    currency: "zł",
    texts: {
      welcomeTitle: "Witamy w AutoLister AI!",
      welcomeSubtitle:
        "Jesteś zalogowany i gotowy do tworzenia niesamowitych ogłoszeń z pomocą AI.",
      welcomeMessage:
        "Wróć do Vinted, przycisk 🪄 Generate pojawi się, gdy będziesz tworzyć nowe ogłoszenia!",
      featuresTitle: "✨ Co możesz teraz zrobić",
      feature1: "Natychmiast generuj przekonujące tytuły i opisy",
      feature2: "Przesyłaj zdjęcia i otrzymuj ogłoszenia wspierane przez AI",
      feature3:
        "Bezpieczny proces tworzenia bez masowych automatycznych akcji na koncie",
      feature4: "Zacznij z 13 darmowymi kredytami — bez karty",
      upgradeTitle: "💡 Chcesz więcej mocy?",
      upgradeDescription:
        "Darmowi użytkownicy dostają łącznie 13 kredytów. Ulepsz plan, aby uzyskać więcej kredytów, więcej ogłoszeń AI i priorytetowe wsparcie!",
      privacyLink: "Polityka prywatności",
      termsLink: "Warunki świadczenia usług",
      // New keys
      closeTabButton: "Zamknij kartę",
      viewPlansButton: "Zobacz wszystkie plany",
      onboardingTitle: "Gotowy do sprzedaży?",
      onboardingImageAlt: "Podgląd narzędzia AutoLister na Vinted",
    },
  },
  ES: {
    domain: "vinted.es",
    currency: "€",
    texts: {
      welcomeTitle: "¡Bienvenido a AutoLister AI!",
      welcomeSubtitle:
        "Has iniciado sesión y estás listo para crear increíbles anuncios con IA.",
      welcomeMessage:
        "Vuelve a Vinted, el botón 🪄 Generate aparecerá cuando crees nuevos anuncios.",
      featuresTitle: "✨ Lo que puedes hacer ahora",
      feature1: "Generar títulos y descripciones convincentes al instante",
      feature2: "Subir fotos y obtener anuncios potenciados por IA",
      feature3:
        "Flujo seguro: solo generacion de texto, sin acciones masivas automatizadas en la cuenta",
      feature4: "Comienza con 13 créditos gratis — sin tarjeta requerida",
      upgradeTitle: "💡 ¿Quieres más potencia?",
      upgradeDescription:
        "Los usuarios gratuitos obtienen 13 créditos en total. Mejora tu plan para más créditos, más anuncios con IA y soporte prioritario!",
      privacyLink: "Política de privacidad",
      termsLink: "Términos de servicio",
      // New keys
      closeTabButton: "Cerrar pestaña",
      viewPlansButton: "Ver todos los planes",
      onboardingTitle: "¿Listo para vender?",
      onboardingImageAlt: "Vista previa de la herramienta AutoLister en Vinted",
    },
  },
  IT: {
    domain: "vinted.it",
    currency: "€",
    texts: {
      welcomeTitle: "Benvenuto su AutoLister AI!",
      welcomeSubtitle:
        "Hai effettuato l'accesso e sei pronto per creare annunci fantastici con l'IA.",
      welcomeMessage:
        "Torna su Vinted, il pulsante 🪄 Generate apparirà quando crei nuovi annunci!",
      featuresTitle: "✨ Cosa puoi fare ora",
      feature1: "Generare titoli e descrizioni convincenti istantaneamente",
      feature2: "Caricare foto e ottenere annunci potenziati dall'IA",
      feature3:
        "Flusso di lavoro sicuro: solo generazione di testo, senza azioni di massa automatizzate sull'account",
      feature4: "Inizia con 13 crediti gratuiti — nessuna carta richiesta",
      upgradeTitle: "💡 Vuoi più potenza?",
      upgradeDescription:
        "Gli utenti gratuiti ottengono in totale 13 crediti. Passa a un piano superiore per più crediti, più annunci IA e supporto prioritario!",
      privacyLink: "Informativa sulla privacy",
      termsLink: "Termini di servizio",
      // New keys
      closeTabButton: "Chiudi scheda",
      viewPlansButton: "Visualizza tutti i piani",
      onboardingTitle: "Pronto a vendere?",
      onboardingImageAlt: "Anteprima dello strumento AutoLister su Vinted",
    },
  },
  NL: {
    domain: "vinted.nl",
    currency: "€",
    texts: {
      welcomeTitle: "Welkom bij AutoLister AI!",
      welcomeSubtitle:
        "Je bent ingelogd en klaar om geweldige advertenties te maken met AI.",
      welcomeMessage:
        "Ga terug naar Vinted, de 🪄 Generate knop verschijnt bij het maken van nieuwe advertenties!",
      featuresTitle: "✨ Wat je nu kunt doen",
      feature1: "Overtuigende titels en beschrijvingen direct genereren",
      feature2: "Foto's uploaden en AI-aangedreven advertenties krijgen",
      feature3:
        "Veilige workflow zonder geautomatiseerde massa-acties op je account",
      feature4: "Begin met 13 gratis credits — geen kaart vereist",
      upgradeTitle: "💡 Wil je meer kracht?",
      upgradeDescription:
        "Gratis gebruikers krijgen in totaal 13 credits. Upgrade om meer credits, meer AI-advertenties en prioriteitsondersteuning te krijgen!",
      privacyLink: "Privacybeleid",
      termsLink: "Servicevoorwaarden",
      // New keys
      closeTabButton: "Tabblad sluiten",
      viewPlansButton: "Bekijk alle plannen",
      onboardingTitle: "Klaar om te verkopen?",
      onboardingImageAlt: "Voorbeeld van de AutoLister-tool op Vinted",
    },
  },
  DEFAULT: {
    domain: "vinted.com",
    currency: "€",
    texts: {
      welcomeTitle: "Welcome to AutoLister AI!",
      welcomeSubtitle:
        "You're signed in and ready to create amazing listings with AI.",
      welcomeMessage:
        "Head back to Vinted, the 🪄 Generate button will appear when you create new listings!",
      featuresTitle: "✨ What You Can Do Now",
      feature1: "Generate compelling titles and descriptions instantly",
      feature2: "Upload photos and get AI-powered listings",
      feature3: "Use a safe workflow with no automated mass account actions",
      feature4: "Start with 13 free credits — no card required",
      upgradeTitle: "💡 Want More Power?",
      upgradeDescription:
        "Free users get 13 credits total. Upgrade for more credits, more AI listings, and priority support!",
      privacyLink: "Privacy Policy",
      termsLink: "Terms of Service",
      // New keys
      closeTabButton: "Close Tab",
      viewPlansButton: "View All Plans",
      onboardingTitle: "Ready to list?",
      onboardingImageAlt: "Preview of AutoLister tool on Vinted",
    },
  },
};

function detectCountryAndLocalization() {
  let countryCode = "DEFAULT";

  // Primary detection via timezone (most reliable)
  if (typeof Intl !== "undefined") {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezoneMap = {
        "Europe/Paris": "FR",
        "Europe/Berlin": "DE",
        "Europe/Madrid": "ES",
        "Europe/Rome": "IT",
        "Europe/Amsterdam": "NL",
        "Europe/Brussels": "NL", // Belgium often uses Dutch for Vinted
        "Europe/Warsaw": "PL",
      };

      if (timezoneMap[timezone]) {
        countryCode = timezoneMap[timezone];
      }
    } catch (e) {
      console.warn("Timezone detection failed:", e);
    }
  }

  // Fallback to language detection
  if (countryCode === "DEFAULT" && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("fr")) countryCode = "FR";
    else if (lang.startsWith("de")) countryCode = "DE";
    else if (lang.startsWith("es")) countryCode = "ES";
    else if (lang.startsWith("it")) countryCode = "IT";
    else if (lang.startsWith("nl")) countryCode = "NL";
    else if (lang.startsWith("pl")) countryCode = "PL";
  }

  return LOCALIZATION[countryCode] || LOCALIZATION.DEFAULT;
}

// Export to global scope for callback.js
window.LOCALIZATION = LOCALIZATION;
window.detectCountryAndLocalization = detectCountryAndLocalization;
