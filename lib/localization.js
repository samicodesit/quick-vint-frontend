// Localization data and helper functions
// Moved from callback.js

const LOCALIZATION = {
  FR: {
    domain: "vinted.fr",
    currency: "€",
    texts: {
      welcomeTitle: "Vous êtes connecté",
      welcomeSubtitle:
        "C'est prêt.",
      welcomeMessage:
        "C'est prêt.",
      featuresTitle: "✨ Ce que vous pouvez faire maintenant",
      feature1:
        "Générer des titres et descriptions convaincants instantanément",
      feature2:
        "Télécharger des photos et obtenir des annonces alimentées par l'IA",
      feature3:
        "Flux de travail sécurisé : génération de texte uniquement, sans actions de masse automatisées sur le compte",
      feature4: "Commencer avec 5 générations gratuites",
      upgradeTitle: "Voir les plans",
      upgradeDescription:
        "Le plan gratuit inclut 5 générations. Passez à une offre supérieure pour plus de générations et le support prioritaire.",
      starterFeatures: "10 annonces/jour<br>75 par mois",
      proFeatures: "25 annonces/jour<br>250 par mois",
      businessFeatures:
        "60 annonces/jour<br>600 par mois",
      privacyLink: "Politique de confidentialité",
      termsLink: "Conditions d'utilisation",
      // New keys
      closeTabButton: "Terminé",
      closeTabFallback: "Vous pouvez fermer cet onglet.",
      vintedButton: "Créer sur Vinted.fr",
      viewPlansButton: "Voir les plans",
      onboardingTitle: "",
      onboardingImageAlt: "Aperçu de l'outil AutoLister sur Vinted",
    },
  },
  DE: {
    domain: "vinted.de",
    currency: "€",
    texts: {
      welcomeTitle: "Sie sind angemeldet",
      welcomeSubtitle:
        "Alles erledigt.",
      welcomeMessage:
        "Alles erledigt.",
      featuresTitle: "✨ Was Sie jetzt tun können",
      feature1: "Überzeugende Titel und Beschreibungen sofort generieren",
      feature2: "Fotos hochladen und KI-gestützte Anzeigen erhalten",
      feature3:
        "Sicherer Workflow ohne automatisierte Massenaktionen auf Ihrem Konto",
      feature4: "Mit 5 kostenlosen Generierungen beginnen",
      upgradeTitle: "Pläne ansehen",
      upgradeDescription:
        "Der Free-Plan enthält 5 Generierungen. Upgraden Sie für mehr Generierungen und priorisierten Support.",
      starterFeatures: "10 Anzeigen/Tag<br>75 pro Monat",
      proFeatures: "25 Anzeigen/Tag<br>250 pro Monat",
      businessFeatures: "60 Anzeigen/Tag<br>600 pro Monat",
      privacyLink: "Datenschutzerklärung",
      termsLink: "Nutzungsbedingungen",
      // New keys
      closeTabButton: "Fertig",
      closeTabFallback: "Sie können diesen Tab schließen.",
      vintedButton: "Auf Vinted.de erstellen",
      viewPlansButton: "Pläne ansehen",
      onboardingTitle: "",
      onboardingImageAlt: "Vorschau des AutoLister-Tools auf Vinted",
    },
  },
  PL: {
    domain: "vinted.pl",
    currency: "zł",
    texts: {
      welcomeTitle: "Jesteś zalogowany",
      welcomeSubtitle:
        "Gotowe.",
      welcomeMessage:
        "Gotowe.",
      featuresTitle: "✨ Co możesz teraz zrobić",
      feature1: "Natychmiast generuj przekonujące tytuły i opisy",
      feature2: "Przesyłaj zdjęcia i otrzymuj ogłoszenia wspierane przez AI",
      feature3:
        "Bezpieczny proces tworzenia bez masowych automatycznych akcji na koncie",
      feature4: "Zacznij od 5 darmowych generacji",
      upgradeTitle: "Zobacz plany",
      upgradeDescription:
        "Plan darmowy obejmuje 5 generacji. Przejdź na wyższy plan, aby uzyskać więcej generacji i priorytetowe wsparcie.",
      starterFeatures:
        "10 ogłoszeń/dzień<br>75 miesięcznie",
      proFeatures: "25 ogłoszeń/dzień<br>250 miesięcznie",
      businessFeatures:
        "60 ogłoszeń/dzień<br>600 miesięcznie",
      privacyLink: "Polityka prywatności",
      termsLink: "Warunki świadczenia usług",
      // New keys
      closeTabButton: "Gotowe",
      closeTabFallback: "Możesz zamknąć tę kartę.",
      vintedButton: "Twórz na Vinted.pl",
      viewPlansButton: "Zobacz plany",
      onboardingTitle: "",
      onboardingImageAlt: "Podgląd narzędzia AutoLister na Vinted",
    },
  },
  ES: {
    domain: "vinted.es",
    currency: "€",
    texts: {
      welcomeTitle: "Has iniciado sesión",
      welcomeSubtitle:
        "Todo listo.",
      welcomeMessage:
        "Todo listo.",
      featuresTitle: "✨ Lo que puedes hacer ahora",
      feature1: "Generar títulos y descripciones convincentes al instante",
      feature2: "Subir fotos y obtener anuncios potenciados por IA",
      feature3:
        "Flujo seguro: solo generacion de texto, sin acciones masivas automatizadas en la cuenta",
      feature4: "Empieza con 5 generaciones gratis",
      upgradeTitle: "Ver planes",
      upgradeDescription:
        "El plan gratuito incluye 5 generaciones. Mejora tu plan para más generaciones y soporte prioritario.",
      starterFeatures:
        "10 anuncios/día<br>75 al mes",
      proFeatures: "25 anuncios/día<br>250 al mes",
      businessFeatures: "60 anuncios/día<br>600 al mes",
      privacyLink: "Política de privacidad",
      termsLink: "Términos de servicio",
      // New keys
      closeTabButton: "Listo",
      closeTabFallback: "Puedes cerrar esta pestaña.",
      vintedButton: "Crear en Vinted.es",
      viewPlansButton: "Ver planes",
      onboardingTitle: "",
      onboardingImageAlt: "Vista previa de la herramienta AutoLister en Vinted",
    },
  },
  IT: {
    domain: "vinted.it",
    currency: "€",
    texts: {
      welcomeTitle: "Hai effettuato l'accesso",
      welcomeSubtitle:
        "Tutto pronto.",
      welcomeMessage:
        "Tutto pronto.",
      featuresTitle: "✨ Cosa puoi fare ora",
      feature1: "Generare titoli e descrizioni convincenti istantaneamente",
      feature2: "Caricare foto e ottenere annunci potenziati dall'IA",
      feature3:
        "Flusso di lavoro sicuro: solo generazione di testo, senza azioni di massa automatizzate sull'account",
      feature4: "Inizia con 5 generazioni gratuite",
      upgradeTitle: "Vedi i piani",
      upgradeDescription:
        "Il piano gratuito include 5 generazioni. Passa a un piano superiore per più generazioni e supporto prioritario.",
      starterFeatures:
        "10 annunci/giorno<br>75 al mese",
      proFeatures: "25 annunci/giorno<br>250 al mese",
      businessFeatures:
        "60 annunci/giorno<br>600 al mese",
      privacyLink: "Informativa sulla privacy",
      termsLink: "Termini di servizio",
      // New keys
      closeTabButton: "Fatto",
      closeTabFallback: "Puoi chiudere questa scheda.",
      vintedButton: "Crea su Vinted.it",
      viewPlansButton: "Vedi i piani",
      onboardingTitle: "",
      onboardingImageAlt: "Anteprima dello strumento AutoLister su Vinted",
    },
  },
  NL: {
    domain: "vinted.nl",
    currency: "€",
    texts: {
      welcomeTitle: "Je bent ingelogd",
      welcomeSubtitle:
        "Alles is klaar.",
      welcomeMessage:
        "Alles is klaar.",
      featuresTitle: "✨ Wat je nu kunt doen",
      feature1: "Overtuigende titels en beschrijvingen direct genereren",
      feature2: "Foto's uploaden en AI-aangedreven advertenties krijgen",
      feature3:
        "Veilige workflow zonder geautomatiseerde massa-acties op je account",
      feature4: "Begin met 5 gratis generaties",
      upgradeTitle: "Bekijk plannen",
      upgradeDescription:
        "Het gratis plan bevat 5 generaties. Upgrade voor meer generaties en prioriteitsondersteuning.",
      starterFeatures:
        "10 advertenties/dag<br>75 per maand",
      proFeatures: "25 advertenties/dag<br>250 per maand",
      businessFeatures:
        "60 advertenties/dag<br>600 per maand",
      privacyLink: "Privacybeleid",
      termsLink: "Servicevoorwaarden",
      // New keys
      closeTabButton: "Klaar",
      closeTabFallback: "Je kunt dit tabblad sluiten.",
      vintedButton: "Maak op Vinted.nl",
      viewPlansButton: "Bekijk plannen",
      onboardingTitle: "",
      onboardingImageAlt: "Voorbeeld van de AutoLister-tool op Vinted",
    },
  },
  DEFAULT: {
    domain: "vinted.com",
    currency: "€",
    texts: {
      welcomeTitle: "You're signed in",
      welcomeSubtitle:
        "All set.",
      welcomeMessage:
        "All set.",
      featuresTitle: "✨ What You Can Do Now",
      feature1: "Generate compelling titles and descriptions instantly",
      feature2: "Upload photos and get AI-powered listings",
      feature3: "Use a safe workflow with no automated mass account actions",
      feature4: "Start with 5 free generations",
      upgradeTitle: "View plans",
      upgradeDescription:
        "The free plan includes 5 generations. Upgrade for more generations and priority support.",
      starterFeatures: "10 listings/day<br>75 per month",
      proFeatures: "25 listings/day<br>For active sellers",
      businessFeatures: "60 listings/day<br>600 per month",
      privacyLink: "Privacy Policy",
      termsLink: "Terms of Service",
      // New keys
      closeTabButton: "Done",
      closeTabFallback: "You can close this tab.",
      vintedButton: "Start Creating on Vinted.com",
      viewPlansButton: "View plans",
      onboardingTitle: "",
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
