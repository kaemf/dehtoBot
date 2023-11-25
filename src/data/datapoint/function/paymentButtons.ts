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

//Generate button for payment status in Club Trial Lesson
export const inlineAcceptTrialPayment = (id: number, ObjectIDClub: string, paymentStatus: string, date: string): HideableIKBtn[][] => {
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
export const inlineAcceptClubWithPacketPayment = (id: number, ObjectIDClub: string, paymentStatus: string, packet: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `acceptPaymentCP:${id},${ObjectIDClub},${packet}`),
                Markup.button.callback("❌", `declinePaymentCP:${id},${ObjectIDClub},${packet}`),
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