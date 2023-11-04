import { ObjectId } from "mongodb";
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
export const inlineAcceptTrialPayment = (id: number, ObjectIDClub: string, paymentStatus: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `acceptPayment:${id},${ObjectIDClub}`),
                Markup.button.callback("❌", `declinePayment:${id},${ObjectIDClub}`),
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
export const inlineAcceptPacketPayment = (id: number, ObjectIDClub: string, paymentStatus: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `acceptPaymentP:${id},${ObjectIDClub}`),
                Markup.button.callback("❌", `declinePaymentP:${id},${ObjectIDClub}`),
            ]
        ];
        } 
    else if (paymentStatus === 'paid') {
        return [
            [
                Markup.button.callback("🟢 Оплачено", `paidCheckP:${id}`)
            ]
        ];
    } 
    else if (paymentStatus === 'nopaid') {
        return [
            [
                Markup.button.callback("🔴 Не оплачено", `nopaidCheckP:${id}`)
            ]
        ];
    }
    return [];
}