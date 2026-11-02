(function (root) {
  "use strict";
  const shared = root.AutoListerSharedUiCopy || (typeof require === "function" ? require("./shared-ui-copy.js") : null);
  if (!shared) throw Error("Load shared-ui-copy.js before listing translations");
  const sharedKeys = {"Add photos":"action.addPhotos","Close":"action.close","Skip":"action.skip","Back":"action.back","Next":"action.next","Done":"action.done","Short":"listing.short","Long":"listing.long","Hashtags":"listing.hashtags","Emojis":"listing.emojis","Seller note":"listing.sellerNote","Description length":"listing.descriptionLength","Title language":"listing.titleLanguage","Description language":"listing.descriptionLanguage"};
  const keys = ["Phone or computer","Writing style","Help","Send feedback","Hide controls","Quick tour","First time here?","Start with your photos","Upload directly in Vinted, or use Add photos to send them from your phone or computer.","Generate, then review","Create your title and description. Languages sit beside each field; Writing style holds your preferences.","Your model is optional","Preview or set up your model here. Turn it on to add two model photos to suitable items.","Paragraphs","Bullet points"];
  const rows = {
    nl: "Telefoon of computer|Schrijfstijl|Hulp|Feedback sturen|Bediening verbergen|Korte rondleiding|Voor het eerst hier?|Begin met je foto’s|Upload rechtstreeks in Vinted, of gebruik Foto’s toevoegen om ze vanaf je telefoon of computer te versturen.|Genereren en controleren|Maak je titel en beschrijving. Talen staan naast elk veld; je voorkeuren vind je onder Schrijfstijl.|Je model is optioneel|Bekijk of maak hier je model. Schakel het in voor twee modelfoto’s bij geschikte artikelen.|Alinea’s|Opsomming",
    fr: "Téléphone ou ordinateur|Style de rédaction|Aide|Envoyer un avis|Masquer les commandes|Visite rapide|Première visite ?|Commencez par vos photos|Importez directement dans Vinted ou utilisez Ajouter des photos depuis votre téléphone ou ordinateur.|Générez, puis vérifiez|Créez votre titre et votre description. Les langues sont à côté des champs ; vos préférences sont dans Style de rédaction.|Votre mannequin est facultatif|Consultez ou créez votre mannequin ici. Activez-le pour ajouter deux photos aux articles adaptés.|Paragraphes|Liste à puces",
    de: "Handy oder Computer|Schreibstil|Hilfe|Feedback senden|Bedienelemente ausblenden|Kurze Einführung|Zum ersten Mal hier?|Beginne mit deinen Fotos|Lade Fotos direkt bei Vinted hoch oder nutze Fotos hinzufügen für dein Handy oder deinen Computer.|Generieren und prüfen|Erstelle Titel und Beschreibung. Sprachen stehen neben den Feldern, deine Einstellungen unter Schreibstil.|Dein Model ist optional|Sieh dir dein Model an oder erstelle es hier. Aktiviere es für zwei Modelfotos bei passenden Artikeln.|Absätze|Stichpunkte",
    es: "Móvil u ordenador|Estilo de escritura|Ayuda|Enviar opinión|Ocultar controles|Guía rápida|¿Primera vez aquí?|Empieza con tus fotos|Sube fotos directamente a Vinted o usa Añadir fotos desde tu móvil u ordenador.|Genera y revisa|Crea el título y la descripción. Los idiomas están junto a cada campo y tus preferencias en Estilo de escritura.|Tu modelo es opcional|Consulta o crea tu modelo aquí. Actívalo para añadir dos fotos a los artículos adecuados.|Párrafos|Viñetas",
    it: "Telefono o computer|Stile di scrittura|Aiuto|Invia feedback|Nascondi comandi|Guida rapida|È la prima volta qui?|Inizia dalle foto|Carica le foto direttamente su Vinted o usa Aggiungi foto dal telefono o dal computer.|Genera, poi controlla|Crea titolo e descrizione. Le lingue sono accanto ai campi; le preferenze sono in Stile di scrittura.|Il modello è facoltativo|Visualizza o crea il tuo modello qui. Attivalo per aggiungere due foto agli articoli adatti.|Paragrafi|Elenco puntato",
    pl: "Telefon lub komputer|Styl tekstu|Pomoc|Wyślij opinię|Ukryj przyciski|Krótki przewodnik|Pierwszy raz tutaj?|Zacznij od zdjęć|Prześlij zdjęcia bezpośrednio w Vinted lub użyj Dodaj zdjęcia na telefonie lub komputerze.|Wygeneruj i sprawdź|Utwórz tytuł i opis. Języki są obok pól, a ustawienia w sekcji Styl tekstu.|Twój model jest opcjonalny|Tutaj obejrzysz lub utworzysz model. Włącz go, aby dodać dwa zdjęcia do odpowiednich przedmiotów.|Akapity|Lista punktowana",
    pt: "Telemóvel ou computador|Estilo de escrita|Ajuda|Enviar opinião|Ocultar controlos|Guia rápido|Primeira vez aqui?|Começa pelas fotos|Carrega diretamente no Vinted ou usa Adicionar fotos a partir do telemóvel ou computador.|Gera e revê|Cria o título e a descrição. Os idiomas estão junto dos campos; as preferências estão em Estilo de escrita.|O teu modelo é opcional|Vê ou cria aqui o teu modelo. Ativa-o para adicionar duas fotos aos artigos adequados.|Parágrafos|Lista com pontos",
    cs: "Telefon nebo počítač|Styl textu|Nápověda|Poslat zpětnou vazbu|Skrýt ovládání|Rychlý průvodce|Jsi tu poprvé?|Začni fotkami|Nahraj fotky přímo na Vinted nebo použij Přidat fotky z telefonu či počítače.|Vygeneruj a zkontroluj|Vytvoř název a popis. Jazyky jsou vedle polí, předvolby najdeš ve Stylu textu.|Tvůj model je volitelný|Tady si model prohlédneš nebo vytvoříš. Zapni ho pro dvě fotky u vhodných předmětů.|Odstavce|Odrážky",
    da: "Telefon eller computer|Skrivestil|Hjælp|Send feedback|Skjul kontroller|Hurtig rundvisning|Første gang her?|Start med dine billeder|Upload direkte på Vinted, eller brug Tilføj billeder fra din telefon eller computer.|Generér og gennemse|Opret titel og beskrivelse. Sprog står ved felterne, og dine indstillinger findes under Skrivestil.|Din model er valgfri|Se eller opret din model her. Slå den til for at tilføje to modelbilleder til egnede varer.|Afsnit|Punktopstilling",
    el: "Κινητό ή υπολογιστής|Ύφος κειμένου|Βοήθεια|Αποστολή σχολίων|Απόκρυψη στοιχείων ελέγχου|Σύντομη ξενάγηση|Πρώτη φορά εδώ;|Ξεκίνα με τις φωτογραφίες|Ανέβασε απευθείας στο Vinted ή χρησιμοποίησε την Προσθήκη φωτογραφιών από κινητό ή υπολογιστή.|Δημιούργησε και έλεγξε|Δημιούργησε τίτλο και περιγραφή. Οι γλώσσες είναι δίπλα στα πεδία και οι προτιμήσεις στο Ύφος κειμένου.|Το μοντέλο είναι προαιρετικό|Δες ή δημιούργησε το μοντέλο σου εδώ. Ενεργοποίησέ το για δύο φωτογραφίες σε κατάλληλα είδη.|Παράγραφοι|Κουκκίδες",
    hr: "Telefon ili računalo|Stil teksta|Pomoć|Pošalji povratne informacije|Sakrij kontrole|Kratki vodič|Prvi put ovdje?|Počni s fotografijama|Prenesi izravno na Vinted ili koristi Dodaj fotografije s telefona ili računala.|Generiraj i provjeri|Izradi naslov i opis. Jezici su uz polja, a postavke su pod Stil teksta.|Tvoj model nije obavezan|Ovdje pregledaj ili izradi model. Uključi ga za dvije fotografije prikladnih predmeta.|Odlomci|Natuknice",
    fi: "Puhelin tai tietokone|Kirjoitustyyli|Ohje|Lähetä palautetta|Piilota painikkeet|Pikaopastus|Ensimmäistä kertaa täällä?|Aloita kuvista|Lataa kuvat suoraan Vintediin tai käytä Lisää kuvia puhelimesta tai tietokoneesta.|Luo ja tarkista|Luo otsikko ja kuvaus. Kielet ovat kenttien vieressä, asetukset kohdassa Kirjoitustyyli.|Mallisi on valinnainen|Katsele tai luo mallisi täällä. Ota se käyttöön, niin sopiviin tuotteisiin lisätään kaksi mallikuvaa.|Kappaleet|Luettelomerkit",
    hu: "Telefon vagy számítógép|Szövegstílus|Súgó|Visszajelzés küldése|Vezérlők elrejtése|Rövid bemutató|Először jársz itt?|Kezdd a fotókkal|Tölts fel közvetlenül a Vintedre, vagy használd a Fotók hozzáadása gombot telefonról vagy számítógépről.|Generálj és ellenőrizz|Hozd létre a címet és a leírást. A nyelvek a mezők mellett, a beállítások a Szövegstílus alatt találhatók.|A modelled nem kötelező|Itt nézheted meg vagy hozhatod létre a modelledet. Kapcsold be két modellfotóhoz a megfelelő termékeknél.|Bekezdések|Felsorolás",
    lt: "Telefonas arba kompiuteris|Rašymo stilius|Pagalba|Siųsti atsiliepimą|Slėpti valdiklius|Trumpas vadovas|Pirmą kartą čia?|Pradėk nuo nuotraukų|Įkelk tiesiai į Vinted arba naudok Pridėti nuotraukų iš telefono ar kompiuterio.|Sugeneruok ir patikrink|Sukurk pavadinimą ir aprašymą. Kalbos yra šalia laukų, o nuostatos skiltyje Rašymo stilius.|Tavo modelis neprivalomas|Čia peržiūrėk arba sukurk modelį. Įjunk jį, kad tinkamiems daiktams pridėtum dvi modelio nuotraukas.|Pastraipos|Punktų sąrašas",
    ro: "Telefon sau computer|Stil de scriere|Ajutor|Trimite feedback|Ascunde comenzile|Tur rapid|Prima dată aici?|Începe cu fotografiile|Încarcă direct în Vinted sau folosește Adaugă fotografii de pe telefon ori computer.|Generează și verifică|Creează titlul și descrierea. Limbile sunt lângă câmpuri, iar preferințele în Stil de scriere.|Modelul tău este opțional|Vezi sau creează modelul aici. Activează-l pentru două fotografii la articolele potrivite.|Paragrafe|Listă cu puncte",
    sk: "Telefón alebo počítač|Štýl textu|Pomoc|Poslať spätnú väzbu|Skryť ovládanie|Rýchly sprievodca|Si tu prvýkrát?|Začni fotkami|Nahraj fotky priamo na Vinted alebo použi Pridať fotky z telefónu či počítača.|Vygeneruj a skontroluj|Vytvor názov a popis. Jazyky sú vedľa polí, predvoľby nájdeš v Štýle textu.|Tvoj model je voliteľný|Tu si model pozrieš alebo vytvoríš. Zapni ho pre dve fotky pri vhodných predmetoch.|Odseky|Odrážky",
    sv: "Telefon eller dator|Skrivstil|Hjälp|Skicka feedback|Dölj kontroller|Snabb rundtur|Första gången här?|Börja med dina bilder|Ladda upp direkt på Vinted eller använd Lägg till bilder från telefonen eller datorn.|Generera och granska|Skapa titel och beskrivning. Språk finns bredvid fälten och dina inställningar under Skrivstil.|Din modell är valfri|Visa eller skapa din modell här. Aktivera den för två modellbilder på lämpliga varor.|Stycken|Punktlista",
  };
  const copy = { en: Object.fromEntries(keys.map((k) => [k, k])) };
  for (const [locale, row] of Object.entries(rows)) {
    const values = row.split("|");
    if (values.length !== keys.length)
      throw Error("Incomplete listing copy: " + locale);
    copy[locale] = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  }
  const accessibility = {
    en: "Description format|Edit seller note|Requires a free trial, Pro or Business.|Settings could not be loaded.",
    nl: "Opmaak beschrijving|Verkopersnotitie bewerken|Vereist een gratis proefperiode, Pro of Business.|Instellingen konden niet worden geladen.",
    fr: "Format de la description|Modifier la note du vendeur|Nécessite un essai gratuit, Pro ou Business.|Impossible de charger les paramètres.",
    de: "Beschreibungsformat|Verkäufernotiz bearbeiten|Erfordert eine kostenlose Testphase, Pro oder Business.|Einstellungen konnten nicht geladen werden.",
    es: "Formato de la descripción|Editar nota del vendedor|Requiere una prueba gratuita, Pro o Business.|No se han podido cargar los ajustes.",
    it: "Formato della descrizione|Modifica nota del venditore|Richiede una prova gratuita, Pro o Business.|Impossibile caricare le impostazioni.",
    pl: "Format opisu|Edytuj notatkę sprzedawcy|Wymaga bezpłatnego okresu próbnego, Pro lub Business.|Nie udało się wczytać ustawień.",
    pt: "Formato da descrição|Editar nota do vendedor|Requer um período experimental gratuito, Pro ou Business.|Não foi possível carregar as definições.",
    cs: "Formát popisu|Upravit poznámku prodejce|Vyžaduje bezplatné zkušební období, Pro nebo Business.|Nastavení se nepodařilo načíst.",
    da: "Beskrivelsens format|Rediger sælgernote|Kræver en gratis prøveperiode, Pro eller Business.|Indstillingerne kunne ikke indlæses.",
    el: "Μορφή περιγραφής|Επεξεργασία σημείωσης πωλητή|Απαιτεί δωρεάν δοκιμή, Pro ή Business.|Δεν ήταν δυνατή η φόρτωση των ρυθμίσεων.",
    hr: "Format opisa|Uredi napomenu prodavatelja|Potreban je besplatan probni period, Pro ili Business.|Postavke se nisu mogle učitati.",
    fi: "Kuvauksen muoto|Muokkaa myyjän huomautusta|Vaatii ilmaisen kokeilun, Pro- tai Business-tilauksen.|Asetuksia ei voitu ladata.",
    hu: "Leírás formátuma|Eladói megjegyzés szerkesztése|Ingyenes próbaidőszak, Pro vagy Business szükséges.|A beállításokat nem sikerült betölteni.",
    lt: "Aprašymo formatas|Redaguoti pardavėjo pastabą|Reikalingas nemokamas bandymas, Pro arba Business.|Nepavyko įkelti nustatymų.",
    ro: "Formatul descrierii|Editează nota vânzătorului|Necesită o perioadă de probă gratuită, Pro sau Business.|Setările nu au putut fi încărcate.",
    sk: "Formát popisu|Upraviť poznámku predajcu|Vyžaduje bezplatné skúšobné obdobie, Pro alebo Business.|Nastavenia sa nepodarilo načítať.",
    sv: "Beskrivningens format|Redigera säljaranteckning|Kräver en gratis provperiod, Pro eller Business.|Inställningarna kunde inte läsas in.",
  };
  for (const [locale, row] of Object.entries(accessibility)) {
    const values = row.split("|");
    if (values.length !== accessibility.en.split("|").length)
      throw Error("Incomplete listing accessibility copy: " + locale);
    for (const [i, value] of values.entries())
      copy[locale][accessibility.en.split("|")[i]] = value;
  }
  const actions = {
    en: "Generate|Generating|Preparing...|Waiting for connection...",
    nl: "Genereren|Bezig met genereren|Voorbereiden...|Wachten op verbinding...",
    fr: "Générer|Génération en cours|Préparation...|En attente de connexion...",
    de: "Generieren|Wird generiert|Vorbereitung...|Warten auf Verbindung...",
    es: "Generar|Generando|Preparando...|Esperando conexión...",
    it: "Genera|Generazione in corso|Preparazione...|In attesa di connessione...",
    pl: "Generuj|Generowanie|Przygotowywanie...|Oczekiwanie na połączenie...",
    pt: "Gerar|A gerar|A preparar...|À espera de ligação...",
    cs: "Vygenerovat|Generování|Příprava...|Čekání na připojení...",
    da: "Generér|Genererer|Forbereder...|Venter på forbindelse...",
    el: "Δημιουργία|Δημιουργείται|Προετοιμασία...|Αναμονή σύνδεσης...",
    hr: "Generiraj|Generiranje|Priprema...|Čekanje veze...",
    fi: "Luo|Luodaan|Valmistellaan...|Odotetaan yhteyttä...",
    hu: "Generálás|Generálás folyamatban|Előkészítés...|Várakozás a kapcsolatra...",
    lt: "Generuoti|Generuojama|Ruošiama...|Laukiama ryšio...",
    ro: "Generează|Se generează|Se pregătește...|Se așteaptă conexiunea...",
    sk: "Vygenerovať|Generovanie|Príprava...|Čakanie na pripojenie...",
    sv: "Generera|Genererar|Förbereder...|Väntar på anslutning...",
  };
  for (const [locale, row] of Object.entries(actions))
    for (const [i, value] of row.split("|").entries())
      copy[locale][actions.en.split("|")[i]] = value;
  for (const [locale, local] of Object.entries(copy)) Object.assign(local, shared.project(sharedKeys, locale));
  root.AutoListerListingCopy = {
    copy,
    text(key) {
      const locale = root.AutoListerModelCopy?.getLocale() || "en";
      return copy[locale]?.[key] || copy.en[key] || key;
    },
  };
})(globalThis);
