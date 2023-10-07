const packetData = {
    "Рівень А1-А2": {
        "🔵": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 400
        },
        "🔴": {
            name: 'Економний',
            countOfLessons: 10,
            price: 380
        },
        "🟢": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 350
        },
        "🟡": {
            name: 'Вигідний',
            countOfLessons: 50,
            price: 330
        }
    },
    "Рівень В1-В2": {
        "🔵": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 500
        },
        "🔴": {
            name: 'Економний',
            countOfLessons: 10,
            price: 480
        },
        "🟢": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 450
        },
        "🟡": {
            name: 'Вигідний',
            countOfLessons: 50,
            price: 430
        }
    },
    "Рівень С1-С2": {
        "🔵": {
            name: 'Мінімальний',
            countOfLessons: 5,
            price: 600
        },
        "🔴": {
            name: 'Економний',
            countOfLessons: 10,
            price: 580
        },
        "🟢": {
            name: 'Популярний',
            countOfLessons: 20,
            price: 550
        },
        "🟡": {
            name: 'Вигідний',
            countOfLessons: 50,
            price: 530
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
