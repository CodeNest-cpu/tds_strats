/*
  Все стратегии лежат здесь. Чтобы добавить новую, скопируй объект целиком
  и поменяй поля. Подробности в README.txt.
  Тексты пишутся парой { en, ru }. Названия башен (Engineer, DJ и т.д.)
  оставляй на английском в обоих языках.
*/
const STRATEGIES = [
  {
    id: "frost-honey-valley",
    team: "solo",
    mode: "Frost",
    map: "Honey Valley",
    modifiers: ["Explosive Enemy", "Limitation", "Committed", "Glass"],
    loadout: ["Engineer", "Juggernaut", "Hacker", "DJ", "Enforcer"],

    // Картинка карты (положи файл в папку maps) и метки башен.
    // Метки удобнее расставить прямо на сайте: кнопка «Расставить башни»,
    // потом «Скопировать JSON» и вставить результат в markers.
    mapImage: "maps/honey-valley.jpg",
    markers: [],

    // Итоговая расстановка
    build: [
      { tower: "Engineer",   n: 6, final: { en: "Max",                   ru: "Макс" } },
      { tower: "Enforcer",   n: 5, final: { en: "Max (3 bottom, 2 top)", ru: "Макс (3 нижний путь, 2 верхний)" } },
      { tower: "Hacker",     n: 2, final: { en: "Max (top)",             ru: "Макс (верхний путь)" } },
      { tower: "DJ",         n: 1, final: { en: "Max",                   ru: "Макс" } },
      { tower: "Juggernaut", n: 1, final: { en: "Max (top)",             ru: "Макс (верхний путь)" } }
    ],

    // Шкала волн над стратегией
    waves: 40,
    timeline: [
      { from: 1, to: 13, tone: "ice",  label: { en: "Skip",         ru: "Пропуск" } },
      { at: 20,          tone: "warn", label: { en: "Red track",    ru: "Красный трек" } },
      { at: 40,          tone: "warn", label: { en: "Purple clone", ru: "Клон DJ" } }
    ],

    notes: [
      { tone: "ice",  tag: { en: "Skip",      ru: "Пропуск" },
        text: { en: "Skip waves 1–13. You can skip later if you want, but it's not recommended.",
                ru: "Пропусти волны 1–13. Позже тоже можно пропускать, но это не рекомендуется." } },
      { tone: "warn", tag: { en: "ASAP",      ru: "Сразу" },
        text: { en: "Use Enforcer's SWAT Van.", ru: "Используй SWAT Van у Enforcer." } },
      { tone: "warn", tag: { en: "ASAP",      ru: "Сразу" },
        text: { en: "Use DJ's Drop the Beat.", ru: "Используй Drop the Beat у DJ." } },
      { tone: "mute", tag: { en: "If needed", ru: "По ситуации" },
        text: { en: "Use Helicopter on towers.", ru: "При необходимости используй Helicopter на башнях." } },
      { tone: "ice",  tag: { en: "Wave 40",   ru: "Волна 40" },
        text: { en: "Clone DJ (purple track) next to Juggernaut and use Juggernaut ASAP.",
                ru: "Клонируй DJ (purple track) рядом с Juggernaut и сразу используй Juggernaut." } }
    ],

    steps: [
      { en: "Place 6 lvl 3 Engineers one by one", ru: "Поставь 6 Engineer лвл 3 по одному" },
      { en: "Place 3 lvl 2 Enforcers one by one", ru: "Поставь 3 Enforcer лвл 2 по одному" },
      { en: "Place 1 lvl 3 DJ", ru: "Поставь 1 DJ лвл 3",
        sub: [ { en: "Set red track on wave 20 for the whole game", ru: "На волне 20 поставь красный трек (red track) на всю игру" } ] },
      { en: "Upgrade all Engineers to lvl 4", ru: "Улучши всех Engineer до лвл 4" },
      { en: "Place 2 lvl 3 Hackers", ru: "Поставь 2 Hacker лвл 3" },
      { en: "Place 2 lvl 4 Enforcers and upgrade all Enforcers to lvl 4", ru: "Поставь 2 Enforcer лвл 4 и улучши всех Enforcer до лвл 4" },
      { en: "Max DJ", ru: "Прокачай DJ на максимум" },
      { en: "Upgrade Engineers to lvl 5", ru: "Улучши Engineer до лвл 5" },
      { en: "Upgrade all Engineers to max", ru: "Прокачай всех Engineer на максимум" },
      { en: "Place 1 lvl 4 Juggernaut", ru: "Поставь 1 Juggernaut лвл 4" },
      { en: "Max all Enforcers (3 bottom, 2 top)", ru: "Прокачай всех Enforcer на максимум (3 нижний путь, 2 верхний)" },
      { en: "Upgrade Hackers to max (2 top)", ru: "Прокачай Hacker на максимум (2 верхний путь)" },
      { en: "Upgrade Juggernaut (top) to max", ru: "Прокачай Juggernaut на максимум (верхний путь)" }
    ]
  }
];
