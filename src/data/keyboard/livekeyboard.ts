import { Markup } from "telegraf";
type HideableIKBtn = ReturnType<typeof Markup.button.callback>;

export const liveKeyboard = (id: number, processStatus: string, oid: string): HideableIKBtn[][] => {
    switch(processStatus){
        case "waiting":
            return [
                [
                    Markup.button.callback("✔ Прийняти", `acceptSupport:${id},${oid}`)
                ]
            ];
            
        case "accepted":
            return [
                [
                    Markup.button.callback("🟢 В процесі", `acceptedCheck`)
                ]
            ];

        case "busy":
            return [
                [
                    Markup.button.callback("🔴 Прийнято іншим оператором", `busyCheck`)
                ]
            ];

        case "declined":
            return [
                [
                    Markup.button.callback("❌ Канал закритий", `declinedCheck`)
                ]
            ];

        default:
            return [
                [
                    Markup.button.callback("??_Помилка_створення_кнопки_??", `errorCheck`)
                ]
            ];
    }
};