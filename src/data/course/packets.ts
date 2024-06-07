const packetData = {
    "Рівень А1-А2": {
        "🔵 Мінімальний: 6 занять": {
            name: 'Мінімальний',
            countOfLessons: 6,
            price: 450
        },
        "🟢 Популярний: 12 занять": {
            name: 'Популярний',
            countOfLessons: 12,
            price: 420
        },
        "🟡 Вигідний: 24 занять": {
            name: 'Вигідний',
            countOfLessons: 24,
            price: 395
        }
    },
    "Рівень В1-В2": {
        "🔵 Мінімальний: 6 занять": {
            name: 'Мінімальний',
            countOfLessons: 6,
            price: 550
        },
        "🟢 Популярний: 12 занять": {
            name: 'Популярний',
            countOfLessons: 12,
            price: 520
        },
        "🟡 Вигідний: 24 занять": {
            name: 'Вигідний',
            countOfLessons: 24,
            price: 495
        }
    },
    "Рівень С1-С2": {
        "🔵 Мінімальний: 6 занять": {
            name: 'Мінімальний',
            countOfLessons: 6,
            price: 650
        },
        "🟢 Популярний: 12 занять": {
            name: 'Популярний',
            countOfLessons: 12,
            price: 620
        },
        "🟡 Вигідний: 24 занять": {
            name: 'Вигідний',
            countOfLessons: 24,
            price: 595
        }
    }
};

type PacketType = {
    [key: string]: {
        [key: string]: {
            name: string;
            countOfLessons: number;
            price: number;
        };
    }
};

const packet: PacketType = packetData;
export default packet;