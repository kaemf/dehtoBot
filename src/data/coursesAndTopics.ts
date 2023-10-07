export type Course = string;

// Js code to parse from https://dehto.de/courses/ courses names
/* 
Array
.from(document.getElementsByClassName('ld-item-title'))
.map(el => el.innerText)
.map(el => el.split('\n')[0]) // removes text about modules
.filter(el => el != 'Тecт') // filter-outs 'Teст'
.map(el => el.split('.')[1]) // removese number in front of name
.filter(Boolean).map(el => el.trim())
*/

// 10, 16, 21, 27, 35, 43, 47 - skipelement
// 10, 14, 21, 29, 34, 37, 42, 48 - skipelement
// 7, 10, 14, 19, 23, 28, 32, 36 - skipelement
// 7, 14, 18, 24, 29, 33, 38 - skipelement
export const A1_1: Course[] = [
  "Абетка",
  "Читання буквосполучень",
  "Особові займенники",
  'Дієслово "sein"',
  "Відмінювання правильних дієслів",
  "Відмінювання правильних дієслів (-s; -ß; -z)",
  "Числа 1-20",
  "Розповідне речення",
  "Питання W-Fragen",
  "Modultest 1",
  "Відмінювання правильних дієслів (-d; -t; -m; -n)",
  "Відмінювання неправильних дієслів",
  "Дієслово “haben”",
  "Порядок слів у реченні",
  "Означений артикль: der, das, die",
  "Modultest 2",
  "Числа: від 20",
  "Іменник: визначення роду за значенням і закінченням",
  "Утворення множини",
  "Займенники",
  "Modultest 3",
  "Неозначений артикль: ein, ein, eine",
  "Заперечення: kein",
  "Заперечення: nicht",
  "Imperativ: Sie i wir (наказовий спосіб)",
  "Прикметник",
  "Modultest 4",
  "Відмінки: Nominativ i Akkusativ",
  "Дієслова з Akkusativ",
  "Заперечення kein в Akkusativ",
  "Nullartikel: нульовий артикль",
  "Modalverb “möchten”",
  "Порядок слів у реченні",
  "Modalverb “mögen”",
  "Modultest 5",
  "Прийменники: im; am; um; von",
  "Годинник",
  "Побудова складних іменників",
  "Присвійні заменники: mein i dein",
  "Присвійні заменники: sein i ihr",
  "Присвійні заменники: unser i euer",
  "Присвійні заменники: Ihr i ihr",
  "Modultest 6",
  "Modalverb “müssen”",
  "Modalverb “können”",
  "Modalverb “wollen”",
  "Test A1.1",
];

export const A1_2: Course[] = [
  "Сполучники: und; oder; aber; denn",
  "Відмінки: Dativ",
  "Дієслова з Dativ",
  "Присвійні займенники в Dativ",
  "Заперечення kein в Dativ",
  "Особові займенники в Dativ: mir, dir",
  "Особові займенники в Dativ: ihm, ihr, ihm",
  "Особові займенники в Dativ: uns, euch",
  "Особові займенники в Dativ: Ihnen, ihnen",
  "Modultest 1",
  "Прийменники місця: aus; in; nach",
  "Прийменники місця: auf; in",
  "Прийменники місця: von; bei; zu",
  "Modultest 2",
  "Прийменники часу: um; am; in",
  "Прийменники часу: seit; vor; in; für",
  "Прийменники часу: vor; nach",
  "Trennbare Präfixe: слова із відокремлюваними префіксами",
  "Untrennbare Präfixe: слова із невідокремлюваними префіксами",
  "Ordinalzahlen: порядкові числівники",
  "Modultest 3",
  "Особові займенники в Akkusativ: mich, dich",
  "Особові займенники в Akkusativ: ihn, sie, es",
  "Особові займенники в Akkusativ: uns, euch",
  "Особові займенники в Akkusativ: Sie, sie",
  "Прийменник für + Akkusativ",
  "Минулий час 1: Präteritum “haben” und “sein”",
  "Минулий час 2: Präteritum",
  "Modultest 4",
  "Imperativ: du, ihr, Sie, wir (наказовий спосіб)",
  "Модальні дієслова: müssen i sollen",
  "Модальні дієслова: möchten i wollen",
  "Модальні дієслова: dürfen i können",
  "Modultest 5",
  "Прийменники з подвійним керуванням (Akkusativ)",
  "Прийменники з подвійним керуванням (Dativ)",
  "Modultest 6",
  "Минулий час 1: Perfekt (будуються “ge + t” і допоміжним “haben”)",
  "Минулий час 2: Perfekt (які закінчуються на “-ieren”)",
  "Минулий час 3: Perfekt (побудова неправильних)",
  "Минулий час 4: Perfekt (із допоміжним “sein”)",
  "Modultest 7",
  "Welcher? Welches? Welche?",
  "Dieser, dieses, diese",
  "Минулий час 5: Perfekt (із (не)відокремлюваними префіксами)",
  "Неозначений займенник “man”",
  "Wer? Was? Wem? Wen?",
  "Test A1.2",
];

export const A2_1: Course[] = [
  "Відмінок Genetiv із власними назвами",
  "Минулий час: Pefekt",
  "Минулий час: Präteritum (допоміжних дієслів)",
  "Минулий час: Präteritum",
  "Дієслова із (не)відокремлюваними префіксами",
  "Weil: сполучник підрядності",
  "Modultest 1",
  "Минулий час: Präteritum (модальний дієслів)",
  "Passiv (пасивний стан)",
  "Modultest 2",
  "Artikel and Kasus: артикль та відмінки",
  "Possessivartikel: присвійні займенники",
  "Weich- und dies-: питальні та вказівні займенники",
  "Modultest 3",
  "Komparativ: вищий ступінь порівняння",
  "Superlativ: найвищий ступінь порівняння",
  "Als und wie: різниця між порівняннями",
  "Dass: сполучник підрядності",
  "Modultest 4",
  "Wenn: сполучник підрядності",
  "Reflexive Verben: зворотні дієслова",
  "Plural: утворення множини",
  "Modultest 5",
  "Дієслово “werden” у значенні “ставати”",
  "Adjektivendungen 1: в Nominativ (ein schönes Haus)",
  "Adjektivendungen 2: в Akkusativ (einen schnellen Wagen)",
  "Adjektivendungen 3: в Dativ (einer netten Kollegin)",
  "Modultest 6",
  "Adjektivendungen 4: в Nominativ (das alte Haus)",
  "Adjektivendungen 5: в Akkusativ (den lustigen Film)",
  "Adjektivendungen 6: в Dativ (dem großen Auto)",
  "Modultest 7",
  "Прийменник “ohne” + Akkusativ",
  "Прийменник “mit” + Dativ",
  "Konjunktiv 2: умовний спосіб дієслова „können“",
  "Test A2.1",
];

export const A2_2: Course[] = [
  "Indirekte Fragesätze: непрямі питальні речення",
  'indirekte Fragen mit "ob": непрямі питальні речення з "ob"',
  "Lokale Präpositionen 1: прийменники місця",
  "Lokale Präpositionen 2: прийменники місця",
  'Konjunktiv 2 "sollen": умовний спосіб',
  "Interrogativartikel Was für ein(e): питальний артикль",
  "Modultest 1",
  "Genetiv: von + Dativ",
  "Сполучник „deshalb“",
  "Сполучник „trotzdem“",
  "Verben mit Dativ und Akkusativ",
  "Verben mit zwei Objekten: 1",
  "Verben mit zwei Objekten: 2",
  "Modultest 2",
  "Wechselpräpositionen: Dativ",
  "Wechselpräpositionen: Akkusativ",
  "Positions- und Richtungsverben",
  "Modultest 3",
  "Adjektive mit “un-“",
  "Nebensätze mit „als“ und „wenn“",
  "Konjunktiv 2: haben",
  "Konjunktiv 2: sein",
  "Konjunktiv 2: würden",
  "Modultest 4",
  "Fragepronomen 1: wer; was; wen",
  "Fragepronomen 2: welch-",
  "Verben mit Präpositionen 1: (sich ärgern über..)",
  "Verben mit Präpositionen 2: (denken an..)",
  "Modultest 5",
  "Präpositionaladverbien 1: (Ich interessiere mich dafür)",
  "Präpositionaladverbien 2: (Wovon träumst du?)",
  "Pronominaladverbien: (Mit wem sprichst du?)",
  "Modultest 6",
  "Indefinitpronomen: “man” und “niemand”",
  "Lokale Präpositionen: „in“ und „nach“(nach Deutschland; in die Ukraine)",
  "Das Verb “lassen”",
  "Relativsätze",
  "Test A2.2",
]

export type Courses = "A1.1" | "A1.2" | "A2.1" | "A2.2";

const getCourses = (c: Courses) => {
  switch (c) {
    case "A1.1":
      return A1_1;

    case "A1.2":
      return A1_2;
    
    case "A2.1":
      return A2_1;
    
    case "A2.2":
      return A2_2;
  }
};

export default getCourses;
