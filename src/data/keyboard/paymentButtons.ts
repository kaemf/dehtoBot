import { Markup } from "telegraf";
type HideableIKBtn = ReturnType<typeof Markup.button.callback>;

//Generate button for payment status (change when paymentStatus changed)
export const inlineApprovePayment = (id: number, paymentStatus: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `approvePayment:${id}`),
                Markup.button.callback("❌", `rejectPayment:${id}`),
            ]
        ];
        } 
    else if (paymentStatus === 'paid') {
        return [
            [
                Markup.button.callback("🟢 Оплачено", `paidCheck:${id}`),
                Markup.button.callback("❌", `resetPaymentStatus:${id}`),
            ]
        ];
    } 
    else if (paymentStatus === 'nopaid') {
        return [
            [
                Markup.button.callback("🔴 Не оплачено", `nopaidCheck:${id}`),
                Markup.button.callback("❌", `resetPaymentStatus:${id}`),
            ]
        ];
    }
    return [];
};

//Generate button for payment status in Club Once Lesson
export const inlineAcceptOncePayment = (id: number, ObjectIDClub: string, paymentStatus: string, date: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `acceptPayment:${id},${ObjectIDClub},${date}`),
                Markup.button.callback("❌", `declinePayment:${id},${ObjectIDClub},${date}`),
            ]
        ];
        } 
    else if (paymentStatus === 'paid') {
        return [
            [
                Markup.button.callback("🟢 Оплачено", `paidCheckT:${id}`)
            ]
        ];
    } 
    else if (paymentStatus === 'nopaid') {
        return [
            [
                Markup.button.callback("🔴 Не оплачено", `nopaidCheckT:${id}`)
            ]
        ];
    }
    return [];
}

// Generate button for payment status in Club Once Lesson without Club
export const inlineAcceptOncePaymentWithoutClub = (id: number, paymentStatus: string, date: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `acceptPaymentWO:${id},${date}`),
                Markup.button.callback("❌", `declinePaymentWO:${id},${date}`),
            ]
        ];
        } 
    else if (paymentStatus === 'paid') {
        return [
            [
                Markup.button.callback("🟢 Оплачено", `paidCheckT:${id}`)
            ]
        ];
    } 
    else if (paymentStatus === 'nopaid') {
        return [
            [
                Markup.button.callback("🔴 Не оплачено", `nopaidCheckT:${id}`)
            ]
        ];
    }
    return [];
}

//Generate button for payment status in Club Packet
export const inlineAcceptPacketPayment = (id: number, paymentStatus: string, packet: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `acceptPaymentP:${id},${packet}`),
                Markup.button.callback("❌", `declinePaymentP:${id},${packet}`),
            ]
        ];
        } 
    else if (paymentStatus === 'paid') {
        return [
            [
                Markup.button.callback("🟢 Оплачено", `paidCheckT:${id}`)
            ]
        ];
    } 
    else if (paymentStatus === 'nopaid') {
        return [
            [
                Markup.button.callback("🔴 Не оплачено", `nopaidCheckT:${id}`)
            ]
        ];
    }
    return [];
}

//Generate button for payment status in Club Packet
export const inlineAcceptClubWithPacketPayment = (id: number, ObjectIDClub: string, paymentStatus: string, packet: string, date: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `acceptPaymentCP:${id},${ObjectIDClub},${packet},${date}`),
                Markup.button.callback("❌", `declinePaymentCP:${id},${ObjectIDClub},${packet},${date}`),
            ]
        ];
        } 
    else if (paymentStatus === 'paid') {
        return [
            [
                Markup.button.callback("🟢 Оплачено", `paidCheckCP:${id}`)
            ]
        ];
    } 
    else if (paymentStatus === 'nopaid') {
        return [
            [
                Markup.button.callback("🔴 Не оплачено", `nopaidCheckCP:${id}`)
            ]
        ];
    }
    return [];
}

//Generate Event buttons for announcement clubs
export const inlineEventAnnouncementClub = (id: number, ObjectIDClub: string): HideableIKBtn[][] => {
    return [
        [
            Markup.button.callback("😍 зареєструватися!", `acceptEventAnnouncementClub:${id},${ObjectIDClub}`),
            Markup.button.callback("😒 нє, не цікаво", `declineEventAnnouncementClub:${id},${ObjectIDClub}`),
        ]
    ];
}

//If individual no lessons, payment button generate
export const inlinePayButton = (id: number): HideableIKBtn[][] => {
    return [
        [
            Markup.button.callback("перейти до оплати", `goToPay:${id}`),
        ]
    ];
}

export const inlineScheduleTrialLessonTeacher = (id: number, idStudent: number): HideableIKBtn[][] => {
    return [
        [
            Markup.button.callback("запланувати пробне заняття", `scheduleTrialLessonTeacher:${id},${idStudent}`),
        ]
    ];
}

// Go to detask Solution
export const inlineGoToDetaskSolution = (id: number): HideableIKBtn[][] => {
    return [
        [
            Markup.button.callback("виконати ", `goToDetaskSolution:${id}`),
        ]
    ];
}