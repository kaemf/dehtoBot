const packetData = {
    "Рівень А1-А2": {
        "🔵": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 420
        },
        "🔴": {
            name: 'Економний',
            countOfLessons: 10,
            price: 395
        },
        "🟢": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 370
        },
        "🟡": {
            name: 'Вигідний',
            countOfLessons: 50,
            price: 350
        }
    },
    "Рівень В1-В2": {
        "🔵": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 520
        },
        "🔴": {
            name: 'Економний',
            countOfLessons: 10,
            price: 495
        },
        "🟢": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 470
        },
        "🟡": {
            name: 'Вигідний',
            countOfLessons: 50,
            price: 450
        }
    },
    "Рівень С1-С2": {
        "🔵": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 620
        },
        "🔴": {
            name: 'Економний',
            countOfLessons: 10,
            price: 595
        },
        "🟢": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 570
        },
        "🟡": {
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