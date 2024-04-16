const packetData = {
    "Рівень А1-А2": {
        "🔵 Мінімальний: 5 занять": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 420
        },
        "🔴 Економний: 10 занять": {
            name: 'Економний',
            countOfLessons: 10,
            price: 395
        },
        "🟢 Популярний: 20 занять": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 370
        },
        "🟡 Вигідний: 50 занять": {
            name: 'Вигідний',
            countOfLessons: 50,
            price: 350
        }
    },
    "Рівень В1-В2": {
        "🔵 Мінімальний: 5 занять": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 520
        },
        "🔴 Економний: 10 занять": {
            name: 'Економний',
            countOfLessons: 10,
            price: 495
        },
        "🟢 Популярний: 20 занять": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 470
        },
        "🟡 Вигідний: 50 занять": {
            name: 'Вигідний',
            countOfLessons: 50,
            price: 450
        }
    },
    "Рівень С1-С2": {
        "🔵 Мінімальний: 5 занять": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 620
        },
        "🔴 Економний: 10 занять": {
            name: 'Економний',
            countOfLessons: 10,
            price: 595
        },
        "🟢 Популярний: 20 занять": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 570
        },
        "🟡 Вигідний: 50 занять": {
            name: 'Вигідний',
            countOfLessons: 50,
            price: 550
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